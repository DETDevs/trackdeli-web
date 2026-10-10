import React from 'react';
import { CheckCircle, Plus } from '@phosphor-icons/react';
import { type SaleResponse } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import { formatManaguaDateTime } from '../../../utils/dateManagua';

interface SaleSuccessViewProps {
  sale: SaleResponse;
  onNewSale: () => void;
}

export const SaleSuccessView: React.FC<SaleSuccessViewProps> = ({
  sale,
  onNewSale,
}) => {
  const methodLabel: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 select-none">
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center shadow-xl shadow-gray-200/40 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Success Icon */}
        <div className="relative inline-flex items-center justify-center mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle size={44} weight="fill" />
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-800 uppercase tracking-wider mb-2">
            Venta Registrada
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            ¡Cobro completado!
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Factura:{' '}
            <span className="font-mono font-bold text-gray-800">
              {sale.invoiceNumber || sale.id.slice(-6).toUpperCase()}
            </span>
          </p>
        </div>

        {/* Resumen de cobro */}
        <div className="bg-gray-50/90 border border-gray-200/70 rounded-2xl p-4 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span>Fecha y hora</span>
            <span className="font-medium text-gray-800">
              {formatManaguaDateTime(sale.createdAt || new Date())}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Método de pago</span>
            <span className="font-bold text-gray-800">
              {methodLabel[sale.paymentMethod] || sale.paymentMethod || 'Efectivo'}
            </span>
          </div>

          {sale.paymentMethod === 'EFECTIVO' && sale.amountPaid != null && sale.amountPaid > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span>Monto recibido</span>
              <span className="font-medium text-gray-800">
                {formatCurrency(sale.amountPaid)}
              </span>
            </div>
          )}

          {sale.paymentMethod === 'EFECTIVO' && sale.change != null && sale.change > 0 && (
            <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/60 p-2 rounded-xl">
              <span>Cambio / Vuelto</span>
              <span className="text-sm font-black">{formatCurrency(sale.change)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Total cobrado</span>
            <span className="text-lg font-black text-emerald-800">
              {formatCurrency(sale.total)}
            </span>
          </div>
        </div>

        {/* Acción principal: Nueva Venta */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={onNewSale}
            className="w-full py-4 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm sm:text-base rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 min-h-[50px]"
          >
            <Plus size={18} weight="bold" />
            <span>Nueva venta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
