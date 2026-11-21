import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash,
  Receipt,
  ArrowRight,
  FileText,
  WifiSlash,
  Storefront,
  Motorcycle,
  Percent,
  PencilSimple,
} from '@phosphor-icons/react';
import { usePosCartStore, type DiscountType } from '../../../store/posCart.store';
import { isLineBlockedFromManualDiscount } from '../../../utils/saleCalculation';
import { formatCurrency } from '../../../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment: () => void;
  onSaveAsQuote?: () => void;
  isOnline?: boolean;
  deliveryChannelEnabled?: boolean;
  defaultDeliveryFee?: number;
  lockChannel?: boolean;
  discountsEnabled?: boolean;
  priceOverrideEnabled?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToPayment,
  onSaveAsQuote,
  isOnline = true,
  deliveryChannelEnabled = false,
  defaultDeliveryFee = 0,
  lockChannel = false,
  discountsEnabled = true,
  priceOverrideEnabled = false,
}) => {
  const items = usePosCartStore((s) => s.items);
  const discountType = usePosCartStore((s) => s.discountType);
  const discountValue = usePosCartStore((s) => s.discountValue);
  const channel = usePosCartStore((s) => s.channel);
  const setChannel = usePosCartStore((s) => s.setChannel);
  const removeItem = usePosCartStore((s) => s.removeItem);
  const deleteItem = usePosCartStore((s) => s.deleteItem);
  const updateQuantity = usePosCartStore((s) => s.updateQuantity);
  const updateUnitPrice = usePosCartStore((s) => s.updateUnitPrice);
  const setItemDiscount = usePosCartStore((s) => s.setItemDiscount);
  const setDiscount = usePosCartStore((s) => s.setDiscount);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const sourceQuote = usePosCartStore((s) => s.sourceQuote);
  const discardSourceQuote = usePosCartStore((s) => s.discardSourceQuote);
  const getCalculationSummary = usePosCartStore((s) => s.getCalculationSummary);
  const getEffectiveDeliveryFee = usePosCartStore((s) => s.getEffectiveDeliveryFee);
  const businessContext = usePosCartStore((s) => s.businessContext);
  const [editingDiscountProductId, setEditingDiscountProductId] = useState<string | null>(null);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [priceInputStr, setPriceInputStr] = useState<string>('');

  if (!isOpen) return null;

  const isQuoteOfflineBlocked = Boolean(sourceQuote && !isOnline);
  const effectiveChannel = lockChannel || !deliveryChannelEnabled ? 'MOSTRADOR' : channel;
  const effectiveDeliveryFee = effectiveChannel === 'DOMICILIO' ? getEffectiveDeliveryFee() : 0;

  const calcSummary = getCalculationSummary();
  const total = Math.round((calcSummary.total + effectiveDeliveryFee) * 100) / 100;

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

        {/* Selector de canal (Mostrador / A domicilio) */}
        {deliveryChannelEnabled && !lockChannel && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200/80 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs font-bold text-gray-600">Canal:</span>
            <div className="inline-flex rounded-xl bg-gray-200/70 p-1 gap-1">
              <button
                type="button"
                onClick={() => setChannel('MOSTRADOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                  effectiveChannel === 'MOSTRADOR'
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Storefront size={15} weight={effectiveChannel === 'MOSTRADOR' ? 'fill' : 'regular'} />
                <span>Mostrador</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('DOMICILIO', defaultDeliveryFee)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                  effectiveChannel === 'DOMICILIO'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Motorcycle size={15} weight={effectiveChannel === 'DOMICILIO' ? 'fill' : 'regular'} />
                <span>A domicilio</span>
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
          {sourceQuote && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-indigo-950">
                  Desde proforma {sourceQuote.quoteNumber}
                </span>
                <p className="text-indigo-800 mt-0.5">
                  {sourceQuote.priceProtectionApplied
                    ? `Precio cotizado vigente hasta ${sourceQuote.validUntilLabel}.`
                    : 'Proforma vencida: usando precios actuales del catálogo.'}
                </p>
              </div>
              <button
                type="button"
                onClick={discardSourceQuote}
                className="px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white hover:bg-indigo-100 text-indigo-900 font-bold shrink-0 cursor-pointer"
              >
                Descartar
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              El carrito está vacío. Agregá productos del catálogo.
            </div>
          ) : (
            items.map((item) => {
              const priceTier = item.priceTier || (item.isWholesale ? 'WHOLESALE' : 'RETAIL');
              const isPromo = priceTier === 'PROMO';
              const isLoweredManually = Boolean(
                item.priceOverridden && item.unitPrice < item.regularPrice - 0.005,
              );
              const blockedFromManual =
                isLoweredManually ||
                isLineBlockedFromManualDiscount(
                  {
                    unitPrice: item.unitPrice,
                    priceTier,
                    allowDiscount: item.allowDiscount !== false,
                    listPrice: item.listPrice,
                  },
                  businessContext.useListPrice,
                );
              const lineCalc = calcSummary.lines.find((l) => l.productId === item.productId);
              const lineManualDisc = lineCalc?.discount || 0;
              const lineGross = Math.round(item.unitPrice * item.quantity * 100) / 100;
              const lineNetAfterItemDisc = Math.max(
                0,
                Math.round((lineGross - lineManualDisc) * 100) / 100,
              );
              const isEditingThisLine =
                discountsEnabled && !blockedFromManual && editingDiscountProductId === item.productId;
              const lineDiscType = item.lineDiscountType || 'PERCENT';
              const lineDiscVal = item.lineDiscountValue || 0;

              let blockedReason = 'No admite descuento manual';
              if (isLoweredManually) {
                blockedReason = 'Ya tiene una rebaja manual de precio aplicada';
              } else if (item.allowDiscount === false) {
                blockedReason = 'Este producto tiene desactivados los descuentos';
              } else if (item.isWholesale || priceTier === 'WHOLESALE') {
                blockedReason = 'Ya tiene precio por mayor aplicado';
              } else if (isPromo) {
                blockedReason = 'Ya tiene oferta de catálogo aplicada';
              } else if (
                businessContext.useListPrice &&
                item.listPrice &&
                item.listPrice > item.unitPrice
              ) {
                blockedReason = 'Ya tiene descuento de precio etiqueta aplicado';
              }

              return (
                <div key={item.productId} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug break-words">
                          {item.productName}
                        </span>
                        {item.taxable !== undefined && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
                              item.taxable
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.taxable ? '15% IVA' : 'Exento'}
                          </span>
                        )}
                        {item.isWholesale && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Precio por mayor
                          </span>
                        )}
                        {isPromo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Oferta {item.promoDiscountPct ? `-${item.promoDiscountPct}%` : ''}
                          </span>
                        )}
                        {item.allowDiscount === false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Sin desc.
                          </span>
                        )}
                        {lineManualDisc > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            -{formatCurrency(lineManualDisc)}
                            {lineDiscType === 'PERCENT' && lineDiscVal > 0 ? ` (${lineDiscVal}%)` : ''}
                          </span>
                        )}
                        {item.isCustomLine && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Línea libre
                          </span>
                        )}
                        {item.isPriceProtected && !item.isCustomLine && sourceQuote?.priceProtectionApplied && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Precio proforma
                          </span>
                        )}
                        {item.priceOverridden && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span>Precio editado</span>
                            {priceOverrideEnabled && (
                              <button
                                type="button"
                                onClick={() => updateUnitPrice(item.productId, null)}
                                className="underline text-amber-900 hover:text-black cursor-pointer"
                              >
                                Restaurar
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        {priceOverrideEnabled ? (
                          editingPriceProductId === item.productId ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs font-bold text-gray-500">C$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                autoFocus
                                value={priceInputStr}
                                onChange={(e) => setPriceInputStr(e.target.value)}
                                onBlur={() => {
                                  const parsed = parseFloat(priceInputStr.replace(',', '.'));
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    updateUnitPrice(item.productId, Math.round(parsed * 100) / 100);
                                  }
                                  setEditingPriceProductId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const parsed = parseFloat(priceInputStr.replace(',', '.'));
                                    if (!isNaN(parsed) && parsed >= 0) {
                                      updateUnitPrice(item.productId, Math.round(parsed * 100) / 100);
                                    }
                                    setEditingPriceProductId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingPriceProductId(null);
                                  }
                                }}
                                className="w-24 px-2 py-0.5 text-xs font-bold text-gray-900 bg-white border border-amber-400 rounded-lg focus:outline-hidden focus:border-amber-600"
                              />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPriceInputStr(String(item.unitPrice ?? 0));
                                setEditingPriceProductId(item.productId);
                              }}
                              title="Clic para modificar el precio unitario manualmente"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-gray-300 hover:border-amber-400 bg-gray-50 hover:bg-amber-50 text-gray-800 hover:text-amber-900 font-semibold transition-colors cursor-pointer"
                            >
                              <span>{formatCurrency(item.unitPrice)} c/u</span>
                              <PencilSimple size={12} weight="bold" className="text-amber-600" />
                            </button>
                          )
                        ) : (
                          <span
                            className={
                              item.isWholesale
                                ? 'font-bold text-purple-700'
                                : isPromo
                                  ? 'font-bold text-emerald-700'
                                  : ''
                            }
                          >
                            {formatCurrency(item.unitPrice)} c/u
                          </span>
                        )}
                        {businessContext.useListPrice && item.listPrice && item.listPrice > item.unitPrice && (
                          <span className="line-through text-gray-400 text-xs">
                            Etiqueta: {formatCurrency(item.listPrice)}
                          </span>
                        )}
                        {(item.isWholesale || isPromo || item.priceOverridden) &&
                          Math.abs(item.regularPrice - item.unitPrice) > 0.005 && (
                          <span className="line-through text-gray-400 text-xs">
                            {formatCurrency(item.regularPrice)}
                          </span>
                        )}
                        {!item.isWholesale && item.wholesaleMinQty && item.wholesalePrice && (
                          <span className="text-xs text-gray-400">
                            (Mayor: {formatCurrency(item.wholesalePrice)} desde {item.wholesaleMinQty})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controles de cantidad y descuento por línea */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <Minus size={14} weight="bold" />
                        </button>
                        <span className="px-2 text-xs font-bold text-gray-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <Plus size={14} weight="bold" />
                        </button>
                      </div>

                      {discountsEnabled && (
                        <button
                          type="button"
                          disabled={blockedFromManual}
                          title={
                            blockedFromManual
                              ? blockedReason
                              : lineManualDisc > 0
                                ? 'Editar descuento de este producto'
                                : 'Aplicar descuento a este producto'
                          }
                          onClick={() =>
                            setEditingDiscountProductId((prev) =>
                              prev === item.productId ? null : item.productId,
                            )
                          }
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                            blockedFromManual
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : lineManualDisc > 0 || isEditingThisLine
                                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 cursor-pointer'
                          }`}
                        >
                          <Percent size={14} weight="bold" />
                        </button>
                      )}

                      <div className="text-right min-w-[65px]">
                        <div className="text-xs sm:text-sm font-bold text-gray-900 tabular-nums">
                          {formatCurrency(lineNetAfterItemDisc)}
                        </div>
                        {lineManualDisc > 0 && (
                          <div className="text-[11px] text-gray-400 line-through tabular-nums">
                            {formatCurrency(lineGross)}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteItem(item.productId)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Editor inline de descuento por producto */}
                  {isEditingThisLine && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-950">Desc. producto:</span>
                        <div className="inline-flex rounded-lg border border-amber-300 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => setItemDiscount(item.productId, 'PERCENT', 0)}
                            className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                              lineDiscType === 'PERCENT'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemDiscount(item.productId, 'FIXED', 0)}
                            className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                              lineDiscType === 'FIXED'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            C$
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {[5, 10, 15].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setItemDiscount(item.productId, 'PERCENT', pct)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              lineDiscType === 'PERCENT' && lineDiscVal === pct
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-amber-200 hover:bg-amber-100/60'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        <div className="relative w-24">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={lineDiscType === 'PERCENT' ? 100 : lineGross}
                            value={lineDiscVal === 0 ? '' : lineDiscVal}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setItemDiscount(
                                item.productId,
                                lineDiscType,
                                isNaN(v) ? 0 : v,
                              );
                            }}
                            placeholder="0"
                            className="w-full text-right pr-6 pl-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:border-gray-900"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                            {lineDiscType === 'PERCENT' ? '%' : 'C$'}
                          </span>
                        </div>
                        {lineDiscVal > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setItemDiscount(item.productId, 'PERCENT', 0);
                              setEditingDiscountProductId(null);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sección de descuento y totales */}
        {items.length > 0 && (
          <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 space-y-3 shrink-0">
            {/* Control de descuento general */}
            {discountsEnabled && (() => {
              const eligibleBase = calcSummary.eligibleForGlobalDiscountSubtotal;
              const eligibleLinesCount = items.filter((it) => {
                const tier = it.priceTier || (it.isWholesale ? 'WHOLESALE' : 'RETAIL');
                const blocked = isLineBlockedFromManualDiscount(
                  {
                    unitPrice: it.unitPrice,
                    priceTier: tier,
                    allowDiscount: it.allowDiscount !== false,
                    listPrice: it.listPrice,
                  },
                  businessContext.useListPrice,
                );
                const lineCalc = calcSummary.lines.find((l) => l.productId === it.productId);
                return !blocked && (lineCalc?.discount || 0) <= 0;
              }).length;
              const excludedLinesCount = items.length - eligibleLinesCount;
              const noEligibleBase = eligibleBase <= 0;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <div>
                      <span>Descuento general de la venta</span>
                      {excludedLinesCount > 0 && (
                        <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                          {noEligibleBase
                            ? 'Ningún producto del carrito admite descuento general (ya tienen oferta, precio por mayor o descuento propio).'
                            : `Aplica sobre ${formatCurrency(eligibleBase)} (${eligibleLinesCount} de ${items.length} productos).`}
                        </p>
                      )}
                    </div>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={noEligibleBase}
                        onClick={() => handleDiscountTypeChange('PERCENT')}
                        className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                          discountType === 'PERCENT'
                            ? 'bg-gray-900 text-white shadow-2xs'
                            : 'text-gray-500 hover:text-gray-900'
                        } disabled:opacity-40`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        disabled={noEligibleBase}
                        onClick={() => handleDiscountTypeChange('FIXED')}
                        className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                          discountType === 'FIXED'
                            ? 'bg-gray-900 text-white shadow-2xs'
                            : 'text-gray-500 hover:text-gray-900'
                        } disabled:opacity-40`}
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
                        disabled={noEligibleBase}
                        onClick={() => handleQuickDiscount(pct)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          discountType === 'PERCENT' && discountValue === pct
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                        disabled={noEligibleBase}
                        max={discountType === 'PERCENT' ? 100 : eligibleBase}
                        value={discountValue === 0 ? '' : discountValue}
                        onChange={handleDiscountValueChange}
                        placeholder="0"
                        className="w-full text-right pr-6 pl-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {discountType === 'PERCENT' ? '%' : 'C$'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                  {calcSummary.lineDiscountTotal > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Descuento por producto</span>
                      <span>-{formatCurrency(calcSummary.lineDiscountTotal)}</span>
                    </div>
                  )}
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
                  {effectiveChannel === 'DOMICILIO' && (
                    <div className="flex justify-between text-gray-700 font-medium">
                      <span>Envío</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(effectiveDeliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm sm:text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>TOTAL A PAGAR {hasTaxable ? '(con IVA)' : ''}</span>
                    <span className="text-emerald-800 font-black">{formatCurrency(total)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(calcSummary.subtotal)}</span>
                  </div>
                  {calcSummary.lineDiscountTotal > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Descuento por producto</span>
                      <span>-{formatCurrency(calcSummary.lineDiscountTotal)}</span>
                    </div>
                  )}
                  {calcSummary.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>
                        Descuento general {discountType === 'PERCENT' ? `(${discountValue}%)` : ''}
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
                  {effectiveChannel === 'DOMICILIO' && (
                    <div className="flex justify-between text-gray-700 font-medium">
                      <span>Envío</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(effectiveDeliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm sm:text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>{hasTaxable ? 'TOTAL A PAGAR (con IVA)' : 'Total a cobrar'}</span>
                    <span className="text-emerald-800 font-black">{formatCurrency(total)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Botones de acción del carrito */}
            <div className="space-y-2">
              {isQuoteOfflineBlocked && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-start gap-2">
                  <WifiSlash size={16} className="text-amber-700 shrink-0 mt-0.5" weight="bold" />
                  <span>Esta proforma solo se puede convertir en venta con conexión a internet</span>
                </div>
              )}

              <button
                type="button"
                disabled={isQuoteOfflineBlocked}
                onClick={onProceedToPayment}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-between cursor-pointer shadow-md shadow-emerald-600/20 active:scale-98 min-h-[48px]"
              >
                <span>Continuar al pago</span>
                <div className="flex items-center gap-1.5">
                  <span className="whitespace-nowrap">{formatCurrency(total)}</span>
                  <ArrowRight size={16} weight="bold" />
                </div>
              </button>

              {onSaveAsQuote && !sourceQuote && (
                <button
                  type="button"
                  onClick={onSaveAsQuote}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
                >
                  <FileText size={16} />
                  <span>Guardar como proforma</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
