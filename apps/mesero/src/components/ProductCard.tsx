import React from 'react';
import { Plus, NotePencil, ForkKnife } from '@phosphor-icons/react';
import type { Product } from '../types/mesero';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAdd: () => void;
  onEditNotes?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAdd,
  onEditNotes,
}) => {
  const handleTap = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
    onAdd();
  };

  return (
    <div
      onClick={handleTap}
      className={`group relative p-3 rounded-2xl bg-white border transition-all duration-150 active:scale-[0.97] cursor-pointer touch-manipulation flex flex-col justify-between select-none shadow-xs ${
        quantityInCart > 0
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Badge de cantidad activa en comanda */}
      {quantityInCart > 0 && (
        <div className="absolute -top-2 -right-2 z-10 bg-brand-600 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-pulseTap">
          {quantityInCart}
        </div>
      )}

      {/* Imagen o Placeholder */}
      <div className="w-full aspect-4/3 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden mb-2.5 flex items-center justify-center text-gray-400">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <ForkKnife size={26} weight="duotone" className="text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
              {product.description}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs font-black text-emerald-700 font-mono">
            C$ {product.price.toFixed(2)}
          </span>

          <div className="flex items-center gap-1">
            {quantityInCart > 0 && onEditNotes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditNotes();
                }}
                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
                title="Nota especial"
              >
                <NotePencil size={13} weight="bold" />
              </button>
            )}
            <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-brand-50 group-hover:text-brand-700 flex items-center justify-center text-gray-700 transition-colors">
              <Plus size={13} weight="bold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
