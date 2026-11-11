import React, { useState, useEffect } from 'react';
import {
  Storefront,
  Buildings,
  CashRegister,
  List,
} from '@phosphor-icons/react';
import { BranchSelector } from './BranchSelector';
import { usePosShift } from '../../hooks/usePosShift';
import { usePosPolicies } from '../../hooks/usePosPolicies';

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
  const { isOpen: isShiftOpen } = usePosShift(isPosActive);
  const { requireOpenShiftToSell } = usePosPolicies(isPosActive);

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
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menú"
        >
          <List size={20} weight="bold" />
        </button>

        {/* Logo e identidad */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#0F0F0F] text-white flex items-center justify-center shrink-0">
            <Storefront size={16} weight="regular" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#0F0F0F] truncate max-w-[120px] sm:max-w-[200px]">
            {businessName || 'NEXOL POS'}
          </span>
        </div>

        {/* Sucursal */}
        <div className="h-4 w-[1px] bg-gray-200 shrink-0 hidden sm:block" />
        <div className="hidden sm:flex items-center space-x-1.5 shrink-0" title="Sucursal activa">
          <Buildings size={16} className="text-gray-500" weight="regular" />
          {branches && branches.length > 1 ? (
            <BranchSelector />
          ) : (
            <span className="text-xs font-medium text-gray-700 truncate max-w-[120px] sm:max-w-[180px]">
              {activeBranchName || businessName || 'Sucursal Principal'}
            </span>
          )}
        </div>

        {/* Estado de Caja (solo si POS está activo) */}
        {isPosActive && (
          <>
            <div className="h-4 w-[1px] bg-gray-200 shrink-0" />
            <div className="flex items-center space-x-1.5 shrink-0" title="Estado de caja">
              <CashRegister size={16} className="text-gray-500 hidden sm:inline" weight="regular" />
              {isShiftOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  Caja Abierta
                </span>
              ) : requireOpenShiftToSell === false ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                  Sin caja
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  Caja Cerrada
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Centro: Reloj en vivo (Managua) */}
      <div className="hidden md:flex items-center space-x-2 text-xs text-gray-500 font-medium shrink-0">
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

        {/* Indicador de conexión */}
        <div
          className="flex items-center space-x-1.5 text-xs font-medium text-gray-600 px-2 py-1 select-none shrink-0"
          title={isOnline ? 'En línea' : 'Sin conexión'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-[#22C55E]' : 'bg-gray-400'
            }`}
          />
          <span className="hidden sm:inline">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-gray-200 shrink-0 hidden sm:block" />

        {/* Usuario y Rol */}
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-xs font-medium text-[#0F0F0F] truncate max-w-[140px]">
            {user?.name || 'Usuario'}
          </div>
          <div className="text-[10px] text-gray-400 font-normal capitalize">
            {roleLabel.toLowerCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

