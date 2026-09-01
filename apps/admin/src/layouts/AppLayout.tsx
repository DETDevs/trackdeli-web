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
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';
import { useState, useEffect } from 'react';

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

  // Cerrar sidebar al navegar a otra ruta en mobile
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

  // Initialize real-time order notifications
  useOrderNotifications();

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

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname === '/orders/new') return 'Nuevo Pedido';
    if (pathname.startsWith('/orders/')) return 'Detalle de Pedido';
    if (pathname.startsWith('/orders')) return 'Pedidos';
    if (pathname.startsWith('/clients')) return 'Clientes del Negocio';
    if (pathname.startsWith('/staff')) return 'Repartidores';
    if (pathname.startsWith('/reports')) return 'Reportes';
    if (pathname.startsWith('/commissions')) return 'Comisiones';
    if (pathname.startsWith('/invites')) return 'Invitaciones';
    if (pathname.startsWith('/settings')) return 'Configuración';
    return '';
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
      {/* Overlay oscuro en mobile cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer en mobile / Fijo en desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo & Close Button on Mobile */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50 lg:border-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-sm">
              TD
            </div>
            <div className="font-semibold text-sm text-gray-900">TrackDeli</div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2 mt-4">
              OPERACIONES
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

          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2 mt-4">
              GESTIÓN
            </div>
            <div className="space-y-1">
              {business?.businessType === 'EMPRESA_RIDERS' && (
                <NavLink to="/clients" className={navLinkClass}>
                  <Buildings size={18} weight="regular" />
                  Clientes
                </NavLink>
              )}
              <NavLink to="/staff" className={navLinkClass}>
                <Motorcycle size={18} weight="regular" />
                Repartidores
              </NavLink>
              {business?.businessType === 'EMPRESA_RIDERS' && (
                <NavLink to="/invites" className={navLinkClass}>
                  <LinkIcon size={18} weight="regular" />
                  Invitaciones
                </NavLink>
              )}
              <NavLink to="/reports" className={navLinkClass}>
                <ChartBar size={18} weight="regular" />
                Reportes
              </NavLink>
              {business?.businessType === 'EMPRESA_RIDERS' && (
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

        {/* User Profile */}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Banner de Membresía Vencida o Inactiva */}
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

        {/* TopBar / Header con Botón Hamburger */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3.5 lg:py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Abrir menú"
            >
              <List size={20} weight="bold" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-semibold text-gray-900 leading-tight">{pageTitle}</h1>
              <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">TrackDeli / {pageTitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">{user?.name || 'Usuario'}</span>
          </div>
        </header>

        {/* Content Area */}
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
