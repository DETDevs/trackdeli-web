import React from 'react';
import {
  Users,
  Clock,
  Receipt,
  PlusCircle,
  User as UserIcon,
} from '@phosphor-icons/react';
import type { PosTableStatusItem } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';

interface SalonTableCardProps {
  table: PosTableStatusItem;
  currency?: string;
  nowMs: number;
  isOpening: boolean;
  disabled: boolean;
  onSelect: (table: PosTableStatusItem) => void;
}

const formatTableTitle = (rawNumber: string): string => {
  const clean = String(rawNumber || '').trim();
  if (!clean) return 'Mesa';
  return /^mesa\s+/i.test(clean) ? clean : `Mesa ${clean}`;
};

const formatElapsed = (openedAtIso: string, nowMs: number): string => {
  const openedMs = new Date(openedAtIso).getTime();
  if (!Number.isFinite(openedMs)) return 'Recién';
  const diffMin = Math.max(0, Math.floor((nowMs - openedMs) / 60000));
  if (diffMin < 1) return 'Recién';
  if (diffMin < 60) return `${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return remMin > 0 ? `${hours} h ${remMin} min` : `${hours} h`;
};

export const SalonTableCard: React.FC<SalonTableCardProps> = React.memo(
  ({ table, currency = 'NIO', nowMs, isOpening, disabled, onSelect }) => {
    const order = table.currentOrder;
    const isOccupied = table.status === 'OCCUPIED' && Boolean(order);
    const isBillRequested =
      isOccupied &&
      (table.displayStatus === 'BILL_REQUESTED' ||
        table.billStatus === 'REQUESTED' ||
        order?.billStatus === 'REQUESTED');
    const isRound = String(table.shape || '').toUpperCase() === 'ROUND';
    const shapeLabel = isRound ? 'Redonda' : 'Cuadrada';
    const waiterName =
      table.assignedWaiter?.name || order?.assignedWaiter?.name || null;
    const customerName = table.customerName || order?.customerName || null;
    const billRequestedAt = table.billRequestedAt || order?.billRequestedAt || null;

    const cardSurfaceClass = isBillRequested
      ? 'border-indigo-300 bg-indigo-50/75 hover:border-indigo-400 hover:bg-indigo-50'
      : isOccupied
      ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400 hover:bg-amber-50/80'
      : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30';

    const iconSurfaceClass = isBillRequested
      ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
      : isOccupied
      ? 'bg-amber-100 border-amber-300 text-amber-900'
      : 'bg-gray-100 border-gray-200 text-gray-800';

    const statusBadgeClass = isBillRequested
      ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
      : isOccupied
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    return (
      <button
        type="button"
        onClick={() => onSelect(table)}
        disabled={disabled}
        data-table-status={isBillRequested ? 'BILL_REQUESTED' : isOccupied ? 'OCCUPIED' : 'FREE'}
        className={`w-full text-left min-h-[144px] p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] shadow-xs ${cardSurfaceClass}`}
      >
        {/* Fila superior: forma visual, número, capacidad y estado */}
        <div className="flex items-start justify-between gap-2.5 w-full">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              aria-hidden="true"
              className={`w-10 h-10 shrink-0 flex items-center justify-center text-sm font-bold border ${
                isRound ? 'rounded-full' : 'rounded-xl'
              } ${iconSurfaceClass}`}
            >
              {String(table.number || '').replace(/^mesa\s+/i, '').slice(0, 4) || 'M'}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate leading-snug">
                {formatTableTitle(table.number)}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-600 mt-0.5">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Users size={14} weight="bold" className="shrink-0 text-gray-500" />
                  {table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}
                </span>
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
                <span className="whitespace-nowrap">{shapeLabel}</span>
              </div>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap border inline-flex items-center gap-1 ${statusBadgeClass}`}
          >
            {isBillRequested && <Receipt size={13} weight="bold" />}
            <span>{isBillRequested ? 'Cuenta pedida' : isOccupied ? 'Ocupada' : 'Libre'}</span>
          </span>
        </div>

        {/* Fila inferior: resumen de orden abierta o acción de abrir */}
        <div
          className={`pt-3 border-t w-full ${
            isBillRequested
              ? 'border-indigo-200/80'
              : isOccupied
              ? 'border-amber-200/80'
              : 'border-gray-100'
          }`}
        >
          {isOccupied && order ? (
            <div className="space-y-1.5">
              {isBillRequested && (
                <div className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                  <Receipt size={14} weight="bold" className="shrink-0" />
                  <span className="truncate">
                    Cuenta pedida{billRequestedAt ? ` · ${formatElapsed(billRequestedAt, nowMs)}` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-xs text-gray-700">
                <span
                  className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
                    isBillRequested ? 'text-indigo-900' : 'text-amber-900'
                  }`}
                >
                  <Receipt
                    size={15}
                    className={`shrink-0 ${isBillRequested ? 'text-indigo-700' : 'text-amber-700'}`}
                  />
                  {order.itemsCount} {order.itemsCount === 1 ? 'ítem' : 'ítems'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 whitespace-nowrap tabular-nums ${
                    isBillRequested ? 'text-indigo-800' : 'text-amber-800'
                  }`}
                >
                  <Clock size={14} className="shrink-0" />
                  {formatElapsed(order.openedAt || order.createdAt, nowMs)}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 pt-0.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  {waiterName && (
                    <p className="text-xs text-gray-700 truncate flex items-center gap-1">
                      <UserIcon size={13} className="shrink-0 text-gray-500" />
                      <span className="truncate">{waiterName}</span>
                    </p>
                  )}
                  {customerName && (
                    <p className="text-xs text-gray-500 truncate">{customerName}</p>
                  )}
                  {!waiterName && !customerName && (
                    <p
                      className={`text-xs font-medium ${
                        isBillRequested ? 'text-indigo-800' : 'text-amber-800'
                      }`}
                    >
                      {isBillRequested ? 'Lista para cobrar' : 'Ver mesa'}
                    </p>
                  )}
                </div>

                <span className="text-lg font-bold text-[#0F0F0F] tabular-nums shrink-0 whitespace-nowrap">
                  {formatCurrency(order.total, currency)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-emerald-700">
              <span>{isOpening ? 'Abriendo mesa...' : 'Abrir mesa'}</span>
              {isOpening ? (
                <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <PlusCircle size={20} weight="duotone" className="shrink-0" />
              )}
            </div>
          )}
        </div>
      </button>
    );
  },
);
