import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  MagnifyingGlass,
  Plus,
  Trash,
  CircleNotch,
  WarningCircle,
  User,
  Car,
  FloppyDisk,
  PaperPlaneTilt,
  Tag,
} from '@phosphor-icons/react';
import {
  createPosQuote,
  formatQuoteApiError,
  generateQuoteRequestId,
  getPosProducts,
  searchPosCustomers,
  updatePosQuote,
  updatePosQuoteStatus,
  type PosCustomer,
  type PosProductItem,
  type PosQuote,
} from 'api-client';
import type { PosPoliciesData } from '../../../hooks/usePosPolicies';
import {
  estimateQuoteTotals,
  mapLinesToQuotePayload,
  resolveCatalogLinePricing,
  resolveProductInitialPrice,
  type EditableQuoteLine,
  type QuoteEstimateBusinessContext,
} from '../../../utils/quoteEstimate';
import { formatQuoteMoney } from '../../../utils/quoteReceiptHtml';
import { ManagerApprovalModal } from '../cobrar/ManagerApprovalModal';

interface QuoteEditorModalProps {
  isOpen: boolean;
  editingQuote?: PosQuote | null;
  businessContext: QuoteEstimateBusinessContext;
  policies?: PosPoliciesData | null;
  isTaller: boolean;
  userRole?: string;
  businessId?: string;
  onClose: () => void;
  onSaved: (saved: PosQuote, notice: string) => void;
}

function makeLineKey(): string {
  return `ql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const QuoteEditorModal: React.FC<QuoteEditorModalProps> = ({
  isOpen,
  editingQuote,
  businessContext,
  policies,
  isTaller,
  userRole,
  businessId,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(editingQuote);
  const isVendedor = userRole === 'VENDEDOR';
  const isPrivileged = userRole === 'ENCARGADO' || userRole === 'SUPERADMIN';
  const canEditCatalogPrice = Boolean(isPrivileged && policies?.priceOverrideEnabled);
  const canAddCustomLine = !isVendedor;
  const discountsEnabled = !isVendedor && policies?.discountsEnabled !== false;
  const currency = businessContext.currency || 'NIO';
  const currencySymbol = currency === 'USD' ? '$' : 'C$';

  // Catálogo
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productQuery, setProductQuery] = useState('');

  // Cliente
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerRuc, setCustomerRuc] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');

  // Líneas
  const [lines, setLines] = useState<EditableQuoteLine[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('UND');
  const [customQty, setCustomQty] = useState('1');
  const [customPrice, setCustomPrice] = useState('');
  const [customTaxable, setCustomTaxable] = useState(true);
  const [customNotes, setCustomNotes] = useState('');

  // Vigencia, descuento, notas y condiciones
  const [validityDays, setValidityDays] = useState('15');
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [discountValue, setDiscountValue] = useState('');
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState('');

  // Envío / errores / aprobación
  const [savingTarget, setSavingTarget] = useState<'DRAFT' | 'SENT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalDescription, setApprovalDescription] = useState('');
  const [pendingTargetStatus, setPendingTargetStatus] = useState<'DRAFT' | 'SENT' | null>(null);
  const requestIdRef = useRef<string>('');

  // Cargar productos al abrir
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingProducts(true);
    getPosProducts({ isActive: true })
      .then((list) => {
        if (!cancelled) {
          setProducts(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Inicializar formulario al abrir / cambiar proforma
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSavingTarget(null);
    setProductQuery('');
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomForm(false);
    setCustomName('');
    setCustomUnit('UND');
    setCustomQty('1');
    setCustomPrice('');
    setCustomTaxable(true);
    setCustomNotes('');
    setApprovalOpen(false);
    setPendingTargetStatus(null);
    requestIdRef.current = generateQuoteRequestId('quote-web');

    if (editingQuote) {
      setCustomerId(editingQuote.customerId || null);
      setCustomerName(editingQuote.customerName || '');
      setCustomerPhone(editingQuote.customerPhone || '');
      setCustomerRuc(editingQuote.customerRuc || '');
      setCustomerAddress(editingQuote.customerAddress || '');
      setVehicleInfo(editingQuote.vehicleInfo || '');
      setValidityDays(String(editingQuote.validityDays || 15));
      setDiscountType('AMOUNT');
      setDiscountValue(
        Number(editingQuote.discountAmount || 0) > 0
          ? String(Number(editingQuote.discountAmount))
          : '',
      );
      setNotes(editingQuote.notes || '');
      setConditions(editingQuote.conditions || '');
      setLines(
        (editingQuote.items || []).map((item) => ({
          key: makeLineKey(),
          productId: item.productId,
          productName: item.productName,
          barcode: item.barcode,
          unit: item.unit || 'UND',
          itemType: item.itemType,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          wholesalePrice: null,
          wholesaleMinQty: null,
          priceOverride: Boolean(item.priceOverride),
          discount: Number(item.discount || 0),
          taxable: Boolean(item.taxable),
          listPrice: item.listPrice ?? null,
          notes: item.notes || '',
        })),
      );
    } else {
      setCustomerId(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerRuc('');
      setCustomerAddress('');
      setVehicleInfo('');
      setValidityDays('15');
      setDiscountType('AMOUNT');
      setDiscountValue('');
      setNotes('');
      setConditions('');
      setLines([]);
    }
  }, [isOpen, editingQuote]);

  // Enriquecer información de mayoreo para líneas cargadas desde borrador cuando llegue el catálogo
  useEffect(() => {
    if (!products.length) return;
    const map = new Map(products.map((p) => [p.id, p]));
    setLines((prev) =>
      prev.map((line) => {
        if (!line.productId || line.itemType === 'CUSTOM') return line;
        const prod = map.get(line.productId);
        if (!prod) return line;
        const retail = Number(prod.price || 0);
        return {
          ...line,
          unitPrice: line.priceOverride ? line.unitPrice : retail,
          wholesalePrice: prod.wholesalePrice ?? prod.wholesale_price ?? null,
          wholesaleMinQty: prod.wholesaleMinQty ?? prod.wholesale_min_qty ?? null,
          listPrice: prod.listPrice ?? line.listPrice,
          taxable: Boolean(prod.taxable),
        };
      }),
    );
  }, [products]);

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = customerSearch.trim();
    if (!trimmed || trimmed.length < 2) {
      setCustomerResults([]);
      setSearchingCustomers(false);
      return;
    }

    let cancelled = false;
    setSearchingCustomers(true);
    const timer = setTimeout(() => {
      searchPosCustomers(trimmed)
        .then((res) => {
          if (!cancelled) setCustomerResults(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          if (!cancelled) setCustomerResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingCustomers(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearch, isOpen]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)),
        )
      : products;
    return list.slice(0, 18);
  }, [products, productQuery]);

  // Subtotal bruto para convertir descuento porcentual a monto fijo antes del cálculo en centavos
  const baseSubtotalBeforeDiscount = useMemo(() => {
    const pre = estimateQuoteTotals(lines, 0, businessContext);
    return pre.subtotal;
  }, [lines, businessContext]);

  const effectiveDiscountAmount = useMemo(() => {
    if (!discountsEnabled) return 0;
    const raw = Number(discountValue);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    if (discountType === 'PERCENT') {
      const pct = Math.min(100, Math.max(0, raw));
      return Math.round(baseSubtotalBeforeDiscount * (pct / 100) * 100) / 100;
    }
    return Math.min(baseSubtotalBeforeDiscount, Math.round(raw * 100) / 100);
  }, [discountsEnabled, discountType, discountValue, baseSubtotalBeforeDiscount]);

  const summary = useMemo(
    () => estimateQuoteTotals(lines, effectiveDiscountAmount, businessContext),
    [lines, effectiveDiscountAmount, businessContext],
  );

  if (!isOpen) return null;

  const handleSelectCustomer = (cust: PosCustomer) => {
    setCustomerId(cust.id);
    setCustomerName(cust.name || '');
    setCustomerPhone(cust.phone || '');
    setCustomerRuc(cust.ruc || '');
    setCustomerAddress(cust.lastAddressText || '');
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const handleClearCustomer = () => {
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerRuc('');
    setCustomerAddress('');
  };

  const handleAddProduct = (prod: PosProductItem) => {
    setError(null);
    setLines((prev) => {
      const existingIdx = prev.findIndex(
        (l) => l.productId === prod.id && l.itemType !== 'CUSTOM' && !l.priceOverride,
      );
      if (existingIdx >= 0) {
        return prev.map((l, idx) =>
          idx === existingIdx ? { ...l, quantity: Number((l.quantity + 1).toFixed(3)) } : l,
        );
      }

      return [
        ...prev,
        {
          key: makeLineKey(),
          productId: prod.id,
          productName: prod.name,
          barcode: prod.barcode || null,
          unit: prod.unit || 'UND',
          itemType: prod.type === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
          quantity: 1,
          unitPrice: Number(prod.price || 0),
          wholesalePrice: prod.wholesalePrice ?? prod.wholesale_price ?? null,
          wholesaleMinQty: prod.wholesaleMinQty ?? prod.wholesale_min_qty ?? null,
          priceOverride: false,
          discount: 0,
          taxable: Boolean(prod.taxable),
          listPrice: prod.listPrice ?? null,
          notes: '',
        },
      ];
    });
  };

  const handleAddCustomLine = () => {
    const trimmedName = customName.trim();
    const qty = Number(customQty);
    const price = Number(customPrice);
    if (!trimmedName) {
      setError('Ingresá una descripción para la línea libre.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 0.001) {
      setError('La cantidad de la línea libre debe ser mayor a 0.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('El precio unitario de la línea libre debe ser mayor a 0.');
      return;
    }

    setError(null);
    setLines((prev) => [
      ...prev,
      {
        key: makeLineKey(),
        productId: null,
        productName: trimmedName,
        barcode: null,
        unit: customUnit.trim() || 'UND',
        itemType: 'CUSTOM',
        quantity: qty,
        unitPrice: price,
        wholesalePrice: null,
        wholesaleMinQty: null,
        priceOverride: false,
        discount: 0,
        taxable: businessContext.taxEnabled ? customTaxable : false,
        listPrice: null,
        notes: customNotes.trim(),
      },
    ]);

    setCustomName('');
    setCustomUnit('UND');
    setCustomQty('1');
    setCustomPrice('');
    setCustomNotes('');
    setShowCustomForm(false);
  };

  const submitQuote = async (targetStatus: 'DRAFT' | 'SENT', approvalToken?: string) => {
    if (lines.length === 0) {
      setError('Agregá al menos un producto o línea antes de guardar la proforma.');
      return;
    }

    for (const l of lines) {
      if (!Number.isFinite(l.quantity) || l.quantity < 0.001) {
        setError(`Revisá la cantidad de "${l.productName}".`);
        return;
      }
      if (l.itemType === 'CUSTOM' && (!l.productName.trim() || l.unitPrice <= 0)) {
        setError(`La línea libre "${l.productName || 'sin nombre'}" requiere precio válido.`);
        return;
      }
    }

    const parsedValidity = Math.min(90, Math.max(1, Math.round(Number(validityDays) || 15)));
    setSavingTarget(targetStatus);
    setError(null);

    const itemsPayload = mapLinesToQuotePayload(lines, canEditCatalogPrice);
    const commonPayload = {
      items: itemsPayload,
      customerId: customerId || null,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerRuc: customerRuc.trim() || null,
      customerAddress: customerAddress.trim() || null,
      vehicleInfo: isTaller ? vehicleInfo.trim() || null : undefined,
      validityDays: parsedValidity,
      discountAmount: effectiveDiscountAmount > 0 ? effectiveDiscountAmount : 0,
      approvalToken,
      notes: notes.trim() || null,
      conditions: conditions.trim() || null,
    };

    try {
      let saved: PosQuote;
      if (isEditing && editingQuote) {
        saved = await updatePosQuote(editingQuote.id, commonPayload, businessId);
        if (targetStatus === 'SENT') {
          saved = await updatePosQuoteStatus(saved.id, { status: 'SENT' }, businessId);
        }
      } else {
        saved = await createPosQuote(
          {
            ...commonPayload,
            status: targetStatus,
            clientRequestId: requestIdRef.current,
          },
          businessId,
        );
      }

      const notice =
        targetStatus === 'SENT'
          ? `Proforma ${saved.quoteNumber} emitida por ${formatQuoteMoney(saved.total, saved.currency)}.`
          : `Borrador ${saved.quoteNumber} guardado (${formatQuoteMoney(saved.total, saved.currency)}).`;
      onSaved(saved, notice);
      onClose();
    } catch (err) {
      const parsed = formatQuoteApiError(err, 'No se pudo guardar la proforma.');
      if (parsed.code === 'DISCOUNT_LIMIT_EXCEEDED' && userRole === 'CAJERO') {
        setPendingTargetStatus(targetStatus);
        setApprovalDescription(parsed.message);
        setApprovalOpen(true);
      } else {
        setError(parsed.message);
      }
    } finally {
      setSavingTarget(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {isEditing ? `Editar borrador ${editingQuote?.quoteNumber}` : 'Nueva proforma'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Cotizá productos o servicios sin afectar inventario ni registrar venta
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(savingTarget)}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Cerrar editor"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 flex items-start gap-2">
                <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
                <span>{error}</span>
              </div>
            )}

            {/* Sección Cliente */}
            <section className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                  <User size={15} />
                  Cliente (opcional)
                </h4>
                {(customerId || customerName || customerPhone || customerRuc || customerAddress) && (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Limpiar cliente
                  </button>
                )}
              </div>

              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscá un cliente registrado por nombre o teléfono..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {searchingCustomers && (
                  <CircleNotch
                    size={16}
                    className="animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"
                  />
                )}
                {customerResults.length > 0 && (
                  <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {[c.phone, c.ruc].filter(Boolean).join(' · ') || 'Sin teléfono/RUC'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre del cliente
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Consumidor final o razón social"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej.: 8888-0000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    RUC / Cédula
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={customerRuc}
                    onChange={(e) => setCustomerRuc(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    maxLength={200}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                {isTaller && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Car size={14} />
                      Vehículo (opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      value={vehicleInfo}
                      onChange={(e) => setVehicleInfo(e.target.value)}
                      placeholder="Ej.: Toyota Hilux 2020 · Placa M-12345"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Sección Catálogo y líneas */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Productos y líneas de la proforma
                </h4>
                {canAddCustomLine && (
                  <button
                    type="button"
                    onClick={() => setShowCustomForm((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} weight="bold" />
                    {showCustomForm ? 'Ocultar línea libre' : 'Agregar línea libre'}
                  </button>
                )}
              </div>

              {/* Buscador catálogo */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/40 space-y-2.5">
                <div className="relative">
                  <MagnifyingGlass
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Buscá en el catálogo por nombre o código de barras..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {loadingProducts ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <CircleNotch size={16} className="animate-spin text-emerald-600" />
                    Cargando catálogo...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">
                    No hay productos que coincidan con tu búsqueda.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredProducts.map((prod) => {
                      const initial = resolveProductInitialPrice(
                        prod,
                        1,
                        businessContext.wholesaleEnabled,
                      );
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProduct(prod)}
                          className="text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {prod.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {prod.unit || 'UND'}
                              {prod.barcode ? ` · ${prod.barcode}` : ''}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 whitespace-nowrap shrink-0">
                            {formatQuoteMoney(initial.unitPrice, currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Formulario línea libre */}
              {canAddCustomLine && showCustomForm && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-3">
                  <p className="text-xs font-bold text-emerald-900">Nueva línea libre</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Descripción *
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Ej.: Mano de obra, instalación o repuesto especial"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Unidad</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        placeholder="UND / SERV"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={customQty}
                        onChange={(e) => setCustomQty(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Precio unit. ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nota de la línea
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Opcional"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                    <div className="flex items-end">
                      {businessContext.taxEnabled !== false && (
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer pb-2">
                          <input
                            type="checkbox"
                            checked={customTaxable}
                            onChange={(e) => setCustomTaxable(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Grava IVA
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomLine}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Añadir línea
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de líneas */}
              {lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 py-8 px-4 text-center text-xs text-slate-500">
                  Todavía no agregaste líneas a esta proforma. Seleccioná productos arriba
                  {canAddCustomLine ? ' o creá una línea libre.' : '.'}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                  {lines.map((line) => {
                    const resolved = resolveCatalogLinePricing(
                      line,
                      line.quantity,
                      businessContext.wholesaleEnabled,
                    );
                    const lineNet = Math.max(
                      0,
                      resolved.unitPrice * line.quantity - Number(line.discount || 0),
                    );
                    const editablePrice =
                      line.itemType === 'CUSTOM' || canEditCatalogPrice;

                    return (
                      <div key={line.key} className="p-3 bg-white space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-900">
                                {line.productName}
                              </span>
                              {line.itemType === 'CUSTOM' && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-xs font-medium text-slate-700">
                                  Libre
                                </span>
                              )}
                              {resolved.priceTier === 'WHOLESALE' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                                  Mayoreo
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Cant.:</span>
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={line.quantity}
                                onChange={(e) => {
                                  const nextQty = Math.max(0.001, Number(e.target.value) || 0);
                                  setLines((prev) =>
                                    prev.map((item) =>
                                      item.key === line.key ? { ...item, quantity: nextQty } : item,
                                    ),
                                  );
                                }}
                                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-900 text-right"
                              />
                              <span className="text-xs text-slate-500">{line.unit}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Precio:</span>
                              {editablePrice ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.unitPrice}
                                  onChange={(e) => {
                                    const nextPrice = Math.max(0, Number(e.target.value) || 0);
                                    setLines((prev) =>
                                      prev.map((item) =>
                                        item.key === line.key
                                          ? {
                                              ...item,
                                              unitPrice: nextPrice,
                                              priceOverride: line.itemType !== 'CUSTOM',
                                            }
                                          : item,
                                      ),
                                    );
                                  }}
                                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-900 text-right"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                                  {formatQuoteMoney(resolved.unitPrice, currency)}
                                </span>
                              )}
                            </div>

                            <span className="text-sm font-bold text-slate-900 whitespace-nowrap min-w-[84px] text-right">
                              {formatQuoteMoney(lineNet, currency)}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setLines((prev) => prev.filter((item) => item.key !== line.key))
                              }
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              aria-label={`Quitar ${line.productName}`}
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            maxLength={200}
                            value={line.notes}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((item) =>
                                  item.key === line.key
                                    ? { ...item, notes: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Nota opcional para esta línea..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Vigencia, Descuento, Notas y Totales */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vigencia (días) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>

                  {discountsEnabled && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Tag size={14} />
                        Descuento global
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={discountType}
                          onChange={(e) =>
                            setDiscountType(e.target.value === 'PERCENT' ? 'PERCENT' : 'AMOUNT')
                          }
                          className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800"
                        >
                          <option value="AMOUNT">{currencySymbol}</option>
                          <option value="PERCENT">%</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones para el cliente o el pedido..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Condiciones comerciales (opcional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    placeholder="Ej.: Tiempo de entrega, forma de pago aceptada, garantía..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 resize-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/70 space-y-2 text-xs">
                <p className="font-bold uppercase tracking-wide text-slate-700">
                  Resumen estimado
                </p>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal estimado</span>
                  <span className="font-semibold text-slate-900 whitespace-nowrap">
                    {formatQuoteMoney(summary.subtotal, currency)}
                  </span>
                </div>
                {summary.listDiscountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Ahorro por tarifa / lista</span>
                    <span className="font-semibold whitespace-nowrap">
                      -{formatQuoteMoney(summary.listDiscountTotal, currency)}
                    </span>
                  </div>
                )}
                {summary.discountAmount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Descuento global</span>
                    <span className="font-semibold whitespace-nowrap">
                      -{formatQuoteMoney(summary.discountAmount, currency)}
                    </span>
                  </div>
                )}
                {summary.taxEnabled && (
                  <div className="flex justify-between text-slate-600">
                    <span>
                      IVA ({summary.taxRate}%){summary.taxIncluded ? ' (incluido)' : ''}
                    </span>
                    <span className="font-semibold text-slate-900 whitespace-nowrap">
                      {formatQuoteMoney(summary.taxAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-sm font-bold text-slate-900">
                  <span>Total estimado</span>
                  <span className="text-lg whitespace-nowrap">
                    {formatQuoteMoney(summary.total, currency)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  El monto final lo confirma el servidor al guardar la proforma.
                </p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              disabled={Boolean(savingTarget)}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={lines.length === 0 || Boolean(savingTarget)}
              onClick={() => submitQuote('DRAFT')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {savingTarget === 'DRAFT' ? (
                <CircleNotch size={15} className="animate-spin" />
              ) : (
                <FloppyDisk size={15} />
              )}
              {isEditing ? 'Guardar cambios' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              disabled={lines.length === 0 || Boolean(savingTarget)}
              onClick={() => submitQuote('SENT')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {savingTarget === 'SENT' ? (
                <CircleNotch size={15} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={15} />
              )}
              {isEditing ? 'Guardar y emitir' : 'Emitir proforma'}
            </button>
          </div>
        </div>
      </div>

      <ManagerApprovalModal
        isOpen={approvalOpen}
        onClose={() => {
          setApprovalOpen(false);
          setPendingTargetStatus(null);
        }}
        actionTitle="Autorizar descuento en proforma"
        actionDescription={
          approvalDescription ||
          'El descuento supera el límite permitido para tu usuario y requiere aprobación de un encargado.'
        }
        actionCode="APLICAR_DESCUENTO"
        entityType="PosQuote"
        onApproved={(token) => {
          const target = pendingTargetStatus || 'DRAFT';
          setPendingTargetStatus(null);
          void submitQuote(target, token);
        }}
      />
    </>
  );
};
