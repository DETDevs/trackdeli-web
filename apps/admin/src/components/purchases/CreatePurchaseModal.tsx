import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Truck,
  Trash,
  MagnifyingGlass,
  WarningCircle,
  Package,
  Plus,
  CheckCircle,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type PosPurchase,
  type PosProductItem,
  type PosSupplier,
  type PosCategory,
  type PosSettingsData,
  createPosPurchase,
  getPosSuppliers,
  getPosProducts,
  getPosCategories,
  getMyBusiness,
  getPosSettings,
} from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { usePosWebDevice } from '../../hooks/usePosWebDevice';
import { getManaguaTodayYMD, formatManaguaDate } from '../../utils/dateManagua';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { extractApiErrorMessage, generateIdempotencyKey } from '../../utils/productCost';
import { SupplierModal } from '../pos/inventory/SupplierModal';
import { ProductModal } from '../pos/inventory/ProductModal';

interface PurchaseDraftItem {
  productId: string;
  productName: string;
  unit: string;
  previousCost: number | null;
  tracksBatches: boolean;
  quantityInput: string;
  quantity: number;
  unitCostInput: string;
  unitCost: number;
  subtotal: number;
  lotNumber: string;
  expiryDate: string;
}

export interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPurchase: PosPurchase) => void;
  currency?: string;
}

const isBarcodeLikeQuery = (raw: string): boolean => {
  const q = raw.trim();
  return q.length >= 4 && !/\s/.test(q) && /^[A-Za-z0-9\-]+$/.test(q) && /\d/.test(q);
};

export const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currency = 'NIO',
}) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { deviceId, deviceSecret } = usePosWebDevice(isOpen);

  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(getManaguaTodayYMD());
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<PurchaseDraftItem[]>([]);

  // Búsqueda y agregado de productos
  const [productSearch, setProductSearch] = useState('');
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [sessionSuppliers, setSessionSuppliers] = useState<PosSupplier[]>([]);
  const [sessionProducts, setSessionProducts] = useState<PosProductItem[]>([]);

  // Submodales de alta rápida (se mantienen sobre este modal sin perder la compra en curso)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [quickProductInitialName, setQuickProductInitialName] = useState('');
  const [quickProductInitialBarcode, setQuickProductInitialBarcode] = useState('');

  // Confirmaciones y estado de envío
  const [expiredItemsToConfirm, setExpiredItemsToConfirm] = useState<PurchaseDraftItem[] | null>(
    null,
  );
  const [duplicateConfirmMessage, setDuplicateConfirmMessage] = useState<string | null>(null);
  const [savedPurchase, setSavedPurchase] = useState<PosPurchase | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const todayYMD = getManaguaTodayYMD();

  const { data: fetchedSuppliers = [] } = useQuery<PosSupplier[]>({
    queryKey: ['pos', 'suppliers'],
    queryFn: () => getPosSuppliers(),
    enabled: isOpen,
    staleTime: 60000,
  });

  const { data: fetchedProducts = [] } = useQuery<PosProductItem[]>({
    queryKey: ['pos', 'products', 'purchase-selector'],
    queryFn: () => getPosProducts({ isActive: true }),
    enabled: isOpen,
    staleTime: 30000,
  });

  const { data: categories = [] } = useQuery<PosCategory[]>({
    queryKey: ['pos', 'categories'],
    queryFn: () => getPosCategories(),
    enabled: isOpen,
    staleTime: 60000,
  });

  const { data: business } = useQuery<any>({
    queryKey: ['business', 'me'],
    queryFn: () => getMyBusiness(),
    enabled: isOpen,
    staleTime: 60000,
  });

  const { data: posSettings } = useQuery<PosSettingsData | null>({
    queryKey: ['pos', 'settings'],
    queryFn: () => getPosSettings(),
    enabled: isOpen,
    staleTime: 60000,
  });

  const businessTracksBatches = Boolean(
    business?.tracksBatches ?? (user as any)?.business?.tracksBatches,
  );

  const suppliers = useMemo(() => {
    const map = new Map<string, PosSupplier>();
    for (const s of fetchedSuppliers) map.set(s.id, s);
    for (const s of sessionSuppliers) map.set(s.id, s);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fetchedSuppliers, sessionSuppliers]);

  const allProducts = useMemo(() => {
    const map = new Map<string, PosProductItem>();
    for (const p of fetchedProducts) map.set(p.id, p);
    for (const p of sessionProducts) map.set(p.id, p);
    return Array.from(map.values());
  }, [fetchedProducts, sessionProducts]);

  const resetDraft = (generateNewKey: boolean) => {
    if (generateNewKey || !idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey('pur');
    }
    setSupplierId('');
    setInvoiceNumber('');
    setPurchaseDate(getManaguaTodayYMD());
    setNotes('');
    setItems([]);
    setProductSearch('');
    setIsSearchingProduct(false);
    setExpiredItemsToConfirm(null);
    setDuplicateConfirmMessage(null);
    setSavedPurchase(null);
    setErrorMsg(null);
    submittingRef.current = false;
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      setSessionSuppliers([]);
      setSessionProducts([]);
      setIsSupplierModalOpen(false);
      setIsProductModalOpen(false);
      resetDraft(true);
    } else {
      idempotencyKeyRef.current = '';
      submittingRef.current = false;
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase().trim();
    if (!term) return [];
    return allProducts
      .filter((p) => {
        if (p.isActive === false || p.type === 'SERVICE') return false;
        const nameMatch = (p.name || '').toLowerCase().includes(term);
        const barcodeMatch = (p.barcode || '').toLowerCase().includes(term);
        const skuMatch = (p.sku || '').toLowerCase().includes(term);
        return nameMatch || barcodeMatch || skuMatch;
      })
      .slice(0, 10);
  }, [allProducts, productSearch]);

  if (!isOpen) return null;

  const findExactCodeProduct = (rawQuery: string): PosProductItem | undefined => {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return undefined;
    return allProducts.find(
      (p) =>
        p.isActive !== false &&
        p.type !== 'SERVICE' &&
        ((p.barcode && p.barcode.trim().toLowerCase() === q) ||
          (p.sku && p.sku.trim().toLowerCase() === q)),
    );
  };

  const addOrIncrementProduct = (p: PosProductItem) => {
    const rawPrevCost =
      p.cost !== undefined && p.cost !== null ? Number(p.cost) : null;
    const prevCost =
      rawPrevCost !== null && Number.isFinite(rawPrevCost) ? rawPrevCost : null;
    const initialCost = prevCost !== null && prevCost >= 0 ? prevCost : 0;

    setItems((prev) => {
      const existing = prev.find((it) => it.productId === p.id);
      if (existing) {
        const nextQty = Number((existing.quantity + 1).toFixed(3));
        return prev.map((it) =>
          it.productId === p.id
            ? {
                ...it,
                quantity: nextQty,
                quantityInput: String(nextQty),
                subtotal: Number((nextQty * it.unitCost).toFixed(2)),
              }
            : it,
        );
      }

      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          unit: p.unit || 'UND',
          previousCost: prevCost,
          tracksBatches: Boolean(p.tracksBatches),
          quantityInput: '1',
          quantity: 1,
          unitCostInput: prevCost !== null ? String(initialCost) : '',
          unitCost: initialCost,
          subtotal: Number(initialCost.toFixed(2)),
          lotNumber: '',
          expiryDate: '',
        },
      ];
    });

    setProductSearch('');
    setIsSearchingProduct(false);
    setErrorMsg(null);
  };

  const handleOpenQuickCreateProduct = (term: string) => {
    const clean = term.trim();
    if (isBarcodeLikeQuery(clean)) {
      setQuickProductInitialBarcode(clean);
      setQuickProductInitialName('');
    } else {
      setQuickProductInitialName(clean);
      setQuickProductInitialBarcode('');
    }
    setIsSearchingProduct(false);
    setIsProductModalOpen(true);
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const clean = productSearch.trim();
    if (!clean) return;

    const exact = findExactCodeProduct(clean);
    if (exact) {
      addOrIncrementProduct(exact);
      return;
    }

    if (filteredProducts.length > 0) {
      setIsSearchingProduct(true);
      return;
    }

    setIsSearchingProduct(true);
  };

  const handleQuantityChange = (productId: string, rawVal: string) => {
    const parsed = parseFloat(rawVal.replace(',', '.'));
    const safeQty = rawVal.trim() === '' || isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              quantityInput: rawVal,
              quantity: safeQty,
              subtotal: Number((safeQty * it.unitCost).toFixed(2)),
            }
          : it,
      ),
    );
  };

  const handleCostChange = (productId: string, rawVal: string) => {
    const parsed = parseFloat(rawVal.replace(',', '.'));
    const safeCost = rawVal.trim() === '' || isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              unitCostInput: rawVal,
              unitCost: safeCost,
              subtotal: Number((it.quantity * safeCost).toFixed(2)),
            }
          : it,
      ),
    );
  };

  const handleLotChange = (productId: string, val: string) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, lotNumber: val } : it)),
    );
  };

  const handleExpiryChange = (productId: string, val: string) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, expiryDate: val } : it)),
    );
    if (errorMsg) setErrorMsg(null);
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const totalPurchasePreview = items.reduce((sum, it) => sum + it.subtotal, 0);

  const submitPurchase = async (opts?: {
    forceDuplicate?: boolean;
    bypassExpiredConfirm?: boolean;
  }) => {
    if (submittingRef.current) return;

    if (items.length === 0) {
      setErrorMsg('Debés agregar al menos un producto a la compra.');
      return;
    }

    for (const it of items) {
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        setErrorMsg(`La cantidad de «${it.productName}» debe ser mayor a 0.`);
        return;
      }
      if (!Number.isFinite(it.unitCost) || it.unitCost < 0) {
        setErrorMsg(`El costo por ${it.unit} de «${it.productName}» no puede ser negativo.`);
        return;
      }
    }

    if (businessTracksBatches) {
      for (const it of items) {
        if (it.tracksBatches && !it.expiryDate.trim()) {
          setErrorMsg(
            `El producto «${it.productName}» controla lotes y requiere fecha de vencimiento.`,
          );
          setTimeout(() => {
            const el = document.getElementById(`purchase-expiry-${it.productId}`);
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 50);
          return;
        }
      }

      if (!opts?.bypassExpiredConfirm && !opts?.forceDuplicate) {
        const expired = items.filter(
          (it) => it.tracksBatches && it.expiryDate && it.expiryDate < todayYMD,
        );
        if (expired.length > 0) {
          setExpiredItemsToConfirm(expired);
          return;
        }
      }
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey('pur');
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        supplierId: supplierId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        purchaseDate: purchaseDate ? `${purchaseDate}T12:00:00.000Z` : undefined,
        notes: notes.trim() || undefined,
        paymentCondition: 'CONTADO' as const,
        ...(opts?.forceDuplicate ? { force: true } : {}),
        items: items.map((it) => {
          const isItemBatchTracked = businessTracksBatches && it.tracksBatches;
          const cleanLot = it.lotNumber.trim();
          return {
            productId: it.productId,
            quantity: it.quantity,
            unitCost: it.unitCost,
            ...(cleanLot ? { lotNumber: cleanLot } : {}),
            ...(isItemBatchTracked && it.expiryDate ? { expiryDate: it.expiryDate } : {}),
          };
        }),
      };

      const res = await createPosPurchase(payload, {
        'X-Device-Id': deviceId || undefined,
        'X-Device-Secret': deviceSecret || undefined,
        'Idempotency-Key': idempotencyKeyRef.current,
      });

      // Solo rotamos la clave tras éxito 2xx (para una eventual "Registrar otra compra")
      idempotencyKeyRef.current = generateIdempotencyKey('pur');
      setExpiredItemsToConfirm(null);
      setDuplicateConfirmMessage(null);
      setSavedPurchase(res);

      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'expiring-batches'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'purchases'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });

      onSuccess(res);
    } catch (err: any) {
      if (
        err?.response?.status === 409 &&
        err?.response?.data?.code === 'DUPLICATE_PURCHASE_INVOICE'
      ) {
        setDuplicateConfirmMessage(
          extractApiErrorMessage(
            err,
            'Ya existe una compra registrada con ese comprobante para este proveedor.',
          ),
        );
        return;
      }

      setErrorMsg(extractApiErrorMessage(err, 'No se pudo registrar la compra.'));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPurchase();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-blue-50/60 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                <Truck size={22} weight="bold" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {savedPurchase ? 'Compra registrada' : 'Registrar compra a proveedor'}
                </h3>
                <p className="text-xs text-blue-800 truncate">
                  {savedPurchase
                    ? 'Existencias y lotes ingresados al inventario'
                    : 'Suma existencias al inventario y actualiza el último costo'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cerrar modal"
              className="w-11 h-11 rounded-xl hover:bg-blue-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {savedPurchase ? (
            /* Resumen post-guardado con los datos y lotes asignados por el API */
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-900">
                <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-xs text-emerald-950">
                    La compra quedó registrada correctamente
                  </p>
                  <p className="text-xs text-emerald-800 break-words">
                    {savedPurchase.supplier?.name || 'Sin proveedor asignado'} ·{' '}
                    {savedPurchase.invoiceNumber
                      ? `Comprobante ${savedPurchase.invoiceNumber}`
                      : 'Sin n.º de comprobante'}{' '}
                    · {formatManaguaDate(savedPurchase.purchaseDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800">
                    Detalle ingresado ({savedPurchase.items?.length || 0})
                  </span>
                  <span className="font-bold font-mono text-sm text-gray-900">
                    Total: {formatCurrency(Number(savedPurchase.total || 0), currency)}
                  </span>
                </div>

                <div className="space-y-2">
                  {(savedPurchase.items || []).map((item) => {
                    const assignedLot = item.lotNumber || item.batchNumber;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-gray-900 break-words">
                            {item.product?.name || 'Producto'}
                          </span>
                          <span className="font-bold font-mono text-xs text-gray-900 shrink-0">
                            {formatCurrency(Number(item.subtotal || 0), currency)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span>
                            {formatQuantity(item.quantity, item.product?.unit || 'UND')} ×{' '}
                            {formatCurrency(Number(item.unitCost || 0), currency)}
                          </span>
                          {assignedLot && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono font-semibold text-xs">
                              Lote: {assignedLot}
                            </span>
                          )}
                          {item.expiryDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs">
                              <CalendarBlank size={13} />
                              <span>
                                Vence:{' '}
                                {formatManaguaDate(
                                  /^\d{4}-\d{2}-\d{2}/.test(String(item.expiryDate))
                                    ? String(item.expiryDate).slice(0, 10)
                                    : item.expiryDate,
                                )}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => resetDraft(true)}
                  className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Registrar otra compra
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            /* Formulario de captura */
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                  <span className="break-words">{errorMsg}</span>
                </div>
              )}

              {/* Datos generales de la compra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-xs text-gray-800 block">Proveedor</label>
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                    >
                      <Plus size={12} weight="bold" />
                      <span>Nuevo proveedor</span>
                    </button>
                  </div>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  >
                    <option value="">Sin proveedor asignado</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="font-semibold text-xs text-gray-800 block">
                    N.º de comprobante
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ej. COMP-00123"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 min-w-0">
                  <label className="font-semibold text-xs text-gray-800 block">
                    Fecha de compra
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="font-semibold text-xs text-gray-800 block">
                    Observaciones / Notas
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Compra al contado, referencia interna, etc."
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Buscador de productos + escaneo Enter + creación rápida */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="font-semibold text-xs text-gray-800 block">
                  Agregar productos a la compra
                </label>
                <div className="relative">
                  <MagnifyingGlass
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={productSearch}
                    onFocus={() => setIsSearchingProduct(true)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsSearchingProduct(true);
                    }}
                    onKeyDown={handleProductSearchKeyDown}
                    placeholder="Buscá por nombre, código o escaneá código de barras..."
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 shadow-2xs"
                  />

                  {isSearchingProduct && productSearch.trim() !== '' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-20 divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addOrIncrementProduct(p)}
                          className="w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-gray-900 break-words">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.sku || p.barcode || 'Sin código'} · Existencia:{' '}
                              {formatQuantity(p.stock || 0, p.unit || 'UND')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-semibold text-gray-700 block">
                              Costo: {formatCurrency(p.cost || 0, currency)}
                            </span>
                            <span className="text-xs text-emerald-700 font-semibold">
                              + Agregar
                            </span>
                          </div>
                        </button>
                      ))}

                      {filteredProducts.length === 0 && (
                        <div className="p-3 text-xs text-gray-500">
                          No encontramos ningún producto con «{productSearch.trim()}».
                        </div>
                      )}

                      {!findExactCodeProduct(productSearch) && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickCreateProduct(productSearch)}
                          className="w-full min-h-[44px] px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors text-left"
                        >
                          <Plus size={16} weight="bold" className="shrink-0" />
                          <span className="break-words">
                            Crear producto nuevo «{productSearch.trim()}»
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Líneas de productos agregados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-gray-800">
                    Productos agregados ({items.length})
                  </span>
                  <span className="text-xs font-bold font-mono text-gray-900">
                    Total estimado: {formatCurrency(totalPurchasePreview, currency)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50/70 border border-gray-100 rounded-2xl text-gray-500 space-y-1">
                    <Package size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-xs font-semibold text-gray-700">
                      Todavía no agregaste productos
                    </p>
                    <p className="text-xs text-gray-500">
                      Buscá arriba o creá un producto nuevo para ingresarlo en esta compra.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((it) => {
                      const requiresLot = businessTracksBatches && it.tracksBatches;
                      const isExpiredDate = Boolean(
                        requiresLot && it.expiryDate && it.expiryDate < todayYMD,
                      );

                      return (
                        <div
                          key={it.productId}
                          className="p-3 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h4 className="font-bold text-xs text-gray-900 break-words">
                                  {it.productName}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-xs">
                                  {it.unit}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {it.previousCost !== null
                                  ? `Antes ${formatCurrency(it.previousCost, currency)} / ${it.unit}`
                                  : `Sin costo anterior por ${it.unit}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.productId)}
                              aria-label={`Quitar ${it.productName}`}
                              className="w-11 h-11 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash size={17} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100">
                            <div>
                              <label className="text-xs text-gray-700 block font-semibold mb-1">
                                Cantidad ({it.unit})
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={it.quantityInput}
                                onChange={(e) =>
                                  handleQuantityChange(it.productId, e.target.value)
                                }
                                placeholder="1"
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-700 block font-semibold mb-1">
                                Costo por {it.unit}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.unitCostInput}
                                onChange={(e) => handleCostChange(it.productId, e.target.value)}
                                placeholder="0.00"
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                              />
                            </div>

                            <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                              <span className="text-xs text-gray-600 font-semibold">Subtotal</span>
                              <span className="text-sm font-bold font-mono text-gray-900">
                                {formatCurrency(it.subtotal, currency)}
                              </span>
                            </div>
                          </div>

                          {requiresLot && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-100 bg-purple-50/40 p-2.5 rounded-xl">
                              <div>
                                <label className="text-xs text-gray-800 block font-semibold mb-1">
                                  Lote (opcional)
                                </label>
                                <input
                                  type="text"
                                  maxLength={100}
                                  value={it.lotNumber}
                                  onChange={(e) => handleLotChange(it.productId, e.target.value)}
                                  placeholder="Automático"
                                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono focus:outline-none focus:border-purple-600"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Automático si lo dejás vacío.
                                </p>
                              </div>

                              <div>
                                <label className="text-xs text-gray-800 block font-semibold mb-1">
                                  Vencimiento <span className="text-red-600">*</span>
                                </label>
                                <input
                                  id={`purchase-expiry-${it.productId}`}
                                  type="date"
                                  value={it.expiryDate}
                                  onChange={(e) => handleExpiryChange(it.productId, e.target.value)}
                                  className={`w-full h-11 px-3 rounded-xl border bg-white text-xs text-gray-900 focus:outline-none ${
                                    isExpiredDate
                                      ? 'border-amber-500 focus:border-amber-600'
                                      : 'border-gray-200 focus:border-purple-600'
                                  }`}
                                />
                                {isExpiredDate && (
                                  <p className="mt-1 text-xs font-medium text-amber-800">
                                    Esta fecha ya venció; te pediremos confirmación al guardar.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Truck size={16} weight="bold" />
                      <span>
                        Guardar compra ({formatCurrency(totalPurchasePreview, currency)})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmación de lote con fecha ya vencida */}
      {expiredItemsToConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <WarningCircle size={22} weight="fill" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900">
                    ¿Registrar lote vencido?
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Los siguientes productos tienen una fecha de vencimiento anterior a hoy:
                  </p>
                </div>
              </div>

              <ul className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-xs text-amber-950">
                {expiredItemsToConfirm.map((it) => (
                  <li key={it.productId} className="break-words">
                    • <strong>{it.productName}</strong> — vence el{' '}
                    {formatManaguaDate(it.expiryDate)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpiredItemsToConfirm(null)}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Revisar fechas
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setExpiredItemsToConfirm(null);
                  submitPurchase({ bypassExpiredConfirm: true });
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Registrar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de comprobante duplicado (409 DUPLICATE_PURCHASE_INVOICE) */}
      {duplicateConfirmMessage && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <WarningCircle size={22} weight="fill" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900">Comprobante duplicado</h4>
                  <p className="text-xs text-gray-600 mt-1 break-words">
                    {duplicateConfirmMessage}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                ¿Querés registrar igualmente esta compra con el mismo n.º de comprobante?
              </p>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateConfirmMessage(null)}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setDuplicateConfirmMessage(null);
                  submitPurchase({ forceDuplicate: true, bypassExpiredConfirm: true });
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Registrar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alta rápida de proveedor */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        existingSuppliers={suppliers}
        onClose={() => setIsSupplierModalOpen(false)}
        onSaved={(created) => {
          setSessionSuppliers((prev) => [
            created,
            ...prev.filter((s) => s.id !== created.id),
          ]);
          setSupplierId(created.id);
          setIsSupplierModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['pos', 'suppliers'] });
        }}
        onSelectExisting={(existing) => {
          setSupplierId(existing.id);
          setIsSupplierModalOpen(false);
        }}
      />

      {/* Alta rápida de producto */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={null}
        categories={categories}
        business={business}
        posSettings={posSettings}
        currency={currency}
        initialName={quickProductInitialName}
        initialBarcode={quickProductInitialBarcode}
        lockInitialStockZero={true}
        onClose={() => setIsProductModalOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
        }}
        onProductCreated={(newProd) => {
          setSessionProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
          addOrIncrementProduct(newProd);
          setIsProductModalOpen(false);
        }}
      />
    </>
  );
};
