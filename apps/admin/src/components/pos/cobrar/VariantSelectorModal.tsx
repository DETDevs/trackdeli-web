import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, SlidersHorizontal, Package, WarningCircle } from '@phosphor-icons/react';
import { type PosProductItem } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';

interface VariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PosProductItem | null;
  onSelectVariant: (variant: PosProductItem) => void;
  currency?: string;
}

function normalizeVariantText(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant,
  currency = 'NIO',
}) => {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

  // Resetear selección al cambiar de producto
  useEffect(() => {
    if (!isOpen || !product) {
      setSelectedValues({});
      return;
    }

    // Auto-seleccionar primer valor si solo hay una opción por eje
    const initial: Record<string, string> = {};
    const axes = Array.isArray(product.variantAxes) ? product.variantAxes : [];
    axes.forEach((axis: any) => {
      if (Array.isArray(axis.values) && axis.values.length === 1) {
        initial[axis.key] = axis.values[0];
      }
    });
    setSelectedValues(initial);
  }, [isOpen, product]);

  const axes = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.variantAxes) && product.variantAxes.length > 0) {
      return product.variantAxes;
    }
    // Fallback: extraer ejes únicos desde las variantes
    const map: Record<string, Set<string>> = {};
    (product.variants || []).forEach((v) => {
      if (v.variantValues && typeof v.variantValues === 'object') {
        Object.entries(v.variantValues).forEach(([k, val]) => {
          if (!map[k]) map[k] = new Set();
          if (val) map[k].add(String(val));
        });
      }
    });
    return Object.entries(map).map(([k, set]) => ({
      key: k,
      name: k.charAt(0).toUpperCase() + k.slice(1),
      values: Array.from(set),
    }));
  }, [product]);

  // Encontrar la variante que coincide exactamente con los valores seleccionados
  const matchingVariant = useMemo<any | null>(() => {
    if (!product || !product.variants) return null;
    const requiredKeys = axes.map((a: any) => a.key);
    const hasAll = requiredKeys.every((k: string) => Boolean(selectedValues[k]));
    if (!hasAll) return null;

    return (
      product.variants.find((v) => {
        if (!v.variantValues || typeof v.variantValues !== 'object') return false;
        return requiredKeys.every((k: string) => {
          const vVal = (v.variantValues as any)[k];
          const sVal = selectedValues[k];
          return vVal != null && normalizeVariantText(String(vVal)) === normalizeVariantText(sVal);
        });
      }) || null
    );
  }, [product, axes, selectedValues]);

  if (!isOpen || !product) return null;

  const isTrackStock = matchingVariant?.trackInventory !== false && matchingVariant?.type !== 'SERVICE';
  const variantStock = typeof matchingVariant?.stock === 'number' ? matchingVariant.stock : 0;
  const isOutOfStock = isTrackStock && variantStock <= 0;
  const isInactive = matchingVariant ? matchingVariant.isActive === false : false;

  const canAdd = Boolean(matchingVariant && !isOutOfStock && !isInactive);

  const handleSelectAxisValue = (axisKey: string, value: string) => {
    setSelectedValues((prev) => ({
      ...prev,
      [axisKey]: value,
    }));
  };

  const handleConfirm = () => {
    if (!matchingVariant || !canAdd) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
    onSelectVariant(matchingVariant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-gray-900 truncate">{product.name}</h3>
              <p className="text-xs text-gray-500">Elegí la combinación de variante</p>
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

        {/* Contenido scrolleable */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Miniatura y precio base */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
                <Package size={22} weight="bold" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-700">Precio de catálogo:</p>
              <p className="text-base font-black text-gray-900 tabular-nums">
                {matchingVariant ? formatCurrency(matchingVariant.price, currency) : formatCurrency(product.price, currency)}
              </p>
            </div>
            {matchingVariant && (
              <div className="text-right">
                {isInactive ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    Inactiva
                  </span>
                ) : isOutOfStock ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                    Agotada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {variantStock} {matchingVariant.unit || product.unit || 'UND'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Selectores de ejes */}
          {axes.map((axis: any) => {
            const axisKey = axis.key;
            const axisName = axis.name || axisKey;
            const values = Array.isArray(axis.values) ? axis.values : [];
            const currentSelected = selectedValues[axisKey];

            return (
              <div key={axisKey} className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {axisName}: {currentSelected && <span className="text-purple-700 font-black">{currentSelected}</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {values.map((val: string) => {
                    const isSelected = currentSelected === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectAxisValue(axisKey, val)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {isSelected && <Check size={14} weight="bold" />}
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Alertas informativas */}
          {axes.some((a: any) => !selectedValues[a.key]) && (
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
              <Package size={16} className="text-purple-700 shrink-0" weight="bold" />
              <span>Seleccioná todas las opciones arriba para ver la variante.</span>
            </div>
          )}

          {matchingVariant && isOutOfStock && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <WarningCircle size={16} className="text-red-600 shrink-0" weight="bold" />
              <span>Esta variante está agotada en inventario.</span>
            </div>
          )}

          {matchingVariant && isInactive && (
            <div className="p-3 rounded-xl bg-gray-100 border border-gray-200 text-xs text-gray-700 flex items-center gap-2">
              <WarningCircle size={16} className="text-gray-500 shrink-0" weight="bold" />
              <span>Esta combinación está desactivada para venta.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center gap-1.5 ${
              canAdd
                ? 'bg-gray-900 hover:bg-black text-white shadow-xs cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Agregar al carrito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
