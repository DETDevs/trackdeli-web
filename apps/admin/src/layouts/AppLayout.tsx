import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Package, ListChecks, Plus, Users, ChartBar, SignOut } from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

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
    if (pathname.startsWith('/staff')) return 'Repartidores';
    if (pathname.startsWith('/reports')) return 'Reportes';
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
    <div className="flex h-screen bg-[#FAFAFA]">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-sm">
            TD
          </div>
          <div className="font-semibold text-sm text-gray-900">TrackDeli</div>
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
              <NavLink to="/staff" className={navLinkClass}>
                <Users size={18} weight="regular" />
                Repartidores
              </NavLink>
              <NavLink to="/reports" className={navLinkClass}>
                <ChartBar size={18} weight="regular" />
                Reportes
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
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
            <div className="text-sm text-gray-400 mt-0.5">TrackDeli / {pageTitle}</div>
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
              className="p-6 h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
