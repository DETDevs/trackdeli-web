import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  User as UserIcon,
  MagnifyingGlass,
  Fire,
  Scissors,
  Receipt,
  CreditCard,
  DoorOpen,
  Percent,
  Trash,
  Minus,
  Plus,
  NotePencil,
  Check,
  X,
  WifiSlash,
  WarningCircle,
  CircleNotch,
  CheckCircle,
  Printer,
} from '@phosphor-icons/react';
import {
  getMyBusiness,
  getPosCategories,
  getPosProducts,
  getPosTableOrder,
  getPosTableOrderRounds,
  openPosTableOrder,
  addPosTableOrderItems,
  updatePosTableOrderItem,
  deletePosTableOrderItem,
  voidPosTableOrderItem,
  sendPosTableOrderToKitchen,
  setPosTableOrderDiscount,
  cancelPosTableOrder,
  checkoutPosTableOrder,
  requestPosTableBill,
  getPosTableOrderBills,
  cancelPosTableBillRequest,
  type PosCategory,
  type PosProductItem,
  type PosTableOrder,
  type PosTableOrderItem,
  type PosKitchenRound,
  type PosTableSubAccount,
  type PosTableBill,
  type PosReceiptSettingsData,
  type RequestTableBillTipDto,
  type SaleResponse,
} from 'api-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { extractApiErrorMessage } from '../../utils/productCost';
import { isRestaurantSalonBusiness } from '../../utils/salonVertical';
import type { CalculatedSaleSummary } from '../../utils/saleCalculation';
import type { ReceiptBusinessInfo } from '../../utils/receiptPdf';
import { usePosWebAccess } from '../../hooks/usePosWebAccess';
import { usePosWebDevice, getStoredWebDeviceHeaders } from '../../hooks/usePosWebDevice';
import { usePosShift } from '../../hooks/usePosShift';
import { usePosPolicies } from '../../hooks/usePosPolicies';
import { ProductCard } from '../../components/pos/cobrar/ProductCard';
import { ShiftStatusBanner } from '../../components/pos/cobrar/ShiftStatusBanner';
import { OpenShiftModal } from '../../components/pos/cobrar/OpenShiftModal';
import {
  PaymentModal,
  type FinalPaymentSubmission,
} from '../../components/pos/cobrar/PaymentModal';
import { SaleSuccessView } from '../../components/pos/cobrar/SaleSuccessView';
import { VoidTableItemModal } from '../../components/pos/tables/VoidTableItemModal';
import { OrderDiscountModal } from '../../components/pos/tables/OrderDiscountModal';
import { CancelTableOrderModal } from '../../components/pos/tables/CancelTableOrderModal';
import { PreBillPrintModal } from '../../components/pos/tables/PreBillPrintModal';
import { SplitTableOrderModal } from '../../components/pos/tables/SplitTableOrderModal';
import { RequestBillModal } from '../../components/pos/tables/RequestBillModal';

const ORDER_POLLING_MS = 6000;

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

const formatTableTitle = (raw?: string | null): string => {
  const clean = String(raw || '').trim();
  if (!clean) return 'Mesa';
  return /^mesa\s+/i.test(clean) ? clean : `Mesa ${clean}`;
};

const formatElapsed = (openedAtIso: string | undefined, nowMs: number): string => {
  if (!openedAtIso) return 'Recién';
  const openedMs = new Date(openedAtIso).getTime();
  if (!Number.isFinite(openedMs)) return 'Recién';
  const diffMin = Math.max(0, Math.floor((nowMs - openedMs) / 60000));
  if (diffMin < 1) return 'Recién';
  if (diffMin < 60) return `${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return remMin > 0 ? `${hours} h ${remMin} min` : `${hours} h`;
};

const renderRoundPrintBadge = (round?: PosKitchenRound | null) => {
  if (!round || !round.printStatus || round.printStatus === 'NOT_REQUIRED') {
    return null;
  }
  if (round.printStatus === 'PENDING') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1 whitespace-nowrap">
        <Printer size={13} />
        <span>Pendiente de imprimir en cocina</span>
      </span>
    );
  }
  if (round.printStatus === 'PRINTED') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
        <CheckCircle size={13} weight="fill" />
        <span>Impresa en cocina</span>
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 inline-flex items-center gap-1 whitespace-nowrap">
      <Printer size={13} />
      <span>No impresa en cocina</span>
    </span>
  );
};

export const PosTableOrderPage: React.FC = () => {
  const { id: tableId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const branches = useAuthStore((s) => s.branches);
  const userRole = String(user?.role || '').toUpperCase();
  const isAllowedRole =
    userRole === 'ENCARGADO' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'CAJERO';

  const { data: business, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    enabled: userRole !== 'VENDEDOR' && isAllowedRole,
    staleTime: 60000,
    retry: false,
  });

  const isRestaurant = isRestaurantSalonBusiness(
    business,
    (user as any)?.business,
  );
  const canQuerySalon = isAllowedRole && isRestaurant && Boolean(tableId);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true,
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Hooks operativos compartidos con /pos/cobrar (dispositivo web, turno y políticas)
  const { webBillingEnabled, canCobrar } = usePosWebAccess();
  const {
    deviceHeaders,
    isRegistering: isRegisteringDevice,
    deviceError,
    handleDeviceApiError,
    retryRegistration,
  } = usePosWebDevice(Boolean(canQuerySalon && webBillingEnabled && canCobrar));
  const {
    isOpen: isShiftOpen,
    shiftId,
    cashierName,
    openedAt: shiftOpenedAt,
    openShift,
    isOpening: isOpeningShift,
    refetch: refetchShift,
  } = usePosShift(Boolean(canQuerySalon && webBillingEnabled && canCobrar));
  const {
    requireOpenShiftToSell,
    discountsEnabled,
    cashierMaxDiscountPercent,
    tipEnabled,
    tipDefaultPercent,
  } = usePosPolicies(Boolean(canQuerySalon));

  // Estado local de UI
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMutatingOrder, setIsMutatingOrder] = useState(false);

  // Notas inline para ítems sin enviar
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Modales 269c
  const [voidTargetItem, setVoidTargetItem] = useState<PosTableOrderItem | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [isVoidSubmitting, setIsVoidSubmitting] = useState(false);

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isDiscountSubmitting, setIsDiscountSubmitting] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  // Modales 269d / 267d
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [billModalTarget, setBillModalTarget] = useState<{
    subAccount: PosTableSubAccount | null;
    unsentCount: number;
  } | null>(null);
  const [activeBillPreview, setActiveBillPreview] = useState<{
    bill: PosTableBill;
    receiptSettings: PosReceiptSettingsData | null;
  } | null>(null);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [isCancellingBill, setIsCancellingBill] = useState(false);
  const [billRequestError, setBillRequestError] = useState<string | null>(null);

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutTargetSubAccount, setCheckoutTargetSubAccount] =
    useState<PosTableSubAccount | null>(null);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Venta completada (comprobante / siguiente subcuenta)
  const [completedCheckout, setCompletedCheckout] = useState<{
    sale: SaleResponse;
    allAccountsPaid: boolean;
  } | null>(null);

  // Idempotencia de envío a cocina y apertura de turno
  const sendKitchenRequestIdRef = useRef<string>('');
  const openShiftKeyRef = useRef<string>('');

  // Consultas principales
  const orderQuery = useQuery<PosTableOrder>({
    queryKey: ['pos', 'table-order', tableId],
    queryFn: () => getPosTableOrder(tableId!),
    enabled: canQuerySalon && isOnline && !completedCheckout,
    refetchInterval:
      canQuerySalon && isOnline && isTabVisible && !completedCheckout
        ? ORDER_POLLING_MS
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (count, err: any) => {
      if (err?.response?.status === 404) return false;
      return count < 1;
    },
  });

  const roundsQuery = useQuery<PosKitchenRound[]>({
    queryKey: ['pos', 'table-order-rounds', tableId],
    queryFn: () => getPosTableOrderRounds(tableId!),
    enabled: canQuerySalon && isOnline && Boolean(orderQuery.data?.id) && !completedCheckout,
    refetchInterval:
      canQuerySalon && isOnline && isTabVisible && Boolean(orderQuery.data?.id) && !completedCheckout
        ? ORDER_POLLING_MS
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const billsQuery = useQuery<PosTableBill[]>({
    queryKey: ['pos', 'table-order-bills', tableId, orderQuery.data?.id],
    queryFn: () =>
      getPosTableOrderBills(tableId!, { orderId: orderQuery.data?.id }),
    enabled:
      canQuerySalon &&
      isOnline &&
      Boolean(orderQuery.data?.id) &&
      !completedCheckout,
    refetchInterval:
      canQuerySalon &&
      isOnline &&
      isTabVisible &&
      Boolean(orderQuery.data?.id) &&
      !completedCheckout
        ? ORDER_POLLING_MS
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const categoriesQuery = useQuery<PosCategory[]>({
    queryKey: ['pos', 'categories'],
    queryFn: () => getPosCategories(),
    enabled: canQuerySalon && isOnline,
    staleTime: 60000,
  });

  const productsQuery = useQuery<PosProductItem[]>({
    queryKey: ['pos', 'products'],
    queryFn: () => getPosProducts(),
    enabled: canQuerySalon && isOnline,
    staleTime: 30000,
  });

  const refetchOrder = orderQuery.refetch;
  const refetchRounds = roundsQuery.refetch;
  const refetchBills = billsQuery.refetch;

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (visible && navigator.onLine && canQuerySalon && !completedCheckout) {
        setNowMs(Date.now());
        refetchOrder();
        refetchRounds();
        refetchBills();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setNowMs(Date.now());
      if (canQuerySalon && !completedCheckout) {
        refetchOrder();
        refetchRounds();
        refetchBills();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [canQuerySalon, completedCheckout, refetchOrder, refetchRounds, refetchBills]);

  useEffect(() => {
    if (!isTabVisible) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, [isTabVisible]);

  const order = orderQuery.data || null;
  const rounds = roundsQuery.data || [];
  const orderBills = billsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const products = productsQuery.data || [];
  const currency = (business as any)?.currency || 'NIO';

  const activeBillSubAccountIds = useMemo(() => {
    const ids = new Set<string>();
    orderBills.forEach((b) => {
      if (b.status === 'ACTIVE' && b.subAccountId) {
        ids.add(b.subAccountId);
      }
    });
    return ids;
  }, [orderBills]);

  const hasGeneralActiveBill = useMemo(
    () => orderBills.some((b) => b.status === 'ACTIVE' && !b.subAccountId),
    [orderBills],
  );

  // Filtrado de productos por categoría, nombre, SKU y código de barras
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId !== 'ALL') {
      list = list.filter((p) => p.categoryId === selectedCategoryId);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [products, selectedCategoryId, searchQuery]);

  // Cantidades totales en orden para mostrar badge en ProductCard
  const orderProductQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    (order?.items || []).forEach((it) => {
      map[it.productId] = round3((map[it.productId] || 0) + Number(it.quantity || 0));
    });
    return map;
  }, [order?.items]);

  // Agrupación de ítems: Sin enviar vs Ronda 1, Ronda 2...
  const unsentItems = useMemo(
    () => (order?.items || []).filter((it) => !it.kitchenRoundId),
    [order?.items],
  );

  const groupedSentRounds = useMemo(() => {
    const itemsByRoundId = new Map<string, PosTableOrderItem[]>();
    (order?.items || []).forEach((it) => {
      if (!it.kitchenRoundId) return;
      const arr = itemsByRoundId.get(it.kitchenRoundId) || [];
      arr.push(it);
      itemsByRoundId.set(it.kitchenRoundId, arr);
    });

    const roundMap = new Map<string, PosKitchenRound>();
    rounds.forEach((r) => roundMap.set(r.id, r));

    const groups: Array<{
      roundId: string;
      roundNumber: number;
      round: PosKitchenRound | null;
      items: PosTableOrderItem[];
    }> = [];

    const sortedRounds = [...rounds].sort((a, b) => a.number - b.number);
    sortedRounds.forEach((r) => {
      const roundItems = itemsByRoundId.get(r.id) || [];
      if (roundItems.length > 0 || r.type === 'VOID') {
        groups.push({
          roundId: r.id,
          roundNumber: r.number,
          round: r,
          items: roundItems,
        });
      }
      itemsByRoundId.delete(r.id);
    });

    // Respaldo defensivo si algún ítem enviado aún no tiene su ronda cargada
    itemsByRoundId.forEach((orphanItems, rid) => {
      groups.push({
        roundId: rid,
        roundNumber: groups.length + 1,
        round: roundMap.get(rid) || null,
        items: orphanItems,
      });
    });

    return groups;
  }, [order?.items, rounds]);

  const unsentToKitchenCount = useMemo(
    () =>
      unsentItems.filter((it) =>
        it.product ? it.product.sendToKitchen !== false : true,
      ).length,
    [unsentItems],
  );

  // Construir resumen de cálculo para PaymentModal usando montos del API
  const paymentCalcSummary = useMemo<CalculatedSaleSummary | undefined>(() => {
    if (!order) return undefined;
    const sub = checkoutTargetSubAccount
      ? Number(checkoutTargetSubAccount.subtotal || 0)
      : Number(order.subtotal || 0);
    const disc = checkoutTargetSubAccount
      ? Number(checkoutTargetSubAccount.discount || 0)
      : Number(order.discountTotal || 0);
    const tax = checkoutTargetSubAccount
      ? Number(checkoutTargetSubAccount.tax || 0)
      : Number(order.taxTotal || 0);
    const tot = checkoutTargetSubAccount
      ? Number(checkoutTargetSubAccount.total || 0)
      : Number(order.total || 0);
    const subBeforeTax = Math.max(0, Math.round((sub - disc) * 100) / 100);
    const rate = Number(order.taxRate || 0);

    return {
      taxModel: 'LEGACY',
      subtotal: sub,
      discountAmount: disc,
      lineDiscountTotal: 0,
      eligibleForGlobalDiscountSubtotal: sub,
      subtotalBeforeTax: subBeforeTax,
      listPriceTotal: 0,
      listDiscountTotal: 0,
      taxEnabled: rate > 0,
      taxIncluded: Boolean((business as any)?.taxIncluded),
      taxRate: rate,
      taxAmount: tax,
      total: tot,
      lines: [],
    };
  }, [order, checkoutTargetSubAccount, business]);

  const activeBranch = branches?.find((b) => b.id === user?.businessId);
  const businessInfo: ReceiptBusinessInfo = useMemo(() => {
    const b = business as any;
    return {
      name:
        completedCheckout?.sale?.business?.name ||
        activeBranch?.name ||
        b?.name ||
        'NEXOL POS',
      address:
        completedCheckout?.sale?.business?.address ||
        b?.posAddress ||
        b?.address ||
        null,
      phone:
        completedCheckout?.sale?.business?.phone ||
        b?.posPhone ||
        b?.whatsappNumber ||
        b?.phone ||
        null,
      taxId: completedCheckout?.sale?.business?.taxId || b?.taxId || null,
      logoUrl: completedCheckout?.sale?.business?.logoUrl || b?.logoUrl || null,
    };
  }, [completedCheckout, business, activeBranch]);

  // Guardas de acceso después de todos los hooks
  if (userRole === 'VENDEDOR') {
    return <Navigate to="/pos/quotes" replace />;
  }

  if (!isAllowedRole || !tableId) {
    return <Navigate to="/" replace />;
  }

  if (isLoadingBusiness && !business && !isRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px]">
        <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">
          Cargando configuración del salón...
        </p>
      </div>
    );
  }

  if (!isLoadingBusiness && !isRestaurant) {
    return (
      <Navigate
        to={userRole === 'CAJERO' ? '/pos/cobrar' : '/pos/dashboard'}
        replace
      />
    );
  }

  const syncOrderState = (updatedOrder: PosTableOrder) => {
    queryClient.setQueryData(['pos', 'table-order', tableId], updatedOrder);
    queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'status'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'salon', 'zones'] });
    queryClient.invalidateQueries({ queryKey: ['pos', 'table-order-bills', tableId] });
  };

  const refreshOrderAndRounds = async (): Promise<PosTableOrder | null> => {
    const [orderRes] = await Promise.all([
      orderQuery.refetch(),
      roundsQuery.refetch(),
      billsQuery.refetch(),
    ]);
    return orderRes.data || null;
  };

  const handleOpenShiftWithIdempotency = async (dto: any) => {
    if (!openShiftKeyRef.current) {
      openShiftKeyRef.current = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `shift-open-${Date.now()}`;
    }
    const res = await openShift({
      dto,
      deviceHeaders: {
        ...(getStoredWebDeviceHeaders(user?.businessId) || deviceHeaders || {}),
        'Idempotency-Key': openShiftKeyRef.current,
      },
    });
    openShiftKeyRef.current = '';
    return res;
  };

  const handleOrderMutationError = async (err: any, fallback: string) => {
    const code = err?.response?.data?.code;
    if (code === 'SPLIT_VERSION_CONFLICT') {
      toast('La cuenta cambió, la actualizamos');
      await refreshOrderAndRounds();
      return;
    }
    if (err?.response?.data?.message === 'AUTHORIZATION_REQUIRED') {
      toast.error('Este producto ya se envió a cocina. Usá "Anular" para quitarlo.');
      await refreshOrderAndRounds();
      return;
    }
    toast.error(extractApiErrorMessage(err, fallback));
  };

  // Agregar producto desde tarjeta o Enter en búsqueda
  const handleAddProduct = async (product: PosProductItem) => {
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para modificar la cuenta.');
      return;
    }
    if (isMutatingOrder) return;
    setIsMutatingOrder(true);
    try {
      const updated = await addPosTableOrderItems(tableId, {
        items: [{ productId: product.id, quantity: 1 }],
      });
      syncOrderState(updated);
      sendKitchenRequestIdRef.current = '';
    } catch (err) {
      await handleOrderMutationError(err, 'No se pudo agregar el producto.');
    } finally {
      setIsMutatingOrder(false);
    }
  };

  const handleDecrementFromProductCard = async (product: PosProductItem) => {
    if (!order || isMutatingOrder) return;
    const unsentMatch = [...(order.items || [])]
      .reverse()
      .find((it) => it.productId === product.id && !it.kitchenRoundId);

    if (unsentMatch) {
      await handleUpdateUnsentQty(unsentMatch, round3(Number(unsentMatch.quantity) - 1));
      return;
    }

    const sentMatch = (order.items || []).find(
      (it) => it.productId === product.id && Boolean(it.kitchenRoundId),
    );
    if (sentMatch) {
      setVoidError(null);
      setVoidTargetItem(sentMatch);
    }
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const exact = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === q) ||
        (p.sku && p.sku.toLowerCase() === q),
    );
    if (exact) {
      e.preventDefault();
      setSearchQuery('');
      await handleAddProduct(exact);
    }
  };

  const handleUpdateUnsentQty = async (item: PosTableOrderItem, nextQty: number) => {
    if (!isOnline || isMutatingOrder) return;
    setIsMutatingOrder(true);
    try {
      const updated =
        nextQty <= 0
          ? await deletePosTableOrderItem(tableId, item.id)
          : await updatePosTableOrderItem(tableId, item.id, { quantity: nextQty });
      syncOrderState(updated);
    } catch (err) {
      await handleOrderMutationError(err, 'No se pudo actualizar la cantidad.');
    } finally {
      setIsMutatingOrder(false);
    }
  };

  const handleSaveNote = async (item: PosTableOrderItem) => {
    if (!isOnline || isMutatingOrder) return;
    setIsMutatingOrder(true);
    try {
      const updated = await updatePosTableOrderItem(tableId, item.id, {
        quantity: item.quantity,
        notes: editingNoteText.trim(),
      });
      syncOrderState(updated);
      setEditingNoteItemId(null);
      setEditingNoteText('');
    } catch (err) {
      await handleOrderMutationError(err, 'No se pudo guardar la nota.');
    } finally {
      setIsMutatingOrder(false);
    }
  };

  const handleDeleteUnsentItem = async (item: PosTableOrderItem) => {
    if (!isOnline || isMutatingOrder) return;
    setIsMutatingOrder(true);
    try {
      const updated = await deletePosTableOrderItem(tableId, item.id);
      syncOrderState(updated);
    } catch (err) {
      await handleOrderMutationError(err, 'No se pudo quitar el producto.');
    } finally {
      setIsMutatingOrder(false);
    }
  };

  // Enviar a cocina
  const handleSendToKitchen = async () => {
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para enviar a cocina.');
      return;
    }
    if (isMutatingOrder || unsentToKitchenCount === 0) return;

    if (!sendKitchenRequestIdRef.current) {
      sendKitchenRequestIdRef.current = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `kitch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    setIsMutatingOrder(true);
    try {
      const res = await sendPosTableOrderToKitchen(tableId, {
        clientRequestId: sendKitchenRequestIdRef.current,
      });
      sendKitchenRequestIdRef.current = '';
      syncOrderState(res.tableOrder);
      await roundsQuery.refetch();
      toast.success(`Ronda ${res.round.number} enviada a cocina`);
    } catch (err) {
      const msg = extractApiErrorMessage(err, 'No se pudo enviar a cocina.');
      if (msg.includes('NOTHING_TO_SEND')) {
        toast('No hay productos pendientes de cocina.');
        await refreshOrderAndRounds();
      } else {
        toast.error(msg);
      }
    } finally {
      setIsMutatingOrder(false);
    }
  };

  // Anular renglón enviado
  const handleConfirmVoid = async (payload: { qty: number; reason: string }) => {
    if (!voidTargetItem || isVoidSubmitting) return;
    setIsVoidSubmitting(true);
    setVoidError(null);
    try {
      const headers = getStoredWebDeviceHeaders(user?.businessId) || deviceHeaders;
      const res = await voidPosTableOrderItem(
        tableId,
        voidTargetItem.id,
        payload,
        headers,
      );
      syncOrderState(res.tableOrder);
      await roundsQuery.refetch();
      setVoidTargetItem(null);
      toast.success('Producto anulado');
    } catch (err) {
      setVoidError(extractApiErrorMessage(err, 'No se pudo anular el producto.'));
    } finally {
      setIsVoidSubmitting(false);
    }
  };

  // Descuento general
  const handleApplyDiscount = async (dto: {
    discountPercent?: number;
    discountAmount?: number;
  }) => {
    if (isDiscountSubmitting) return;
    setIsDiscountSubmitting(true);
    setDiscountError(null);
    try {
      const updated = await setPosTableOrderDiscount(tableId, dto);
      syncOrderState(updated);
      setIsDiscountModalOpen(false);
      toast.success(
        (dto.discountPercent || 0) === 0 && (dto.discountAmount || 0) === 0
          ? 'Descuento quitado'
          : 'Descuento aplicado',
      );
    } catch (err) {
      setDiscountError(extractApiErrorMessage(err, 'No se pudo aplicar el descuento.'));
    } finally {
      setIsDiscountSubmitting(false);
    }
  };

  // Liberar mesa sin cobro (exige WebBillingGuard)
  const handleConfirmCancelOrder = async (reason?: string) => {
    if (isCancelSubmitting) return;
    if (!webBillingEnabled) {
      setCancelError(
        'El cobro web no está habilitado para este negocio. Pedile al administrador habilitarlo para liberar mesas desde la web.',
      );
      return;
    }

    const activeHeaders = getStoredWebDeviceHeaders(user?.businessId) || deviceHeaders;
    if (!activeHeaders?.['X-Device-Id'] || !activeHeaders?.['X-Device-Secret']) {
      setCancelError(
        deviceError?.message ||
          'Este navegador no está registrado como dispositivo web autorizado.',
      );
      return;
    }

    setIsCancelSubmitting(true);
    setCancelError(null);
    try {
      await cancelPosTableOrder(tableId, reason ? { reason } : {}, activeHeaders);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pos', 'salon', 'zones'] }),
      ]);
      queryClient.removeQueries({ queryKey: ['pos', 'table-order', tableId] });
      toast.success('Mesa liberada');
      navigate('/pos/tables');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (handleDeviceApiError(err)) {
        setCancelError(extractApiErrorMessage(err, 'Dispositivo web no autorizado.'));
        return;
      }
      if (err?.response?.status === 403) {
        setCancelError(
          extractApiErrorMessage(
            err,
            'No tenés permiso o falta activar el cobro web para liberar esta mesa.',
          ),
        );
        return;
      }
      if (code === 'SPLIT_HAS_PAID_ACCOUNTS') {
        setCancelError(
          'No se puede liberar esta mesa porque ya tiene subcuentas pagadas.',
        );
        return;
      }
      setCancelError(extractApiErrorMessage(err, 'No se pudo liberar la mesa.'));
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  // Preparar cobro recargando orden primero (#269d requisito 4)
  const ensureWebBillingAndShiftReady = (): boolean => {
    if (!webBillingEnabled) {
      toast.error('El cobro web no está habilitado para este negocio.');
      return false;
    }
    const activeHeaders = getStoredWebDeviceHeaders(user?.businessId) || deviceHeaders;
    if (!activeHeaders?.['X-Device-Id'] || !activeHeaders?.['X-Device-Secret']) {
      toast.error(
        deviceError?.message ||
          'Se requiere registrar este dispositivo web antes de cobrar.',
      );
      return false;
    }
    if (requireOpenShiftToSell && !isShiftOpen) {
      toast.error('Abrí tu turno de caja antes de cobrar.');
      setIsOpenShiftModalOpen(true);
      return false;
    }
    return true;
  };

  const handleOpenCheckoutFlow = async () => {
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para cobrar.');
      return;
    }
    if (!ensureWebBillingAndShiftReady()) return;

    const freshOrder = await refreshOrderAndRounds();
    if (!freshOrder) {
      toast.error('No se pudo actualizar la cuenta de la mesa.');
      return;
    }
    if ((freshOrder.items || []).length === 0) {
      toast.error('Agregá productos antes de cobrar.');
      return;
    }

    if (freshOrder.splitMode && (freshOrder.subAccounts || []).length > 0) {
      setIsSplitModalOpen(true);
      return;
    }

    setCheckoutTargetSubAccount(null);
    setCheckoutError(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenCheckoutForSubAccount = async (subAccount: PosTableSubAccount) => {
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para cobrar.');
      return;
    }
    if (!ensureWebBillingAndShiftReady()) return;

    const freshOrder = await refreshOrderAndRounds();
    if (!freshOrder) return;

    const freshSub = (freshOrder.subAccounts || []).find((sa) => sa.id === subAccount.id);
    if (!freshSub) {
      toast('La división de cuentas cambió. Revisá las subcuentas actualizadas.');
      return;
    }
    if (freshSub.status === 'PAID') {
      toast.error(`"${freshSub.label}" ya fue cobrada.`);
      return;
    }

    setIsSplitModalOpen(false);
    setCheckoutTargetSubAccount(freshSub);
    setCheckoutError(null);
    setIsPaymentModalOpen(true);
  };

  const createBillRequestId = (): string =>
    window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `bill-req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const countUnsentForTarget = (
    targetOrder: PosTableOrder,
    subAccount: PosTableSubAccount | null,
  ): number =>
    (targetOrder.items || []).filter((it) => {
      if (it.kitchenRoundId) return false;
      const sendToKitchen = it.product ? it.product.sendToKitchen !== false : true;
      if (!sendToKitchen) return false;
      if (subAccount && targetOrder.splitMode === 'ITEMS') {
        return it.subAccountId === subAccount.id;
      }
      return true;
    }).length;

  const executeRequestBill = async (
    subAccount: PosTableSubAccount | null,
    tip?: RequestTableBillTipDto,
  ) => {
    if (!isRestaurant || !tableId || isRequestingBill) return;
    setIsRequestingBill(true);
    setBillRequestError(null);
    try {
      const res = await requestPosTableBill(tableId, {
        ...(subAccount ? { subAccountId: subAccount.id } : {}),
        ...(tip ? { tip } : {}),
        clientRequestId: createBillRequestId(),
      });
      if (res.tableOrder) {
        syncOrderState(res.tableOrder);
      } else {
        await refreshOrderAndRounds();
      }
      await billsQuery.refetch();
      setBillModalTarget(null);
      setActiveBillPreview({
        bill: res.bill,
        receiptSettings: res.receiptSettings || null,
      });
      toast.success(
        res.isReprint
          ? `Cuenta reimpresa (#${res.bill.sequence})`
          : 'Cuenta pedida',
      );
    } catch (err: any) {
      const msg = extractApiErrorMessage(err, 'No se pudo generar la cuenta.');
      setBillRequestError(msg);
      toast.error(msg);
      await refreshOrderAndRounds();
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleStartBillRequest = async (
    subAccount: PosTableSubAccount | null = null,
    isReprintAction: boolean = false,
  ) => {
    if (!isRestaurant) return;
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para pedir la cuenta.');
      return;
    }
    if (isRequestingBill) return;

    if (isReprintAction) {
      await executeRequestBill(subAccount, undefined);
      return;
    }

    const freshOrder = await refreshOrderAndRounds();
    if (!freshOrder) return;

    if ((freshOrder.items || []).length === 0) {
      toast.error('Agregá productos antes de pedir la cuenta.');
      return;
    }

    let freshSub: PosTableSubAccount | null = null;
    if (subAccount) {
      freshSub =
        (freshOrder.subAccounts || []).find((sa) => sa.id === subAccount.id) || null;
      if (!freshSub) {
        toast('La división de cuentas cambió. Revisá las subcuentas actualizadas.');
        return;
      }
      if (freshSub.status === 'PAID') {
        toast.error(`"${freshSub.label}" ya fue cobrada.`);
        return;
      }
      if (
        freshOrder.splitMode === 'ITEMS' &&
        (freshSub.items || []).length === 0
      ) {
        toast.error(`"${freshSub.label}" no tiene productos para pedir la cuenta.`);
        return;
      }
    }

    const unsentCount = countUnsentForTarget(freshOrder, freshSub);
    const freshTipEnabled = freshOrder.tipPolicy
      ? Boolean(freshOrder.tipPolicy.tipEnabled)
      : tipEnabled;

    if (unsentCount > 0 || freshTipEnabled) {
      setBillRequestError(null);
      setBillModalTarget({
        subAccount: freshSub,
        unsentCount,
      });
      return;
    }

    await executeRequestBill(freshSub, undefined);
  };

  const handleCancelBillRequest = async () => {
    if (!isRestaurant || !tableId || isCancellingBill) return;
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para cancelar el pedido de cuenta.');
      return;
    }
    setIsCancellingBill(true);
    try {
      const res = await cancelPosTableBillRequest(tableId);
      if (res.tableOrder) {
        syncOrderState(res.tableOrder);
      } else {
        await refreshOrderAndRounds();
      }
      await billsQuery.refetch();
      toast.success('Pedido de cuenta cancelado');
    } catch (err: any) {
      toast.error(
        extractApiErrorMessage(err, 'No se pudo cancelar el pedido de cuenta.'),
      );
      await refreshOrderAndRounds();
    } finally {
      setIsCancellingBill(false);
    }
  };

  // Envío final de cobro al API (/pos/tables/:id/order/checkout)
  const handleCheckoutSubmit = async (paymentData: FinalPaymentSubmission) => {
    if (isCheckoutSubmitting || !order) return;

    const activeHeaders = getStoredWebDeviceHeaders(user?.businessId) || deviceHeaders;
    if (!activeHeaders?.['X-Device-Id'] || !activeHeaders?.['X-Device-Secret']) {
      setCheckoutError('Dispositivo web no registrado para cobrar.');
      return;
    }

    setIsCheckoutSubmitting(true);
    setCheckoutError(null);

    try {
      const singleLine = paymentData.payments?.[0];
      const dto = {
        ...(checkoutTargetSubAccount ? { subAccountId: checkoutTargetSubAccount.id } : {}),
        paymentMethod: paymentData.method,
        amountPaid: paymentData.amountPaid,
        // En orden sin dividir el API toma dto.discountAmount || 0
        ...(!checkoutTargetSubAccount && Number(order.discountTotal || 0) > 0
          ? { discountAmount: Number(order.discountTotal) }
          : {}),
        customerId: paymentData.customerId,
        customerName: paymentData.customerName,
        customerPhone: paymentData.customerPhone,
        customerRuc: paymentData.customerRuc,
        cashRegisterId: shiftId || undefined,
        notes: paymentData.notes,
        reference: paymentData.reference || singleLine?.reference,
        bankId: paymentData.bankId || singleLine?.bankId,
        bankName: paymentData.bankName || singleLine?.bankName,
        payments: paymentData.payments,
        tip: paymentData.tip,
      };

      const res = await checkoutPosTableOrder(tableId, dto, {
        ...activeHeaders,
        'Idempotency-Key': paymentData.clientGeneratedId,
      });

      setIsPaymentModalOpen(false);
      setCheckoutTargetSubAccount(null);
      setCompletedCheckout({
        sale: res.sale,
        allAccountsPaid: res.allAccountsPaid,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pos', 'salon', 'zones'] }),
        queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] }),
      ]);

      if (!res.allAccountsPaid) {
        await refreshOrderAndRounds();
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (handleDeviceApiError(err)) {
        setCheckoutError(extractApiErrorMessage(err, 'Dispositivo web no autorizado.'));
        return;
      }
      if (code === 'ORDER_ALREADY_CLOSED') {
        setCheckoutError(
          extractApiErrorMessage(err, 'Esta mesa ya fue cobrada en otro dispositivo.'),
        );
        queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'status'] });
        return;
      }
      if (code === 'SUB_ACCOUNT_ALREADY_PAID') {
        const msg = extractApiErrorMessage(
          err,
          'Esta subcuenta ya fue cobrada en otro dispositivo.',
        );
        setCheckoutError(msg);
        toast.error(msg);
        await refreshOrderAndRounds();
        return;
      }
      if (code === 'NO_OPEN_SHIFT') {
        setCheckoutError(
          'Tu turno de caja está cerrado. Abrí un turno para registrar el cobro.',
        );
        refetchShift();
        setIsPaymentModalOpen(false);
        setIsOpenShiftModalOpen(true);
        return;
      }
      setCheckoutError(extractApiErrorMessage(err, 'No se pudo completar el cobro.'));
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  // Vista de comprobante tras cobro exitoso
  if (completedCheckout) {
    return (
      <div className="max-w-3xl mx-auto pb-10">
        <SaleSuccessView
          sale={completedCheckout.sale}
          businessInfo={businessInfo}
          cashierName={user?.name || cashierName || undefined}
          primaryActionLabel={
            completedCheckout.allAccountsPaid
              ? 'Volver al salón'
              : 'Seguir cobrando subcuentas'
          }
          onNewSale={async () => {
            if (completedCheckout.allAccountsPaid) {
              navigate('/pos/tables');
              return;
            }
            setCompletedCheckout(null);
            await refreshOrderAndRounds();
            setIsSplitModalOpen(true);
          }}
        />
      </div>
    );
  }

  // Estados de carga o mesa cerrada/libre al entrar directo por URL
  if (orderQuery.isLoading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px]">
        <CircleNotch size={28} className="animate-spin text-gray-900 mb-3" />
        <p className="text-xs text-gray-600 font-medium">Cargando orden de mesa...</p>
      </div>
    );
  }

  if (orderQuery.isError && !order) {
    const is404 = (orderQuery.error as any)?.response?.status === 404;
    return (
      <div className="max-w-lg mx-auto py-8 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/pos/tables')}
          className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Volver al salón</span>
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center space-y-4">
          <WarningCircle size={32} weight="duotone" className="text-amber-600 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-base sm:text-lg font-bold text-[#0F0F0F]">
              {is404 ? 'Esta mesa no tiene orden abierta' : 'No pudimos cargar la orden'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              {is404
                ? 'Podés abrir la mesa ahora para empezar a cargar productos o volver al salón.'
                : extractApiErrorMessage(orderQuery.error, 'Error consultando el servidor.')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {is404 ? (
              <button
                type="button"
                onClick={async () => {
                  await openPosTableOrder(tableId);
                  await orderQuery.refetch();
                }}
                className="min-h-[44px] px-5 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold cursor-pointer"
              >
                Abrir mesa
              </button>
            ) : (
              <button
                type="button"
                onClick={() => orderQuery.refetch()}
                className="min-h-[44px] px-5 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold cursor-pointer"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const waiterDisplay = order.assignedWaiter?.name || order.openedByWaiterName || null;
  const hasSentItems = groupedSentRounds.some((g) => g.items.length > 0);
  const canOpenCheckout = (order.items || []).length > 0 && isOnline;
  const checkoutTargetData = checkoutTargetSubAccount || order;
  const isBillRequested = isRestaurant && order.billStatus === 'REQUESTED';
  const isGeneralBillReprint =
    isBillRequested &&
    (hasGeneralActiveBill ||
      !order.splitMode ||
      activeBillSubAccountIds.size === 0);
  const effectiveTipEnabled = order.tipPolicy
    ? Boolean(order.tipPolicy.tipEnabled)
    : tipEnabled;
  const effectiveTipDefaultPercent =
    order.tipPolicy?.tipDefaultPercent || tipDefaultPercent || 10;

  return (
    <div className="space-y-4 pb-10 max-w-7xl mx-auto">
      {/* Barra superior / cabecera de la mesa */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/pos/tables')}
              className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>Volver al salón</span>
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#0F0F0F] truncate">
                  {formatTableTitle(order.table?.number)}
                </h1>
                {isBillRequested && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300 inline-flex items-center gap-1 whitespace-nowrap">
                    <Receipt size={13} weight="bold" />
                    <span>Cuenta pedida</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-0.5">
                {order.table?.zoneName && (
                  <span className="font-medium text-gray-800">{order.table.zoneName}</span>
                )}
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock size={14} />
                  <span>{formatElapsed(order.createdAt, nowMs)}</span>
                </span>
                {waiterDisplay && (
                  <span className="inline-flex items-center gap-1">
                    <UserIcon size={14} />
                    <span>{waiterDisplay}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-gray-500">Total actual</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0F0F0F] tabular-nums">
              {formatCurrency(order.total, currency)}
            </p>
          </div>
        </div>

        {isBillRequested && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0 text-xs text-indigo-950 space-y-0.5">
              <p className="font-bold">Cuenta pedida</p>
              <p className="text-indigo-800">
                {order.billRequestedAt
                  ? (() => {
                      const elapsed = formatElapsed(order.billRequestedAt, nowMs);
                      return elapsed === 'Recién' ? 'Pedida recién' : `Hace ${elapsed}`;
                    })()
                  : 'Pendiente de cobro'}
                {order.billRequestedByName ? ` · Solicitada por ${order.billRequestedByName}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancelBillRequest}
              disabled={!isOnline || isCancellingBill}
              className="min-h-[44px] px-3.5 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-100 text-xs font-semibold text-indigo-900 cursor-pointer disabled:opacity-50"
            >
              {isCancellingBill ? 'Cancelando...' : 'Cancelar pedido de cuenta'}
            </button>
          </div>
        )}

        {/* Estado de turno y dispositivo web */}
        {webBillingEnabled && canCobrar && (
          <ShiftStatusBanner
            isOpen={isShiftOpen}
            cashierName={cashierName}
            openedAt={shiftOpenedAt}
            onOpenShiftClick={() => setIsOpenShiftModalOpen(true)}
          />
        )}

        {webBillingEnabled && deviceError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>{deviceError.message}</span>
            <button
              type="button"
              onClick={retryRegistration}
              disabled={isRegisteringDevice}
              className="min-h-[36px] px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
            >
              {isRegisteringDevice ? 'Registrando...' : 'Reintentar dispositivo'}
            </button>
          </div>
        )}

        {!isOnline && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center gap-2"
          >
            <WifiSlash size={18} weight="bold" className="text-amber-700 shrink-0" />
            <span>
              Sin conexión a internet. Reconectá para agregar productos o cobrar esta mesa.
            </span>
          </div>
        )}
      </div>

      {/* Cuerpo principal: Catálogo (izq) y Cuenta (der) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Columna izquierda: Catálogo y búsqueda */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 space-y-3.5">
          <div className="space-y-2.5">
            <div className="relative">
              <MagnifyingGlass
                size={18}
                className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar por nombre, SKU o código de barras (Enter agrega exacto)..."
                className="w-full min-h-[44px] pl-10 pr-9 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-gray-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Chips de categorías */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('ALL')}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-[#0F0F0F] text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Todas ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-[#0F0F0F] text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {productsQuery.isLoading ? (
            <div className="py-10 text-center text-xs text-gray-500">
              Cargando catálogo...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-500">
              No se encontraron productos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[62vh] overflow-y-auto pr-0.5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={orderProductQuantities[product.id] || 0}
                  useListPrice={Boolean((business as any)?.useListPrice ?? (user as any)?.business?.useListPrice)}
                  onAdd={handleAddProduct}
                  onDecrement={handleDecrementFromProductCard}
                  disabled={!isOnline || isMutatingOrder}
                />
              ))}
            </div>
          )}
        </section>

        {/* Columna derecha: Cuenta, rondas de cocina y acciones */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#0F0F0F]">Cuenta de mesa</h2>
              <p className="text-xs text-gray-500">
                {order.itemsCount} {order.itemsCount === 1 ? 'producto' : 'productos'} en la
                orden
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {discountsEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setDiscountError(null);
                    setIsDiscountModalOpen(true);
                  }}
                  disabled={!isOnline || isMutatingOrder || (order.items || []).length === 0}
                  className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Percent size={15} weight="bold" />
                  <span>Descuento</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setCancelError(null);
                  setIsCancelModalOpen(true);
                }}
                disabled={!isOnline || isCancelSubmitting}
                className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <DoorOpen size={15} weight="bold" />
                <span>Liberar mesa</span>
              </button>
            </div>
          </div>

          {/* Sin enviar */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Sin enviar ({unsentItems.length})
              </h3>
              {unsentToKitchenCount > 0 && (
                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={!isOnline || isMutatingOrder}
                  className="min-h-[44px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Fire size={16} weight="fill" />
                  <span>Enviar a cocina ({unsentToKitchenCount})</span>
                </button>
              )}
            </div>

            {unsentItems.length === 0 ? (
              <p className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3">
                No hay renglones pendientes de enviar a cocina.
              </p>
            ) : (
              <div className="space-y-2">
                {unsentItems.map((item) => {
                  const isEditingNote = editingNoteItemId === item.id;
                  const qty = Number(item.quantity || 0);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#0F0F0F] break-words">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-600 tabular-nums">
                            {formatCurrency(item.unitPrice, currency)} c/u
                          </p>
                          {item.notes && !isEditingNote && (
                            <p className="text-xs text-amber-900 mt-1 break-words">
                              Nota: {item.notes}
                            </p>
                          )}
                        </div>

                        <span className="text-sm font-bold text-[#0F0F0F] tabular-nums shrink-0">
                          {formatCurrency(item.subtotal, currency)}
                        </span>
                      </div>

                      {isEditingNote ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            maxLength={200}
                            placeholder="Ej: Sin cebolla, término medio..."
                            className="flex-1 min-h-[40px] px-2.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNote(item)}
                            disabled={isMutatingOrder}
                            className="min-h-[40px] min-w-[40px] rounded-lg bg-[#0F0F0F] text-white flex items-center justify-center cursor-pointer"
                            aria-label="Guardar nota"
                          >
                            <Check size={15} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteItemId(null);
                              setEditingNoteText('');
                            }}
                            className="min-h-[40px] min-w-[40px] rounded-lg border border-gray-200 bg-white text-gray-600 flex items-center justify-center cursor-pointer"
                            aria-label="Cancelar nota"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateUnsentQty(item, round3(qty - 1))
                              }
                              disabled={!isOnline || isMutatingOrder}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 flex items-center justify-center cursor-pointer"
                              aria-label="Restar"
                            >
                              <Minus size={14} weight="bold" />
                            </button>
                            <span className="min-w-[32px] text-center text-sm font-bold text-[#0F0F0F] tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateUnsentQty(item, round3(qty + 1))
                              }
                              disabled={!isOnline || isMutatingOrder}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 flex items-center justify-center cursor-pointer"
                              aria-label="Sumar"
                            >
                              <Plus size={14} weight="bold" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteItemId(item.id);
                                setEditingNoteText(item.notes || '');
                              }}
                              disabled={!isOnline || isMutatingOrder}
                              className="min-h-[44px] px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <NotePencil size={14} />
                              <span>Nota</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUnsentItem(item)}
                              disabled={!isOnline || isMutatingOrder}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 flex items-center justify-center cursor-pointer"
                              aria-label="Quitar producto"
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rondas enviadas a cocina */}
          {groupedSentRounds.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Rondas enviadas a cocina
              </h3>

              {groupedSentRounds.map((group) => (
                <div
                  key={group.roundId}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0F0F0F]">
                      Ronda {group.roundNumber}
                      {group.round?.type === 'VOID' ? ' · Anulación' : ''}
                    </span>
                    {renderRoundPrintBadge(group.round)}
                  </div>

                  {group.round?.type === 'VOID' ? (
                    <div className="space-y-1">
                      {(group.round.items || []).map((ri, idx) => (
                        <p key={`${ri.id}-${idx}`} className="text-xs text-red-700">
                          Anulado: {ri.quantity} × {ri.name}
                          {ri.voidReason ? ` (${ri.voidReason})` : ''}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-white border border-gray-200/80 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-[#0F0F0F] break-words">
                              {item.quantity} × {item.productName}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-500 break-words">
                                Nota: {item.notes}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 tabular-nums mt-0.5">
                              {formatCurrency(item.subtotal, currency)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setVoidError(null);
                              setVoidTargetItem(item);
                            }}
                            disabled={!isOnline || isVoidSubmitting}
                            className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 shrink-0 cursor-pointer disabled:opacity-40"
                          >
                            Anular
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Totales y botones principales de cierre (#269d) */}
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {formatCurrency(order.subtotal, currency)}
                </span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    Descuento
                    {order.discountPercent > 0 ? ` (${order.discountPercent} %)` : ''}
                  </span>
                  <span className="tabular-nums">
                    -{formatCurrency(order.discountTotal, currency)}
                  </span>
                </div>
              )}
              {order.taxTotal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Impuesto ({order.taxRate}%)</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(order.taxTotal, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 text-base font-extrabold text-[#0F0F0F]">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCurrency(order.total, currency)}
                </span>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${isRestaurant ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(true)}
                disabled={!isOnline || (order.items || []).length === 0}
                className="min-h-[46px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Scissors size={15} weight="bold" />
                <span>
                  {order.splitMode
                    ? `Dividida (${order.subAccounts.filter((sa) => sa.status === 'OPEN').length} abiertas)`
                    : 'Dividir cuenta'}
                </span>
              </button>

              {isRestaurant && (
                <button
                  type="button"
                  onClick={() => handleStartBillRequest(null, isGeneralBillReprint)}
                  disabled={!isOnline || (order.items || []).length === 0 || isRequestingBill}
                  className={`min-h-[46px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    isGeneralBillReprint
                      ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <Receipt size={15} weight="bold" />
                  <span>
                    {isGeneralBillReprint ? 'Reimprimir cuenta' : 'Pedir la cuenta'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenCheckoutFlow}
                disabled={!canOpenCheckout || isCheckoutSubmitting}
                className="min-h-[46px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
              >
                <CreditCard size={16} weight="bold" />
                <span>Cobrar</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modales de #269c */}
      <VoidTableItemModal
        isOpen={Boolean(voidTargetItem)}
        item={voidTargetItem}
        currency={currency}
        isSubmitting={isVoidSubmitting}
        errorMessage={voidError}
        onClose={() => {
          setVoidTargetItem(null);
          setVoidError(null);
        }}
        onConfirm={handleConfirmVoid}
      />

      <OrderDiscountModal
        isOpen={isDiscountModalOpen}
        subtotal={order.subtotal}
        currentPercent={order.discountPercent}
        currentAmount={order.discountAmount}
        currency={currency}
        userRole={userRole}
        cashierMaxDiscountPercent={cashierMaxDiscountPercent}
        isSubmitting={isDiscountSubmitting}
        errorMessage={discountError}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setDiscountError(null);
        }}
        onApply={handleApplyDiscount}
      />

      <CancelTableOrderModal
        isOpen={isCancelModalOpen}
        tableNumber={order.table?.number || ''}
        hasSentItems={hasSentItems}
        isSubmitting={isCancelSubmitting}
        errorMessage={cancelError}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelError(null);
        }}
        onConfirm={handleConfirmCancelOrder}
      />

      {/* Modales de #269d / #267d */}
      <SplitTableOrderModal
        isOpen={isSplitModalOpen}
        order={order}
        currency={currency}
        canRequestBill={isRestaurant}
        activeBillSubAccountIds={activeBillSubAccountIds}
        hasGeneralActiveBill={hasGeneralActiveBill}
        isRequestingBill={isRequestingBill}
        onClose={() => setIsSplitModalOpen(false)}
        onOrderUpdated={syncOrderState}
        onRefreshOrder={refreshOrderAndRounds}
        onCheckoutSubAccount={handleOpenCheckoutForSubAccount}
        onRequestBill={(sa, isReprint) => handleStartBillRequest(sa, isReprint)}
      />

      <RequestBillModal
        isOpen={Boolean(billModalTarget)}
        targetLabel={
          billModalTarget?.subAccount
            ? `${formatTableTitle(order.table?.number)} · ${
                order.splitMode === 'EQUAL' &&
                !billModalTarget.subAccount.label.includes(' de ') &&
                order.subAccounts.length > 1
                  ? `${billModalTarget.subAccount.label} de ${order.subAccounts.length}`
                  : billModalTarget.subAccount.label
              }`
            : formatTableTitle(order.table?.number)
        }
        currency={currency}
        unsentCount={billModalTarget?.unsentCount || 0}
        tipEnabled={effectiveTipEnabled}
        tipDefaultPercent={effectiveTipDefaultPercent}
        initialTipMode={billModalTarget?.subAccount?.tipMode || order.tipMode}
        initialTipPercent={billModalTarget?.subAccount?.tipPercent ?? order.tipPercent}
        initialTipAmount={billModalTarget?.subAccount?.tipAmount ?? order.tipAmount}
        isSubmitting={isRequestingBill}
        errorMessage={billRequestError}
        onClose={() => {
          setBillModalTarget(null);
          setBillRequestError(null);
        }}
        onConfirm={(tip) =>
          executeRequestBill(billModalTarget?.subAccount || null, tip)
        }
      />

      <PreBillPrintModal
        isOpen={Boolean(activeBillPreview)}
        bill={activeBillPreview?.bill || null}
        receiptSettings={activeBillPreview?.receiptSettings || null}
        totalSubAccounts={order.subAccounts?.length}
        onClose={() => setActiveBillPreview(null)}
      />

      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onSuccess={() => {
          setIsOpenShiftModalOpen(false);
          refetchShift();
        }}
        onAlreadyOpen={() => {
          refetchShift();
        }}
        onOpenShift={handleOpenShiftWithIdempotency}
        isOpening={isOpeningShift}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setCheckoutError(null);
        }}
        total={checkoutTargetData.total}
        subtotal={checkoutTargetData.subtotal}
        discountAmount={
          checkoutTargetSubAccount
            ? checkoutTargetSubAccount.discount
            : order.discountTotal
        }
        calcSummary={paymentCalcSummary}
        onSubmitSale={handleCheckoutSubmit}
        isSubmitting={isCheckoutSubmitting}
        errorMessage={checkoutError}
        userRole={userRole}
        carteraActive={Boolean((business as any)?.hasCarteraCobro)}
        posVertical={(business as any)?.posVertical || 'RESTAURANTE'}
        deliveryChannelEnabled={false}
        lockChannel={true}
        initialCustomer={
          order.customerName
            ? {
                id: order.customerId || null,
                name: order.customerName,
                phone: order.customerPhone || null,
              }
            : null
        }
        tableContext={{
          tableNumber: order.table?.number || '',
          zoneName: order.table?.zoneName || null,
          waiterName: waiterDisplay,
          tipMode: order.tipMode,
          tipPercent: order.tipPercent,
          tipAmount: order.tipAmount,
          tipCurrency: order.tipCurrency,
        }}
        targetSubAccount={
          checkoutTargetSubAccount
            ? {
                id: checkoutTargetSubAccount.id,
                label: checkoutTargetSubAccount.label,
                tipMode: checkoutTargetSubAccount.tipMode,
                tipPercent: checkoutTargetSubAccount.tipPercent,
                tipAmount: checkoutTargetSubAccount.tipAmount,
                tipCurrency: checkoutTargetSubAccount.tipCurrency,
              }
            : null
        }
      />
    </div>
  );
};
