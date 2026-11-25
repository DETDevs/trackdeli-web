import React, { useState, useMemo, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  ArrowLeft,
  WarningCircle,
  MagnifyingGlass,
  ShoppingCart,
  CircleNotch,
  DeviceMobile,
  Tag,
  X,
  ClockCounterClockwise,
  CashRegister,
  ArrowsDownUp,
  ArrowsOut,
  ArrowsIn,
  SignOut,
  DotsThreeVertical,
  FileText,
  WifiSlash,
  Storefront,
  Motorcycle,
} from '@phosphor-icons/react';
import {
  getPosCategories,
  getPosProducts,
  createPosSale,
  getMyBusiness,
  getPosSettings,
  type PosCategory,
  type PosProductItem,
  type PosQuote,
  type PosSettingsData,
  type SaleResponse,
} from 'api-client';
import { usePosWebAccess } from '../../hooks/usePosWebAccess';
import { usePosWebDevice } from '../../hooks/usePosWebDevice';
import { usePosShift } from '../../hooks/usePosShift';
import { usePosPolicies } from '../../hooks/usePosPolicies';
import { usePosCartStore } from '../../store/posCart.store';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaTime } from '../../utils/dateManagua';
import { type ReceiptBusinessInfo } from '../../utils/receiptPdf';

// Subcomponentes del flujo de cobro
import { OpenShiftModal } from '../../components/pos/cobrar/OpenShiftModal';
import { CloseShiftModal } from '../../components/pos/cobrar/CloseShiftModal';
import { CashMovementsModal } from '../../components/pos/cobrar/CashMovementsModal';
import { ProductCard } from '../../components/pos/cobrar/ProductCard';
import { CartDrawer } from '../../components/pos/cobrar/CartDrawer';
import { VariantSelectorModal } from '../../components/pos/cobrar/VariantSelectorModal';
import { PresentationSelectorModal } from '../../components/pos/cobrar/PresentationSelectorModal';
import { CategorySelector, type CategorySelectorItem } from '../../components/pos/CategorySelector';
import { PaymentModal, type FinalPaymentSubmission } from '../../components/pos/cobrar/PaymentModal';
import { SaleSuccessView } from '../../components/pos/cobrar/SaleSuccessView';
import { NetworkErrorModal } from '../../components/pos/cobrar/NetworkErrorModal';
import { RecentSalesModal } from '../../components/pos/cobrar/RecentSalesModal';
import { SaveAsQuoteModal } from '../../components/pos/cobrar/SaveAsQuoteModal';
import { QuotePrintModal } from '../../components/pos/quotes/QuotePrintModal';
import { ManagerApprovalModal } from '../../components/pos/cobrar/ManagerApprovalModal';

export interface PosCobrarPageProps {
  lockChannel?: boolean;
}

export const PosCobrarPage: React.FC<PosCobrarPageProps> = ({ lockChannel = false }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const branches = useAuthStore((s) => s.branches);

  const isCajero = user?.role === 'CAJERO';
  const isSupervisor = user?.role === 'ENCARGADO' || user?.role === 'SUPERADMIN';

  // 1. Niveles de acceso
  const { webBillingEnabled, canCobrar, isLoading: isLoadingAccess } = usePosWebAccess();

  // 2. Dispositivo web
  const {
    deviceHeaders,
    isReady: isDeviceReady,
    isRegistering: isRegisteringDevice,
    deviceError,
    handleDeviceApiError,
    retryRegistration,
  } = usePosWebDevice(Boolean(webBillingEnabled && canCobrar));

  // 3. Turno de caja
  const {
    statusData,
    isOpen: isShiftOpen,
    shiftId,
    cashierName,
    openedAt,
    isResumedFromOtherBrowser,
    dismissResumedNotice,
    openShift,
    isOpening: isOpeningShift,
    closeShift,
    isClosing: isClosingShift,
    addMovement,
    isAddingMovement,
    refetch: refetchShift,
  } = usePosShift(Boolean(webBillingEnabled && canCobrar));

  // 4. Políticas de POS
  const {
    requireOpenShiftToSell,
    blindCashClose,
    cashCloseDiscrepancyPolicy,
    cashCloseTolerance,
    cashCloseMaxRecounts,
    multiCurrencyEnabled,
    discountsEnabled,
    cashierMaxDiscountPercent,
    priceOverrideEnabled,
    isLoading: isLoadingPolicies,
  } = usePosPolicies(Boolean(webBillingEnabled && canCobrar));

  // 5. Carrito
  const cartItems = usePosCartStore((s) => s.items);
  const channel = usePosCartStore((s) => s.channel);
  const setChannel = usePosCartStore((s) => s.setChannel);
  const addItem = usePosCartStore((s) => s.addItem);
  const removeItem = usePosCartStore((s) => s.removeItem);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const sourceQuote = usePosCartStore((s) => s.sourceQuote);
  const discardSourceQuote = usePosCartStore((s) => s.discardSourceQuote);
  const getSubtotal = usePosCartStore((s) => s.getSubtotal);
  const getDiscountAmount = usePosCartStore((s) => s.getDiscountAmount);
  const getTotal = usePosCartStore((s) => s.getTotal);
  const getEffectiveDeliveryFee = usePosCartStore((s) => s.getEffectiveDeliveryFee);
  const getCalculationSummary = usePosCartStore((s) => s.getCalculationSummary);
  const setBusinessContext = usePosCartStore((s) => s.setBusinessContext);

  // Estado de conexión del navegador (obligatorio para convertir proformas)
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  const isQuoteOfflineBlocked = Boolean(sourceQuote && !isOnline);
  const quoteInitialCustomer = useMemo(() => {
    if (!sourceQuote) return null;
    if (!sourceQuote.customerId && !sourceQuote.customerName?.trim()) return null;
    return {
      id: sourceQuote.customerId || null,
      name: sourceQuote.customerName?.trim() || 'Cliente de proforma',
      phone: sourceQuote.customerPhone || null,
      ruc: sourceQuote.customerRuc || null,
      lastAddressText: sourceQuote.customerAddress || null,
      deliveryReference: null,
      creditLimit: null,
      creditSummary: null,
    };
  }, [sourceQuote]);

  // Estados de modales
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isCashMovementsModalOpen, setIsCashMovementsModalOpen] = useState(false);
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSaveAsQuoteOpen, setIsSaveAsQuoteOpen] = useState(false);
  const [printingQuote, setPrintingQuote] = useState<PosQuote | null>(null);
  const [isNetworkErrorModalOpen, setIsNetworkErrorModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filtros de productos (persistencia de categoría en la sesión actual)
  const categorySessionKey = `pos_cobrar_category_${user?.businessId || 'default'}`;
  const recentCategoriesKey = `pos_recent_categories_${user?.businessId || 'default'}`;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'ALL';
    try {
      return window.sessionStorage.getItem(categorySessionKey) || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [variantModalProduct, setVariantModalProduct] = useState<PosProductItem | null>(null);
  const [presentationModalProduct, setPresentationModalProduct] = useState<PosProductItem | null>(null);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();

    // 1. Coincidencia exacta de código de barras en presentaciones
    for (const p of products) {
      if (Array.isArray(p.presentations)) {
        const pres = p.presentations.find(
          (pr) => pr.isActive !== false && pr.barcode && pr.barcode.trim().toLowerCase() === q,
        );
        if (pres) {
          addItem(p, pres, 1);
          setSearchQuery('');
          e.preventDefault();
          return;
        }
      }
    }

    // 2. Coincidencia exacta de código de barras en variantes
    for (const p of products) {
      if (Array.isArray(p.variants)) {
        const v = p.variants.find(
          (va) => va.isActive !== false && va.barcode && va.barcode.trim().toLowerCase() === q,
        );
        if (v) {
          addItem(v as PosProductItem, undefined, 1);
          setSearchQuery('');
          e.preventDefault();
          return;
        }
      }
    }

    // 3. Coincidencia exacta de código de barras en productos base
    const matchedProduct = products.find((p) => p.barcode && p.barcode.trim().toLowerCase() === q);
    if (matchedProduct) {
      if (matchedProduct.isVariantParent) {
        setVariantModalProduct(matchedProduct);
      } else if (
        Array.isArray(matchedProduct.presentations) &&
        matchedProduct.presentations.filter((pr) => pr.isActive !== false).length > 0
      ) {
        setPresentationModalProduct(matchedProduct);
      } else {
        addItem(matchedProduct, undefined, 1);
      }
      setSearchQuery('');
      e.preventDefault();
      return;
    }

    // 4. Si hay un solo producto en los resultados filtrados
    if (filteredProducts.length === 1) {
      const single = filteredProducts[0];
      if (single.isVariantParent) {
        setVariantModalProduct(single);
      } else if (
        Array.isArray(single.presentations) &&
        single.presentations.filter((pr) => pr.isActive !== false).length > 0
      ) {
        setPresentationModalProduct(single);
      } else {
        addItem(single, undefined, 1);
      }
      setSearchQuery('');
      e.preventDefault();
      return;
    }
  };

  React.useEffect(() => {
    try {
      window.sessionStorage.setItem(categorySessionKey, selectedCategoryId);
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }, [categorySessionKey, selectedCategoryId]);

  // Venta en proceso y resultado
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleErrorMessage, setSaleErrorMessage] = useState<string | null>(null);
  const [previewFallbackNotice, setPreviewFallbackNotice] = useState<string | null>(null);
  const [usePromotionsInSale, setUsePromotionsInSale] = useState<boolean>(true);
  const [pendingDiscountApprovalSubmission, setPendingDiscountApprovalSubmission] =
    useState<FinalPaymentSubmission | null>(null);
  const [discountApprovalMessage, setDiscountApprovalMessage] = useState<string>('');

  // Claves de idempotencia para operaciones de caja (reutilizadas en reintentos hasta éxito)
  const openShiftKeyRef = useRef<string>('');
  const closeShiftKeyRef = useRef<string>('');
  const movementKeyRef = useRef<string>('');

  const handleOpenShiftWithIdempotency = async (dto: any) => {
    if (!openShiftKeyRef.current) {
      openShiftKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `shift-open-${Date.now()}`;
    }
    try {
      const res = await openShift({
        dto,
        deviceHeaders: {
          ...(deviceHeaders || {}),
          'Idempotency-Key': openShiftKeyRef.current,
        },
      });
      openShiftKeyRef.current = '';
      return res;
    } catch (err) {
      throw err;
    }
  };

  const handleCloseShiftWithIdempotency = async (dto: any) => {
    if (!closeShiftKeyRef.current) {
      closeShiftKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `shift-close-${Date.now()}`;
    }
    try {
      const res = await closeShift({
        dto,
        deviceHeaders: {
          ...(deviceHeaders || {}),
          'Idempotency-Key': closeShiftKeyRef.current,
        },
      });
      closeShiftKeyRef.current = '';
      return res;
    } catch (err) {
      throw err;
    }
  };

  const handleAddMovementWithIdempotency = async (dto: any) => {
    if (!movementKeyRef.current) {
      movementKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `movement-${Date.now()}`;
    }
    try {
      const res = await addMovement({
        dto,
        deviceHeaders: {
          ...(deviceHeaders || {}),
          'Idempotency-Key': movementKeyRef.current,
        },
      });
      movementKeyRef.current = '';
      return res;
    } catch (err) {
      throw err;
    }
  };

  // Pantalla completa toggle para supervisor
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isCajero || localStorage.getItem('pos_fullscreen') === 'true';
  });

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    localStorage.setItem('pos_fullscreen', next ? 'true' : 'false');
    window.dispatchEvent(new Event('resize'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Consulta de datos del negocio para recibos
  const { data: businessData } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 5 * 60 * 1000,
  });

  // Configuración POS (vertical, canales, cartera) accesible para roles de caja
  const { data: posSettingsData } = useQuery<PosSettingsData>({
    queryKey: ['pos', 'settings'],
    queryFn: () => getPosSettings(),
    enabled: Boolean(webBillingEnabled && canCobrar),
    staleTime: 60 * 1000,
  });

  const resolvedPosVertical = String(
    posSettingsData?.posVertical ??
      (businessData as any)?.posVertical ??
      (user as any)?.business?.posVertical ??
      'RETAIL',
  ).toUpperCase();
  const isTallerBusiness = [
    resolvedPosVertical,
    (posSettingsData as any)?.salonProfile,
    (businessData as any)?.salonProfile,
    (user as any)?.business?.salonProfile,
  ].some((v) => String(v || '').toUpperCase() === 'TALLER');
  const deliveryChannelEnabled = Boolean(posSettingsData?.channels?.delivery?.enabled);
  const defaultDeliveryFee = Number(posSettingsData?.channels?.delivery?.defaultFee ?? 0);
  const deliveryRequireDriver = Boolean(posSettingsData?.channels?.delivery?.requireDriver);
  const effectiveChannel = lockChannel || !deliveryChannelEnabled ? 'MOSTRADOR' : channel;

  React.useEffect(() => {
    if ((lockChannel || (posSettingsData && !deliveryChannelEnabled)) && channel !== 'MOSTRADOR') {
      setChannel('MOSTRADOR');
    }
  }, [lockChannel, posSettingsData, deliveryChannelEnabled, channel, setChannel]);
  const carteraActive = Boolean(
    posSettingsData?.hasCarteraCobro ??
      (businessData as any)?.hasCarteraCobro ??
      (user as any)?.business?.hasCarteraCobro,
  );

  React.useEffect(() => {
    if (businessData) {
      const b = businessData as any;
      setBusinessContext({
        useListPrice: Boolean(b.useListPrice),
        taxEnabled: b.taxEnabled !== undefined ? Boolean(b.taxEnabled) : true,
        taxIncluded: Boolean(b.taxIncluded),
        taxRate: b.taxRate !== undefined && Number(b.taxRate) > 0 ? Number(b.taxRate) : 15,
      });
    }
  }, [businessData, setBusinessContext]);

  const activeBranch = branches?.find((b) => b.id === user?.businessId);
  const businessInfo: ReceiptBusinessInfo = useMemo(() => {
    const b = businessData as any;
    return {
      name: completedSale?.business?.name || activeBranch?.name || b?.name || 'NEXOL POS',
      address: completedSale?.business?.address || b?.posAddress || b?.address || null,
      phone: completedSale?.business?.phone || b?.posPhone || b?.whatsappNumber || b?.phone || null,
      taxId: completedSale?.business?.taxId || b?.taxId || null,
      logoUrl: completedSale?.business?.logoUrl || b?.logoUrl || null,
    };
  }, [completedSale, businessData, activeBranch]);

  // Consulta de categorías
  const { data: categories = [] } = useQuery<PosCategory[]>({
    queryKey: ['pos', 'categories'],
    queryFn: () => getPosCategories(),
    enabled: Boolean(webBillingEnabled && canCobrar),
    staleTime: 60000,
  });

  // Consulta de productos del catálogo (294: con variantes agrupadas)
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<PosProductItem[]>({
    queryKey: ['pos', 'products'],
    queryFn: () => getPosProducts({ groupVariants: true }),
    enabled: Boolean(webBillingEnabled && canCobrar),
    staleTime: 30000,
  });

  // Filtrado de productos por categoría y texto de búsqueda (soporta variantes y presentaciones)
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategoryId !== 'ALL') {
      result = result.filter((p) => p.categoryId === selectedCategoryId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        if (p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q))) {
          return true;
        }
        if (Array.isArray(p.presentations) && p.presentations.some((pres) =>
          pres.isActive !== false &&
          (pres.name.toLowerCase().includes(q) || (pres.barcode && pres.barcode.toLowerCase().includes(q)))
        )) {
          return true;
        }
        if (Array.isArray(p.variants) && p.variants.some((v) =>
          v.isActive !== false &&
          (v.name.toLowerCase().includes(q) || (v.barcode && v.barcode.toLowerCase().includes(q)))
        )) {
          return true;
        }
        return false;
      });
    }
    return result;
  }, [products, selectedCategoryId, searchQuery]);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((item) => {
      map[item.id] = (map[item.id] || 0) + item.quantity;
      if (item.id !== item.productId) {
        map[item.productId] = (map[item.productId] || 0) + item.quantity;
      }
    });
    // Para productos padre con variantes, sumar el conteo de los hijos en carrito
    products.forEach((p) => {
      if (p.isVariantParent && Array.isArray(p.variants)) {
        const sumVar = p.variants.reduce((s, v) => s + (map[v.id] || 0), 0);
        if (sumVar > 0) {
          map[p.id] = sumVar;
        }
      }
    });
    return map;
  }, [cartItems, products]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  const selectorCategories = useMemo<CategorySelectorItem[]>(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: isLoadingProducts && c._count?.products !== undefined
        ? c._count.products
        : (categoryCounts[c.id] ?? c._count?.products ?? 0),
    }));
  }, [categories, categoryCounts, isLoadingProducts]);

  React.useEffect(() => {
    if (
      selectedCategoryId !== 'ALL' &&
      categories.length > 0 &&
      !categories.some((c) => c.id === selectedCategoryId)
    ) {
      setSelectedCategoryId('ALL');
    }
  }, [categories, selectedCategoryId]);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const effectiveDeliveryFee = effectiveChannel === 'DOMICILIO' ? getEffectiveDeliveryFee() : 0;
  const total = effectiveChannel === 'DOMICILIO' ? getTotal() : getCalculationSummary().total;
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 1. Estados de carga inicial
  if (isLoadingAccess || isLoadingPolicies) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <CircleNotch size={28} className="animate-spin text-gray-900 mb-3" />
        <p className="text-xs text-gray-600 font-medium">Cargando punto de venta...</p>
      </div>
    );
  }

  // 2. Cobro web no habilitado
  if (!webBillingEnabled) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mx-auto">
            <CreditCard size={30} weight="duotone" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 uppercase tracking-wide mb-2">
              Módulo adicional
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Cobro web no habilitado
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              El cobro web no está habilitado para este negocio. Pedile al administrador que lo active desde el panel de Superadmin.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            {!isCajero ? (
              <NavLink
                to="/pos/dashboard"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px] cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Volver al resumen POS</span>
              </NavLink>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px] cursor-pointer"
              >
                <SignOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Rol no autorizado
  if (!canCobrar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 mx-auto">
            <WarningCircle size={30} weight="duotone" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200/60 uppercase tracking-wide mb-2">
              Permiso insuficiente
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Rol no autorizado para cobrar
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              Tu usuario ({user?.role || 'sin rol'}) no tiene permisos para cobrar en el punto de venta.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px] cursor-pointer"
            >
              <SignOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Error de registro o verificación de dispositivo
  if (deviceError) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <div className="bg-white rounded-3xl border border-red-200 p-6 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
            <DeviceMobile size={30} weight="duotone" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200 mb-2 uppercase tracking-wide">
              Dispositivo no autorizado
            </span>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              {deviceError.code === 'WEB_DEVICE_LIMIT_REACHED'
                ? 'Límite de dispositivos alcanzado'
                : 'Error con el dispositivo'}
            </h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              {deviceError.message}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            {deviceError.code !== 'WEB_DEVICE_LIMIT_REACHED' && (
              <button
                type="button"
                onClick={retryRegistration}
                className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px] cursor-pointer"
              >
                Reintentar registro
              </button>
            )}

            {!isCajero ? (
              <NavLink
                to="/pos/dashboard"
                className="w-full block py-3 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors min-h-[44px]"
              >
                Volver al resumen POS
              </NavLink>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full block py-3 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] cursor-pointer"
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. Registrando dispositivo
  if (isRegisteringDevice && !isDeviceReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <CircleNotch size={28} className="animate-spin text-gray-900 mb-3" />
        <p className="text-xs text-gray-700 font-semibold">Registrando dispositivo para cobro...</p>
        <p className="text-xs text-gray-500 mt-1">Solo toma un instante</p>
      </div>
    );
  }

  // 6. Venta completada exitosamente
  if (completedSale) {
    return (
      <div className="h-full overflow-y-auto">
        <SaleSuccessView
          sale={completedSale}
          businessInfo={businessInfo}
          cashierName={cashierName || user?.name || 'Cajero'}
          onNewSale={() => {
            setCompletedSale(null);
            clearCart();
          }}
        />
      </div>
    );
  }

  // 7. Política obligatoria y caja cerrada: Bloquear pantalla con apertura obligatoria
  if (requireOpenShiftToSell && !isShiftOpen && !isCloseShiftModalOpen) {
    const branchDiffers =
      Boolean(activeBranch?.name) &&
      activeBranch?.name.trim().toLowerCase() !== (businessInfo?.name || '').trim().toLowerCase();

    return (
      <div className="h-full overflow-y-auto flex flex-col bg-[#FAFAFA] select-none">
        {/* Barra superior compacta */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-2 shrink-0 shadow-2xs sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!isCajero && (
              <NavLink
                to="/pos/dashboard"
                className="p-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                title="Volver al resumen"
                aria-label="Volver al resumen"
              >
                <ArrowLeft size={18} weight="bold" />
              </NavLink>
            )}
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gray-900 text-white items-center justify-center font-bold text-xs shrink-0">
              POS
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900 truncate leading-tight">
                {businessInfo?.name || 'NEXOL POS'}
              </div>
              {branchDiffers && (
                <div className="hidden sm:block text-xs text-gray-500 truncate leading-tight">
                  {activeBranch?.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Sin turno</span>
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <SignOut size={18} />
            </button>
          </div>
        </header>

        {/* Bloque central amigable de turno requerido */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <CashRegister size={36} weight="duotone" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Abrí tu turno para empezar a vender
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                La política del negocio exige abrir un turno de caja antes de registrar ventas.
              </p>
            </div>
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <CashRegister size={18} />
                <span>Abrir turno de caja</span>
              </button>

              {!isCajero ? (
                <NavLink
                  to="/pos/dashboard"
                  className="w-full block py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Volver al panel administrativo
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Apertura de Caja */}
        <OpenShiftModal
          isOpen={isOpenShiftModalOpen}
          onClose={() => setIsOpenShiftModalOpen(false)}
          onSuccess={() => {
            setIsOpenShiftModalOpen(false);
            refetchShift();
          }}
          onAlreadyOpen={() => {
            refetchShift();
          }}
          onOpenShift={handleOpenShiftWithIdempotency}
          isOpening={isOpeningShift}
        />
      </div>
    );
  }

  // 8. Flujo de cobro final
  const handleFinalSubmitSale = async (paymentData: FinalPaymentSubmission) => {
    if (isSubmittingSale) return;

    // Si la caja está cerrada y la política lo exige, bloquear
    if (!isShiftOpen && requireOpenShiftToSell) {
      setSaleErrorMessage('La caja está cerrada. Debes abrir un turno para registrar ventas.');
      return;
    }

    if (cartItems.length === 0) {
      setSaleErrorMessage('El carrito está vacío. Agrega productos para cobrar.');
      return;
    }

    if (sourceQuote && !navigator.onLine) {
      setSaleErrorMessage('Esta proforma solo se puede convertir en venta con conexión a internet');
      return;
    }

    setIsSubmittingSale(true);
    setSaleErrorMessage(null);

    const isUsingPromos =
      usePromotionsInSale &&
      !previewFallbackNotice &&
      Boolean(usePosCartStore.getState().previewResult);

    const currentCalc = getCalculationSummary();

    const itemsPayload = currentCalc.lines.map((line, idx) => {
      const cartItem = cartItems[idx];
      const isCustom =
        Boolean(cartItem?.isCustomLine) ||
        String(line.productId || '').startsWith('quote-custom-');
      return {
        productId: isCustom ? undefined : line.productId || undefined,
        presentationId: cartItem?.presentationId || undefined,
        productName: line.productName,
        barcode: line.barcode || undefined,
        unitPrice: line.unitPrice,
        quantity: Number(Number(line.quantity).toFixed(3)),
        discount: line.discount || 0,
        priceTier: line.priceTier,
        subtotal: line.subtotal,
        promoDiscount: isUsingPromos ? cartItem?.promoDiscount || undefined : undefined,
        promotionName: isUsingPromos ? cartItem?.promotionName || undefined : undefined,
        listPrice: line.listPrice != null ? line.listPrice : undefined,
        listPriceDiscount: line.listPriceDiscount,
        manualDiscountShare: line.manualDiscountShare,
        taxable: line.taxable,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
      };
    });

    const idempotencyKey =
      paymentData.clientGeneratedId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    const saleDeliveryFee =
      effectiveChannel === 'DOMICILIO'
        ? Math.max(0, Math.round(Number(paymentData.deliveryFee ?? effectiveDeliveryFee ?? 0) * 100) / 100)
        : 0;
    const finalSubtotal = Math.round((currentCalc.subtotal + saleDeliveryFee) * 100) / 100;
    const finalSubtotalBeforeTax = Math.round((currentCalc.subtotalBeforeTax + saleDeliveryFee) * 100) / 100;
    const finalTotal = Math.round((currentCalc.total + saleDeliveryFee) * 100) / 100;

    const salePayload: any = {
      channel: effectiveChannel,
      applyPromotions: isUsingPromos,
      deliveryFee: effectiveChannel === 'DOMICILIO' ? saleDeliveryFee : undefined,
      deliveryAddress:
        effectiveChannel === 'DOMICILIO'
          ? paymentData.deliveryAddress?.trim() || undefined
          : undefined,
      deliveryPhone:
        effectiveChannel === 'DOMICILIO'
          ? paymentData.deliveryPhone?.trim() || paymentData.customerPhone || undefined
          : undefined,
      deliveryReference:
        effectiveChannel === 'DOMICILIO'
          ? paymentData.deliveryReference !== undefined
            ? paymentData.deliveryReference.trim()
            : undefined
          : undefined,
      deliveryDriverId:
        effectiveChannel === 'DOMICILIO'
          ? paymentData.deliveryDriverId || undefined
          : undefined,
      quoteId: sourceQuote?.quoteId || undefined,
      vehicleInfo: sourceQuote?.vehicleInfo || undefined,
      items: itemsPayload,
      subtotal: finalSubtotal,
      discountAmount: currentCalc.discountAmount > 0 ? currentCalc.discountAmount : undefined,
      discount: currentCalc.discountAmount > 0 ? currentCalc.discountAmount : undefined,
      promoDiscountTotal: isUsingPromos && (currentCalc.promoDiscountTotal ?? 0) > 0 ? currentCalc.promoDiscountTotal : undefined,
      subtotalBeforeTax: finalSubtotalBeforeTax,
      total: finalTotal,
      clientTotal: finalTotal,
      taxModel: currentCalc.taxModel,
      taxAmount: currentCalc.taxAmount,
      taxEnabled: currentCalc.taxAmount > 0,
      taxRate: 15,
      listPriceTotal: currentCalc.listPriceTotal,
      listDiscountTotal: currentCalc.listDiscountTotal,
      clientListPriceTotal: currentCalc.listPriceTotal,
      clientListDiscountTotal: currentCalc.listDiscountTotal,
      clientTaxRate: 15,
      clientTaxEnabled: currentCalc.taxAmount > 0,
      clientTaxIncluded: false,
      clientTaxAmount: currentCalc.taxAmount,
      paymentMethod: paymentData.method,
      amountPaid: paymentData.amountPaid,
      amountTendered: paymentData.amountTendered,
      change: paymentData.change,
      reference: paymentData.reference,
      customerName: paymentData.customerName,
      customerPhone: paymentData.customerPhone,
      customerId: paymentData.customerId,
      customerRuc: paymentData.customerRuc,
      notes: paymentData.notes,
      creditDueDate: paymentData.creditDueDate,
      creditPlan: paymentData.creditPlan,
      approvalToken: paymentData.approvalToken,
      discountApprovalToken: paymentData.discountApprovalToken,
      payments: paymentData.payments,
      tip: paymentData.tip,
      sellerId: paymentData.sellerId,
      sellerName: paymentData.sellerName,
      clientGeneratedId: idempotencyKey,
    };

    try {
      const response = await createPosSale(salePayload, {
        ...(deviceHeaders || {}),
        'Idempotency-Key': idempotencyKey,
      });

      setIsPaymentModalOpen(false);
      setIsCartDrawerOpen(false);
      setCompletedSale(response);
      clearCart();

      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'quotes'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'quote'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    } catch (err: any) {
      const handled = handleDeviceApiError(err);
      if (handled) {
        setIsPaymentModalOpen(false);
        return;
      }

      const isNetError =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout') ||
        err.message?.includes('Network Error');

      if (isNetError) {
        setSaleErrorMessage(
          sourceQuote
            ? 'Esta proforma solo se puede convertir en venta con conexión a internet'
            : 'No hay conexión. La venta no se registró. Revisá tu internet y volvé a intentar.',
        );
        return;
      }

      const rawData = err?.response?.data;
      const rawMessage = rawData?.message;
      const errCode =
        rawData?.code ??
        (typeof rawMessage === 'object' && rawMessage !== null ? rawMessage.code : undefined);
      const errMsg =
        typeof rawMessage === 'string'
          ? rawMessage
          : typeof rawMessage?.message === 'string'
            ? rawMessage.message
            : Array.isArray(rawMessage)
              ? rawMessage.join(', ')
              : undefined;

      if (errCode === 'QUOTE_ALREADY_CONVERTED') {
        setSaleErrorMessage('Esta proforma ya fue convertida en una venta.');
      } else if (errCode === 'QUOTE_EXPIRED') {
        setSaleErrorMessage('La proforma está vencida o no aplica precio protegido.');
      } else if (errCode === 'QUOTE_CANCELLED') {
        setSaleErrorMessage('Esta proforma fue cancelada y no se puede convertir en venta.');
      } else if (errCode === 'QUOTE_NOT_SENT') {
        setSaleErrorMessage('Esta proforma sigue en borrador; emitila antes de convertirla.');
      } else if (errCode === 'QUOTE_NOT_FOUND') {
        setSaleErrorMessage('No se encontró la proforma asociada a este cobro.');
      } else if (errCode === 'DISCOUNT_LIMIT_EXCEEDED') {
        setDiscountApprovalMessage(
          errMsg ||
            `El descuento aplicado supera el máximo permitido para cajero (${cashierMaxDiscountPercent}%). Ingresá las credenciales del encargado para autorizar.`,
        );
        setPendingDiscountApprovalSubmission({
          ...paymentData,
          clientGeneratedId: idempotencyKey,
        });
      } else if (
        errCode === 'DISCOUNTS_DISABLED' ||
        errCode === 'DISCOUNT_NOT_ALLOWED_ON_ITEM' ||
        errCode === 'DISCOUNT_NOT_ALLOWED'
      ) {
        setSaleErrorMessage(errMsg || 'El descuento aplicado no está permitido.');
      } else if (errCode === 'PRICE_MISMATCH') {
        setSaleErrorMessage(
          errMsg || 'El catálogo de precios cambió. Recargá los productos para actualizar los precios.',
        );
      } else if (errCode === 'VARIANT_PARENT_NOT_SELLABLE') {
        setSaleErrorMessage(errMsg || 'Elegí la talla o el color antes de agregarlo.');
      } else if (errCode === 'QUANTITY_MUST_BE_INTEGER') {
        setSaleErrorMessage(errMsg || 'La unidad de este producto no admite decimales. Ingresá una cantidad entera.');
      } else if (errCode === 'TIP_DISABLED') {
        setSaleErrorMessage(errMsg || 'Las propinas están desactivadas para este negocio.');
      } else if (errCode === 'TIP_NOT_ALLOWED_FOR_CHANNEL') {
        setSaleErrorMessage(errMsg || 'Las propinas solo están permitidas para ventas en mostrador.');
      } else if (err?.response?.status === 400) {
        setSaleErrorMessage(
          errMsg || 'Los datos de la venta o propina no son válidos. Revisá e intentá de nuevo.',
        );
      } else if (err?.response?.status === 422 || errCode === 'INSUFFICIENT_STOCK') {
        setSaleErrorMessage(
          errMsg || 'Uno o más productos no cuentan con stock suficiente para completar la venta.',
        );
      } else if (err?.response?.status === 409 || errCode === 'NO_OPEN_SHIFT') {
        setSaleErrorMessage('La caja está cerrada. Debés abrir un turno para registrar ventas.');
        refetchShift();
      } else {
        setSaleErrorMessage(errMsg || 'No se pudo completar la venta. Revisá los datos ingresados.');
      }
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const showBranchSubtitle =
    Boolean(activeBranch?.name) &&
    activeBranch?.name.trim().toLowerCase() !== (businessInfo?.name || '').trim().toLowerCase();

  return (
    <div className="h-full bg-[#FAFAFA] flex flex-col select-none overflow-hidden">
      {/* 1. BARRA SUPERIOR COMPACTA Y FIJA */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-2 shrink-0 shadow-2xs z-30">
        {/* Identidad del Negocio */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          {!isCajero && (
            <NavLink
              to="/pos/dashboard"
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
              title="Volver al resumen"
              aria-label="Volver al resumen"
            >
              <ArrowLeft size={18} weight="bold" />
            </NavLink>
          )}

          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gray-900 text-white items-center justify-center font-bold text-xs shrink-0">
            POS
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-gray-900 truncate leading-tight">
              {businessInfo?.name || 'NEXOL POS'}
            </div>
            {showBranchSubtitle && (
              <div className="hidden sm:block text-xs text-gray-500 truncate leading-tight">
                {activeBranch?.name}
              </div>
            )}
          </div>
        </div>

        {/* Estado único de la Caja y Menú de Acciones */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isShiftOpen ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Caja abierta</span>
            </span>
          ) : requireOpenShiftToSell === false ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span>Sin caja</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Sin turno</span>
            </span>
          )}

          {/* Menú de Acciones Desplegable */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Menú de caja y acciones"
              aria-label="Menú de acciones"
              aria-expanded={isMenuOpen}
            >
              <DotsThreeVertical size={20} weight="bold" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.role === 'CAJERO'
                        ? 'Cajero'
                        : user?.role === 'ENCARGADO'
                        ? 'Encargado'
                        : user?.role || 'Personal'}
                    </p>
                  </div>

                  <div className="py-1">
                    {/* Abrir o Cerrar caja */}
                    {!isShiftOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsOpenShiftModalOpen(true);
                        }}
                        className="w-full px-4 py-3 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                      >
                        <CashRegister size={18} className="shrink-0" />
                        <span>Abrir turno de caja</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsCloseShiftModalOpen(true);
                        }}
                        className="w-full px-4 py-3 text-left text-xs font-semibold text-amber-800 bg-amber-50/40 hover:bg-amber-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                      >
                        <CashRegister size={18} className="shrink-0 text-amber-700" />
                        <span>Cerrar turno de caja</span>
                      </button>
                    )}

                    {/* Movimientos de caja */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsCashMovementsModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                    >
                      <ArrowsDownUp size={18} className="shrink-0" />
                      <span>Movimientos de caja</span>
                    </button>

                    {/* Ventas de hoy */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsRecentSalesModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                    >
                      <ClockCounterClockwise size={18} className="shrink-0" />
                      <span>Ventas de hoy</span>
                    </button>

                    {/* Proformas */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/pos/quotes');
                      }}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                    >
                      <FileText size={18} className="shrink-0" />
                      <span>Proformas</span>
                    </button>

                    {/* Volver al Resumen (supervisores) */}
                    {!isCajero && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/pos/dashboard');
                        }}
                        className="w-full px-4 py-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                      >
                        <ArrowLeft size={18} className="shrink-0" />
                        <span>Ir al resumen</span>
                      </button>
                    )}

                    {/* Alternar Pantalla Completa (solo en escritorio para supervisor) */}
                    {isSupervisor && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          toggleFullscreen();
                        }}
                        className="hidden lg:flex w-full px-4 py-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 items-center gap-2.5 min-h-[48px] cursor-pointer"
                      >
                        {isFullscreen ? (
                          <>
                            <ArrowsIn size={18} className="shrink-0" />
                            <span>Salir de pantalla completa</span>
                          </>
                        ) : (
                          <>
                            <ArrowsOut size={18} className="shrink-0" />
                            <span>Pantalla completa</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="border-t border-gray-200 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2.5 min-h-[48px] cursor-pointer"
                    >
                      <SignOut size={18} className="shrink-0" />
                      <span>Salir</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Aviso corto al retomar caja web abierta desde otro navegador */}
      {isShiftOpen && isResumedFromOtherBrowser && openedAt && (() => {
        const openedLabel = formatManaguaTime(openedAt);
        const suffix = openedLabel.endsWith('.') ? '' : '.';
        return (
          <div
            role="status"
            className="bg-blue-50 border-b border-blue-200 px-3 sm:px-5 py-2 flex items-center justify-between gap-2 text-xs text-blue-900 shrink-0"
          >
            <span className="font-medium">
              Retomaste tu caja abierta desde las {openedLabel}{suffix}
            </span>
            <button
              type="button"
              onClick={dismissResumedNotice}
              aria-label="Cerrar aviso"
              className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors shrink-0 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        );
      })()}

      {/* 2. BUSCADOR Y CATEGORÍAS FIJOS (Nunca se cortan ni saltan al hacer scroll) */}
      <div className="bg-[#FAFAFA] border-b border-gray-200/70 px-3 sm:px-5 pt-2.5 pb-2 shrink-0 z-20">
        <div className="max-w-5xl w-full mx-auto space-y-2.5">
          {/* Selector de canal (Mostrador / A domicilio) */}
          {deliveryChannelEnabled && !lockChannel && (
            <div className="flex items-center justify-between gap-2 bg-white border border-gray-200/80 rounded-2xl px-3 py-1.5 shadow-2xs">
              <span className="text-xs font-bold text-gray-600">Canal de venta</span>
              <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setChannel('MOSTRADOR')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    effectiveChannel === 'MOSTRADOR'
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <Storefront size={15} weight={effectiveChannel === 'MOSTRADOR' ? 'fill' : 'regular'} />
                  <span>Mostrador</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('DOMICILIO', defaultDeliveryFee)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    effectiveChannel === 'DOMICILIO'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <Motorcycle size={15} weight={effectiveChannel === 'DOMICILIO' ? 'fill' : 'regular'} />
                  <span>A domicilio</span>
                </button>
              </div>
            </div>
          )}

          {/* Buscador de productos */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <MagnifyingGlass size={18} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar producto o código de barras..."
              className="w-full pl-10 pr-11 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-hidden focus:border-gray-900 transition-colors shadow-2xs min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 rounded-xl flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Categorías: chips horizontales hasta 6 categorías, botón con buscador arriba de 6 */}
          <CategorySelector
            categories={selectorCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            totalProductsCount={products.length}
            allValue="ALL"
            compactVariant="chips"
            recentStorageKey={recentCategoriesKey}
          />

          {sourceQuote && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-indigo-950">
                    <FileText size={15} className="text-indigo-700 shrink-0" weight="bold" />
                    Desde proforma {sourceQuote.quoteNumber}
                  </span>
                  {sourceQuote.vehicleInfo && (
                    <span className="text-indigo-900 font-medium">
                      · {sourceQuote.vehicleInfo}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {sourceQuote.hasPriceChanges && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold">
                      {sourceQuote.priceProtectionApplied
                        ? 'Precio cotizado protegido'
                        : 'Precios actualizados al catálogo'}
                    </span>
                  )}
                  {sourceQuote.hasInsufficientStock && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                      Stock insuficiente en {sourceQuote.insufficientStockNotes.join(', ')}
                    </span>
                  )}
                  {sourceQuote.batchItemNotes.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold">
                      Lotes FEFO: {sourceQuote.batchItemNotes.join(', ')}
                    </span>
                  )}
                  {sourceQuote.missingProductNotes.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-semibold">
                      Omitidos por no disponibles: {sourceQuote.missingProductNotes.join(', ')}
                    </span>
                  )}
                </div>
                {isQuoteOfflineBlocked && (
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold pt-0.5">
                    <WifiSlash size={15} className="text-amber-700 shrink-0" weight="bold" />
                    <span>Esta proforma solo se puede convertir en venta con conexión a internet</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={discardSourceQuote}
                className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-100 text-indigo-900 font-bold shrink-0 cursor-pointer"
              >
                Descartar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. CATÁLOGO CON SCROLL INDEPENDIENTE */}
      <section aria-label="Catálogo de productos" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-5xl w-full mx-auto p-3 sm:p-5 pb-6">
          {isLoadingProducts ? (
            <div
              className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3"
              aria-label="Cargando productos"
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-200/80 p-3 space-y-3 animate-pulse h-36 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-16 bg-gray-200 rounded-md" />
                    <div className="h-5 w-14 bg-gray-100 rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-full bg-gray-200 rounded" />
                    <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-3">
              <Tag size={32} className="mx-auto text-gray-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">
                  {searchQuery.trim() && selectedCategoryId !== 'ALL'
                    ? 'No encontramos productos con esos filtros'
                    : searchQuery.trim()
                      ? 'No encontramos productos con ese nombre'
                      : 'No hay productos en esta categoría'}
                </h4>
                <p className="text-xs text-gray-600">
                  {searchQuery.trim() && selectedCategoryId !== 'ALL'
                    ? `Sin coincidencias para "${searchQuery.trim()}" en la categoría seleccionada`
                    : searchQuery.trim()
                      ? `Sin coincidencias para "${searchQuery.trim()}"`
                      : 'Probá eligiendo otra categoría del catálogo'}
                </p>
              </div>
              {searchQuery.trim() && selectedCategoryId !== 'ALL' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId('ALL');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl min-h-[44px] cursor-pointer transition-colors"
                >
                  <X size={14} weight="bold" />
                  <span>Limpiar filtros</span>
                </button>
              ) : searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl min-h-[44px] cursor-pointer transition-colors"
                >
                  <X size={14} weight="bold" />
                  <span>Limpiar búsqueda</span>
                </button>
              ) : selectedCategoryId !== 'ALL' ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('ALL')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl min-h-[44px] cursor-pointer transition-colors"
                >
                  <span>Limpiar filtros</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={cartQuantities[product.id] || 0}
                  useListPrice={Boolean((businessData as any)?.useListPrice ?? (user as any)?.business?.useListPrice)}
                  onAdd={() => {
                    if (product.isVariantParent) {
                      setVariantModalProduct(product);
                    } else if (
                      Array.isArray(product.presentations) &&
                      product.presentations.filter((pr) => pr.isActive !== false).length > 0
                    ) {
                      setPresentationModalProduct(product);
                    } else {
                      addItem(product);
                    }
                  }}
                  onDecrement={() => removeItem(product.id)}
                  onOpenVariantSelector={(p) => setVariantModalProduct(p)}
                  onOpenPresentationSelector={(p) => setPresentationModalProduct(p)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. BARRA INFERIOR FIJA DEL CARRITO */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 sm:px-6 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 min-h-[48px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                <ShoppingCart size={20} weight="bold" />
              </div>
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-[20px] text-center text-xs font-black bg-emerald-600 text-white rounded-full tabular-nums shadow-2xs">
                  {totalItemCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-gray-600 font-medium leading-tight">Total a cobrar</p>
                {effectiveChannel === 'DOMICILIO' && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold leading-none">
                    Envío: {formatCurrency(effectiveDeliveryFee)}
                  </span>
                )}
              </div>
              <p className="text-base sm:text-lg font-black text-gray-900 leading-tight tabular-nums truncate">
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            disabled={cartItems.length === 0}
            className="px-4 sm:px-6 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap cursor-pointer tabular-nums"
          >
            <span>Ver carrito</span>
            <span>({totalItemCount})</span>
          </button>
        </div>
      </div>

      {/* 4. MODALES DEL FLUJO */}
      {/* Drawer del Carrito */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        isOnline={isOnline}
        deliveryChannelEnabled={deliveryChannelEnabled}
        defaultDeliveryFee={defaultDeliveryFee}
        lockChannel={lockChannel}
        discountsEnabled={discountsEnabled}
        priceOverrideEnabled={priceOverrideEnabled}
        onProceedToPayment={async () => {
          setSaleErrorMessage(null);

          const timeoutPromise = new Promise<'TIMEOUT'>((resolve) => {
            setTimeout(() => resolve('TIMEOUT'), 5000);
          });

          let previewOutcome: any = null;
          try {
            previewOutcome = await Promise.race([
              usePosCartStore.getState().flushPreview(),
              timeoutPromise,
            ]);
          } catch {
            previewOutcome = null;
          }

          if (!previewOutcome || previewOutcome === 'TIMEOUT') {
            usePosCartStore.getState().clearPreview();
            setPreviewFallbackNotice('No se pudieron aplicar las promociones. Se cobra el precio normal.');
            setUsePromotionsInSale(false);
          } else {
            setPreviewFallbackNotice(null);
            setUsePromotionsInSale(true);
          }

          setIsCartDrawerOpen(false);
          setIsPaymentModalOpen(true);
        }}
        onSaveAsQuote={() => {
          setIsCartDrawerOpen(false);
          setIsSaveAsQuoteOpen(true);
        }}
      />

      <SaveAsQuoteModal
        isOpen={isSaveAsQuoteOpen}
        onClose={() => setIsSaveAsQuoteOpen(false)}
        cartItems={cartItems}
        discountAmount={discountAmount}
        estimatedTotal={getCalculationSummary().total}
        currency={(businessData as any)?.currency || 'NIO'}
        isTaller={isTallerBusiness}
        userRole={user?.role}
        onClearCart={clearCart}
        onOpenPrint={(quote) => setPrintingQuote(quote)}
        onGoToQuotes={() => navigate('/pos/quotes')}
      />

      <QuotePrintModal
        isOpen={Boolean(printingQuote)}
        quoteId={printingQuote?.id || null}
        initialQuote={printingQuote}
        onClose={() => setPrintingQuote(null)}
      />

      {/* Modal de Cobro Completo */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSaleErrorMessage(null);
          setPreviewFallbackNotice(null);
        }}
        fallbackNotice={previewFallbackNotice}
        total={total}
        subtotal={subtotal}
        discountAmount={discountAmount}
        calcSummary={getCalculationSummary()}
        onSubmitSale={handleFinalSubmitSale}
        isSubmitting={isSubmittingSale}
        errorMessage={saleErrorMessage}
        onReloadProducts={() => {
          queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
          setSaleErrorMessage(null);
        }}
        userRole={user?.role}
        carteraActive={carteraActive}
        posVertical={resolvedPosVertical}
        deliveryChannelEnabled={deliveryChannelEnabled}
        deliveryRequireDriver={deliveryRequireDriver}
        channel={effectiveChannel}
        lockChannel={lockChannel}
        initialCustomer={quoteInitialCustomer}
        sourceQuoteNumber={sourceQuote?.quoteNumber || null}
        isQuoteOfflineBlocked={isQuoteOfflineBlocked}
      />

      {/* Modal de Apertura de Caja */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onSuccess={() => {
          setIsOpenShiftModalOpen(false);
          refetchShift();
        }}
        onAlreadyOpen={() => {
          refetchShift();
        }}
        onOpenShift={handleOpenShiftWithIdempotency}
        isOpening={isOpeningShift}
      />

      {/* Modal de Cierre de Caja */}
      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        onSuccess={() => {
          refetchShift();
        }}
        currentShift={{
          shiftId: shiftId || statusData?.shiftId || 'ACTIVO',
          cashierName: cashierName || user?.name || 'Cajero',
          openedAt: openedAt || new Date().toISOString(),
          openingCash: Number(statusData?.shift?.openingCash ?? statusData?.shift?.initialAmount ?? 0),
          expectedCash: Number(statusData?.shift?.expectedCash ?? statusData?.shift?.openingCash ?? 0),
          tipsSummary: statusData?.shift?.tipsSummary ?? null,
        }}
        policies={{
          blindCashClose,
          cashCloseDiscrepancyPolicy,
          cashCloseTolerance,
          cashCloseMaxRecounts,
          multiCurrencyEnabled,
        }}
        isSupervisor={isSupervisor}
        businessInfo={businessInfo}
        onCloseShift={handleCloseShiftWithIdempotency}
        isClosing={isClosingShift}
      />

      {/* Modal de Movimientos de Caja */}
      <CashMovementsModal
        isOpen={isCashMovementsModalOpen}
        onClose={() => setIsCashMovementsModalOpen(false)}
        onSuccess={() => {
          setIsCashMovementsModalOpen(false);
          refetchShift();
        }}
        onSubmitMovement={handleAddMovementWithIdempotency}
        isSubmitting={isAddingMovement}
      />

      {/* Modal de Ventas Recientes */}
      <RecentSalesModal
        isOpen={isRecentSalesModalOpen}
        onClose={() => setIsRecentSalesModalOpen(false)}
        businessInfo={businessInfo}
        cashierName={cashierName || user?.name || 'Cajero'}
      />

      {/* Modal de Falla de Red */}
      <NetworkErrorModal
        isOpen={isNetworkErrorModalOpen}
        onClose={() => setIsNetworkErrorModalOpen(false)}
        onRetryCobro={() => {
          setIsNetworkErrorModalOpen(false);
          setIsPaymentModalOpen(true);
        }}
        onDiscardAndClean={() => {
          setIsNetworkErrorModalOpen(false);
        }}
        businessInfo={businessInfo}
        cashierName={cashierName || user?.name || 'Cajero'}
      />

      {/* Modal de Autorización de Encargado para Descuento */}
      <ManagerApprovalModal
        isOpen={Boolean(pendingDiscountApprovalSubmission)}
        onClose={() => setPendingDiscountApprovalSubmission(null)}
        actionTitle="Autorizar descuento de encargado"
        actionDescription={
          discountApprovalMessage ||
          `El descuento supera el límite permitido para cajero (${cashierMaxDiscountPercent}%). Ingresá las credenciales del encargado para autorizar.`
        }
        actionCode="APLICAR_DESCUENTO"
        entityType="Sale"
        onApproved={(token) => {
          const pending = pendingDiscountApprovalSubmission;
          setPendingDiscountApprovalSubmission(null);
          if (pending) {
            void handleFinalSubmitSale({
              ...pending,
              discountApprovalToken: token,
            });
          }
        }}
      />

      {/* Modal de selección de variantes de atributos (Talla, Color, etc.) */}
      {variantModalProduct && (
        <VariantSelectorModal
          isOpen={Boolean(variantModalProduct)}
          onClose={() => setVariantModalProduct(null)}
          product={variantModalProduct}
          onSelectVariant={(variant) => {
            addItem(variant, undefined, 1);
            setVariantModalProduct(null);
          }}
        />
      )}

      {/* Modal de selección de presentaciones (Saco, Caja, etc.) */}
      {presentationModalProduct && (
        <PresentationSelectorModal
          isOpen={Boolean(presentationModalProduct)}
          onClose={() => setPresentationModalProduct(null)}
          product={presentationModalProduct}
          onSelectSuelto={(p) => {
            addItem(p);
            setPresentationModalProduct(null);
          }}
          onSelectPresentation={(p, pres) => {
            addItem(p, pres, 1);
            setPresentationModalProduct(null);
          }}
        />
      )}
    </div>
  );
};
