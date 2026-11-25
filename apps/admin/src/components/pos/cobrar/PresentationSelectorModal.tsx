import React, { useEffect, useCallback } from 'react';
import { X, Stack, Package, ArrowRight } from '@phosphor-icons/react';
import { type PosProductItem, type PosProductPresentation } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import {
  getBaseUnitDisplayName,
  getPresentationAvailableUnits,
  pluralizeUnitName,
  pluralizePresentationName,
} from '../../../utils/presentationHelpers';

interface PresentationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PosProductItem | null;
  onSelectSuelto: (product: PosProductItem) => void;
  onSelectPresentation: (product: PosProductItem, presentation: PosProductPresentation) => void;
  currency?: string;
  useListPrice?: boolean;
}

export const PresentationSelectorModal: React.FC<PresentationSelectorModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectSuelto,
  onSelectPresentation,
  currency = 'NIO',
  useListPrice = false,
}) => {
  const activePresentations = (product?.presentations || []).filter(
    (p) => p.isActive !== false,
  );

  const productStock = typeof product?.stock === 'number' ? product.stock : 0;
  const tracksStock = product ? product.trackInventory !== false && product.type !== 'SERVICE' : false;
  const isOutOfStock = tracksStock && productStock <= 0;

  const handleChooseSuelto = useCallback(() => {
    if (!product || isOutOfStock) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
    onSelectSuelto(product);
    onClose();
  }, [product, isOutOfStock, onSelectSuelto, onClose]);

  const handleChoosePresentation = useCallback(
    (pres: PosProductPresentation) => {
      if (!product) return;
      const avail = getPresentationAvailableUnits(pres, productStock);
      if (tracksStock && avail <= 0) return;
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } catch {
        // ignore
      }
      onSelectPresentation(product, pres);
      onClose();
    },
    [product, productStock, tracksStock, onSelectPresentation, onClose],
  );

  // 306c #6: Atajos 1/2/3... y Esc en el selector de formas de venta
  useEffect(() => {
    if (!isOpen || !product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx === 0) {
          if (!isOutOfStock) {
            e.preventDefault();
            handleChooseSuelto();
          }
          return;
        }
        const pres = activePresentations[idx - 1];
        if (pres) {
          const avail = getPresentationAvailableUnits(pres, productStock);
          if (!tracksStock || avail > 0) {
            e.preventDefault();
            handleChoosePresentation(pres);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isOpen,
    product,
    activePresentations,
    isOutOfStock,
    productStock,
    tracksStock,
    handleChooseSuelto,
    handleChoosePresentation,
    onClose,
  ]);

  if (!isOpen || !product) return null;

  const baseUnitDisplay = getBaseUnitDisplayName(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Stack size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-gray-900 truncate">{product.name}</h3>
              <p className="text-xs text-gray-500">Elegí la forma de venta (teclas 1–{activePresentations.length + 1} o Esc)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de opciones */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          {/* Opción 1: Suelto (Unidad base) */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleChooseSuelto}
            className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
              isOutOfStock
                ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                : 'bg-white border-gray-200/90 hover:border-purple-500 hover:bg-purple-50/20 shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center shrink-0">
                <Package size={20} weight="bold" />
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-gray-800 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-gray-900 leading-snug truncate">
                  Suelto ({baseUnitDisplay})
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isOutOfStock
                    ? 'Sin existencia suficiente'
                    : `Existencia: ${productStock} ${pluralizeUnitName(baseUnitDisplay, productStock)}`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-xs sm:text-sm text-gray-900 tabular-nums">
                {formatCurrency(product.price, currency)}
              </p>
              {useListPrice && product.listPrice != null && Number(product.listPrice) > Number(product.price) && (
                <p className="text-xs text-gray-400 line-through tabular-nums">
                  {formatCurrency(Number(product.listPrice), currency)}
                </p>
              )}
              <span className="text-xs text-purple-700 font-semibold inline-flex items-center gap-1">
                <span>Elegir</span>
                <ArrowRight size={12} weight="bold" />
              </span>
            </div>
          </button>

          {/* Opciones 2..N: Formas de venta configuradas */}
          {activePresentations.map((pres, index) => {
            const availUnits = getPresentationAvailableUnits(pres, productStock);
            const isPresOutOfStock = tracksStock && availUnits <= 0;
            const hasWholesale = Boolean(
              pres.wholesalePrice &&
                pres.wholesaleMinQty &&
                Number(pres.wholesaleMinQty) >= 2 &&
                Number(pres.wholesalePrice) < Number(pres.price),
            );
            const hasPresListPrice = Boolean(
              useListPrice && pres.listPrice != null && Number(pres.listPrice) > Number(pres.price),
            );

            return (
              <button
                key={pres.id}
                type="button"
                disabled={isPresOutOfStock}
                onClick={() => handleChoosePresentation(pres)}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                  isPresOutOfStock
                    ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-purple-200/90 hover:border-purple-600 hover:bg-purple-50/30 shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                    <Stack size={20} weight="bold" />
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-purple-700 text-white text-xs font-bold flex items-center justify-center">
                      {index + 2}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">
                        {pres.name}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        Contiene {pres.factor} {pluralizeUnitName(baseUnitDisplay, pres.factor)}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isPresOutOfStock ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {isPresOutOfStock
                        ? 'Sin existencia suficiente'
                        : `Disponibles: ${availUnits} ${pluralizePresentationName(pres.name, availUnits)}`}
                    </p>
                    {hasWholesale && (
                      <p className="text-xs font-semibold text-purple-800">
                        Mayor: {formatCurrency(pres.wholesalePrice, currency)} desde {pres.wholesaleMinQty}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-xs sm:text-sm text-purple-900 tabular-nums">
                    {formatCurrency(pres.price, currency)}
                  </p>
                  {hasPresListPrice && (
                    <p className="text-xs text-gray-400 line-through tabular-nums">
                      {formatCurrency(Number(pres.listPrice), currency)}
                    </p>
                  )}
                  <span className="text-xs text-purple-700 font-semibold inline-flex items-center gap-1">
                    <span>Elegir</span>
                    <ArrowRight size={12} weight="bold" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer min-h-[40px]"
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
