import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  ListChecks,
  Plus,
  ChartBar,
  SignOut,
  Gear,
  WarningCircle,
  WhatsappLogo,
  List,
  X,
  Buildings,
  Coins,
  Motorcycle,
  Link as LinkIcon,
  Users,
  User,
  Storefront,
  Receipt,
  TrendUp,
  CashRegister,
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';
import { useState, useEffect } from 'react';
import { useMyProducts } from '../hooks/useMyProducts';
import { DeliveryAccessBlocked } from '../components/DeliveryAccessBlocked';

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentRequiredMessage, setPaymentRequiredMessage] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 60000,
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePaymentRequired = (e: Event) => {
      const customEvent = e as CustomEvent;
      const msg = customEvent.detail?.message || 'Tu membresía está vencida o requiere pago.';
      setPaymentRequiredMessage(msg);
    };

    window.addEventListener('trackdeli:payment_required', handlePaymentRequired);
    return () => {
      window.removeEventListener('trackdeli:payment_required', handlePaymentRequired);
    };
  }, []);

  const isMembershipInactive =
    business?.businessType !== 'EMPRESA_RIDERS' && (
      business?.isActive === false ||
      business?.membership?.status === 'EXPIRED' ||
      Boolean(paymentRequiredMessage)
    );

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const {
    data: productsData,
    isLoading: isLoadingProducts,
  } = useMyProducts(!isSuperAdmin);

  const isDeliveryActive =
    isSuperAdmin ||
    productsData?.products?.DELIVERY?.status === 'ACTIVE';

  const isPosActive =
    isSuperAdmin ||
    productsData?.products?.POS?.status === 'ACTIVE' ||
    (business as any)?.hasPOS === true;

  const businessName = business?.name || productsData?.businessName;

  useOrderNotifications(isDeliveryActive);

  const roleLabels: Record<string, string> = {
    ENCARGADO: 'Encargado',
    REPARTIDOR: 'Repartidor',
    SUPERADMIN: 'Super Admin',
  };

  const roleLabel = user?.role ? (roleLabels[user.role] || user.role) : 'Usuario';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isSuperAdmin && isLoadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium tracking-tight">
          Verificando suscripciones del negocio...
        </p>
      </div>
    );
  }

  // Si no tiene activo ni Delivery ni POS, bloquear acceso
  if (!isDeliveryActive && !isPosActive) {
    return (
      <DeliveryAccessBlocked
        businessName={business?.name || productsData?.businessName}
        onLogout={handleLogout}
      />
    );
  }

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/pos/dashboard')) return 'Resumen POS';
    if (pathname.startsWith('/pos/sales')) return 'Ventas POS';
    if (pathname.startsWith('/pos/reports') || pathname.startsWith('/reports')) return 'Reportes';
    if (pathname.startsWith('/pos/analytics')) return 'Más Vendidos y Categorías';
    if (pathname.startsWith('/pos/inventory')) return 'Inventario POS';
    if (pathname.startsWith('/pos/cash-registers')) return 'Cierres de Caja';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname === '/orders/new') return 'Nuevo Pedido';
    if (pathname.startsWith('/orders/')) return 'Detalle de Pedido';
    if (pathname.startsWith('/orders')) return 'Pedidos';
    if (pathname.startsWith('/clients')) return 'Afiliados / Negocios';
    if (pathname.startsWith('/customers')) return 'Clientes Finales';
    if (pathname.startsWith('/team')) return 'Mi Equipo';
    if (pathname.startsWith('/staff')) return 'Repartidores';
    if (pathname.startsWith('/reports')) return 'Reportes';
    if (pathname.startsWith('/commissions')) return 'Comisiones';
    if (pathname.startsWith('/invites')) return 'Invitaciones';
    if (pathname.startsWith('/settings')) return 'Configuración';
    return 'Panel';
  };

  const pageTitle = getPageTitle(location.pathname);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const pageVariants = {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50 lg:border-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-sm shrink-0">
              TD
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {businessName || 'TrackDeli'}
              </div>
              {businessName && (
                <div className="text-[10px] text-gray-400 font-normal leading-none mt-0.5">TrackDeli</div>
              )}
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
          {/* SECCIÓN PUNTO DE VENTA (POS) - Solo visible si POS está activo */}
          {isPosActive && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-2">
                PUNTO DE VENTA (POS)
              </div>
              <div className="space-y-1">
                <NavLink to="/pos/dashboard" className={navLinkClass}>
                  <Storefront size={18} weight="regular" />
                  Resumen
                </NavLink>
                <NavLink to="/pos/sales" className={navLinkClass}>
                  <Receipt size={18} weight="regular" />
                  Ventas
                </NavLink>
                <NavLink to="/pos/analytics" className={navLinkClass}>
                  <TrendUp size={18} weight="regular" />
                  Más Vendidos
                </NavLink>
                <NavLink to="/pos/inventory" className={navLinkClass}>
                  <Package size={18} weight="regular" />
                  Inventario
                </NavLink>
                <NavLink to="/pos/cash-registers" className={navLinkClass}>
                  <CashRegister size={18} weight="regular" />
                  Cierres de Caja
                </NavLink>
                {(user?.role === 'SUPERADMIN' || user?.role === 'ENCARGADO') && (
                  <NavLink to="/pos/reports" className={navLinkClass}>
                    <ChartBar size={18} weight="regular" />
                    Reportes
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN OPERACIONES DELIVERY - Solo visible si Delivery está activo */}
          {isDeliveryActive && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-4">
                OPERACIONES DELIVERY
              </div>
              <div className="space-y-1">
                <NavLink to="/dashboard" className={navLinkClass}>
                  <Package size={18} weight="regular" />
                  Dashboard
                </NavLink>
                <NavLink to="/orders" end className={navLinkClass}>
                  <ListChecks size={18} weight="regular" />
                  Pedidos
                </NavLink>
                <NavLink to="/orders/new" className={navLinkClass}>
                  <Plus size={18} weight="regular" />
                  Nuevo pedido
                </NavLink>
              </div>
            </div>
          )}

          {/* SECCIÓN GESTIÓN */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-4">
              GESTIÓN
            </div>
            <div className="space-y-1">
              {isDeliveryActive && business?.businessType === 'EMPRESA_RIDERS' && (
                <NavLink to="/clients" className={navLinkClass}>
                  <Buildings size={18} weight="regular" />
                  Afiliados
                </NavLink>
              )}
              {isDeliveryActive && (
                <NavLink to="/customers" className={navLinkClass}>
                  <User size={18} weight="regular" />
                  Clientes
                </NavLink>
              )}
              {business?.businessType !== 'EMPRESA_RIDERS' && (
                <NavLink to="/team" className={navLinkClass}>
                  <Users size={18} weight="regular" />
                  Mi Equipo
                </NavLink>
              )}
              {isDeliveryActive && (
                <NavLink to="/staff" className={navLinkClass}>
                  <Motorcycle size={18} weight="regular" />
                  Repartidores
                </NavLink>
              )}
              {isDeliveryActive && business?.businessType === 'EMPRESA_RIDERS' && (
                <NavLink to="/invites" className={navLinkClass}>
                  <LinkIcon size={18} weight="regular" />
                  Invitaciones
                </NavLink>
              )}
              {isDeliveryActive && (
                <NavLink to="/reports" className={navLinkClass}>
                  <ChartBar size={18} weight="regular" />
                  Reportes
                </NavLink>
              )}
              {isDeliveryActive && business?.businessType === 'EMPRESA_RIDERS' && (
                <NavLink to="/commissions" className={navLinkClass}>
                  <Coins size={18} weight="regular" />
                  Comisiones
                </NavLink>
              )}
              <NavLink to="/settings" className={navLinkClass}>
                <Gear size={18} weight="regular" />
                Configuración
              </NavLink>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Usuario'}</div>
              <div className="text-xs text-gray-500 truncate">{roleLabel}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors px-3 py-2 rounded-md hover:bg-gray-50 w-full"
          >
            <SignOut size={18} weight="regular" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isMembershipInactive && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 lg:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-900 z-20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0" />
              <div className="truncate">
                <span className="font-semibold">Membresía inactiva o pago pendiente: </span>
                <span className="text-amber-800">
                  {paymentRequiredMessage || 'Tu suscripción ha vencido. Contacta al soporte para renovar y habilitar todas las operaciones.'}
                </span>
              </div>
            </div>
            <a
              href={`https://wa.me/50588068133?text=Hola,%20deseo%20activar/renovar%20la%20membres%C3%ADa%20de%20mi%20negocio%20(${encodeURIComponent(business?.name || 'mi negocio')})%20en%20TrackDeli`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shadow-xs shrink-0 self-end sm:self-auto"
            >
              <WhatsappLogo size={14} weight="fill" />
              <span>Contactar Soporte</span>
            </a>
          </div>
        )}

        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3.5 lg:py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Abrir menú"
            >
              <List size={20} weight="bold" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base lg:text-lg font-semibold text-gray-900 leading-tight truncate">{pageTitle}</h1>
                {businessName && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 truncate max-w-[160px] lg:max-w-[220px]" title={businessName}>
                    {businessName}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 hidden sm:block truncate">
                {businessName ? `${businessName} · ${pageTitle}` : `TrackDeli / ${pageTitle}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {businessName && (
              <span className="sm:hidden text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md truncate max-w-[130px]" title={businessName}>
                {businessName}
              </span>
            )}
            <span className="text-xs text-gray-500 hidden sm:inline">{user?.name || 'Usuario'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="p-4 lg:p-6 h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
