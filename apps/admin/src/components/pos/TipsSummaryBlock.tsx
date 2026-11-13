import React from 'react';
import type { CashRegisterTipsSummary } from 'api-client';
import { formatCurrency } from '../../utils/formatters';

interface TipsSummaryBlockProps {
  tipsSummary: CashRegisterTipsSummary;
  currency?: string;
  compact?: boolean;
}

/**
 * Muestra el resumen de propinas del turno separado de las ventas y caja.
 */
export const TipsSummaryBlock: React.FC<TipsSummaryBlockProps> = ({
  tipsSummary,
  currency = 'NIO',
  compact = false,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2.5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
          Propinas del turno
        </span>
        <span className="text-xs font-medium text-amber-800">
          Aparte de las ventas
        </span>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2 text-xs`}>
        <div className="p-2.5 rounded-lg bg-white border border-amber-200/70">
          <span className="text-xs text-gray-500 block">Efectivo C$</span>
          <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(tipsSummary.cashNio, currency)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-amber-200/70">
          <span className="text-xs text-gray-500 block">Efectivo US$</span>
          <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
            US$ {Number(tipsSummary.cashUsd || 0).toFixed(2)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-amber-200/70">
          <span className="text-xs text-gray-500 block">Tarjeta</span>
          <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(tipsSummary.card, currency)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-amber-200/70">
          <span className="text-xs text-gray-500 block">Transferencia</span>
          <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
            {formatCurrency(tipsSummary.transfer, currency)}
          </span>
        </div>

        <div className="col-span-2 p-2.5 rounded-lg bg-amber-100/70 border border-amber-300/80 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-950">Total base (C$)</span>
          <span className="text-sm font-black text-amber-950 tabular-nums whitespace-nowrap">
            {formatCurrency(tipsSummary.totalBase, currency)}
          </span>
        </div>
      </div>

      {!compact && Array.isArray(tipsSummary.byBank) && tipsSummary.byBank.length > 0 && (
        <div className="pt-2 border-t border-amber-200/70 space-y-1 text-xs">
          <span className="font-semibold text-amber-900 block">
            Desglose por banco
          </span>
          <div className="space-y-1">
            {tipsSummary.byBank.map((b) => (
              <div
                key={b.bankId}
                className="flex items-center justify-between gap-2 text-gray-700 bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-100"
              >
                <span className="truncate">{b.bankName}</span>
                <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(b.totalBase, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

