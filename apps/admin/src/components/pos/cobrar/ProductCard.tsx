import React from 'react';
import { Plus, Package, Wrench, Sparkle } from '@phosphor-icons/react';
import { type PosProductItem } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';

interface ProductCardProps {
  product: PosProductItem;
  quantityInCart: number;
  onAdd: (product: PosProductItem) => void;
  disabled?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAdd,
  disabled,
}) => {
  const isService = product.type === 'SERVICE';
  const isRecipe = Boolean(product.isRecipe);
  const trackStock = product.trackInventory !== false && !isService;
  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const isOutOfStock = trackStock && stock <= 0;

  const handleClick = () => {
    if (disabled || isOutOfStock) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
    onAdd(product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isOutOfStock}
      className={`group relative text-left p-3 rounded-2xl border transition-all select-none flex flex-col justify-between h-[115px] sm:h-[125px] cursor-pointer active:scale-97 ${
        isOutOfStock
          ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed'
          : quantityInCart > 0
          ? 'bg-emerald-50/40 border-emerald-400 shadow-xs'
          : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Indicador superior de tipo / stock */}
      <div className="flex items-center justify-between w-full gap-1 mb-1">
        <div className="truncate">
          {isService ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Wrench size={10} />
              Servicio
            </span>
          ) : isRecipe ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
              <Sparkle size={10} />
              Receta
            </span>
          ) : trackStock ? (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                isOutOfStock
                  ? 'bg-red-50 text-red-700 border border-red-200/70'
                  : stock <= 5
                  ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Package size={10} />
              {isOutOfStock ? 'Agotado' : `${stock} ${product.unit || 'UND'}`}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">Producto</span>
          )}
        </div>

        {quantityInCart > 0 && (
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
            {quantityInCart}
          </span>
        )}
      </div>

      {/* Nombre del producto */}
      <div className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight flex-1 flex items-center">
        {product.name}
      </div>

      {/* Precio */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100/70">
        <span className="font-bold text-xs sm:text-sm text-emerald-800 tracking-tight">
          {formatCurrency(product.price)}
        </span>
        <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-gray-900 group-hover:text-white flex items-center justify-center text-gray-500 transition-colors">
          <Plus size={12} weight="bold" />
        </div>
      </div>
    </button>
  );
};
