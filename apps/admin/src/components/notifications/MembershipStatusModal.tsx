import React from 'react';
import {
  CalendarBlank,
  CheckCircle,
  Crown,
  WarningCircle,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import { useNotificationCenterStore } from '../../store/notificationCenter.store';
import { useAuthStore } from '../../store/auth.store';
import { formatCalendarDate } from '../../utils/batchExpiry';

function formatRefAmount(amount: number, currency?: string | null): string {
  const prefix = currency === 'NIO' || currency === 'C$' ? 'C$' : 'US$';
  return `${prefix}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const MembershipStatusModal: React.FC = () => {
  const user: any = useAuthStore((s) => s.user);
  const { membership, isMembershipModalOpen, closeMembershipModal } =
    useNotificationCenterStore();

  if (!isMembershipModalOpen) return null;

  const isInGrace = Boolean(membership?.isInGrace);
  const daysUntilDue = membership?.daysUntilDue ?? null;
  const isDueSoon = !isInGrace && daysUntilDue !== null && daysUntilDue <= 7;

  const statusBadge = isInGrace
    ? {
        label: 'En período de gracia',
        cls: 'bg-red-100 text-red-800 border-red-200',
      }
    : isDueSoon
      ? {
          label: 'Próxima a vencer',
          cls: 'bg-amber-100 text-amber-900 border-amber-200',
        }
      : {
          label: 'Membresía vigente',
          cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };

  const bizName = user?.business?.name || 'mi negocio';
  const waUrl = `https://wa.me/50587140989?text=${encodeURIComponent(
    `Hola NEXOL, deseo coordinar la renovación de la membresía de ${bizName}.`,
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isInGrace
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Crown size={20} weight="fill" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Estado de tu membresía
              </h3>
              <p className="text-xs text-gray-500">
                Control de renovación y fechas de pago
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMembershipModal}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {membership ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-600">
                  Estado actual
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.cls}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
                <div>
                  <span className="text-xs text-gray-500 block">
                    Fecha límite de pago
                  </span>
                  <span className="font-mono font-bold text-sm text-gray-900 inline-flex items-center gap-1 mt-0.5">
                    <CalendarBlank
                      size={14}
                      className="text-gray-500 shrink-0"
                    />
                    <span>
                      {membership.coveredUntil
                        ? formatCalendarDate(membership.coveredUntil)
                        : 'Sin fecha'}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-xs text-gray-500 block">
                    {isInGrace ? 'Días de gracia restantes' : 'Días restantes'}
                  </span>
                  <span
                    className={`font-mono font-bold text-sm block mt-0.5 ${
                      isInGrace
                        ? 'text-red-700'
                        : isDueSoon
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {isInGrace
                      ? `${membership.graceDaysRemaining ?? 1} ${membership.graceDaysRemaining === 1 ? 'día' : 'días'}`
                      : daysUntilDue !== null
                        ? daysUntilDue === 0
                          ? 'Vence hoy'
                          : `${daysUntilDue} ${daysUntilDue === 1 ? 'día' : 'días'}`
                        : '—'}
                  </span>
                </div>

                {membership.lastAmount !== null &&
                  membership.lastAmount > 0 && (
                    <div className="col-span-2 pt-2 border-t border-gray-200/80 flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Último monto de renovación
                      </span>
                      <span className="font-mono font-bold text-sm text-gray-900 whitespace-nowrap">
                        {formatRefAmount(
                          membership.lastAmount,
                          membership.lastCurrency,
                        )}
                      </span>
                    </div>
                  )}
              </div>

              {isInGrace ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-900">
                  <WarningCircle
                    size={18}
                    weight="fill"
                    className="text-red-600 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-bold">
                      Tu membresía está vencida en período de gracia
                    </p>
                    <p>
                      Tenés hasta el fin del período de gracia para reportar tu
                      pago a NEXOL y evitar que el sistema se pause
                      automáticamente.
                    </p>
                  </div>
                </div>
              ) : isDueSoon ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                  <WarningCircle
                    size={18}
                    weight="fill"
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-bold">Estate listo con tu pago</p>
                    <p>
                      Quedan {daysUntilDue}{' '}
                      {daysUntilDue === 1 ? 'día' : 'días'} para tu fecha de
                      renovación. Anticipá tu transferencia o depósito para
                      operar sin contratiempos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-900">
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="text-emerald-600 shrink-0 mt-0.5"
                  />
                  <p className="leading-relaxed">
                    Tu suscripción está al día. El sistema te avisará con 7 días
                    de anticipación antes de tu próximo cobro.
                  </p>
                </div>
              )}

              {membership.commercialInstallment && (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>
                      Cuota de acuerdo comercial #
                      {membership.commercialInstallment.installmentNumber}
                    </span>
                    <span className="font-mono whitespace-nowrap">
                      {formatRefAmount(
                        membership.commercialInstallment.remainingAmount,
                        membership.commercialInstallment.currency,
                      )}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Fecha límite:{' '}
                    <strong className="font-mono">
                      {formatCalendarDate(
                        membership.commercialInstallment.dueDate,
                      )}
                    </strong>{' '}
                    {membership.commercialInstallment.daysUntilDue < 0
                      ? `(vencida hace ${Math.abs(membership.commercialInstallment.daysUntilDue)} días)`
                      : membership.commercialInstallment.daysUntilDue === 0
                        ? '(vence hoy)'
                        : `(en ${membership.commercialInstallment.daysUntilDue} días)`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
              No hay información pendiente de membresía para mostrar en este
              momento.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
          >
            <WhatsappLogo size={15} weight="fill" />
            <span>Reportar pago</span>
          </a>

          <button
            type="button"
            onClick={closeMembershipModal}
            className="px-4 py-2 bg-[#0F0F0F] hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
