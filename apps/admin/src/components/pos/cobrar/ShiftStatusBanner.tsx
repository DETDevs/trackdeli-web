import React from 'react';
import { CheckCircle, WarningCircle, Plus } from '@phosphor-icons/react';
import { formatManaguaTime } from '../../../utils/dateManagua';

interface ShiftStatusBannerProps {
  isOpen: boolean;
  cashierName?: string | null;
  openedAt?: string | null;
  onOpenShiftClick: () => void;
  isLoading?: boolean;
}

export const ShiftStatusBanner: React.FC<ShiftStatusBannerProps> = ({
  isOpen,
  cashierName,
  openedAt,
  onOpenShiftClick,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-gray-100 animate-pulse rounded-xl h-10 w-full mb-3" />
    );
  }

  if (isOpen) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-xs mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="truncate text-emerald-950 font-medium">
            <span className="font-bold">Caja abierta</span>
            {cashierName && <span className="text-emerald-700"> · {cashierName}</span>}
            {openedAt && (
              <span className="text-emerald-600/80 text-[11px] ml-1">
                ({formatManaguaTime(openedAt)})
              </span>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 uppercase tracking-wider shrink-0 bg-emerald-100/70 px-2 py-0.5 rounded-md">
          <CheckCircle size={12} weight="bold" />
          Turno activo
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <WarningCircle size={18} className="text-amber-600 shrink-0" weight="fill" />
        <div className="min-w-0">
          <div className="font-bold text-amber-950">Caja cerrada</div>
          <div className="text-[11px] text-amber-700 truncate">
            Debes abrir turno para registrar ventas
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenShiftClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
      >
        <Plus size={13} weight="bold" />
        <span>Abrir turno</span>
      </button>
    </div>
  );
};
