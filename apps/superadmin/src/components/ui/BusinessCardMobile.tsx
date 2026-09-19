import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessItem } from '../../hooks/useBusinesses';
import { Badge } from './Badge';
import { ArrowRight, Motorcycle, Coins, Receipt, Wallet, CalendarBlank } from '@phosphor-icons/react';

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
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-gray-900 truncate">{business.name}</h4>
              {business.businessType === 'EMPRESA_RIDERS' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0">
                  Riders
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {business.businessType === 'EMPRESA_RIDERS' ? (business.type || 'Empresa de Riders') : (business.type || 'Comercio')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => onToggle(e, business)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
            business.isActive ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {(() => {
            const isDeliveryActive = business.productSubscriptions
              ? business.productSubscriptions.some((s) => s.productType === 'DELIVERY' && s.status === 'ACTIVE')
              : (business.hasTrackDeli ?? false);
            const isPosActive = business.productSubscriptions
              ? business.productSubscriptions.some((s) => s.productType === 'POS' && s.status === 'ACTIVE')
              : (business.hasPOS ?? false);
            const isCarteraActive = business.productSubscriptions
              ? business.productSubscriptions.some((s) => s.productType === 'CARTERA_COBRO' && s.status === 'ACTIVE')
              : (business.hasCarteraCobro ?? false);
            const isCitasActive = business.productSubscriptions
              ? business.productSubscriptions.some((s) => s.productType === 'CITAS' && s.status === 'ACTIVE')
              : (business.hasCitas ?? false);

            if (!isDeliveryActive && !isPosActive && !isCarteraActive && !isCitasActive) {
              return <Badge variant="neutral" size="sm">Sin productos</Badge>;
            }

            const badges: React.ReactNode[] = [];

            // 1. Delivery
            if (isDeliveryActive) {
              if (business.businessType === 'EMPRESA_RIDERS') {
                const rate = business.commissionRate ? `${(business.commissionRate * 100).toFixed(0)}%` : '15%';
                badges.push(
                  <span key="delivery" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                    <Coins size={11} className="text-amber-700" />
                    <span>{rate}</span>
                  </span>
                );
              } else {
                const mem = business.membership;
                if (mem && mem.status === 'ACTIVE') {
                  const days = mem.daysLeft ?? 0;
                  badges.push(
                    <Badge key="delivery" variant={days <= 7 ? 'warning' : 'success'} dot size="sm">
                      {days <= 7 ? `${days}d` : `Activa ${days}d`}
                    </Badge>
                  );
                } else if (mem?.status === 'EXPIRED') {
                  badges.push(
                    <Badge key="delivery" variant="danger" dot size="sm">
                      Vencida
                    </Badge>
                  );
                } else {
                  badges.push(
                    <span key="delivery" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                      <Motorcycle size={11} weight="duotone" className="text-amber-700" />
                      <span>Delivery</span>
                    </span>
                  );
                }
              }
            }

            // 2. POS
            if (isPosActive) {
              const posSub = business.productSubscriptions?.find((s) => s.productType === 'POS');
              const vertical = posSub?.posVertical === 'RETAIL' ? 'Retail' : 'Rest.';
              badges.push(
                <span key="pos" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200/80">
                  <Receipt size={11} className="text-purple-700" />
                  <span>POS ({vertical})</span>
                </span>
              );
            }

            // 3. Cartera de Cobro
            if (isCarteraActive) {
              badges.push(
                <span key="cartera" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <Wallet size={11} className="text-emerald-700" />
                  <span>Cartera</span>
                </span>
              );
            }

            // 4. Citas
            if (isCitasActive) {
              badges.push(
                <span key="citas" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200/80">
                  <CalendarBlank size={11} className="text-sky-700" />
                  <span>Citas</span>
                </span>
              );
            }

            return badges;
          })()}

          <div className="text-gray-400 pl-1">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
