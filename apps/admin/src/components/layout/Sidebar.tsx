import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Storefront,
  ShoppingCartSimple,
  CashRegister,
  Package,
  Receipt,
  HandCoins,
  Users,
  ChartBar,
  TrendUp,
  Gear,
  CaretLeft,
  CaretRight,
  SignOut,
  X,
  ListChecks,
  Plus,
  Buildings,
  Motorcycle,
  Link as LinkIcon,
  Coins,
} from '@phosphor-icons/react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  user?: any;
  business?: any;
  businessName?: string;
  isPosActive: boolean;
  webAdminEnabled: boolean;
  canCobrar: boolean;
  isPosManager: boolean;
  isCajero: boolean;
  isDeliveryActive: boolean;
  hasCarteraCobro: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
  end?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onLogout,
  user,
  business,
  businessName,
  isPosActive,
  webAdminEnabled,
  canCobrar,
  isPosManager,
  isCajero,
  isDeliveryActive,
  hasCarteraCobro,
}) => {
  const location = useLocation();

  // Ítems principales de POS ordenados como en el POS desktop
  const posNavItems: NavItem[] = [
    // 1. Resumen (métrica rápida exclusiva de la web)
    {
      to: '/pos/dashboard',
      label: 'Resumen',
      icon: Storefront,
      show: Boolean(isPosActive && webAdminEnabled && isPosManager),
    },
    // 2. Punto de Venta (abre /pos/cobrar)
    {
      to: '/pos/cobrar',
      label: 'Punto de Venta',
      icon: ShoppingCartSimple,
      show: Boolean(isPosActive && canCobrar),
    },
    // 3. Caja y Turnos (abre /pos/cash-registers)
    {
      to: '/pos/cash-registers',
      label: 'Caja y Turnos',
      icon: CashRegister,
      show: Boolean(isPosActive && webAdminEnabled && (isPosManager || isCajero)),
    },
    // 4. Catálogo (abre /pos/inventory)
    {
      to: '/pos/inventory',
      label: 'Catálogo',
      icon: Package,
      show: Boolean(isPosActive && webAdminEnabled && (isPosManager || isCajero)),
    },
    // 5. Historial Ventas (abre /pos/sales)
    {
      to: '/pos/sales',
      label: 'Historial Ventas',
      icon: Receipt,
      show: Boolean(isPosActive && webAdminEnabled && (isPosManager || isCajero)),
    },
    // 6. Finanzas (solo ENCARGADO / SUPERADMIN si tiene cartera de cobro)
    {
      to: '/finances',
      label: 'Finanzas',
      icon: HandCoins,
      show: Boolean(hasCarteraCobro && isPosManager),
    },
    // 7. Clientes (directorio /customers)
    {
      to: '/customers',
      label: 'Clientes',
      icon: Users,
      show: Boolean((isPosActive || isDeliveryActive || hasCarteraCobro) && isPosManager),
      end: true,
    },
    // 8. Reportes (abre /pos/reports)
    {
      to: '/pos/reports',
      label: 'Reportes',
      icon: ChartBar,
      show: Boolean((isPosActive || isDeliveryActive) && isPosManager),
    },
    // 9. Más Vendidos (métrica analítica complementaria a reportes)
    {
      to: '/pos/analytics',
      label: 'Más Vendidos',
      icon: TrendUp,
      show: Boolean(isPosActive && webAdminEnabled && isPosManager),
    },
    // 10. Mi Equipo (gestión de personal previa a configuración)
    {
      to: '/team',
      label: 'Mi Equipo',
      icon: Users,
      show: Boolean(business?.businessType !== 'EMPRESA_RIDERS' && isPosManager),
    },
    // 11. Configuración (abre /settings)
    {
      to: '/settings',
      label: 'Configuración',
      icon: Gear,
      show: Boolean(isPosManager),
    },
  ];

  // Ítems de Operaciones Delivery (si el negocio tiene delivery activo)
  const deliveryNavItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Dashboard Delivery',
      icon: Package,
      show: Boolean(isDeliveryActive && isPosManager),
    },
    {
      to: '/orders',
      label: 'Pedidos',
      icon: ListChecks,
      show: Boolean(isDeliveryActive && isPosManager),
      end: true,
    },
    {
      to: '/orders/new',
      label: 'Nuevo pedido',
      icon: Plus,
      show: Boolean(isDeliveryActive && isPosManager),
    },
    {
      to: '/clients',
      label: 'Afiliados',
      icon: Buildings,
      show: Boolean(isDeliveryActive && business?.businessType === 'EMPRESA_RIDERS' && isPosManager),
    },
    {
      to: '/staff',
      label: 'Repartidores',
      icon: Motorcycle,
      show: Boolean(isDeliveryActive && isPosManager),
    },
    {
      to: '/invites',
      label: 'Invitaciones',
      icon: LinkIcon,
      show: Boolean(isDeliveryActive && business?.businessType === 'EMPRESA_RIDERS' && isPosManager),
    },
    {
      to: '/commissions',
      label: 'Comisiones',
      icon: Coins,
      show: Boolean(isDeliveryActive && business?.businessType === 'EMPRESA_RIDERS' && isPosManager),
    },
  ];

  const visiblePosItems = posNavItems.filter((i) => i.show);
  const visibleDeliveryItems = deliveryNavItems.filter((i) => i.show);

  const getNavLinkClass = (isActive: boolean, collapsed: boolean) =>
    `flex items-center ${
      collapsed ? 'justify-center px-2' : 'space-x-3 px-3'
    } py-2.5 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-[#0F0F0F] text-white shadow-xs'
        : 'text-gray-600 hover:bg-gray-50 hover:text-[#0F0F0F]'
    }`;

  const renderNavList = (collapsed: boolean, onItemClick?: () => void) => (
    <div className="py-2 px-2 space-y-1">
      {visiblePosItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onItemClick}
            className={getNavLinkClass(isActive, collapsed)}
            title={item.label}
          >
            <Icon size={20} weight="regular" className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        );
      })}

      {visibleDeliveryItems.length > 0 && (
        <>
          <div className="my-2 border-t border-gray-100" />
          {!collapsed && (
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1 mt-2">
              Delivery
            </div>
          )}
          {visibleDeliveryItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onItemClick}
                className={getNavLinkClass(isActive, collapsed)}
                title={item.label}
              >
                <Icon size={20} weight="regular" className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* 1. VERSIÓN ESCRITORIO (lg:flex) */}
      <aside
        className={`hidden lg:flex flex-col justify-between bg-white border-r border-gray-100 select-none h-full transition-all duration-200 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-52 xl:w-56'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {renderNavList(isCollapsed)}
        </div>

        {/* Sección inferior: Botón Colapsar y Cerrar Sesión */}
        <div className="p-2 border-t border-gray-100 space-y-1 shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'
            } py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer`}
            title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
          >
            {isCollapsed ? (
              <CaretRight size={18} weight="bold" />
            ) : (
              <>
                <CaretLeft size={18} weight="bold" />
                <span>Colapsar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'
            } py-2.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer`}
            title="Cerrar sesión"
          >
            <SignOut size={20} weight="regular" className="shrink-0" />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* 2. VERSIÓN CELULAR (Cajón deslizante / Drawer) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:hidden select-none ${
          mobileOpen
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full shadow-none pointer-events-none'
        }`}
      >
        {/* Cabecera del drawer móvil */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0F0F0F] text-white flex items-center justify-center shrink-0">
              <Storefront size={16} weight="regular" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-gray-900 truncate">
                {businessName || 'NEXOL POS'}
              </div>
              <div className="text-xs text-gray-500 font-normal capitalize">
                {user?.role?.toLowerCase() || 'usuario'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de navegación móvil (siempre expandida) */}
        <div className="flex-1 overflow-y-auto">
          {renderNavList(false, onCloseMobile)}
        </div>

        {/* Pie del drawer móvil */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onLogout();
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <SignOut size={20} weight="regular" className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

