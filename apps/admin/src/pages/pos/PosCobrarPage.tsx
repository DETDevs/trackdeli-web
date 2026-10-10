import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
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
import { usePosCartStore } from '../../store/posCart.store';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { type ReceiptBusinessInfo } from '../../utils/receiptPdf';

// Subcomponentes del flujo de cobro
import { ShiftStatusBanner } from '../../components/pos/cobrar/ShiftStatusBanner';
import { OpenShiftModal } from '../../components/pos/cobrar/OpenShiftModal';
import { ProductCard } from '../../components/pos/cobrar/ProductCard';
import { CartDrawer } from '../../components/pos/cobrar/CartDrawer';
import { PaymentModal } from '../../components/pos/cobrar/PaymentModal';
import { SaleSuccessView } from '../../components/pos/cobrar/SaleSuccessView';
import { NetworkErrorModal } from '../../components/pos/cobrar/NetworkErrorModal';
import { RecentSalesModal } from '../../components/pos/cobrar/RecentSalesModal';

export const PosCobrarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

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
    isOpen: isShiftOpen,
    cashierName,
    openedAt,
    isLoading: isLoadingShift,
    openShift,
    isOpening: isOpeningShift,
    refetch: refetchShift,
  } = usePosShift(Boolean(webBillingEnabled && canCobrar));

  // 4. Carrito
  const cartItems = usePosCartStore((s) => s.items);
  const addItem = usePosCartStore((s) => s.addItem);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const getSubtotal = usePosCartStore((s) => s.getSubtotal);
  const getDiscountAmount = usePosCartStore((s) => s.getDiscountAmount);
  const getTotal = usePosCartStore((s) => s.getTotal);

  // Estado local de la UI
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNetworkErrorModalOpen, setIsNetworkErrorModalOpen] = useState(false);
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleErrorMessage, setSaleErrorMessage] = useState<string | null>(null);

  // Consulta de datos del negocio para recibos
  const { data: businessData } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 5 * 60 * 1000,
  });

  const businessInfo: ReceiptBusinessInfo = useMemo(() => {
    const b = businessData as any;
    return {
      name: completedSale?.business?.name || b?.name || 'NEXOL POS',
      address: completedSale?.business?.address || b?.posAddress || b?.address || null,
      phone: completedSale?.business?.phone || b?.posPhone || b?.whatsappNumber || b?.phone || null,
      taxId: completedSale?.business?.taxId || b?.taxId || null,
      logoUrl: completedSale?.business?.logoUrl || b?.logoUrl || null,
    };
  }, [completedSale, businessData]);

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
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, selectedCategoryId, searchQuery]);

  // Cantidad de cada producto en carrito para feedback visual
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

  // Estados de verificación de acceso base
  if (isLoadingAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <CircleNotch size={28} className="animate-spin text-gray-400 mb-3" />
        <p className="text-xs text-gray-500 font-medium">Verificando permisos de cobro...</p>
      </div>
    );
  }

  // 1. Facturación web no habilitada
  if (!webBillingEnabled) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mx-auto">
            <CreditCard size={30} weight="duotone" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 uppercase tracking-wide mb-2">
              Módulo adicional
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Facturación web no habilitada
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
              La facturación desde la web es un módulo adicional que no está activo en este negocio. Pedile al administrador que lo active desde el panel de Superadmin.
            </p>
          </div>
          <div className="pt-2">
            <NavLink
              to="/pos/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver al resumen POS</span>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // 2. Rol no autorizado
  if (!canCobrar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 mx-auto">
            <WarningCircle size={30} weight="duotone" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200/60 uppercase tracking-wide mb-2">
              Permiso insuficiente
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Rol no autorizado para cobrar
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
              Tu usuario ({user?.role || 'sin rol'}) no tiene permisos para realizar operaciones de cobro en el punto de venta.
            </p>
          </div>
          <div className="pt-2">
            <NavLink
              to="/pos/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver al resumen POS</span>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error de registro o verificación de dispositivo
  if (deviceError) {
    const isEncargadoOrAdmin = user?.role === 'ENCARGADO' || user?.role === 'SUPERADMIN';
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <div className="bg-white rounded-3xl border border-red-200 p-6 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
            <DeviceMobile size={30} weight="duotone" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200 mb-2 uppercase tracking-wide">
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
            {isEncargadoOrAdmin && deviceError.code === 'WEB_DEVICE_LIMIT_REACHED' && (
              <p className="text-[11px] text-gray-400">
                Como encargado, puedes revocar dispositivos no utilizados desde el Superadmin o la configuración.
              </p>
            )}

            {deviceError.code !== 'WEB_DEVICE_LIMIT_REACHED' && (
              <button
                type="button"
                onClick={retryRegistration}
                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Reintentar registro
              </button>
            )}

            <NavLink
              to="/pos/dashboard"
              className="w-full block py-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Volver al resumen POS
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // 4. Si el dispositivo se está registrando por primera vez
  if (isRegisteringDevice && !isDeviceReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <CircleNotch size={28} className="animate-spin text-gray-900 mb-3" />
        <p className="text-xs text-gray-700 font-semibold">Registrando dispositivo para cobro...</p>
        <p className="text-[11px] text-gray-400 mt-1">Solo toma un instante</p>
      </div>
    );
  }

  // 5. Si la venta se completó exitosamente
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

  // Ejecución de cobro final
  const handleFinalSubmitSale = async (paymentData: {
    method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
    amountTendered?: number;
    reference?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }) => {
    if (!isShiftOpen) {
      setSaleErrorMessage('La caja está cerrada. Debes abrir un turno para registrar ventas.');
      return;
    }

    if (cartItems.length === 0) {
      setSaleErrorMessage('El carrito está vacío. Agrega productos para cobrar.');
      return;
    }

    setIsSubmittingSale(true);
    setSaleErrorMessage(null);

    // Identificador único para idempotencia y encabezados del dispositivo
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const salePayload = {
      items: cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        barcode: item.barcode,
      })),
      subtotal,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      discount: discountAmount > 0 ? discountAmount : undefined,
      total,
      clientTotal: total,
      paymentMethod: paymentData.method,
      amountPaid: paymentData.method === 'EFECTIVO' ? paymentData.amountTendered : total,
      reference: paymentData.reference,
      customerName: paymentData.customerName,
      customerPhone: paymentData.customerPhone,
      notes: paymentData.notes,
      payments: [
        {
          method: paymentData.method,
          amount: total,
          amountTendered: paymentData.method === 'EFECTIVO' ? paymentData.amountTendered : total,
          reference: paymentData.reference,
          currency: 'NIO',
        },
      ],
    };

    try {
      const response = await createPosSale(salePayload, {
        ...(deviceHeaders || {}),
        'Idempotency-Key': idempotencyKey,
      });

      // Venta exitosa
      setIsPaymentModalOpen(false);
      setIsCartDrawerOpen(false);
      setCompletedSale(response);

      // Invalida inventario y ventas para mantener sincronía
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    } catch (err: any) {
      // 1. Manejar error de dispositivo (revocado o inválido)
      const handled = handleDeviceApiError(err);
      if (handled) {
        setIsPaymentModalOpen(false);
        return;
      }

      // 2. Falla de red: NO reintentar automáticamente (Req #8)
      const isNetError =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout') ||
        err.message?.includes('Network Error');

      if (isNetError) {
        setIsPaymentModalOpen(false);
        setIsNetworkErrorModalOpen(true);
        return;
      }

      // 3. Error de stock insuficiente (422) o caja cerrada (409)
      const errCode = err?.response?.data?.code;
      const errMsg = err?.response?.data?.message;

      if (err?.response?.status === 422 || errCode === 'INSUFFICIENT_STOCK') {
        setSaleErrorMessage(
          errMsg || 'Uno o más productos no cuentan con stock suficiente para completar la venta.'
        );
      } else if (err?.response?.status === 409 || errCode === 'NO_OPEN_SHIFT') {
        setSaleErrorMessage('La caja está cerrada. Debes abrir un turno para registrar ventas.');
        refetchShift();
      } else {
        setSaleErrorMessage(errMsg || 'No se pudo completar la venta. Revisa los datos ingresados.');
      }
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 select-none px-2 sm:px-4">
      {/* 0. Barra Superior con navegación y Ventas Recientes */}
      <div className="flex items-center justify-between gap-2 mb-3 pt-1">
        <div className="flex items-center gap-2">
          <NavLink
            to="/dashboard"
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            title="Volver al panel"
          >
            <ArrowLeft size={18} weight="bold" />
          </NavLink>
          <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
            Cobro Móvil
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsRecentSalesModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-700 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
          title="Ver ventas recientes y reimprimir recibos"
        >
          <ClockCounterClockwise size={15} weight="bold" />
          <span>Ventas recientes</span>
        </button>
      </div>

      {/* 1. Barra de Turno de Caja */}
      <ShiftStatusBanner
        isOpen={isShiftOpen}
        cashierName={cashierName}
        openedAt={openedAt}
        isLoading={isLoadingShift}
        onOpenShiftClick={() => setIsOpenShiftModalOpen(true)}
      />

      {/* 2. Buscador y Categorías */}
      <div className="space-y-3 mb-4">
        {/* Barra de búsqueda */}
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200/90 rounded-2xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-gray-900 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Carrusel de categorías horizontal táctil */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs ${
              selectedCategoryId === 'ALL'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs ${
                selectedCategoryId === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Cuadrícula de Productos */}
      {isLoadingProducts ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 text-xs">
          <CircleNotch size={26} className="animate-spin mb-2" />
          <span>Cargando catálogo de productos...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-xs bg-white rounded-2xl border border-gray-200/80 p-6 space-y-2 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
            <Tag size={20} />
          </div>
          <div className="font-semibold text-gray-700 text-sm">No se encontraron productos</div>
          <p className="text-gray-400 max-w-xs mx-auto text-[11px]">
            {searchQuery
              ? 'Prueba con otro término de búsqueda o selecciona otra categoría.'
              : 'No hay productos disponibles en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={cartQuantities[product.id] || 0}
              onAdd={addItem}
              disabled={!isShiftOpen}
            />
          ))}
        </div>
      )}

      {/* 4. Barra Fija Inferior de Cobro (siempre visible cuando hay ítems o para abrir el carrito) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-3 sm:p-4 shadow-xl select-none animate-in slide-in-from-bottom duration-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Resumen del carrito (clic abre el drawer) */}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center relative shadow-xs">
                <ShoppingCart size={18} weight="bold" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {totalItemCount}
                </span>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 font-medium group-hover:text-gray-700 transition-colors">
                  {totalItemCount} {totalItemCount === 1 ? 'ítem' : 'ítems'} · Ver orden
                </div>
                <div className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                  {formatCurrency(total)}
                </div>
              </div>
            </button>

            {/* Botón grande de Cobrar */}
            <button
              type="button"
              onClick={() => {
                if (!isShiftOpen) {
                  setIsOpenShiftModalOpen(true);
                  return;
                }
                setIsPaymentModalOpen(true);
              }}
              className="py-3 px-5 sm:px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-2xl transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-97 min-h-[46px]"
            >
              <span>Cobrar</span>
              <span>{formatCurrency(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Modales y Drawers */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onOpenShift={async (dto) => {
          await openShift({ dto, deviceHeaders });
          refetchShift();
          setIsOpenShiftModalOpen(false);
        }}
        isOpening={isOpeningShift}
      />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onProceedToPayment={() => {
          setIsCartDrawerOpen(false);
          if (!isShiftOpen) {
            setIsOpenShiftModalOpen(true);
            return;
          }
          setIsPaymentModalOpen(true);
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSaleErrorMessage(null);
        }}
        total={total}
        subtotal={subtotal}
        discountAmount={discountAmount}
        onSubmitSale={handleFinalSubmitSale}
        isSubmitting={isSubmittingSale}
        errorMessage={saleErrorMessage}
      />

      <NetworkErrorModal
        isOpen={isNetworkErrorModalOpen}
        onClose={() => setIsNetworkErrorModalOpen(false)}
        onRetryCobro={() => {
          setIsNetworkErrorModalOpen(false);
          setIsPaymentModalOpen(true);
        }}
        onDiscardAndClean={() => {
          setIsNetworkErrorModalOpen(false);
          clearCart();
        }}
        businessInfo={businessInfo}
        cashierName={cashierName || user?.name || 'Cajero'}
      />

      <RecentSalesModal
        isOpen={isRecentSalesModalOpen}
        onClose={() => setIsRecentSalesModalOpen(false)}
        businessInfo={businessInfo}
        cashierName={cashierName || user?.name || 'Cajero'}
      />
    </div>
  );
};
