import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrderDispatches, type OrderDispatch } from 'api-client';
import {
  Hourglass,
  Motorcycle,
  Clock,
  CheckCircle,
  XCircle,
  ClockCountdown,
} from '@phosphor-icons/react';
import { formatRelativeCompact } from '../utils/formatDate';

interface OrderDispatchPanelProps {
  orderId: string;
  orderStatus: string;
  initialDispatches?: OrderDispatch[];
}

export const OrderDispatchPanel: React.FC<OrderDispatchPanelProps> = ({
  orderId,
  orderStatus,
  initialDispatches,
}) => {
  const [now, setNow] = useState(Date.now());

  // Update clock every second for countdown and elapsed calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: dispatches = initialDispatches || [] } = useQuery({
    queryKey: ['order-dispatches', orderId],
    queryFn: () => getOrderDispatches(orderId),
    refetchInterval: orderStatus === 'OFERTADO' ? 3000 : false,
  });

  // Sort by attempt descending
  const sortedDispatches = useMemo(() => {
    return [...dispatches].sort((a, b) => b.attempt - a.attempt);
  }, [dispatches]);

  const activeDispatch = useMemo(() => {
    return sortedDispatches.find((d) => d.status === 'SENT');
  }, [sortedDispatches]);

  const pastDispatches = useMemo(() => {
    return sortedDispatches.filter((d) => d.status !== 'SENT');
  }, [sortedDispatches]);

  if (dispatches.length === 0 && orderStatus !== 'OFERTADO') {
    return null;
  }

  // Calculate elapsed time from sentAt
  const formatElapsed = (sentAt: string) => {
    const sentTime = new Date(sentAt).getTime();
    const diffSec = Math.max(0, Math.floor((now - sentTime) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins === 0) return `${secs} seg`;
    return `${mins} min ${secs} seg`;
  };

  // Calculate remaining countdown until timeoutAt
  const formatCountdown = (timeoutAt: string) => {
    const expiresTime = new Date(timeoutAt).getTime();
    const remainSec = Math.floor((expiresTime - now) / 1000);
    if (remainSec <= 0) return '00:00 (Expirando...)';
    const mins = Math.floor(remainSec / 60);
    const secs = remainSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-amber-200/80 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hourglass size={18} weight="fill" className="text-amber-600 animate-spin-slow" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Estado de Asignación (Despacho)
          </h3>
        </div>
        {orderStatus === 'OFERTADO' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/60 text-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
            <span>Ofertando a repartidores</span>
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Active Dispatch */}
        {activeDispatch ? (
          <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                  <Motorcycle size={20} weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      Intento #{activeDispatch.attempt}
                    </span>
                    <p className="font-semibold text-gray-900 text-sm">
                      {activeDispatch.rider?.name || 'Repartidor asignado'}
                    </p>
                  </div>
                  {activeDispatch.rider?.vehicleType && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activeDispatch.rider.vehicleType}
                      {activeDispatch.rider.vehiclePlate ? ` · ${activeDispatch.rider.vehiclePlate}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/40 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <span>Enviado hace: <strong>{formatElapsed(activeDispatch.sentAt)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-900 font-medium justify-end">
                <ClockCountdown size={14} className="text-amber-700 shrink-0" />
                <span>Expira en: <strong className="font-mono text-sm">{formatCountdown(activeDispatch.timeoutAt)}</strong></span>
              </div>
            </div>
          </div>
        ) : (
          orderStatus === 'OFERTADO' && (
            <div className="text-center py-4 text-xs text-gray-500">
              <Hourglass size={24} className="mx-auto text-amber-500 mb-1.5 animate-pulse" />
              <p className="font-medium text-gray-800">Buscando el siguiente repartidor disponible...</p>
              <p className="text-[11px] text-gray-400 mt-0.5">El sistema asignará la orden automáticamente según proximidad.</p>
            </div>
          )
        )}

        {/* Previous Attempts */}
        {pastDispatches.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Intentos anteriores ({pastDispatches.length})
            </p>
            <div className="space-y-2">
              {pastDispatches.map((dispatch) => {
                const isRejected = dispatch.status === 'REJECTED';
                const isAccepted = dispatch.status === 'ACCEPTED';

                return (
                  <div
                    key={dispatch.id}
                    className="flex items-center justify-between text-xs py-2 px-3 bg-gray-50/70 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isAccepted ? (
                        <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
                      ) : isRejected ? (
                        <XCircle size={15} weight="fill" className="text-red-500 shrink-0" />
                      ) : (
                        <Clock size={15} weight="fill" className="text-amber-500 shrink-0" />
                      )}
                      <span className="font-medium text-gray-700 truncate">
                        Intento #{dispatch.attempt} — {dispatch.rider?.name || 'Repartidor'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isAccepted
                            ? 'bg-emerald-50 text-emerald-700'
                            : isRejected
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isAccepted ? 'Aceptó' : isRejected ? 'Rechazó' : 'Expiró (sin respuesta)'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {formatRelativeCompact(dispatch.respondedAt || dispatch.timeoutAt || dispatch.sentAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
