import React from 'react';
import {
  X,
  Plus,
  Minus,
  Trash,
  Receipt,
  ArrowRight,
} from '@phosphor-icons/react';
import { usePosCartStore, type DiscountType } from '../../../store/posCart.store';
import { formatCurrency } from '../../../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToPayment,
}) => {
  const items = usePosCartStore((s) => s.items);
  const discountType = usePosCartStore((s) => s.discountType);
  const discountValue = usePosCartStore((s) => s.discountValue);
  const removeItem = usePosCartStore((s) => s.removeItem);
  const deleteItem = usePosCartStore((s) => s.deleteItem);
  const updateQuantity = usePosCartStore((s) => s.updateQuantity);
  const setDiscount = usePosCartStore((s) => s.setDiscount);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const getCalculationSummary = usePosCartStore((s) => s.getCalculationSummary);
  const businessContext = usePosCartStore((s) => s.businessContext);

  if (!isOpen) return null;

  const calcSummary = getCalculationSummary();
  const subtotal = calcSummary.subtotal;
  // discountAmount used via calcSummary
  const total = calcSummary.total;

  const hasListDiscount = calcSummary.listDiscountTotal > 0 && calcSummary.listPriceTotal > 0;
  const hasTaxable = calcSummary.taxAmount > 0;
  const listDiscountPct = hasListDiscount
    ? Math.round((calcSummary.listDiscountTotal / calcSummary.listPriceTotal) * 100)
    : 0;

  const handleQuickDiscount = (pct: number) => {
    setDiscount('PERCENT', pct);
  };

  const handleDiscountTypeChange = (type: DiscountType) => {
    setDiscount(type, 0);
  };

  const handleDiscountValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDiscount(discountType, isNaN(val) ? 0 : val);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none">
      {/* Backdrop click */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content */}
      <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-gray-200 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-gray-900" weight="bold" />
            <h3 className="font-bold text-base text-gray-900">
              Detalle de la orden ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                Vaciar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              El carrito está vacío. Agrega productos del catálogo.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {item.productName}
                    </span>
                    {item.taxable !== undefined && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.taxable
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.taxable ? '15% IVA' : 'Exento'}
                      </span>
                    )}
                    {item.isWholesale && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Precio por mayor
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={item.isWholesale ? 'font-bold text-purple-700' : ''}>
                      {formatCurrency(item.unitPrice)} c/u
                    </span>
                    {businessContext.useListPrice && item.listPrice && item.listPrice > item.unitPrice && (
                      <span className="line-through text-gray-400 text-[10px]">
                        Etiqueta: {formatCurrency(item.listPrice)}
                      </span>
                    )}
                    {item.isWholesale && item.regularPrice > item.unitPrice && (
                      <span className="line-through text-gray-400 text-[10px]">
                        {formatCurrency(item.regularPrice)}
                      </span>
                    )}
                    {!item.isWholesale && item.wholesaleMinQty && item.wholesalePrice && (
                      <span className="text-[10px] text-gray-400">
                        (Mayor: {formatCurrency(item.wholesalePrice)} desde {item.wholesaleMinQty})
                      </span>
                    )}
                  </div>
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <Minus size={14} weight="bold" />
                    </button>
                    <span className="px-2 text-xs font-bold text-gray-900 min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  </div>

                  <div className="text-right min-w-[65px]">
                    <div className="text-xs sm:text-sm font-bold text-gray-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteItem(item.productId)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sección de descuento y totales */}
        {items.length > 0 && (
          <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 space-y-3 shrink-0">
            {/* Control de descuento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span>Descuento de la venta</span>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('PERCENT')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      discountType === 'PERCENT'
                        ? 'bg-gray-900 text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('FIXED')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      discountType === 'FIXED'
                        ? 'bg-gray-900 text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    C$
                  </button>
                </div>
              </div>

              {/* Atajos de descuento */}
              <div className="flex items-center gap-1.5">
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickDiscount(pct)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      discountType === 'PERCENT' && discountValue === pct
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}

                {discountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscount('PERCENT', 0)}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                  >
                    Quitar
                  </button>
                )}

                <div className="relative w-24 ml-auto">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={discountType === 'PERCENT' ? 100 : subtotal}
                    value={discountValue === 0 ? '' : discountValue}
                    onChange={handleDiscountValueChange}
                    placeholder="0"
                    className="w-full text-right pr-6 pl-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:border-gray-900"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    {discountType === 'PERCENT' ? '%' : 'C$'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-gray-200/60">
              {hasListDiscount ? (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Precio</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(calcSummary.listPriceTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Descuento ({listDiscountPct}%)</span>
                    <span>-{formatCurrency(calcSummary.listDiscountTotal)}</span>
                  </div>
                  {calcSummary.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Descuento adicional</span>
                      <span>-{formatCurrency(calcSummary.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-gray-200/60">
                    <span>Subtotal antes de IVA</span>
                    <span>{formatCurrency(calcSummary.subtotalBeforeTax)}</span>
                  </div>
                  {hasTaxable && (
                    <div className="flex justify-between text-gray-600">
                      <span>IVA 15 %</span>
                      <span>{formatCurrency(calcSummary.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm sm:text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>TOTAL A PAGAR {hasTaxable ? '(con IVA)' : ''}</span>
                    <span className="text-emerald-800 font-black">{formatCurrency(calcSummary.total)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(calcSummary.subtotal)}</span>
                  </div>
                  {calcSummary.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>
                        Descuento {discountType === 'PERCENT' ? `(${discountValue}%)` : ''}
                      </span>
                      <span>-{formatCurrency(calcSummary.discountAmount)}</span>
                    </div>
                  )}
                  {hasTaxable && (
                    <>
                      <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-gray-200/60">
                        <span>Subtotal antes de IVA</span>
                        <span>{formatCurrency(calcSummary.subtotalBeforeTax)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>IVA 15 %</span>
                        <span>{formatCurrency(calcSummary.taxAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm sm:text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>{hasTaxable ? 'TOTAL A PAGAR (con IVA)' : 'Total a cobrar'}</span>
                    <span className="text-emerald-800 font-black">{formatCurrency(calcSummary.total)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Botón de acción principal */}
            <button
              type="button"
              onClick={onProceedToPayment}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-between cursor-pointer shadow-md shadow-emerald-600/20 active:scale-98 min-h-[48px]"
            >
              <span>Continuar al pago</span>
              <div className="flex items-center gap-1.5">
                <span>{formatCurrency(total)}</span>
                <ArrowRight size={16} weight="bold" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
