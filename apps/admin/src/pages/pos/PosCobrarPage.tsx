import React, { useState, useMemo } from 'react';
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
} from '@phosphor-icons/react';
import {
  getPosCategories,
  getPosProducts,
  createPosSale,
  getMyBusiness,
  type PosCategory,
  type PosProductItem,
  type SaleResponse,
} from 'api-client';
import { usePosWebAccess } from '../../hooks/usePosWebAccess';
import { usePosWebDevice } from '../../hooks/usePosWebDevice';
import { usePosShift } from '../../hooks/usePosShift';
import { usePosPolicies } from '../../hooks/usePosPolicies';
import { usePosCartStore } from '../../store/posCart.store';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { type ReceiptBusinessInfo } from '../../utils/receiptPdf';

// Subcomponentes del flujo de cobro
import { OpenShiftModal } from '../../components/pos/cobrar/OpenShiftModal';
import { CloseShiftModal } from '../../components/pos/cobrar/CloseShiftModal';
import { CashMovementsModal } from '../../components/pos/cobrar/CashMovementsModal';
import { ProductCard } from '../../components/pos/cobrar/ProductCard';
import { CartDrawer } from '../../components/pos/cobrar/CartDrawer';
import { PaymentModal, type FinalPaymentSubmission } from '../../components/pos/cobrar/PaymentModal';
import { SaleSuccessView } from '../../components/pos/cobrar/SaleSuccessView';
import { NetworkErrorModal } from '../../components/pos/cobrar/NetworkErrorModal';
import { RecentSalesModal } from '../../components/pos/cobrar/RecentSalesModal';

export const PosCobrarPage: React.FC = () => {
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
    isLoading: isLoadingPolicies,
  } = usePosPolicies(Boolean(webBillingEnabled && canCobrar));

  // 5. Carrito
  const cartItems = usePosCartStore((s) => s.items);
  const addItem = usePosCartStore((s) => s.addItem);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const getSubtotal = usePosCartStore((s) => s.getSubtotal);
  const getDiscountAmount = usePosCartStore((s) => s.getDiscountAmount);
  const getTotal = usePosCartStore((s) => s.getTotal);
  const getCalculationSummary = usePosCartStore((s) => s.getCalculationSummary);
  const setBusinessContext = usePosCartStore((s) => s.setBusinessContext);

  // Estados de modales
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isCashMovementsModalOpen, setIsCashMovementsModalOpen] = useState(false);
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNetworkErrorModalOpen, setIsNetworkErrorModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filtros de productos
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Venta en proceso y resultado
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleErrorMessage, setSaleErrorMessage] = useState<string | null>(null);

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

  // Consulta de productos del catálogo
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<PosProductItem[]>({
    queryKey: ['pos', 'products'],
    queryFn: () => getPosProducts(),
    enabled: Boolean(webBillingEnabled && canCobrar),
    staleTime: 30000,
  });

  // Filtrado de productos por categoría y texto de búsqueda
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategoryId !== 'ALL') {
      result = result.filter((p) => p.categoryId === selectedCategoryId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [products, selectedCategoryId, searchQuery]);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((item) => {
      map[item.productId] = item.quantity;
    });
    return map;
  }, [cartItems]);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();
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
      <SaleSuccessView
        sale={completedSale}
        businessInfo={businessInfo}
        cashierName={cashierName || user?.name || 'Cajero'}
        onNewSale={() => {
          setCompletedSale(null);
          clearCart();
        }}
      />
    );
  }

  // 7. Política obligatoria y caja cerrada: Bloquear pantalla con apertura obligatoria
  if (requireOpenShiftToSell && !isShiftOpen) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA] select-none">
        {/* Barra superior compacta */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              POS
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-gray-900 truncate leading-tight">
                {businessInfo?.name || 'NEXOL POS'}
              </div>
              <div className="text-xs text-gray-500 truncate leading-tight">
                {activeBranch?.name || 'Sucursal Principal'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Sin turno</span>
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Cerrar sesión"
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
          onOpenShift={async (dto) => openShift({ dto, deviceHeaders })}
          isOpening={isOpeningShift}
        />
      </div>
    );
  }

  // 8. Flujo de cobro final
  const handleFinalSubmitSale = async (paymentData: FinalPaymentSubmission) => {
    // Si la caja está cerrada y la política lo exige, bloquear
    if (!isShiftOpen && requireOpenShiftToSell) {
      setSaleErrorMessage('La caja está cerrada. Debes abrir un turno para registrar ventas.');
      return;
    }

    if (cartItems.length === 0) {
      setSaleErrorMessage('El carrito está vacío. Agrega productos para cobrar.');
      return;
    }

    setIsSubmittingSale(true);
    setSaleErrorMessage(null);

    const currentCalc = getCalculationSummary();

    const itemsPayload = currentCalc.lines.map((line) => ({
      productId: line.productId || undefined,
      productName: line.productName,
      barcode: line.barcode || undefined,
      unitPrice: line.unitPrice,
      quantity: Number(Number(line.quantity).toFixed(3)),
      discount: line.discount || 0,
      subtotal: line.subtotal,
      listPrice: line.listPrice != null ? line.listPrice : undefined,
      listPriceDiscount: line.listPriceDiscount,
      manualDiscountShare: line.manualDiscountShare,
      taxable: line.taxable,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
    }));

    const idempotencyKey =
      paymentData.clientGeneratedId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    const salePayload: any = {
      items: itemsPayload,
      subtotal: currentCalc.subtotal,
      discountAmount: currentCalc.discountAmount > 0 ? currentCalc.discountAmount : undefined,
      discount: currentCalc.discountAmount > 0 ? currentCalc.discountAmount : undefined,
      subtotalBeforeTax: currentCalc.subtotalBeforeTax,
      total: currentCalc.total,
      clientTotal: currentCalc.total,
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
      payments: paymentData.payments,
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

      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
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
        setSaleErrorMessage('No hay conexión. La venta no se registró. Revisá tu internet y volvé a intentar.');
        return;
      }

      const errCode = err?.response?.data?.code;
      const errMsg = err?.response?.data?.message;

      if (errCode === 'PRICE_MISMATCH') {
        setSaleErrorMessage(
          typeof errMsg === 'string'
            ? errMsg
            : 'El catálogo de precios cambió. Recargá los productos para actualizar los precios.',
        );
      } else if (err?.response?.status === 422 || errCode === 'INSUFFICIENT_STOCK') {
        setSaleErrorMessage(
          typeof errMsg === 'string'
            ? errMsg
            : 'Uno o más productos no cuentan con stock suficiente para completar la venta.',
        );
      } else if (err?.response?.status === 409 || errCode === 'NO_OPEN_SHIFT') {
        setSaleErrorMessage('La caja está cerrada. Debes abrir un turno para registrar ventas.');
        refetchShift();
      } else {
        setSaleErrorMessage(
          typeof errMsg === 'string'
            ? errMsg
            : 'No se pudo completar la venta. Revisá los datos ingresados.',
        );
      }
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col select-none">
      {/* 1. BARRA SUPERIOR COMPACTA (Requisito 2) */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shrink-0 shadow-2xs sticky top-0 z-30">
        {/* Identidad del Negocio y Sucursal */}
        <div className="flex items-center gap-2.5 min-w-0">
          {!isCajero && !isFullscreen && (
            <NavLink
              to="/dashboard"
              className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
              title="Volver al panel"
            >
              <ArrowLeft size={18} weight="bold" />
            </NavLink>
          )}

          <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            POS
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-900 truncate leading-tight">
              {businessInfo?.name || 'NEXOL POS'}
            </div>
            <div className="text-xs text-gray-500 truncate leading-tight">
              {activeBranch?.name || 'Sucursal Principal'}
            </div>
          </div>
        </div>

        {/* Estado de la Caja y Menú de Acciones */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Badge de Turno */}
          {isShiftOpen ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Caja abierta</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
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
            >
              <DotsThreeVertical size={20} weight="bold" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500">
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
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                      >
                        <CashRegister size={18} />
                        <span>Abrir turno de caja</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsCloseShiftModalOpen(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                      >
                        <CashRegister size={18} />
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
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                    >
                      <ArrowsDownUp size={18} />
                      <span>Movimientos de caja</span>
                    </button>

                    {/* Ventas de hoy */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsRecentSalesModalOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                    >
                      <ClockCounterClockwise size={18} />
                      <span>Ventas de hoy</span>
                    </button>

                    {/* Alternar Pantalla Completa (solo para supervisor) */}
                    {isSupervisor && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          toggleFullscreen();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                      >
                        {isFullscreen ? (
                          <>
                            <ArrowsIn size={18} />
                            <span>Salir de pantalla completa</span>
                          </>
                        ) : (
                          <>
                            <ArrowsOut size={18} />
                            <span>Pantalla completa</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                    >
                      <SignOut size={18} />
                      <span>Salir</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL: CATÁLOGO DE PRODUCTOS */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 space-y-4 pb-28">
        {/* Buscador de productos */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <MagnifyingGlass size={18} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o escanear código de barras..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-hidden focus:border-gray-900 transition-colors shadow-2xs min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Categorías deslizables */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[44px] cursor-pointer ${
              selectedCategoryId === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[44px] cursor-pointer ${
                selectedCategoryId === c.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Grilla de Productos */}
        {isLoadingProducts ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CircleNotch size={28} className="animate-spin text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 font-medium">Cargando catálogo de productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-2">
            <Tag size={32} className="mx-auto text-gray-400" />
            <h4 className="text-sm font-bold text-gray-800">No se encontraron productos</h4>
            <p className="text-xs text-gray-500">
              {searchQuery ? `No hay resultados para "${searchQuery}"` : 'No hay productos en esta categoría'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantityInCart={cartQuantities[product.id] || 0}
                onAdd={() => addItem(product)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 3. BOTÓN FLOTANTE INFERIOR DEL CARRITO (Móvil y Escritorio) */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                <ShoppingCart size={20} weight="bold" />
              </div>
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-[20px] text-center text-xs font-black bg-emerald-500 text-white rounded-full">
                  {totalItemCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total a cobrar</p>
              <p className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            disabled={cartItems.length === 0}
            className="px-6 py-3 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 min-h-[44px] cursor-pointer"
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
        onProceedToPayment={() => {
          setIsCartDrawerOpen(false);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Modal de Cobro Completo */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
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
        carteraActive={Boolean((user as any)?.business?.hasCarteraCobro || (businessData as any)?.products?.CARTERA_COBRO || true)}
      />

      {/* Modal de Apertura de Caja */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onSuccess={() => {
          setIsOpenShiftModalOpen(false);
          refetchShift();
        }}
        onOpenShift={async (dto) => openShift({ dto, deviceHeaders })}
        isOpening={isOpeningShift}
      />

      {/* Modal de Cierre de Caja */}
      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        onSuccess={() => {
          setIsCloseShiftModalOpen(false);
          refetchShift();
        }}
        currentShift={{
          shiftId: shiftId || statusData?.shiftId || 'ACTIVO',
          cashierName: cashierName || user?.name || 'Cajero',
          openedAt: openedAt || new Date().toISOString(),
          openingCash: Number(statusData?.shift?.openingCash ?? statusData?.shift?.initialAmount ?? 0),
          expectedCash: Number(statusData?.shift?.expectedCash ?? statusData?.shift?.openingCash ?? 0),
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
        onCloseShift={async (dto) => closeShift({ dto, deviceHeaders })}
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
        onSubmitMovement={async (dto) => addMovement({ dto, deviceHeaders })}
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
    </div>
  );
};
