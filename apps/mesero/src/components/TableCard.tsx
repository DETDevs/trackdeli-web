import React from 'react';
import { Users, Clock, Receipt, PlusCircle } from '@phosphor-icons/react';
import type { TableStatusSummary } from '../types/mesero';

interface TableCardProps {
  table: TableStatusSummary;
  onClick: () => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onClick }) => {
  const isOccupied = table.isOccupied && Boolean(table.activeOrder);

  const handleClick = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
    onClick();
  };

  const openedTimeStr = table.activeOrder?.openedAt
    ? new Date(table.activeOrder.openedAt).toLocaleTimeString('es-NI', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left p-3.5 sm:p-4 rounded-3xl transition-all active:scale-[0.98] cursor-pointer touch-manipulation flex flex-col justify-between min-h-[135px] shadow-xs relative overflow-hidden ${
        isOccupied
          ? 'bg-amber-50/90 border-2 border-amber-400 hover:border-amber-500 text-amber-950'
          : 'bg-white border-2 border-emerald-500/80 hover:border-emerald-600 text-gray-900'
      }`}
    >
      {/* Top row: Number and Status pill */}
      <div className="flex items-start justify-between w-full gap-1.5">
        <div className="min-w-0 flex-1">
          <span className="text-xl sm:text-2xl font-black tracking-tight block whitespace-nowrap leading-tight text-gray-900">
            Mesa {table.number}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium mt-0.5 whitespace-nowrap">
            <Users size={12} weight="bold" className="shrink-0" />
            <span>{table.capacity} comensales</span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide shrink-0 whitespace-nowrap ${
            isOccupied
              ? 'bg-amber-200/90 text-amber-900 border border-amber-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          {isOccupied ? 'Ocupada' : 'Libre'}
        </span>
      </div>

      {/* Bottom row: Details depending on status */}
      <div className="pt-2.5 w-full border-t border-black/5 mt-2.5">
        {isOccupied && table.activeOrder ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-800 font-medium flex items-center gap-1 whitespace-nowrap">
                <Receipt size={13} className="shrink-0" />
                {table.activeOrder.itemCount} {table.activeOrder.itemCount === 1 ? 'ítem' : 'ítems'}
              </span>
              {openedTimeStr && (
                <span className="text-[11px] text-amber-700/80 flex items-center gap-1 font-mono whitespace-nowrap">
                  <Clock size={11} className="shrink-0" />
                  {openedTimeStr}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-amber-950 tracking-tight whitespace-nowrap block">
                C$ {table.activeOrder.total.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-emerald-700 font-semibold text-xs whitespace-nowrap">
            <span>Abrir comanda</span>
            <PlusCircle size={18} weight="duotone" className="shrink-0" />
          </div>
        )}
      </div>
    </button>
  );
};
