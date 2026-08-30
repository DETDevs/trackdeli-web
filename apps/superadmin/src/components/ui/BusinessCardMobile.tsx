import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessItem } from '../../hooks/useBusinesses';
import { Badge } from './Badge';
import { ArrowRight } from '@phosphor-icons/react';

interface BusinessCardMobileProps {
  business: BusinessItem;
  onToggle: (e: React.MouseEvent, business: BusinessItem) => void;
}

export const BusinessCardMobile: React.FC<BusinessCardMobileProps> = ({
  business,
  onToggle,
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/businesses/${business.id}`)}
      className="bg-white border border-gray-200/80 rounded-xl p-4 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:bg-gray-50 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm shrink-0">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              business.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{business.name}</h4>
            <p className="text-xs text-gray-500 truncate mt-0.5">{business.type || 'Comercio'}</p>
          </div>
        </div>

        <button
          onClick={(e) => onToggle(e, business)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            business.isActive ? 'bg-brand-600' : 'bg-gray-200'
          }`}
          title={business.isActive ? 'Desactivar negocio' : 'Activar negocio'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              business.isActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-3 text-gray-600">
          <div>
            <span className="text-gray-400">Hoy: </span>
            <span className="font-semibold text-gray-900">{business.ordersToday}</span>
          </div>
          <div>
            <span className="text-gray-400">Total: </span>
            <span className="font-semibold text-gray-900">{business._count?.orders ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {business.membership ? (
            <Badge
              variant={
                business.membership.status === 'ACTIVE'
                  ? 'success'
                  : business.membership.status === 'EXPIRED'
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            >
              {business.membership.status === 'ACTIVE'
                ? `Activa (${business.membership.daysLeft ?? 0}d)`
                : business.membership.status === 'EXPIRED'
                ? 'Vencida'
                : 'Sin plan'}
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">Sin plan</Badge>
          )}

          <div className="text-gray-400 pl-1">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
