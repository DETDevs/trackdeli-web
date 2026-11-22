import React from 'react';
import { X, Stack, Package, ArrowRight } from '@phosphor-icons/react';
import { type PosProductItem, type PosProductPresentation } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';

interface PresentationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PosProductItem | null;
  onSelectSuelto: (product: PosProductItem) => void;
  onSelectPresentation: (product: PosProductItem, presentation: PosProductPresentation) => void;
  currency?: string;
}

const formatUnitLabel = (unit?: string): string => {
  const u = (unit || 'UND').trim().toUpperCase();
  switch (u) {
    case 'LB':
      return 'por libra';
    case 'KG':
      return 'por kilo';
    case 'LT':
      return 'por litro';
    case 'GAL':
      return 'por galón';
    case 'UND':
      return 'por unidad';
    case 'ROLLO':
      return 'por rollo';
    case 'MT':
      return 'por metro';
    case 'DOC':
      return 'por docena';
    case 'PAR':
      return 'por par';
    case 'CAJA':
      return 'por caja';
    default:
      return `por ${u.toLowerCase()}`;
  }
};

export const PresentationSelectorModal: React.FC<PresentationSelectorModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectSuelto,
  onSelectPresentation,
  currency = 'NIO',
}) => {
  if (!isOpen || !product) return null;

  const activePresentations = (product.presentations || []).filter(
    (p) => p.isActive !== false,
  );

  const productStock = typeof product.stock === 'number' ? product.stock : 0;
  const isOutOfStock = product.trackInventory !== false && product.type !== 'SERVICE' && productStock <= 0;

  const handleChooseSuelto = () => {
    if (isOutOfStock) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
    onSelectSuelto(product);
    onClose();
  };

  const handleChoosePresentation = (pres: PosProductPresentation) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
    onSelectPresentation(product, pres);
    onClose();
  };

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
              <p className="text-xs text-gray-500">Elegí la presentación a vender</p>
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
              <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center shrink-0">
                <Package size={20} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-gray-900 leading-snug truncate">
                  Suelto ({formatUnitLabel(product.unit)})
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Existencia: {productStock} {product.unit || 'UND'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-xs sm:text-sm text-gray-900 tabular-nums">
                {formatCurrency(product.price, currency)}
              </p>
              <span className="text-xs text-purple-700 font-semibold inline-flex items-center gap-1">
                <span>Elegir</span>
                <ArrowRight size={12} weight="bold" />
              </span>
            </div>
          </button>

          {/* Opciones 2..N: Presentaciones configuradas */}
          {activePresentations.map((pres) => {
            const factor = Number(pres.factor) || 1;
            const presStock = Math.floor(productStock / factor);
            const isPresOutOfStock = product.trackInventory !== false && product.type !== 'SERVICE' && presStock <= 0;
            const hasWholesale = Boolean(
              pres.wholesalePrice &&
              pres.wholesaleMinQty &&
              Number(pres.wholesaleMinQty) >= 2 &&
              Number(pres.wholesalePrice) < Number(pres.price),
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
                  <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                    <Stack size={20} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">
                        {pres.name}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        Factor: {pres.factor} {product.unit || 'UND'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Equivalente: {presStock} {pres.name} disponibles
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
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
