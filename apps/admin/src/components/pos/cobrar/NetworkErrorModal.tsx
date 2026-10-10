import React, { useState, useEffect } from 'react';
import {
  X,
  WarningCircle,
  Clock,
  ArrowClockwise,
  CircleNotch,
} from '@phosphor-icons/react';
import { getRecentPosSales } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import { formatManaguaTime } from '../../../utils/dateManagua';

interface NetworkErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryCobro: () => void;
  onDiscardAndClean: () => void;
}

export const NetworkErrorModal: React.FC<NetworkErrorModalProps> = ({
  isOpen,
  onClose,
  onRetryCobro,
  onDiscardAndClean,
}) => {
  const [sales, setSales] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  const fetchSales = async () => {
    setIsLoadingSales(true);
    setSalesError(null);
    try {
      const data = await getRecentPosSales(5);
      setSales(data);
    } catch {
      setSalesError('No se pudieron consultar las últimas ventas. Revisa tu conexión.');
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSales();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header con advertencia */}
        <div className="p-5 bg-amber-50/90 border-b border-amber-200/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <WarningCircle size={24} weight="fill" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-950 leading-tight">
                Falla de conexión al cobrar
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-snug">
                No sabemos si la venta se registró. Revisá las últimas ventas antes de volver a cobrar para no duplicarla.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-amber-700 hover:bg-amber-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Últimas ventas */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Clock size={15} />
              Últimas 5 ventas registradas
            </span>
            <button
              type="button"
              onClick={fetchSales}
              disabled={isLoadingSales}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              <ArrowClockwise size={12} className={isLoadingSales ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>

          {isLoadingSales ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-xs">
              <CircleNotch size={20} className="animate-spin mb-2" />
              <span>Consultando últimas ventas...</span>
            </div>
          ) : salesError ? (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">
              {salesError}
            </div>
          ) : sales.length === 0 ? (
            <div className="py-6 text-center text-gray-400 text-xs bg-gray-50 rounded-xl">
              No hay ventas registradas recientemente en este turno.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200/80 rounded-2xl overflow-hidden bg-gray-50/50">
              {sales.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-gray-900">
                      {s.invoiceNumber || s.id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {formatManaguaTime(s.createdAt)} · {s.paymentMethod || 'Efectivo'}
                      {s.customerName ? ` · ${s.customerName}` : ''}
                    </div>
                  </div>
                  <div className="font-bold text-emerald-800 text-sm shrink-0 ml-2">
                    {formatCurrency(s.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2 shrink-0">
          <button
            type="button"
            onClick={onDiscardAndClean}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Ya se registró: limpiar carrito e iniciar nueva venta
          </button>

          <button
            type="button"
            onClick={onRetryCobro}
            className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            No se registró: volver a intentar cobrar
          </button>
        </div>
      </div>
    </div>
  );
};
