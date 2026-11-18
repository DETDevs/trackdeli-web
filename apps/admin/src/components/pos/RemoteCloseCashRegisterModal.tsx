import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  CashRegister,
  Warning,
  WarningCircle,
  CheckCircle,
  CircleNotch,
  Desktop,
  Globe,
  DeviceMobile,
} from '@phosphor-icons/react';
import { closeCashRegisterById, type PosOpenCashRegisterItem } from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { getStoredWebDeviceHeaders } from '../../hooks/usePosWebDevice';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';

interface RemoteCloseCashRegisterModalProps {
  register: PosOpenCashRegisterItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency?: string;
}

function getSourceLabel(source?: string): string {
  if (source === 'WEB') return 'Web';
  if (source === 'MOBILE') return 'Móvil';
  if (source === 'DESKTOP') return 'Computadora';
  return 'Caja';
}

export const RemoteCloseCashRegisterModal: React.FC<RemoteCloseCashRegisterModalProps> = ({
  register,
  isOpen,
  onClose,
  onSuccess,
  currency = 'NIO',
}) => {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((s) => s.user?.businessId);

  const [closingCashStr, setClosingCashStr] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedResult, setClosedResult] = useState<any | null>(null);
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => {
    if (isOpen && register) {
      setClosingCashStr('');
      setReason('');
      setErrorMessage(null);
      setClosedResult(null);
      idempotencyKeyRef.current = '';
    }
  }, [isOpen, register?.id]);

  if (!isOpen || !register) return null;

  const source = (register.registerSource || register.registerType || '').toUpperCase();
  const isDesktop = source === 'DESKTOP';
  const pendingCount = Number(register.pendingOfflineSalesCount ?? 0);
  const hasPendingOffline = Boolean(register.hasPendingOfflineSales || pendingCount > 0);

  const handleCloseModal = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (closingCashStr.trim() === '') {
      setErrorMessage('Ingresá el efectivo contado para cerrar el turno.');
      return;
    }

    const parsedCash = Number(closingCashStr);
    if (!Number.isFinite(parsedCash) || parsedCash < 0) {
      setErrorMessage('El efectivo contado debe ser un monto válido mayor o igual a 0.');
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      setErrorMessage('El motivo es obligatorio y debe tener al menos 5 caracteres.');
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `remote-close-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    setIsSubmitting(true);
    try {
      const normalizedCash = Math.round(parsedCash * 100) / 100;
      const storedHeaders = getStoredWebDeviceHeaders(businessId);
      const res = await closeCashRegisterById(
        register.id,
        {
          closingCash: normalizedCash,
          actualAmount: normalizedCash,
          reason: trimmedReason,
        },
        {
          deviceHeaders: {
            ...(storedHeaders || {}),
            'Idempotency-Key': idempotencyKeyRef.current,
          },
        },
      );

      idempotencyKeyRef.current = '';
      setClosedResult(res);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos', 'cash-registers', 'open-list'] }),
        queryClient.invalidateQueries({ queryKey: ['backoffice'] }),
        queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pos', 'web-billing', 'status'] }),
      ]);
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo cerrar la caja. Intentá de nuevo.';
      setErrorMessage(typeof msg === 'string' ? msg : 'No se pudo cerrar la caja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSourceIcon = () => {
    if (source === 'WEB') return <Globe size={15} className="text-blue-600 shrink-0" />;
    if (source === 'MOBILE') return <DeviceMobile size={15} className="text-purple-600 shrink-0" />;
    return <Desktop size={15} className="text-gray-600 shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden border border-gray-200">
        {/* Encabezado */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0 bg-gray-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <CashRegister size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {closedResult ? 'Caja cerrada' : 'Cerrar caja abierta'}
              </h3>
              <p className="text-xs text-gray-600 truncate">
                Turno #{register.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            aria-label="Cerrar ventana"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        {!closedResult ? (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Información de la caja a cerrar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs text-gray-600 block">Caja</span>
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                    {renderSourceIcon()}
                    <span className="truncate">{register.deviceName || 'Caja sin nombre'}</span>
                  </div>
                  {source && (
                    <span className="inline-block text-xs text-gray-600">
                      Tipo: {getSourceLabel(source)}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs text-gray-600 block">Cajero</span>
                  <p className="font-semibold text-gray-900 truncate">
                    {register.cashierName || 'Cajero'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs text-gray-600 block">Abierta desde</span>
                  <p className="font-medium text-gray-900">{formatDateTime(register.openedAt)}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs text-gray-600 block">Fondo inicial</span>
                  <p className="font-semibold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                    {formatCurrency(register.openingCash, currency)}
                  </p>
                </div>
              </div>

              {/* Aviso para cajas de computadora */}
              {isDesktop && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    hasPendingOffline
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <Warning
                    size={18}
                    weight="fill"
                    className={`shrink-0 mt-0.5 ${
                      hasPendingOffline ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                  <div className="space-y-1 min-w-0">
                    {hasPendingOffline && (
                      <p className="font-bold">
                        Esta computadora tiene {pendingCount}{' '}
                        {pendingCount === 1
                          ? 'venta sin internet pendiente'
                          : 'ventas sin internet pendientes'}{' '}
                        por sincronizar.
                      </p>
                    )}
                    <p className="leading-relaxed">
                      Si esa computadora vendió sin internet, esas ventas pueden quedar fuera de este cierre.
                    </p>
                    {register.lastSeenAt && (
                      <p className="text-xs opacity-90">
                        Última conexión: {formatDateTime(register.lastSeenAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                  <WarningCircle size={16} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="remote-close-cash"
                  className="block text-xs font-semibold text-gray-900"
                >
                  Efectivo contado ({currency}) *
                </label>
                <input
                  id="remote-close-cash"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={closingCashStr}
                  onChange={(e) => setClosingCashStr(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-gray-900 focus:outline-hidden text-sm font-mono tabular-nums text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="remote-close-reason"
                  className="block text-xs font-semibold text-gray-900"
                >
                  Motivo del cierre *
                </label>
                <textarea
                  id="remote-close-reason"
                  rows={3}
                  required
                  minLength={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Explicá por qué se cierra este turno desde el panel..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-gray-900 focus:outline-hidden text-xs text-gray-900 resize-none"
                />
                <p className="text-xs text-gray-600">Mínimo 5 caracteres.</p>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:bg-red-300 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    <span>Cerrando...</span>
                  </>
                ) : (
                  <span>Confirmar cierre</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <CheckCircle size={22} weight="fill" className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-xs">Turno cerrado correctamente</p>
                  <p className="text-xs text-emerald-800">
                    {register.deviceName || 'Caja'} · {register.cashierName || 'Cajero'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-xs text-gray-600 block">Efectivo esperado</span>
                  <span className="text-sm font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                    {formatCurrency(closedResult.expectedCash ?? 0, currency)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-xs text-gray-600 block">Efectivo contado</span>
                  <span className="text-sm font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                    {formatCurrency(closedResult.closingCash ?? 0, currency)}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border space-y-1 ${
                    Number(closedResult.difference ?? 0) === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : Number(closedResult.difference ?? 0) > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <span className="text-xs block">Diferencia</span>
                  <span className="text-sm font-bold font-mono whitespace-nowrap tabular-nums">
                    {Number(closedResult.difference ?? 0) > 0 ? '+' : ''}
                    {formatCurrency(closedResult.difference ?? 0, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
