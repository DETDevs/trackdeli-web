import React from 'react';
import {
  Gear,
  ClockCounterClockwise,
  Plus,
  CreditCard,
  WarningCircle,
} from '@phosphor-icons/react';
import { Badge } from '../ui/Badge';
import { formatDateShort } from '../../utils/format';
import { BusinessProductType } from '../../hooks/useBusinessProducts';

interface ProductCardProps {
  productType: BusinessProductType;
  title: string;
  subtitle: string;
  activateButtonLabel?: string;
  icon: React.ReactNode;
  iconActiveThemeClass: string;
  isActive: boolean;
  autoRenew?: boolean;
  renewalCanceledAt?: string | null;
  coverageEndDate?: string | null;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
  inactiveDescription: string;
  isMembershipProduct?: boolean;
  onAuditClick: () => void;
  onConfigureClick: () => void;
  onDeactivateClick?: () => void;
  onCancelRenewalClick?: () => void;
  onDeactivateNowClick?: () => void;
  onActivateClick?: () => void;
  onRegisterPaymentClick?: () => void;
  children?: React.ReactNode;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  productType,
  title,
  subtitle,
  activateButtonLabel,
  icon,
  iconActiveThemeClass,
  isActive,
  autoRenew = true,
  renewalCanceledAt,
  coverageEndDate,
  activatedAt,
  deactivatedAt,
  inactiveDescription,
  isMembershipProduct = false,
  onAuditClick,
  onConfigureClick,
  onDeactivateClick,
  onCancelRenewalClick,
  onDeactivateNowClick,
  onActivateClick,
  onRegisterPaymentClick,
  children,
}) => {
  const isCanceledRenewal = isActive && isMembershipProduct && autoRenew === false;

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between h-full ${
        isActive
          ? isCanceledRenewal
            ? 'border-amber-200/80 bg-white shadow-2xs hover:shadow-xs'
            : 'border-gray-200/90 bg-white shadow-2xs hover:shadow-xs'
          : 'border-dashed border-gray-200 bg-gray-50/60'
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isActive
                  ? iconActiveThemeClass
                  : 'bg-gray-100 text-gray-400 border border-gray-200/60'
              }`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-gray-900 leading-tight truncate">
                {title}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{subtitle}</p>
            </div>
          </div>

          {isActive ? (
            isCanceledRenewal ? (
              <Badge variant="warning" dot size="sm" className="shrink-0">
                Activo — no se renovará
              </Badge>
            ) : (
              <Badge variant="success" dot size="sm" className="shrink-0">
                Activo
              </Badge>
            )
          ) : (
            <Badge variant="neutral" dot size="sm" className="shrink-0">
              Inactivo
            </Badge>
          )}
        </div>

        {/* Date and Details / Inactive notice */}
        <div className="space-y-2.5 pt-1 text-xs">
          <div className="flex items-center justify-between text-xs text-gray-400 pb-1.5 border-b border-gray-100">
            <span className="font-medium text-gray-500">
              {isActive
                ? isCanceledRenewal && coverageEndDate
                  ? 'Vence el'
                  : 'Fecha de activación'
                : deactivatedAt
                ? 'Última baja / vencimiento'
                : activatedAt
                ? 'Última activación'
                : 'Fecha de activación'}
            </span>
            <span
              className={`font-semibold ${
                !isActive && deactivatedAt
                  ? 'text-amber-800'
                  : isCanceledRenewal
                  ? 'text-amber-700'
                  : 'text-gray-800'
              }`}
            >
              {isActive
                ? isCanceledRenewal && coverageEndDate
                  ? formatDateShort(coverageEndDate)
                  : activatedAt
                  ? formatDateShort(activatedAt)
                  : 'Activado'
                : deactivatedAt
                ? formatDateShort(deactivatedAt)
                : activatedAt
                ? formatDateShort(activatedAt)
                : 'Sin contratar'}
            </span>
          </div>

          {isCanceledRenewal && (
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold">
                  Renovación cancelada{renewalCanceledAt ? ` (${formatDateShort(renewalCanceledAt)})` : ''}:
                </span>{' '}
                El servicio seguirá activo hasta el{' '}
                <strong>{coverageEndDate ? formatDateShort(coverageEndDate) : 'fin del período'}</strong>. Para reactivar la renovación, registra un nuevo pago.
              </div>
            </div>
          )}

          {isActive ? (
            children
          ) : (
            <div className="p-3.5 rounded-xl bg-gray-100/70 border border-gray-200/50 text-gray-500 text-xs leading-relaxed min-h-[64px] flex flex-col justify-center space-y-2">
              <p>{inactiveDescription}</p>
              {isMembershipProduct && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700 bg-brand-50/80 px-2.5 py-1 rounded-lg border border-brand-100/80 w-fit">
                  <CreditCard size={13} weight="duotone" className="shrink-0" />
                  <span>Se activa al registrar un pago de membresía</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-5 border-t border-gray-100 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onAuditClick}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 -ml-1 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ClockCounterClockwise size={14} />
            <span>Auditoría</span>
          </button>

          <div className="flex items-center gap-2">
            {isActive ? (
              isMembershipProduct ? (
                <>
                  <button
                    type="button"
                    onClick={onConfigureClick}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Gear size={13} />
                    <span>Configurar</span>
                  </button>

                  {autoRenew === false ? (
                    <button
                      type="button"
                      onClick={onRegisterPaymentClick}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-2xs cursor-pointer"
                    >
                      <CreditCard size={13} weight="bold" />
                      <span>Renovar pago</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onCancelRenewalClick}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 transition-colors cursor-pointer"
                    >
                      <span>Cancelar renovación</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onConfigureClick}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Gear size={13} />
                    <span>Configurar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDeactivateClick}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/60 transition-colors cursor-pointer"
                  >
                    <span>Desactivar</span>
                  </button>
                </>
              )
            ) : isMembershipProduct ? (
              <button
                id={`btn-register-payment-${productType.toLowerCase()}`}
                data-testid={`btn-register-payment-${productType.toLowerCase()}`}
                type="button"
                onClick={onRegisterPaymentClick}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-2xs cursor-pointer"
              >
                <CreditCard size={13} weight="bold" />
                <span>Registrar pago</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onActivateClick}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus size={13} weight="bold" />
                <span>{activateButtonLabel || `Activar ${title}`}</span>
              </button>
            )}
          </div>
        </div>

        {isActive && isMembershipProduct && (
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={onDeactivateNowClick}
              className="text-[11px] text-gray-400 hover:text-red-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
            >
              Desactivar ahora (corte inmediato)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
