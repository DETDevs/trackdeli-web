import React from 'react';
import { ShoppingCart, CaretUp, PaperPlaneTilt } from '@phosphor-icons/react';

interface FloatingCartBarProps {
  tableNumber: string | number;
  tableDisplayName?: string;
  newItemsCount: number;
  totalPendingAmount: number;
  existingItemsCount?: number;
  isRestaurante?: boolean;
  onOpenBottomSheet: () => void;
  onSendToKitchen?: () => void;
  isSendingToKitchen?: boolean;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  tableNumber,
  tableDisplayName,
  newItemsCount,
  totalPendingAmount,
  existingItemsCount = 0,
  isRestaurante = true,
  onOpenBottomSheet,
  onSendToKitchen,
  isSendingToKitchen = false,
}) => {
  const hasItems = newItemsCount > 0 || existingItemsCount > 0;
  if (!hasItems) return null;

  const displayTitle = tableDisplayName || `Mesa ${tableNumber}`;
  const showSendButton = isRestaurante && newItemsCount > 0 && Boolean(onSendToKitchen);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="w-full bg-gray-900 text-white p-2.5 sm:p-3 rounded-3xl shadow-float flex items-center justify-between border border-gray-800 gap-2">
          {/* Left: Tappable to open comanda bottom sheet */}
          <button
            type="button"
            onClick={onOpenBottomSheet}
            className="flex-1 min-w-0 flex items-center gap-3 text-left p-1 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer touch-manipulation"
          >
            <div className="relative w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <ShoppingCart size={20} weight="bold" />
              {newItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-pulseTap">
                  +{newItemsCount}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 truncate">
                  {displayTitle}
                </span>
                {newItemsCount > 0 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded shrink-0">
                    {newItemsCount} sin enviar
                  </span>
                )}
              </div>
              <p className="text-sm font-extrabold text-white font-mono">
                C$ {totalPendingAmount.toFixed(2)}
              </p>
            </div>

            {!showSendButton && (
              <div className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl text-xs font-bold text-gray-100 shrink-0">
                <span>Ver comanda</span>
                <CaretUp size={14} weight="bold" />
              </div>
            )}
          </button>

          {/* Right: Botón Fijo "Enviar a cocina (N)" — Visible solo si hay renglones sin enviar y perfil Restaurante */}
          {showSendButton && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenBottomSheet}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-200 transition-colors cursor-pointer touch-manipulation"
                title="Ver comanda detallada"
              >
                <CaretUp size={16} weight="bold" />
              </button>

              <button
                type="button"
                disabled={isSendingToKitchen}
                onClick={onSendToKitchen}
                className="py-2.5 px-3.5 sm:px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation whitespace-nowrap"
              >
                {isSendingToKitchen ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <PaperPlaneTilt size={14} weight="bold" />
                    <span>Enviar a cocina ({newItemsCount})</span>
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
