import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowClockwise,
  ArrowRight,
  Bell,
  Checks,
  Clock,
  Crown,
  HandCoins,
  HourglassMedium,
  Package,
  Receipt,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import type {
  SystemNotificationCategory,
  SystemNotificationItem,
  SystemNotificationSeverity,
} from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationCenterStore } from '../../store/notificationCenter.store';

type DrawerTabFilter =
  | 'ALL'
  | 'CRITICAL'
  | 'MEMBERSHIP'
  | 'INVENTORY_EXPIRY'
  | 'FINANCE'
  | 'OPERATIONS';

function renderCategoryIcon(
  category: SystemNotificationCategory,
  severity: SystemNotificationSeverity,
) {
  const iconColor =
    severity === 'CRITICAL'
      ? 'text-red-600'
      : severity === 'WARNING'
        ? 'text-amber-600'
        : 'text-blue-600';

  switch (category) {
    case 'MEMBERSHIP':
      return <Crown size={18} weight="fill" className={iconColor} />;
    case 'RECEIVABLES':
      return <HandCoins size={18} weight="bold" className={iconColor} />;
    case 'PAYABLES':
      return <Receipt size={18} weight="bold" className={iconColor} />;
    case 'EXPIRY':
      return <HourglassMedium size={18} weight="bold" className={iconColor} />;
    case 'INVENTORY':
      return <Package size={18} weight="bold" className={iconColor} />;
    case 'OPERATIONS':
    default:
      return <Clock size={18} weight="bold" className={iconColor} />;
  }
}

function resolveWebRedirect(
  item: SystemNotificationItem,
  userRole: string,
): { pathname: string; state?: Record<string, any> } {
  const rawRoute = item.redirect.route;
  const rawState = item.redirect.state || {};
  const ts = Date.now();

  if (rawRoute === '/products') {
    const rawFilter = String(rawState.filter || 'ALL').toLowerCase();
    return {
      pathname: '/pos/inventory',
      state: {
        stockFilter: rawFilter,
        filter: rawState.filter,
        _notifTs: ts,
      },
    };
  }

  if (rawRoute === '/reports') {
    return {
      pathname: '/pos/reports',
      state: { ...rawState, _notifTs: ts },
    };
  }

  if (rawRoute === '/quotes') {
    return {
      pathname: '/pos/quotes',
      state: { ...rawState, _notifTs: ts },
    };
  }

  if (rawRoute === '/cash-register') {
    return {
      pathname: userRole === 'CAJERO' ? '/pos/cobrar' : '/pos/cash-registers',
      state: { ...rawState, _notifTs: ts },
    };
  }

  if (rawRoute === '/finances') {
    return {
      pathname: '/finances',
      state: { ...rawState, _notifTs: ts },
    };
  }

  return {
    pathname: rawRoute.startsWith('/') ? rawRoute : '/',
    state: { ...rawState, _notifTs: ts },
  };
}

export const NotificationCenterDrawer: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    items,
    isLoading,
    isDrawerOpen,
    readByScope,
    snoozedByScope,
    closeDrawer,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    snoozeForToday,
    openMembershipModal,
  } = useNotificationCenterStore();

  const [tabFilter, setTabFilter] = useState<DrawerTabFilter>('ALL');
  const [showSnoozed, setShowSnoozed] = useState(false);

  const scopeKey = `${user?.businessId || 'none'}:${user?.id || 'anon'}`;
  const readMap = readByScope[scopeKey] || {};
  const snoozedMap = snoozedByScope[scopeKey] || {};
  const nowMs = Date.now();

  const { activeItems, snoozedItems, unreadCount } = useMemo(() => {
    const active: SystemNotificationItem[] = [];
    const snoozed: SystemNotificationItem[] = [];
    let unread = 0;

    for (const item of items) {
      const snoozeUntil = snoozedMap[item.fingerprint] || 0;
      if (snoozeUntil > nowMs) {
        snoozed.push(item);
      } else {
        active.push(item);
        if (!readMap[item.fingerprint]) {
          unread++;
        }
      }
    }

    return { activeItems: active, snoozedItems: snoozed, unreadCount: unread };
  }, [items, readMap, snoozedMap, nowMs]);

  const baseList = showSnoozed ? items : activeItems;

  const filteredList = useMemo(() => {
    return baseList.filter((item) => {
      if (tabFilter === 'ALL') return true;
      if (tabFilter === 'CRITICAL') return item.severity === 'CRITICAL';
      if (tabFilter === 'MEMBERSHIP') return item.category === 'MEMBERSHIP';
      if (tabFilter === 'INVENTORY_EXPIRY') {
        return item.category === 'INVENTORY' || item.category === 'EXPIRY';
      }
      if (tabFilter === 'FINANCE') {
        return item.category === 'RECEIVABLES' || item.category === 'PAYABLES';
      }
      if (tabFilter === 'OPERATIONS') return item.category === 'OPERATIONS';
      return true;
    });
  }, [baseList, tabFilter]);

  const role = String(user?.role || '').toUpperCase();
  const isManager = role === 'SUPERADMIN' || role === 'ENCARGADO';

  const filterTabs: Array<{ id: DrawerTabFilter; label: string }> = isManager
    ? [
        { id: 'ALL', label: `Todas (${activeItems.length})` },
        {
          id: 'CRITICAL',
          label: `Urgentes (${activeItems.filter((i) => i.severity === 'CRITICAL').length})`,
        },
        { id: 'MEMBERSHIP', label: 'Membresía' },
        { id: 'INVENTORY_EXPIRY', label: 'Inventario y Lotes' },
        { id: 'FINANCE', label: 'Cobros y Pagos' },
        { id: 'OPERATIONS', label: 'Operación' },
      ]
    : [
        { id: 'ALL', label: `Todas (${activeItems.length})` },
        {
          id: 'CRITICAL',
          label: `Urgentes (${activeItems.filter((i) => i.severity === 'CRITICAL').length})`,
        },
        { id: 'OPERATIONS', label: 'Operación' },
      ];

  if (!isDrawerOpen) return null;

  const handleAction = (item: SystemNotificationItem) => {
    markAsRead(item.fingerprint);
    closeDrawer();

    if (item.redirect.route === '#membership-modal') {
      openMembershipModal();
      return;
    }

    if (item.redirect.route === '#offline-modal') {
      return;
    }

    const target = resolveWebRedirect(item, role);
    navigate(target.pathname, { state: target.state });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="fixed inset-0" onClick={closeDrawer} />

      <aside
        data-testid="notification-center-drawer"
        className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-900 flex items-center justify-center shrink-0">
              <Bell size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-gray-900">
                  Centro de notificaciones
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">
                    {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Avisos prioritarios del negocio y accesos directos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              title="Actualizar notificaciones"
              aria-label="Actualizar notificaciones"
            >
              <ArrowClockwise
                size={17}
                className={isLoading ? 'animate-spin' : ''}
              />
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Cerrar"
              aria-label="Cerrar centro de notificaciones"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Barra de acciones y filtros */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabFilter(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  tabFilter === t.id
                    ? 'bg-[#0F0F0F] text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black transition-colors cursor-pointer"
              >
                <Checks size={15} weight="bold" />
                <span>Marcar todas como leídas</span>
              </button>
            ) : (
              <span className="text-xs text-gray-500">Todas revisadas</span>
            )}

            {snoozedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSnoozed((prev) => !prev)}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline cursor-pointer"
              >
                {showSnoozed
                  ? 'Ocultar pospuestas'
                  : `Ver pospuestas (${snoozedItems.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Lista de alertas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
          {isLoading && items.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
              <ArrowClockwise size={24} className="animate-spin text-gray-600" />
              <span>Analizando alertas del negocio...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border border-gray-200/80 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Checks size={20} weight="bold" />
              </div>
              <p className="text-sm font-bold text-gray-900">Todo en orden</p>
              <p className="text-xs text-gray-500">
                No tenés alertas pendientes en esta categoría.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isRead = Boolean(readMap[item.fingerprint]);
              const isSnoozed = (snoozedMap[item.fingerprint] || 0) > nowMs;

              const containerCls =
                item.severity === 'CRITICAL'
                  ? 'border-red-200 bg-white'
                  : item.severity === 'WARNING'
                    ? 'border-amber-200 bg-white'
                    : 'border-gray-200 bg-white';

              const badgeCls =
                item.severity === 'CRITICAL'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : item.severity === 'WARNING'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

              const badgeLabel =
                item.severity === 'CRITICAL'
                  ? 'Urgente'
                  : item.severity === 'WARNING'
                    ? 'Atención'
                    : 'Preventiva';

              return (
                <div
                  key={item.fingerprint}
                  className={`p-4 rounded-2xl border shadow-2xs space-y-2.5 transition-opacity ${containerCls} ${
                    isSnoozed ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-center shrink-0">
                        {renderCategoryIcon(item.category, item.severity)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${badgeCls}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSnoozed && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Pospuesta
                        </span>
                      )}
                      {!isRead && !isSnoozed && (
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.severity === 'CRITICAL'
                              ? 'bg-red-600'
                              : 'bg-amber-500'
                          }`}
                          title="Sin leer"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {item.highlights && item.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md max-w-full truncate"
                          title={h}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        item.severity === 'CRITICAL'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-[#0F0F0F] hover:bg-gray-800 text-white'
                      }`}
                    >
                      <span>{item.redirect.actionLabel}</span>
                      <ArrowRight size={13} weight="bold" />
                    </button>

                    {!isSnoozed && (
                      <button
                        type="button"
                        onClick={() => snoozeForToday(item.fingerprint)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        Posponer hoy
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer informativo */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2 text-xs text-gray-500">
          <WarningCircle size={15} className="shrink-0 text-gray-400" />
          <span>
            Las alertas pospuestas reaparecen mañana o si cambia la gravedad.
          </span>
        </div>
      </aside>
    </div>
  );
};
