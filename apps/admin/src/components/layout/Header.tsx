import React, { useState, useEffect, useMemo } from 'react';
import {
  Storefront,
  Buildings,
  CashRegister,
  List,
  Bell,
  BellRinging,
} from '@phosphor-icons/react';
import { BranchSelector } from './BranchSelector';
import { usePosShift } from '../../hooks/usePosShift';
import { usePosPolicies } from '../../hooks/usePosPolicies';
import { useNotificationCenterStore } from '../../store/notificationCenter.store';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  businessName?: string;
  activeBranchName?: string;
  user?: any;
  roleLabel: string;
  branches?: any[];
  isPosActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  businessName,
  activeBranchName,
  user,
  roleLabel,
  branches,
  isPosActive,
}) => {
  const canReadCashRegisterAndPolicies =
    isPosActive && user?.role !== 'VENDEDOR' && user?.role !== 'WAITER';
  const { isOpen: isShiftOpen } = usePosShift(canReadCashRegisterAndPolicies);
  const { requireOpenShiftToSell } = usePosPolicies(canReadCashRegisterAndPolicies);
  const { items, readByScope, snoozedByScope, openDrawer } =
    useNotificationCenterStore();

  const { unreadCount, hasUnreadCritical } = useMemo(() => {
    const scopeKey = `${user?.businessId || 'none'}:${user?.id || 'anon'}`;
    const readMap = readByScope[scopeKey] || {};
    const snoozedMap = snoozedByScope[scopeKey] || {};
    const nowMs = Date.now();
    let count = 0;
    let critical = false;
    for (const item of items) {
      if ((snoozedMap[item.fingerprint] || 0) > nowMs) continue;
      if (!readMap[item.fingerprint]) {
        count++;
        if (item.severity === 'CRITICAL') critical = true;
      }
    }
    return { unreadCount: count, hasUnreadCritical: critical };
  }, [items, readByScope, snoozedByScope, user?.businessId, user?.id]);

  // Reloj en vivo (zona horaria Managua / es-NI)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Estado de conexión a internet
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const dateStr = currentTime.toLocaleDateString('es-NI', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Managua',
  });

  const timeStr = currentTime.toLocaleTimeString('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Managua',
  });

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-4 select-none z-30 shrink-0">
      {/* Lado izquierdo: Botón móvil + Identidad del Negocio + Sucursal + Estado de Caja */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menú"
        >
          <List size={20} weight="bold" />
        </button>

        {/* Logo e identidad */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#0F0F0F] text-white flex items-center justify-center shrink-0">
            <Storefront size={16} weight="regular" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#0F0F0F] truncate">
            {businessName || 'NEXOL POS'}
          </span>
        </div>

        {/* Sucursal (ocultar si coincide exactamente con el nombre del negocio en pantallas angostas/medianas, o cuando solo hay 1 sucursal idéntica) */}
        {(Boolean(branches && branches.length > 1) ||
          (activeBranchName &&
            activeBranchName.trim().toLowerCase() !== (businessName || '').trim().toLowerCase())) && (
          <>
            <div className="h-4 w-[1px] bg-gray-200 shrink-0 hidden sm:block" />
            <div className="hidden sm:flex items-center space-x-1.5 shrink-0" title="Sucursal activa">
              <Buildings size={16} className="text-gray-500" weight="regular" />
              {branches && branches.length > 1 ? (
                <BranchSelector />
              ) : (
                <span className="text-xs font-medium text-gray-700 truncate max-w-[140px] sm:max-w-[200px]">
                  {activeBranchName}
                </span>
              )}
            </div>
          </>
        )}

        {/* Estado de Caja (solo si POS está activo y el rol opera caja) */}
        {canReadCashRegisterAndPolicies && (
          <>
            <div className="h-4 w-[1px] bg-gray-200 shrink-0" />
            <div className="flex items-center space-x-1.5 shrink-0" title="Estado de caja">
              <CashRegister size={16} className="text-gray-500 hidden sm:inline" weight="regular" />
              {isShiftOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  Caja abierta
                </span>
              ) : requireOpenShiftToSell === false ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                  Sin caja
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  Caja cerrada
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Centro: Reloj en vivo (Managua) — visible desde xl para evitar solapar en tablets 768-1024 px */}
      <div className="hidden xl:flex items-center space-x-2 text-xs text-gray-500 font-medium shrink-0 px-3">
        <span>{dateStr}</span>
        <span>•</span>
        <span className="font-semibold text-gray-700">{timeStr}</span>
      </div>

      {/* Lado derecho: Indicador "En línea" + Usuario y Rol */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Selector de sucursal móvil */}
        {branches && branches.length > 1 && (
          <div className="sm:hidden">
            <BranchSelector isMobile />
          </div>
        )}

        {/* Indicador de conexión: visible en >= sm, o en móvil solo si está sin conexión para no mostrar un punto suelto */}
        <div
          className={`${isOnline ? 'hidden sm:flex' : 'flex'} items-center space-x-1.5 text-xs font-medium text-gray-600 px-2 py-1 select-none shrink-0`}
          title={isOnline ? 'En línea' : 'Sin conexión'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-[#22C55E]' : 'bg-gray-400'
            }`}
          />
          <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
        </div>

        {/* Centro de notificaciones */}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Notificaciones del sistema"
          title={
            unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? 'notificación nueva' : 'notificaciones nuevas'}`
              : 'Notificaciones del sistema'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            unreadCount > 0 && hasUnreadCritical
              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              : unreadCount > 0
                ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
          }`}
        >
          {unreadCount > 0 && hasUnreadCritical ? (
            <BellRinging size={16} weight="fill" className="text-red-600 shrink-0" />
          ) : (
            <Bell
              size={16}
              weight={unreadCount > 0 ? 'fill' : 'regular'}
              className={unreadCount > 0 ? 'text-amber-600 shrink-0' : 'text-gray-600 shrink-0'}
            />
          )}
          {unreadCount > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold leading-none ${
                hasUnreadCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <div className="h-4 w-[1px] bg-gray-200 shrink-0 hidden sm:block" />

        {/* Usuario y Rol */}
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-xs font-medium text-[#0F0F0F] truncate max-w-[140px]">
            {user?.name || 'Usuario'}
          </div>
          <div className="text-xs text-gray-500 font-normal capitalize">
            {roleLabel.toLowerCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

