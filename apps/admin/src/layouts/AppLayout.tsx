import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';
import { useState, useEffect } from 'react';
import { useMyProducts } from '../hooks/useMyProducts';
import { usePosWebAccess } from '../hooks/usePosWebAccess';
import { DeliveryAccessBlocked } from '../components/DeliveryAccessBlocked';
import { WebAccessDisabledView } from '../components/pos/WebAccessDisabledView';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';

const decodeTokenBusinessId = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    return payload?.businessId || null;
  } catch {
    return null;
  }
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const branches = useAuthStore(state => state.branches);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentRequiredMessage, setPaymentRequiredMessage] = useState<string | null>(null);

  // Estado de colapso del menú lateral recordado en localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('trackdeli_sidebar_collapsed');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth < 1280;
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('trackdeli_sidebar_collapsed', String(next));
      return next;
    });
  };

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

  // 240b ajuste: Sincronización entre pestañas ante cambio de sucursal o logout en otra pestaña
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 1. Cierre de sesión en otra pestaña -> redirigir al login
      if (
        (e.key === 'trackdeli_access_token' && !e.newValue) ||
        (e.key === 'auth-storage' && !e.newValue)
      ) {
        logout();
        navigate('/login');
        return;
      }

      if (e.key === 'auth-storage' && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          const oldData = e.oldValue ? JSON.parse(e.oldValue) : null;

          if (
            (oldData?.state?.isAuthenticated && !newData?.state?.isAuthenticated) ||
            (newData?.state && !newData.state.user)
          ) {
            logout();
            navigate('/login');
            return;
          }

          const oldBizId = oldData?.state?.user?.businessId || user?.businessId;
          const newBizId = newData?.state?.user?.businessId;
          if (oldBizId && newBizId && oldBizId !== newBizId) {
            window.location.reload();
            return;
          }
        } catch {}
      }

      if (e.key === 'trackdeli_access_token' && e.newValue && e.oldValue) {
        const oldBizId = decodeTokenBusinessId(e.oldValue) || user?.businessId;
        const newBizId = decodeTokenBusinessId(e.newValue);
        if (oldBizId && newBizId && oldBizId !== newBizId) {
          window.location.reload();
          return;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [logout, navigate, user?.businessId]);

  const isMembershipInactive =
    business?.businessType !== 'EMPRESA_RIDERS' && (
      business?.isActive === false ||
      business?.membership?.status === 'EXPIRED' ||
      Boolean(paymentRequiredMessage)
    );

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isPosManager = isSuperAdmin || user?.role === 'ENCARGADO';

  const {
    data: productsData,
    isLoading: isLoadingProducts,
  } = useMyProducts(!isSuperAdmin);

  const {
    webAdminEnabled,
    canCobrar,
    isLoading: isLoadingPosAccess,
  } = usePosWebAccess();

  const isDeliveryActive =
    isSuperAdmin ||
    productsData?.products?.DELIVERY?.status === 'ACTIVE';

  const isPosActive =
    isSuperAdmin ||
    productsData?.products?.POS?.status === 'ACTIVE' ||
    (business as any)?.hasPOS === true;

  const hasCarteraCobro =
    isSuperAdmin ||
    productsData?.products?.CARTERA_COBRO?.status === 'ACTIVE' ||
    (business as any)?.hasCarteraCobro === true;

  const activeBranch = branches?.find(b => b.id === user?.businessId);
  const businessName = activeBranch?.name || business?.name || productsData?.businessName;

  useOrderNotifications(isDeliveryActive);

  const roleLabels: Record<string, string> = {
    ENCARGADO: 'Encargado',
    CAJERO: 'Cajero',
    REPARTIDOR: 'Repartidor',
    SUPERADMIN: 'Super Admin',
  };

  const roleLabel = user?.role ? (roleLabels[user.role] || user.role) : 'Usuario';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isSuperAdmin && (isLoadingProducts || (isPosActive && isLoadingPosAccess))) {
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

  const isPosRoute = location.pathname.startsWith('/pos');
  const isCajero = user?.role === 'CAJERO';
  const isPosCobrar = location.pathname === '/pos/cobrar';
  const isFullscreen =
    (isPosCobrar &&
      (new URLSearchParams(location.search).get('fullscreen') === 'true' ||
        localStorage.getItem('pos_fullscreen') === 'true'));

  // 1. Cajero solo puede acceder a rutas operativas del POS y Configuración restringida (Ticket 251b, 257b, 257e)
  const isAllowedCajeroPos =
    isPosCobrar ||
    location.pathname.startsWith('/pos/inventory') ||
    location.pathname.startsWith('/pos/sales') ||
    location.pathname.startsWith('/pos/cash-registers') ||
    location.pathname === '/settings';
  if (isCajero && !isAllowedCajeroPos) {
    return <Navigate to="/pos/cobrar" replace />;
  }

  // 2. Modo pantalla completa para POS en Cobrar
  if (isPosCobrar && isFullscreen) {
    return (
      <div className="h-[100dvh] w-full bg-[#FAFAFA] overflow-hidden">
        <Outlet />
      </div>
    );
  }

  // Si el negocio solo tiene POS y el acceso web básico está apagado
  if (isPosActive && !isDeliveryActive && !webAdminEnabled) {
    return (
      <WebAccessDisabledView
        isFullScreen={true}
        hasDelivery={false}
        onLogout={handleLogout}
      />
    );
  }

  const pageVariants = {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#FAFAFA] font-sans antialiased text-[#0F0F0F]">
      {/* 1. Barra superior fija estilo POS desktop (oculta en celular/tablet cuando está en /pos/cobrar para evitar encabezados apilados) */}
      <div className={isPosCobrar ? 'hidden lg:block shrink-0' : 'shrink-0'}>
        <Header
          onOpenMobileMenu={() => setSidebarOpen(true)}
          businessName={businessName}
          activeBranchName={activeBranch?.name}
          user={user}
          roleLabel={roleLabel}
          branches={branches}
          isPosActive={isPosActive}
        />
      </div>

      {/* Banner de advertencia si la membresía está inactiva */}
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

      {/* 2. Cuerpo: Menú lateral izquierdo y contenido principal */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleSidebar}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          user={user}
          business={business}
          businessName={businessName}
          isPosActive={isPosActive}
          webAdminEnabled={webAdminEnabled}
          canCobrar={canCobrar}
          isPosManager={isPosManager}
          isCajero={isCajero}
          isDeliveryActive={isDeliveryActive}
          hasCarteraCobro={hasCarteraCobro}
        />

        <main
          className={`flex-1 overflow-x-hidden min-w-0 bg-[#FAFAFA] ${
            isPosCobrar ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={isPosCobrar ? 'h-full lg:p-4' : 'p-4 lg:p-6 min-h-full'}
            >
              {isPosRoute && !webAdminEnabled ? (
                <WebAccessDisabledView
                  isFullScreen={false}
                  hasDelivery={isDeliveryActive}
                  onLogout={handleLogout}
                />
              ) : (
                <Outlet />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
