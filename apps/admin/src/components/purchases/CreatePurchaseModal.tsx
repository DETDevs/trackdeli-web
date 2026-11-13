import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Truck,
  Trash,
  MagnifyingGlass,
  WarningCircle,
  Package,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { createPosPurchase, getPosSuppliers, apiClient } from 'api-client';
import { usePosWebDevice } from '../../hooks/usePosWebDevice';
import { getManaguaTodayYMD } from '../../utils/dateManagua';
import { formatCurrency, formatQuantity } from '../../utils/formatters';

interface PurchaseDraftItem {
  productId: string;
  productName: string;
  unit?: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPurchase: any) => void;
  currency?: string;
}

export const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currency = 'NIO',
}) => {
  const { deviceId, deviceSecret } = usePosWebDevice();

  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(getManaguaTodayYMD());
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<PurchaseDraftItem[]>([]);

  // Búsqueda y agregado de productos
  const [productSearch, setProductSearch] = useState('');
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar proveedores
  const { data: suppliers = [] } = useQuery({
    queryKey: ['pos', 'suppliers'],
    queryFn: () => getPosSuppliers(),
    enabled: isOpen,
    staleTime: 60000,
  });

  // Cargar productos del catálogo
  const { data: productsData } = useQuery({
    queryKey: ['pos', 'products', 'purchase-selector'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/pos/products');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  const allProducts: any[] = productsData || [];

  // Clave de idempotencia única por intento de compra (se preserva en reintentos mientras el modal esté abierto)
  const idempotencyKeyRef = useRef<string>('');

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `pur-${Date.now()}`;
      }
      setSupplierId('');
      setInvoiceNumber('');
      setPurchaseDate(getManaguaTodayYMD());
      setNotes('');
      setItems([]);
      setProductSearch('');
      setIsSearchingProduct(false);
      setErrorMsg(null);
    } else {
      idempotencyKeyRef.current = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrado de productos por búsqueda
  const filteredProducts = allProducts.filter((p) => {
    if (!productSearch.trim()) return false;
    const term = productSearch.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const barcodeMatch = (p.barcode || '').toLowerCase().includes(term);
    const skuMatch = (p.sku || '').toLowerCase().includes(term);
    return nameMatch || barcodeMatch || skuMatch;
  }).slice(0, 10);

  const handleAddProduct = (p: any) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === p.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === p.id
            ? {
                ...it,
                quantity: Number((it.quantity + 1).toFixed(3)),
                subtotal: Number(((it.quantity + 1) * it.unitCost).toFixed(2)),
              }
            : it
        );
      }

      const cost = Number(p.costPrice || p.cost || 0);
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          unit: p.unit || undefined,
          quantity: 1,
          unitCost: cost,
          subtotal: Number(cost.toFixed(2)),
        },
      ];
    });

    setProductSearch('');
    setIsSearchingProduct(false);
  };

  const handleQuantityChange = (productId: string, val: number) => {
    const safeQty = Math.max(0, isNaN(val) ? 0 : val);
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              quantity: safeQty,
              subtotal: Number((safeQty * it.unitCost).toFixed(2)),
            }
          : it
      )
    );
  };

  const handleCostChange = (productId: string, val: number) => {
    const safeCost = Math.max(0, isNaN(val) ? 0 : val);
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              unitCost: safeCost,
              subtotal: Number((it.quantity * safeCost).toFixed(2)),
            }
          : it
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const totalPurchase = items.reduce((sum, it) => sum + it.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setErrorMsg('Debés agregar al menos un producto a la compra.');
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0) {
        setErrorMsg(`La cantidad de "${it.productName}" debe ser mayor a 0.`);
        return;
      }
      if (it.unitCost < 0) {
        setErrorMsg(`El costo de "${it.productName}" no puede ser negativo.`);
        return;
      }
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `pur-${Date.now()}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      const payload = {
        supplierId: supplierId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        purchaseDate: new Date(purchaseDate).toISOString(),
        notes: notes.trim() || undefined,
        paymentCondition: 'CONTADO' as const,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitCost: it.unitCost,
        })),
      };

      const res = await createPosPurchase(
        payload,
        {
          'X-Device-Id': deviceId || undefined,
          'X-Device-Secret': deviceSecret || undefined,
          'Idempotency-Key': idempotencyKey,
        }
      );

      setIsSubmitting(false);
      idempotencyKeyRef.current = '';
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err?.response?.data?.message?.message || err?.response?.data?.message || 'Error al registrar la compra';
      setErrorMsg(typeof msg === 'string' ? msg : 'Error al registrar la compra');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
              <Truck size={22} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Registrar Compra a Proveedor
              </h3>
              <p className="text-xs text-blue-800">Suma existencias al inventario y actualiza costo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl hover:bg-blue-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos Generales de la Compra */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-xs text-gray-800 block">Proveedor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900"
              >
                <option value="">Proveedor general (sin asignar)</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-xs text-gray-800 block">N° Factura / Comprobante</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="FAC-00123"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-xs text-gray-800 block">Fecha de compra</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-xs text-gray-800 block">Observaciones / Notas</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Compra al contado, lote, etc."
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Buscador de productos para agregar */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="font-bold text-xs text-gray-800 block">
              Agregar productos a la compra
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={productSearch}
                onFocus={() => setIsSearchingProduct(true)}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsSearchingProduct(true);
                }}
                placeholder="Buscar por nombre, código o código de barras..."
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-gray-900 shadow-2xs"
              />

              {isSearchingProduct && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-20 divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="p-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-gray-900">{p.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {p.sku || p.barcode || 'Sin código'} • Stock actual: {formatQuantity(p.stock || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-gray-700 block">
                          Costo: {formatCurrency(p.costPrice || p.cost || 0, currency)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">+ Agregar</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de productos agregados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-800">
                Productos agregados ({items.length})
              </span>
              <span className="text-xs font-bold font-mono text-gray-900">
                Total: {formatCurrency(totalPurchase, currency)}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/70 border border-gray-100 rounded-2xl text-gray-400 space-y-1">
                <Package size={28} className="mx-auto text-gray-300 mb-1" />
                <p className="text-xs font-medium text-gray-600">No hay productos agregados</p>
                <p className="text-[11px] text-gray-400">
                  Buscá y seleccioná arriba los productos para recibirlos en inventario.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div
                    key={it.productId}
                    className="p-3 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-gray-900 truncate">
                          {it.productName}
                        </h4>
                        {it.unit && (
                          <span className="text-[10px] text-gray-400">Unidad: {it.unit}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.productId)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Quitar producto"
                      >
                        <Trash size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center pt-1 border-t border-gray-100">
                      <div>
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={it.quantity || ''}
                          onChange={(e) => handleQuantityChange(it.productId, parseFloat(e.target.value) || 0)}
                          placeholder="1"
                          className="w-full h-10 px-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">
                          Costo Unitario
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.unitCost || ''}
                          onChange={(e) => handleCostChange(it.productId, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full h-10 px-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                        />
                      </div>

                      <div className="text-right">
                        <label className="text-[10px] text-gray-400 block uppercase font-bold">
                          Subtotal
                        </label>
                        <span className="text-sm font-bold font-mono text-gray-900 block mt-1">
                          {formatCurrency(it.subtotal, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 px-5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Truck size={16} weight="bold" />
                  <span>Registrar compra (C${totalPurchase.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
