import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  Coins,
  CurrencyDollar,
  Eye,
  FileCsv,
  HourglassMedium,
  MagnifyingGlass,
  Package,
  PencilSimple,
  ShoppingCart,
  Tag,
  Trash,
  TrendDown,
  Truck,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  getPosBatchTraceability,
  getPosExpiredLossReport,
  getPosExpiringBatches,
  getPosPolicies,
  getPosProductBatches,
  getPosProducts,
  type BatchProductInvestment,
  type BatchTraceabilityData,
  type BatchTraceabilityFinancials,
  type ExpiredLossItem,
  type PosPoliciesData,
  type PosProductBatchItem,
  type PosProductItem,
} from 'api-client';
import { PeriodSelector } from './PeriodSelector';
import { EditBatchModal, type BatchToEdit } from '../pos/inventory/EditBatchModal';
import { StockAdjustmentModal } from '../pos/inventory/StockAdjustmentModal';
import { useNotificationCenterStore } from '../../store/notificationCenter.store';
import type { PeriodType } from '../../types/reports';
import { formatManaguaDate } from '../../utils/dateManagua';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { getBatchStatusMeta } from '../../utils/batchStatus';
import {
  extractDateYmd,
  formatCalendarDate,
  getBatchStatusInfo,
  getDaysToExpiry,
  isBatchExpiredDate,
  round2,
  round3,
} from '../../utils/batchExpiry';

export type BatchesSubTabKey = 'expirations' | 'traceability' | 'losses';

interface BatchesReportsTabProps {
  currency?: string;
  initialSubTab?: BatchesSubTabKey;
  initialStatusFilter?: string;
  navTrigger?: number;
}

type ExpiryStatusFilter = 'ALL' | 'EXPIRED' | 'CRITICAL' | 'UPCOMING' | 'NO_DATE';
type LossSourceFilter = 'ALL' | 'EXPIRED_IN_STOCK' | 'WRITE_OFF';

function normalizeInitialFilter(raw?: string): ExpiryStatusFilter {
  const up = String(raw || '').toUpperCase();
  if (up === 'EXPIRED' || up === 'VENCIDO') return 'EXPIRED';
  if (up === 'CRITICAL' || up === 'CRITICO') return 'CRITICAL';
  if (up === 'UPCOMING' || up === 'PROXIMO') return 'UPCOMING';
  if (up === 'NO_DATE' || up === 'SIN_FECHA') return 'NO_DATE';
  return 'ALL';
}

function resolveTraceabilityMetrics(
  traceabilityData: BatchTraceabilityData,
  productBatches: PosProductBatchItem[],
): {
  unitCost: number;
  unitPrice: number;
  status: 'SIN_FECHA' | 'VENCIDO' | 'CRITICO' | 'PROXIMO' | 'NORMAL';
  daysToExpiry: number | null;
  isExpired: boolean;
  currentBalance: number;
  financials: BatchTraceabilityFinancials;
  productInvestment: BatchProductInvestment;
} {
  const { batch, totals, sales } = traceabilityData;
  const fallbackInfo = getBatchStatusInfo(batch.expiryDate);
  const status = batch.status ?? fallbackInfo.status;
  const daysToExpiry =
    batch.daysToExpiry !== undefined
      ? batch.daysToExpiry
      : fallbackInfo.daysToExpiry;
  const isExpired =
    batch.isExpired !== undefined ? batch.isExpired : fallbackInfo.isExpired;

  const unitCost = round2(
    Number(
      traceabilityData.financials?.unitCost ??
        batch.effectiveCost ??
        batch.cost ??
        batch.product.cost ??
        0,
    ),
  );
  const unitPrice = round2(
    Number(traceabilityData.financials?.unitPrice ?? batch.product.price ?? 0),
  );
  const currentBalance = round3(
    Number(totals.currentBalance ?? batch.currentQuantity ?? 0),
  );
  const totalReceived = round3(Number(totals.totalReceived ?? 0));

  const writtenOffUnits = round3(
    Number(traceabilityData.financials?.writtenOffUnits ?? totals.totalExpired ?? 0),
  );
  const pendingExpiredUnits = round3(
    Number(
      traceabilityData.financials?.pendingExpiredUnits ??
        totals.expiredInStock ??
        (isExpired ? currentBalance : 0),
    ),
  );
  const totalExpiredUnits = round3(
    Number(
      traceabilityData.financials?.totalExpiredUnits ??
        totals.totalExpiredWithPending ??
        writtenOffUnits + pendingExpiredUnits,
    ),
  );

  const soldRevenueFallback = round2(
    sales
      .filter((s) => !s.status || s.status === 'COMPLETED')
      .reduce((acc, s) => acc + Number(s.quantity) * Number(s.unitPrice || 0), 0),
  );

  const writtenOffLossAmount = round2(
    Number(
      traceabilityData.financials?.writtenOffLossAmount ??
        writtenOffUnits * unitCost,
    ),
  );
  const pendingExpiredLossAmount = round2(
    Number(
      traceabilityData.financials?.pendingExpiredLossAmount ??
        pendingExpiredUnits * unitCost,
    ),
  );

  const financials: BatchTraceabilityFinancials = traceabilityData.financials ?? {
    unitCost,
    unitPrice,
    initialInvestedCost: round2(totalReceived * unitCost),
    currentInvestedCost: round2(currentBalance * unitCost),
    currentSaleValue: round2(currentBalance * unitPrice),
    soldRevenue: soldRevenueFallback,
    writtenOffUnits,
    writtenOffLossAmount,
    pendingExpiredUnits,
    pendingExpiredLossAmount,
    totalExpiredUnits,
    totalExpiredLossAmount: round2(
      writtenOffLossAmount + pendingExpiredLossAmount,
    ),
    potentialRevenueLost: round2(totalExpiredUnits * unitPrice),
  };

  let productInvestment: BatchProductInvestment;
  if (traceabilityData.productInvestment) {
    productInvestment = traceabilityData.productInvestment;
  } else {
    const activeBatches = productBatches.filter(
      (pb) => Number(pb.quantity ?? 0) > 0,
    );
    let totalStock = 0;
    let sellableStock = 0;
    let expiredStock = 0;
    let totalInvestedCost = 0;
    let sellableInvestedCost = 0;
    let expiredInvestedCost = 0;

    for (const pb of activeBatches) {
      const pbQty = round3(Number(pb.quantity ?? 0));
      const pbCost = round2(Number(pb.cost ?? batch.product.cost ?? 0));
      const pbInv = round2(pbQty * pbCost);
      const pbExpired =
        pb.status === 'VENCIDO' || isBatchExpiredDate(pb.expiryDate);

      totalStock = round3(totalStock + pbQty);
      totalInvestedCost = round2(totalInvestedCost + pbInv);
      if (pbExpired) {
        expiredStock = round3(expiredStock + pbQty);
        expiredInvestedCost = round2(expiredInvestedCost + pbInv);
      } else {
        sellableStock = round3(sellableStock + pbQty);
        sellableInvestedCost = round2(sellableInvestedCost + pbInv);
      }
    }

    productInvestment = {
      activeBatchCount: activeBatches.length,
      totalStock,
      sellableStock,
      expiredStock,
      totalInvestedCost,
      sellableInvestedCost,
      expiredInvestedCost,
      totalSaleValue: round2(totalStock * unitPrice),
    };
  }

  return {
    unitCost,
    unitPrice,
    status,
    daysToExpiry,
    isExpired,
    currentBalance,
    financials,
    productInvestment,
  };
}

export const BatchesReportsTab: React.FC<BatchesReportsTabProps> = ({
  currency = 'NIO',
  initialSubTab = 'expirations',
  initialStatusFilter,
  navTrigger,
}) => {
  const [subTab, setSubTab] = useState<BatchesSubTabKey>(initialSubTab);

  // Estado compartido de catálogo y políticas para modales de baja y edición
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [policies, setPolicies] = useState<PosPoliciesData | null>(null);

  // Modales compartidos
  const [batchToEdit, setBatchToEdit] = useState<BatchToEdit | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<{
    product: PosProductItem;
    batchId: string;
    batchNumber: string;
    qty: number;
  } | null>(null);

  // Subtab 1: Alertas de vencimiento
  const [expDays, setExpDays] = useState<30 | 60 | 90>(60);
  const [expStatusFilter, setExpStatusFilter] = useState<ExpiryStatusFilter>(() =>
    normalizeInitialFilter(initialStatusFilter),
  );
  const [expSearch, setExpSearch] = useState('');
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [isLoadingExp, setIsLoadingExp] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  // Subtab 2: Trazabilidad por lote
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productBatches, setProductBatches] = useState<PosProductBatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [traceabilityData, setTraceabilityData] =
    useState<BatchTraceabilityData | null>(null);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [pendingTraceBatchId, setPendingTraceBatchId] = useState<string | null>(
    null,
  );

  // Subtab 3: Pérdidas por vencimiento
  const [lossPeriod, setLossPeriod] = useState<PeriodType>('month');
  const [lossCustomFrom, setLossCustomFrom] = useState<string | undefined>();
  const [lossCustomTo, setLossCustomTo] = useState<string | undefined>();
  const [lossSearch, setLossSearch] = useState('');
  const [lossSourceFilter, setLossSourceFilter] =
    useState<LossSourceFilter>('ALL');
  const [writeOffItems, setWriteOffItems] = useState<ExpiredLossItem[]>([]);
  const [pendingBatches, setPendingBatches] = useState<ExpiredLossItem[]>([]);
  const [isLoadingLosses, setIsLoadingLosses] = useState(false);
  const [lossError, setLossError] = useState<string | null>(null);

  useEffect(() => {
    if (navTrigger === undefined) return;
    if (initialSubTab) setSubTab(initialSubTab);
    if (initialStatusFilter !== undefined) {
      setExpStatusFilter(normalizeInitialFilter(initialStatusFilter));
    }
  }, [navTrigger, initialSubTab, initialStatusFilter]);

  const productMap = useMemo(
    () => new Map<string, PosProductItem>(products.map((p) => [p.id, p])),
    [products],
  );

  const loadCatalogAndPolicies = useCallback(async () => {
    const [prods, pol] = await Promise.all([
      getPosProducts({ isActive: true }).catch(() => []),
      getPosPolicies().catch(() => null),
    ]);
    if (Array.isArray(prods)) setProducts(prods);
    if (pol) setPolicies(pol);
  }, []);

  useEffect(() => {
    loadCatalogAndPolicies();
  }, [loadCatalogAndPolicies]);

  // Carga Subtab 1: Alertas de vencimiento
  const loadExpiring = useCallback(async () => {
    setIsLoadingExp(true);
    setExpError(null);
    try {
      const res = await getPosExpiringBatches(expDays);
      setExpiringItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err: any) {
      setExpError(
        err?.response?.data?.message ||
          'No se pudieron cargar las alertas de vencimiento.',
      );
    } finally {
      setIsLoadingExp(false);
    }
  }, [expDays]);

  useEffect(() => {
    if (subTab === 'expirations') {
      loadExpiring();
    }
  }, [subTab, loadExpiring]);

  // Carga Subtab 2: Trazabilidad
  const batchProducts = useMemo(() => {
    return products.filter(
      (p) =>
        Boolean(p.tracksBatches || p.hasBatches || (p.batchesCount ?? 0) > 0) &&
        !p.isService &&
        p.type !== 'SERVICE',
    );
  }, [products]);

  useEffect(() => {
    if (!selectedProductId && batchProducts.length > 0) {
      setSelectedProductId(batchProducts[0].id);
    }
  }, [batchProducts, selectedProductId]);

  const loadProductBatches = useCallback(
    async (prodId: string, preferredBatchId?: string) => {
      if (!prodId) {
        setProductBatches([]);
        setSelectedBatchId('');
        return;
      }
      try {
        const res = await getPosProductBatches(prodId);
        const list = Array.isArray(res?.batches) ? res.batches : [];
        setProductBatches(list);
        if (preferredBatchId && list.some((b) => b.id === preferredBatchId)) {
          setSelectedBatchId(preferredBatchId);
        } else if (list.length > 0) {
          setSelectedBatchId((prev) =>
            prev && list.some((b) => b.id === prev) ? prev : list[0].id,
          );
        } else {
          setSelectedBatchId('');
          setTraceabilityData(null);
        }
      } catch {
        setProductBatches([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (subTab === 'traceability' && selectedProductId) {
      loadProductBatches(selectedProductId, pendingTraceBatchId || undefined);
    }
  }, [subTab, selectedProductId, pendingTraceBatchId, loadProductBatches]);

  const loadTraceability = useCallback(async (batchId: string) => {
    if (!batchId) {
      setTraceabilityData(null);
      return;
    }
    setIsLoadingTrace(true);
    setTraceError(null);
    try {
      const data = await getPosBatchTraceability({ batchId });
      setTraceabilityData(data);
    } catch (err: any) {
      setTraceError(
        err?.response?.data?.message ||
          'No se pudo obtener la trazabilidad de este lote.',
      );
    } finally {
      setIsLoadingTrace(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'traceability' && selectedBatchId) {
      loadTraceability(selectedBatchId);
    }
  }, [subTab, selectedBatchId, loadTraceability]);

  const jumpToTraceability = async (batchId: string, productId?: string) => {
    setPendingTraceBatchId(batchId);
    if (productId && productId !== selectedProductId) {
      setSelectedProductId(productId);
    } else if (productId) {
      await loadProductBatches(productId, batchId);
    } else {
      setSelectedBatchId(batchId);
    }
    setSubTab('traceability');
  };

  // Carga Subtab 3: Pérdidas por vencimiento
  const loadLosses = useCallback(async () => {
    setIsLoadingLosses(true);
    setLossError(null);
    try {
      let fromParam: string | undefined;
      let toParam: string | undefined;
      const now = new Date();

      if (lossPeriod === 'today') {
        fromParam = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();
      } else if (lossPeriod === 'week') {
        fromParam = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
      } else if (lossPeriod === 'month') {
        fromParam = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();
      } else if (lossPeriod === 'custom' && lossCustomFrom) {
        fromParam = new Date(`${lossCustomFrom}T00:00:00`).toISOString();
        if (lossCustomTo) {
          toParam = new Date(`${lossCustomTo}T23:59:59.999`).toISOString();
        }
      }

      const res = await getPosExpiredLossReport({
        from: fromParam,
        to: toParam,
      });

      const rawWriteOffs = Array.isArray(res?.data) ? res.data : [];
      const normalizedWriteOffs: ExpiredLossItem[] = rawWriteOffs.map((it) => {
        const prod = productMap.get(it.productId);
        const unitPrice = round2(Number(it.unitPrice ?? prod?.price ?? 0));
        const qty = Number(it.quantity || 0);
        return {
          ...it,
          productUnit: it.productUnit || prod?.unit || 'UND',
          productStock: it.productStock ?? Number(prod?.stock ?? 0),
          unitPrice,
          potentialRevenueLoss: round2(
            Number(it.potentialRevenueLoss ?? qty * unitPrice),
          ),
          source: it.source ?? 'WRITE_OFF',
        };
      });

      let resolvedPending: ExpiredLossItem[];
      if (Array.isArray(res?.pendingBatches)) {
        resolvedPending = res.pendingBatches.map((item) => ({
          ...item,
          source: 'EXPIRED_IN_STOCK' as const,
        }));
      } else {
        const expRes = await getPosExpiringBatches(30).catch(() => ({
          items: [],
        }));
        const upperYmd =
          lossPeriod === 'custom' && lossCustomTo ? lossCustomTo : null;
        const rawList: any[] = Array.isArray(expRes?.items) ? expRes.items : [];
        resolvedPending = rawList
          .filter((b) => {
            const qty = Number(b.quantity ?? 0);
            if (qty <= 0 || !isBatchExpiredDate(b.expiryDate)) return false;
            if (upperYmd) {
              const expYmd = extractDateYmd(b.expiryDate);
              if (expYmd && expYmd > upperYmd) return false;
            }
            return true;
          })
          .map((b) => {
            const pid = b.product?.id || '';
            const prod = productMap.get(pid);
            const qty = round3(Number(b.quantity ?? 0));
            const unitCost = round2(
              Number(b.unitCost ?? b.cost ?? b.product?.cost ?? prod?.cost ?? 0),
            );
            const unitPrice = round2(
              Number(b.product?.price ?? prod?.price ?? 0),
            );
            const days = getDaysToExpiry(b.expiryDate) ?? -1;
            return {
              id: `pending-batch-${b.id}`,
              date: b.expiryDate,
              productId: pid,
              productName: b.product?.name || prod?.name || 'Producto',
              productSku: b.product?.sku ?? prod?.sku ?? null,
              productUnit: prod?.unit || 'UND',
              productStock: Number(prod?.stock ?? qty),
              batchId: b.id,
              batchNumber: b.batchNumber,
              expiryDate: b.expiryDate,
              daysExpired: Math.abs(days),
              quantity: qty,
              unitCost,
              unitPrice,
              lossAmount: round2(qty * unitCost),
              potentialRevenueLoss: round2(qty * unitPrice),
              reason: 'Lote vencido en inventario (pendiente de dar de baja)',
              userName: null,
              source: 'EXPIRED_IN_STOCK' as const,
            };
          });
      }

      setWriteOffItems(normalizedWriteOffs);
      setPendingBatches(resolvedPending);
    } catch (err: any) {
      setLossError(
        err?.response?.data?.message ||
          'No se pudieron consultar las pérdidas por vencimiento.',
      );
    } finally {
      setIsLoadingLosses(false);
    }
  }, [lossPeriod, lossCustomFrom, lossCustomTo, productMap]);

  useEffect(() => {
    if (subTab === 'losses') {
      loadLosses();
    }
  }, [subTab, loadLosses]);

  // Cálculos Subtab 1 (Alertas)
  const expNormalized = useMemo(() => {
    return expiringItems.map((b) => {
      const info = getBatchStatusInfo(b.expiryDate);
      const qty = round3(Number(b.quantity ?? 0));
      const unitCost = round2(
        Number(b.unitCost ?? b.cost ?? b.product?.cost ?? 0),
      );
      const investment = round2(qty * unitCost);
      const bucket: ExpiryStatusFilter = !b.expiryDate
        ? 'NO_DATE'
        : info.isExpired || b.status === 'VENCIDO'
          ? 'EXPIRED'
          : (info.daysToExpiry ?? 999) <= 30 || b.status === 'CRITICO'
            ? 'CRITICAL'
            : 'UPCOMING';
      return {
        ...b,
        qty,
        unitCost,
        investment,
        bucket,
        daysToExpiry: info.daysToExpiry,
      };
    });
  }, [expiringItems]);

  const expKpis = useMemo(() => {
    let expCount = 0;
    let expUnits = 0;
    let expCost = 0;
    let critCount = 0;
    let critUnits = 0;
    let critCost = 0;
    let upCount = 0;
    let upCost = 0;
    let noDateCount = 0;

    for (const it of expNormalized) {
      if (it.bucket === 'EXPIRED') {
        expCount++;
        expUnits = round3(expUnits + it.qty);
        expCost = round2(expCost + it.investment);
      } else if (it.bucket === 'CRITICAL') {
        critCount++;
        critUnits = round3(critUnits + it.qty);
        critCost = round2(critCost + it.investment);
      } else if (it.bucket === 'UPCOMING') {
        upCount++;
        upCost = round2(upCost + it.investment);
      } else if (it.bucket === 'NO_DATE') {
        noDateCount++;
      }
    }

    return {
      expCount,
      expUnits,
      expCost,
      critCount,
      critUnits,
      critCost,
      upCount,
      upCost,
      noDateCount,
    };
  }, [expNormalized]);

  const filteredExpItems = useMemo(() => {
    const q = expSearch.toLowerCase().trim();
    return expNormalized.filter((it) => {
      if (expStatusFilter !== 'ALL' && it.bucket !== expStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(it.product?.name || '').toLowerCase().includes(q) ||
        String(it.product?.sku || '').toLowerCase().includes(q) ||
        String(it.batchNumber || '').toLowerCase().includes(q)
      );
    });
  }, [expNormalized, expStatusFilter, expSearch]);

  // Cálculos Subtab 2 (Trazabilidad)
  const resolvedTrace = useMemo(() => {
    if (!traceabilityData) return null;
    return resolveTraceabilityMetrics(traceabilityData, productBatches);
  }, [traceabilityData, productBatches]);

  // Cálculos Subtab 3 (Pérdidas)
  const allLosses = useMemo(
    () => [...pendingBatches, ...writeOffItems],
    [pendingBatches, writeOffItems],
  );

  const filteredLosses = useMemo(() => {
    const q = lossSearch.toLowerCase().trim();
    return allLosses.filter((it) => {
      if (lossSourceFilter !== 'ALL' && it.source !== lossSourceFilter) {
        return false;
      }
      if (!q) return true;
      return (
        it.productName.toLowerCase().includes(q) ||
        String(it.batchNumber || '').toLowerCase().includes(q) ||
        String(it.productSku || '').toLowerCase().includes(q) ||
        String(it.reason || '').toLowerCase().includes(q)
      );
    });
  }, [allLosses, lossSourceFilter, lossSearch]);

  const lossKpis = useMemo(() => {
    const pendingUnits = round3(
      pendingBatches.reduce((s, it) => s + Number(it.quantity || 0), 0),
    );
    const pendingLoss = round2(
      pendingBatches.reduce((s, it) => s + Number(it.lossAmount || 0), 0),
    );
    const pendingRev = round2(
      pendingBatches.reduce(
        (s, it) =>
          s +
          Number(
            it.potentialRevenueLoss ??
              Number(it.quantity || 0) * Number(it.unitPrice || 0),
          ),
        0,
      ),
    );
    const woUnits = round3(
      writeOffItems.reduce((s, it) => s + Number(it.quantity || 0), 0),
    );
    const woLoss = round2(
      writeOffItems.reduce((s, it) => s + Number(it.lossAmount || 0), 0),
    );
    const woRev = round2(
      writeOffItems.reduce(
        (s, it) =>
          s +
          Number(
            it.potentialRevenueLoss ??
              Number(it.quantity || 0) * Number(it.unitPrice || 0),
          ),
        0,
      ),
    );

    return {
      combinedUnits: round3(pendingUnits + woUnits),
      combinedLoss: round2(pendingLoss + woLoss),
      pendingUnits,
      pendingLoss,
      pendingCount: pendingBatches.length,
      woUnits,
      woLoss,
      woCount: writeOffItems.length,
      combinedRevLoss: round2(pendingRev + woRev),
    };
  }, [pendingBatches, writeOffItems]);

  const openWriteOffModal = (params: {
    productId: string;
    productName: string;
    productSku?: string | null;
    unit?: string;
    stock?: number;
    batchId: string;
    batchNumber: string;
    qty: number;
  }) => {
    const fromMap = productMap.get(params.productId);
    const productObj: PosProductItem = fromMap || {
      id: params.productId,
      name: params.productName,
      sku: params.productSku || undefined,
      price: 0,
      stock: params.stock ?? params.qty,
      unit: params.unit || 'UND',
      tracksBatches: true,
      hasBatches: true,
    };
    setAdjustTarget({
      product: productObj,
      batchId: params.batchId,
      batchNumber: params.batchNumber,
      qty: params.qty,
    });
  };

  const handleExportLossesCsv = () => {
    if (filteredLosses.length === 0) return;
    let csv = '\uFEFF';
    csv += 'REPORTE DE PÉRDIDAS POR VENCIMIENTO\n';
    csv +=
      'Estado,Fecha,Producto,SKU,Lote,Vencimiento,Unidades,Costo unit.,Pérdida al costo,Venta potencial perdida,Motivo\n';
    for (const it of filteredLosses) {
      const estado =
        it.source === 'EXPIRED_IN_STOCK' ? 'En stock sin baja' : 'Baja aplicada';
      const fecha =
        it.source === 'EXPIRED_IN_STOCK'
          ? formatCalendarDate(it.expiryDate)
          : formatManaguaDate(it.date);
      const rev = Number(
        it.potentialRevenueLoss ??
          Number(it.quantity || 0) * Number(it.unitPrice || 0),
      );
      csv += `"${estado}","${fecha}","${it.productName.replace(/"/g, '""')}","${it.productSku || ''}","${it.batchNumber || '—'}","${formatCalendarDate(it.expiryDate)}",${it.quantity},${it.unitCost},${it.lossAmount},${rev},"${String(it.notes || it.reason || '').replace(/"/g, '""')}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perdidas_vencimiento_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const refreshActiveSubTab = () => {
    loadCatalogAndPolicies();
    if (subTab === 'expirations') loadExpiring();
    else if (subTab === 'traceability' && selectedBatchId) {
      loadTraceability(selectedBatchId);
      if (selectedProductId) loadProductBatches(selectedProductId, selectedBatchId);
    } else if (subTab === 'losses') loadLosses();
  };

  return (
    <div className="space-y-4">
      {/* Sub-navegación de Lotes y vencimientos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            {
              id: 'expirations' as const,
              label: 'Alertas de vencimiento',
              icon: <HourglassMedium size={15} weight="bold" />,
            },
            {
              id: 'traceability' as const,
              label: 'Trazabilidad por lote',
              icon: <Tag size={15} weight="bold" />,
            },
            {
              id: 'losses' as const,
              label: 'Pérdidas por vencimiento',
              icon: <TrendDown size={15} weight="bold" />,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                subTab === t.id
                  ? 'bg-[#0F0F0F] text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={refreshActiveSubTab}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowsClockwise
            size={14}
            className={
              isLoadingExp || isLoadingTrace || isLoadingLosses
                ? 'animate-spin'
                : ''
            }
          />
          <span>Actualizar</span>
        </button>
      </div>

      {/* SUBTAB 1: ALERTAS DE VENCIMIENTO */}
      {subTab === 'expirations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-red-800 uppercase">
                Vencidos en stock
              </span>
              <p className="text-lg font-black text-red-700 font-mono whitespace-nowrap">
                {formatCurrency(expKpis.expCost, currency)}
              </p>
              <p className="text-xs text-red-700">
                {expKpis.expCount} {expKpis.expCount === 1 ? 'lote' : 'lotes'} ·{' '}
                {round3(expKpis.expUnits)} UND sin poder vender
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-amber-900 uppercase">
                Críticos (≤ 30 días)
              </span>
              <p className="text-lg font-black text-amber-800 font-mono whitespace-nowrap">
                {formatCurrency(expKpis.critCost, currency)}
              </p>
              <p className="text-xs text-amber-800">
                {expKpis.critCount} {expKpis.critCount === 1 ? 'lote' : 'lotes'}{' '}
                · {round3(expKpis.critUnits)} UND
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-gray-600 uppercase">
                Próximos (31–60 días)
              </span>
              <p className="text-lg font-black text-gray-900 font-mono whitespace-nowrap">
                {formatCurrency(expKpis.upCost, currency)}
              </p>
              <p className="text-xs text-gray-600">
                {expKpis.upCount} {expKpis.upCount === 1 ? 'lote' : 'lotes'}{' '}
                en horizonte de rotación
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-gray-600 uppercase">
                Sin fecha de vencimiento
              </span>
              <p className="text-lg font-black text-gray-900 font-mono">
                {expKpis.noDateCount}
              </p>
              <p className="text-xs text-gray-600">
                Completá fechas para activar FEFO
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlass
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                  placeholder="Buscar producto, SKU o lote..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-gray-900"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
                {([30, 60, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExpDays(d)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      expDays === d
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'EXPIRED', label: `Vencidos (${expKpis.expCount})` },
                  { id: 'CRITICAL', label: `Críticos (${expKpis.critCount})` },
                  { id: 'UPCOMING', label: `Próximos (${expKpis.upCount})` },
                  { id: 'NO_DATE', label: `Sin fecha (${expKpis.noDateCount})` },
                ] as Array<{ id: ExpiryStatusFilter; label: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setExpStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    expStatusFilter === f.id
                      ? 'bg-[#0F0F0F] text-white'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {expError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <WarningCircle size={18} className="shrink-0 text-red-600" />
              <span>{expError}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-x-auto">
            {isLoadingExp ? (
              <div className="p-10 text-center text-xs text-gray-500">
                Cargando lotes y vencimientos...
              </div>
            ) : filteredExpItems.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle size={30} className="text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-gray-900">
                  Sin lotes en esta vista
                </p>
                <p className="text-xs text-gray-500">
                  No hay lotes que coincidan con los filtros seleccionados.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Lote</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Existencia</th>
                    <th className="py-3 px-4 text-right">Costo unit.</th>
                    <th className="py-3 px-4 text-right">Inversión / Riesgo</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpItems.map((it) => {
                    const meta = getBatchStatusMeta(it.status, it.expiryDate);
                    const unit = productMap.get(it.product?.id)?.unit || 'UND';
                    return (
                      <tr key={it.id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {it.product?.name || 'Producto'}
                          </div>
                          {it.product?.sku && (
                            <div className="text-xs text-gray-500 font-mono">
                              SKU: {it.product.sku}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold bg-gray-100 text-gray-900 px-2 py-0.5 rounded">
                            {it.batchNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                          {it.expiryDate
                            ? formatCalendarDate(it.expiryDate)
                            : 'Sin fecha'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}
                            />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatQuantity(it.qty, unit)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          {formatCurrency(it.unitCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(it.investment, currency)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setBatchToEdit({
                                  id: it.id,
                                  batchNumber: it.batchNumber,
                                  expiryDate: it.expiryDate,
                                  quantity: it.qty,
                                  productName: it.product?.name,
                                  unit,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PencilSimple size={13} weight="bold" />
                              <span>{it.expiryDate ? 'Editar' : 'Fecha'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                jumpToTraceability(it.id, it.product?.id)
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Ver trazabilidad e inversión del lote"
                            >
                              <Eye size={13} weight="bold" />
                              <span>Trazabilidad</span>
                            </button>

                            {it.bucket === 'EXPIRED' && it.qty > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  openWriteOffModal({
                                    productId: it.product?.id,
                                    productName: it.product?.name || 'Producto',
                                    productSku: it.product?.sku,
                                    unit,
                                    batchId: it.id,
                                    batchNumber: it.batchNumber,
                                    qty: it.qty,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash size={13} weight="bold" />
                                <span>Dar de baja</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TRAZABILIDAD POR LOTE */}
      {subTab === 'traceability' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-2xs">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                1. Seleccionar producto con lotes
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setPendingTraceBatchId(null);
                  setSelectedProductId(e.target.value);
                }}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-900"
              >
                {batchProducts.length === 0 ? (
                  <option value="">No hay productos con control de lotes</option>
                ) : (
                  batchProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''} · Stock: {p.stock ?? 0}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                2. Seleccionar lote
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setPendingTraceBatchId(null);
                  setSelectedBatchId(e.target.value);
                }}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-900"
              >
                {productBatches.length === 0 ? (
                  <option value="">Este producto no tiene lotes registrados</option>
                ) : (
                  productBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Lote {b.batchNumber} ·{' '}
                      {b.expiryDate
                        ? `Vence ${formatCalendarDate(b.expiryDate)}`
                        : 'Sin fecha'}{' '}
                      · Cant: {b.quantity}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {traceError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <WarningCircle size={18} className="shrink-0 text-red-600" />
              <span>{traceError}</span>
            </div>
          )}

          {isLoadingTrace ? (
            <div className="p-10 bg-white rounded-2xl border border-gray-200/80 text-center text-xs text-gray-500">
              Calculando trazabilidad financiera y balance del lote...
            </div>
          ) : !traceabilityData || !resolvedTrace ? (
            <div className="p-10 bg-white rounded-2xl border border-gray-200/80 text-center space-y-2">
              <Package size={32} className="text-gray-400 mx-auto" />
              <p className="text-sm font-bold text-gray-900">
                Seleccioná un lote para ver su historial
              </p>
              <p className="text-xs text-gray-500">
                Visualizarás compra de origen, inversión, ventas realizadas y pérdidas por vencimiento.
              </p>
            </div>
          ) : (
            <>
              {/* Ficha y alerta si está vencido en stock */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                        Ficha del lote
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          resolvedTrace.isExpired
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {resolvedTrace.isExpired
                          ? `VENCIDO (${Math.abs(resolvedTrace.daysToExpiry ?? 0)} d)`
                          : resolvedTrace.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mt-1.5">
                      {traceabilityData.batch.product.name} · Lote{' '}
                      <span className="font-mono">
                        {traceabilityData.batch.batchNumber}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Vencimiento:{' '}
                      <strong className="text-gray-900">
                        {formatCalendarDate(traceabilityData.batch.expiryDate)}
                      </strong>{' '}
                      · Costo unitario:{' '}
                      <strong className="font-mono whitespace-nowrap">
                        {formatCurrency(resolvedTrace.unitCost, currency)}
                      </strong>{' '}
                      · Precio venta:{' '}
                      <strong className="font-mono whitespace-nowrap">
                        {formatCurrency(resolvedTrace.unitPrice, currency)}
                      </strong>
                    </p>
                  </div>

                  {traceabilityData.batch.purchase ? (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-gray-800">
                        <Truck size={15} />
                        <span>
                          Compra {traceabilityData.batch.purchase.invoiceNumber}
                        </span>
                      </div>
                      <p className="text-gray-600">
                        {traceabilityData.batch.purchase.supplierName ||
                          'Proveedor no especificado'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                      Inventario inicial / ajuste directo
                    </div>
                  )}
                </div>

                {resolvedTrace.isExpired && resolvedTrace.currentBalance > 0 && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-2 text-xs text-red-900">
                      <WarningCircle
                        size={18}
                        weight="fill"
                        className="text-red-600 shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="font-bold">
                          Este lote está vencido y aún tiene{' '}
                          {formatQuantity(
                            resolvedTrace.currentBalance,
                            traceabilityData.batch.product.unit,
                          )}{' '}
                          en stock contable
                        </p>
                        <p className="text-red-800">
                          Representa una pérdida retenida de{' '}
                          <strong className="font-mono whitespace-nowrap">
                            {formatCurrency(
                              resolvedTrace.financials.pendingExpiredLossAmount,
                              currency,
                            )}
                          </strong>{' '}
                          al costo.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openWriteOffModal({
                          productId: traceabilityData.batch.product.id,
                          productName: traceabilityData.batch.product.name,
                          productSku: traceabilityData.batch.product.sku,
                          unit: traceabilityData.batch.product.unit,
                          batchId: traceabilityData.batch.id,
                          batchNumber: traceabilityData.batch.batchNumber,
                          qty: resolvedTrace.currentBalance,
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash size={14} weight="bold" />
                      <span>Dar de baja lote vencido</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inversión del lote y resumen de producto */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase">
                    <CurrencyDollar size={16} className="text-emerald-600" />
                    <span>Inversión y pérdida del lote</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                      <span className="text-gray-500 block">
                        Capital invertido inicial
                      </span>
                      <span className="font-mono font-bold text-sm text-gray-900 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.financials.initialInvestedCost,
                          currency,
                        )}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                      <span className="text-gray-500 block">
                        Inversión actual en stock
                      </span>
                      <span className="font-mono font-bold text-sm text-gray-900 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.financials.currentInvestedCost,
                          currency,
                        )}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                      <span className="text-red-700 block font-semibold">
                        Pérdida total por vencimiento
                      </span>
                      <span className="font-mono font-bold text-sm text-red-700 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.financials.totalExpiredLossAmount,
                          currency,
                        )}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                      <span className="text-amber-800 block font-semibold">
                        Ingreso potencial perdido
                      </span>
                      <span className="font-mono font-bold text-sm text-amber-900 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.financials.potentialRevenueLost,
                          currency,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase">
                    <Coins size={16} className="text-purple-600" />
                    <span>Inversión acumulada en el producto</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-emerald-800 block font-semibold">
                        Inversión vigente vendible
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-900 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.productInvestment.sellableInvestedCost,
                          currency,
                        )}
                      </span>
                      <span className="text-xs text-emerald-700 block">
                        {round3(resolvedTrace.productInvestment.sellableStock)}{' '}
                        {traceabilityData.batch.product.unit}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                      <span className="text-red-800 block font-semibold">
                        Inversión vencida en producto
                      </span>
                      <span className="font-mono font-bold text-sm text-red-700 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.productInvestment.expiredInvestedCost,
                          currency,
                        )}
                      </span>
                      <span className="text-xs text-red-700 block">
                        {round3(resolvedTrace.productInvestment.expiredStock)}{' '}
                        {traceabilityData.batch.product.unit}
                      </span>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                      <span className="text-gray-600 font-semibold">
                        Capital total invertido actualmente (
                        {resolvedTrace.productInvestment.activeBatchCount}{' '}
                        lotes activos)
                      </span>
                      <span className="font-mono font-bold text-sm text-gray-900 whitespace-nowrap">
                        {formatCurrency(
                          resolvedTrace.productInvestment.totalInvestedCost,
                          currency,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance de movimientos */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-gray-800">
                    Balance y cuadre de movimientos
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    Recibido − Ventas + Devoluciones − Bajas ± Ajustes = Saldo actual
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                    <span className="text-blue-700 font-semibold block">
                      Entradas (+)
                    </span>
                    <span className="text-base font-bold text-blue-900 font-mono">
                      {traceabilityData.totals.totalReceived}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-emerald-700 font-semibold block">
                      Ventas (−)
                    </span>
                    <span className="text-base font-bold text-emerald-900 font-mono">
                      {traceabilityData.totals.totalSold}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                    <span className="text-amber-700 font-semibold block">
                      Devoluciones (+)
                    </span>
                    <span className="text-base font-bold text-amber-900 font-mono">
                      {traceabilityData.totals.totalReturned}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50/60 border border-red-200">
                    <span className="text-red-700 font-semibold block">
                      Bajas vencidas (−)
                    </span>
                    <span className="text-base font-bold text-red-800 font-mono">
                      {traceabilityData.totals.totalExpired}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-600 font-semibold block">
                      Ajustes (±)
                    </span>
                    <span className="text-base font-bold text-gray-900 font-mono">
                      {traceabilityData.totals.totalAdjusted}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
                    <span className="text-purple-700 font-semibold block">
                      Saldo actual (=)
                    </span>
                    <span className="text-base font-bold text-purple-900 font-mono">
                      {traceabilityData.totals.currentBalance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ventas del lote */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <ShoppingCart size={16} />
                  <span>
                    Ventas realizadas con este lote (
                    {traceabilityData.sales.length})
                  </span>
                </div>
                {traceabilityData.sales.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    No se han registrado ventas con este lote.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                          <th className="py-2.5 px-3">Comprobante</th>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Cajero</th>
                          <th className="py-2.5 px-3 text-right">Cant.</th>
                          <th className="py-2.5 px-3 text-right">Precio</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {traceabilityData.sales.map((s) => (
                          <tr key={`${s.saleId}-${s.date}`}>
                            <td className="py-2 px-3 font-mono font-semibold text-gray-900">
                              {s.invoiceNumber}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {formatManaguaDate(s.date)}
                            </td>
                            <td className="py-2 px-3">
                              {s.cashierName || '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {s.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                              {formatCurrency(s.unitPrice, currency)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold whitespace-nowrap">
                              {formatCurrency(
                                round2(Number(s.quantity) * Number(s.unitPrice)),
                                currency,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 3: PÉRDIDAS POR VENCIMIENTO */}
      {subTab === 'losses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-red-800 uppercase">
                Pérdida total por vencimiento
              </span>
              <p className="text-lg font-black text-red-700 font-mono whitespace-nowrap">
                {formatCurrency(lossKpis.combinedLoss, currency)}
              </p>
              <p className="text-xs text-red-700">
                {lossKpis.combinedUnits} unidades acumuladas
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-red-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-gray-700 uppercase">
                En stock (sin dar de baja)
              </span>
              <p className="text-lg font-black text-red-700 font-mono whitespace-nowrap">
                {formatCurrency(lossKpis.pendingLoss, currency)}
              </p>
              <p className="text-xs text-gray-600">
                {lossKpis.pendingCount}{' '}
                {lossKpis.pendingCount === 1 ? 'lote' : 'lotes'} ·{' '}
                {lossKpis.pendingUnits} UND vencidas
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-gray-600 uppercase">
                Bajas registradas (EXPIRED)
              </span>
              <p className="text-lg font-black text-gray-900 font-mono whitespace-nowrap">
                {formatCurrency(lossKpis.woLoss, currency)}
              </p>
              <p className="text-xs text-gray-600">
                {lossKpis.woCount}{' '}
                {lossKpis.woCount === 1 ? 'registro' : 'registros'} ·{' '}
                {lossKpis.woUnits} UND
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-amber-900 uppercase">
                Venta potencial perdida
              </span>
              <p className="text-lg font-black text-amber-900 font-mono whitespace-nowrap">
                {formatCurrency(lossKpis.combinedRevLoss, currency)}
              </p>
              <p className="text-xs text-amber-800">
                Valor al precio de venta al público
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <PeriodSelector
                period={lossPeriod}
                from={lossCustomFrom}
                to={lossCustomTo}
                onChange={(p, f, t) => {
                  setLossPeriod(p);
                  setLossCustomFrom(f);
                  setLossCustomTo(t);
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={lossSearch}
                    onChange={(e) => setLossSearch(e.target.value)}
                    placeholder="Buscar producto o lote..."
                    className="pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-gray-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportLossesCsv}
                  disabled={filteredLosses.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  <FileCsv size={15} weight="bold" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
              {(
                [
                  { id: 'ALL', label: `Todos (${allLosses.length})` },
                  {
                    id: 'EXPIRED_IN_STOCK',
                    label: `En stock sin baja (${pendingBatches.length})`,
                  },
                  {
                    id: 'WRITE_OFF',
                    label: `Bajas aplicadas (${writeOffItems.length})`,
                  },
                ] as Array<{ id: LossSourceFilter; label: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLossSourceFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    lossSourceFilter === f.id
                      ? 'bg-[#0F0F0F] text-white'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {lossError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <WarningCircle size={18} className="shrink-0 text-red-600" />
              <span>{lossError}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-x-auto">
            {isLoadingLosses ? (
              <div className="p-10 text-center text-xs text-gray-500">
                Calculando pérdidas y lotes vencidos en stock...
              </div>
            ) : filteredLosses.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle size={30} className="text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-gray-900">
                  No se registraron pérdidas por vencimiento en este período
                </p>
                <p className="text-xs text-gray-500">
                  Todos los productos rotaron adecuadamente antes de caducar.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Producto / Lote</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4 text-right">Unidades</th>
                    <th className="py-3 px-4 text-right">Costo unit.</th>
                    <th className="py-3 px-4 text-right">Pérdida (inversión)</th>
                    <th className="py-3 px-4 text-right">Venta perdida</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLosses.map((it) => {
                    const isPending = it.source === 'EXPIRED_IN_STOCK';
                    const revLoss = Number(
                      it.potentialRevenueLoss ??
                        Number(it.quantity || 0) * Number(it.unitPrice || 0),
                    );
                    return (
                      <tr key={it.id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              En stock (sin baja)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                              Baja aplicada
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {it.productName}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            Lote: {it.batchNumber || '—'}
                            {it.productSku ? ` · ${it.productSku}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                          {it.expiryDate
                            ? formatCalendarDate(it.expiryDate)
                            : formatManaguaDate(it.date)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatQuantity(it.quantity, it.productUnit || 'UND')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          {formatCurrency(it.unitCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-700 whitespace-nowrap">
                          {formatCurrency(it.lossAmount, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-800 whitespace-nowrap">
                          {formatCurrency(revLoss, currency)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {it.batchId && (
                              <button
                                type="button"
                                onClick={() =>
                                  jumpToTraceability(it.batchId!, it.productId)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={13} weight="bold" />
                                <span>Trazabilidad</span>
                              </button>
                            )}
                            {isPending && it.batchId && (
                              <button
                                type="button"
                                onClick={() =>
                                  openWriteOffModal({
                                    productId: it.productId,
                                    productName: it.productName,
                                    productSku: it.productSku,
                                    unit: it.productUnit || 'UND',
                                    stock: it.productStock ?? it.quantity,
                                    batchId: it.batchId!,
                                    batchNumber: it.batchNumber || 'SIN_LOTE',
                                    qty: it.quantity,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash size={13} weight="bold" />
                                <span>Dar de baja</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal edición de lote */}
      <EditBatchModal
        isOpen={Boolean(batchToEdit)}
        batch={batchToEdit}
        onClose={() => setBatchToEdit(null)}
        onSuccess={() => {
          setBatchToEdit(null);
          refreshActiveSubTab();
          useNotificationCenterStore
            .getState()
            .fetchNotifications(true)
            .catch(() => {});
        }}
      />

      {/* Modal dar de baja por vencimiento */}
      {adjustTarget && (
        <StockAdjustmentModal
          isOpen={Boolean(adjustTarget)}
          product={adjustTarget.product}
          businessTracksBatches={true}
          policies={policies}
          initialType="EXPIRED"
          initialBatchId={adjustTarget.batchId}
          initialBatchNumber={adjustTarget.batchNumber}
          initialQty={adjustTarget.qty}
          onClose={() => setAdjustTarget(null)}
          onSuccess={() => {
            setAdjustTarget(null);
            refreshActiveSubTab();
            useNotificationCenterStore
              .getState()
              .fetchNotifications(true)
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
};
