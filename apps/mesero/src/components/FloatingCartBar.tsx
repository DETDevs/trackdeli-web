import React from 'react';
import { ShoppingCart, CaretUp } from '@phosphor-icons/react';

interface FloatingCartBarProps {
  tableNumber: string | number;
  newItemsCount: number;
  totalPendingAmount: number;
  existingItemsCount?: number;
  onOpenBottomSheet: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  tableNumber,
  newItemsCount,
  totalPendingAmount,
  existingItemsCount = 0,
  onOpenBottomSheet,
}) => {
  const hasItems = newItemsCount > 0 || existingItemsCount > 0;
  if (!hasItems) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          type="button"
          onClick={onOpenBottomSheet}
          className="w-full bg-gray-900 active:bg-black text-white p-3.5 sm:p-4 rounded-3xl shadow-float flex items-center justify-between transition-transform active:scale-[0.98] cursor-pointer touch-manipulation border border-gray-800"
        >
          {/* Left: Ítems badge and Table */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingCart size={20} weight="bold" />
              {newItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-pulseTap">
                  +{newItemsCount}
                </span>
              )}
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Mesa {tableNumber}
                </span>
                {newItemsCount > 0 && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded">
                    {newItemsCount} por enviar
                  </span>
                )}
              </div>
              <p className="text-sm font-extrabold text-white">
                C$ {totalPendingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Right: Action trigger */}
          <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-100">
            <span>Ver comanda</span>
            <CaretUp size={14} weight="bold" />
          </div>
        </button>
      </div>
    </div>
  );
};
