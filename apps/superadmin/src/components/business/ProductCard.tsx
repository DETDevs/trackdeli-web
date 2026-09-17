import React from 'react';
import { Gear, ClockCounterClockwise, Plus } from '@phosphor-icons/react';
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
  activatedAt?: string | null;
  inactiveDescription: string;
  onAuditClick: () => void;
  onConfigureClick: () => void;
  onDeactivateClick: () => void;
  onActivateClick: () => void;
  children?: React.ReactNode;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  subtitle,
  activateButtonLabel,
  icon,
  iconActiveThemeClass,
  isActive,
  activatedAt,
  inactiveDescription,
  onAuditClick,
  onConfigureClick,
  onDeactivateClick,
  onActivateClick,
  children,
}) => {
  return (
    <div
      className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
        isActive
          ? 'border-gray-200/90 bg-white shadow-2xs'
          : 'border-dashed border-gray-200 bg-gray-50/50'
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isActive
                  ? iconActiveThemeClass
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                {title}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <Badge variant={isActive ? 'success' : 'neutral'} dot size="sm">
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        {/* Date and Details / Inactive notice */}
        <div className="space-y-2 pt-1 text-xs">
          <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1 border-b border-gray-100">
            <span>Fecha de activación</span>
            <span className="font-medium text-gray-700">
              {activatedAt
                ? formatDateShort(activatedAt)
                : isActive
                ? 'Activado'
                : 'Sin contratar'}
            </span>
          </div>

          {isActive ? (
            children
          ) : (
            <div className="py-3 px-3 rounded-lg bg-gray-100/70 text-gray-500 text-[11px] leading-relaxed">
              {inactiveDescription}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onAuditClick}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ClockCounterClockwise size={14} />
          <span>Auditoría</span>
        </button>

        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <button
                type="button"
                onClick={onConfigureClick}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs"
              >
                <Gear size={13} />
                <span>Configurar</span>
              </button>
              <button
                type="button"
                onClick={onDeactivateClick}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
              >
                <span>Desactivar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onActivateClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-2xs"
            >
              <Plus size={13} weight="bold" />
              <span>{activateButtonLabel || `Activar ${title}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
