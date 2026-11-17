import React from 'react';
import { ArrowRight, Crown, WarningCircle } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationCenterStore } from '../../store/notificationCenter.store';
import { getManaguaTodayYmd } from '../../utils/batchExpiry';

export const MembershipBanner: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const {
    membership,
    bannerDismissedDayByScope,
    openMembershipModal,
    dismissMembershipBannerToday,
  } = useNotificationCenterStore();

  const isManager =
    user?.role === 'SUPERADMIN' || user?.role === 'ENCARGADO';
  if (!isManager || !membership || !membership.shouldShowTopBanner) {
    return null;
  }

  const scopeKey = `${user?.businessId || 'none'}:${user?.id || 'anon'}`;
  const todayYmd = getManaguaTodayYmd();
  const isDismissedToday = bannerDismissedDayByScope[scopeKey] === todayYmd;

  if (isDismissedToday && !membership.isInGrace) {
    return null;
  }

  const isUrgent =
    membership.isInGrace || membership.bannerSeverity === 'CRITICAL';

  return (
    <div
      className={`px-4 lg:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
        isUrgent
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isUrgent ? (
          <WarningCircle
            size={17}
            weight="fill"
            className="text-red-600 shrink-0"
          />
        ) : (
          <Crown size={17} weight="fill" className="text-amber-600 shrink-0" />
        )}
        <span className="font-semibold leading-snug">
          {membership.bannerMessage ||
            'Revisá el estado de tu membresía para mantener tu servicio activo.'}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={openMembershipModal}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            isUrgent
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-700 hover:bg-amber-800 text-white'
          }`}
        >
          <span>
            {membership.isInGrace ? 'Ver detalle y renovar' : 'Ver detalle'}
          </span>
          <ArrowRight size={13} weight="bold" />
        </button>

        {!membership.isInGrace && (
          <button
            type="button"
            onClick={dismissMembershipBannerToday}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            Ocultar por hoy
          </button>
        )}
      </div>
    </div>
  );
};
