import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  X,
  ForkKnife,
  WarningCircle,
  CheckCircle,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import {
  useTablesStatus,
  useCategories,
  useProducts,
  useActiveOrder,
  useAddOrderItems,
  useTableOrderRounds,
  useSendToKitchen,
  useVoidOrderItem,
  useDeleteOrderItem,
} from '../hooks/useMesero';
import { useWaiterAuth } from '../store/authStore';
import { Header } from '../components/Header';
import { CategoryPills } from '../components/CategoryPills';
import { ProductCard } from '../components/ProductCard';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { ComandaBottomSheet } from '../components/ComandaBottomSheet';
import { VoidItemModal } from '../components/VoidItemModal';
import { SplitAccountModal } from '../components/SplitAccountModal';
import type { CartItem, Product, TableOrderItem } from '../types/mesero';
import toast from 'react-hot-toast';

export const OrderPage: React.FC = () => {
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const navigate = useNavigate();
  const { session } = useWaiterAuth();

  const businessSlug = slug || session?.slug || '';

  if (!session) {
    return <Navigate to={`/mesas/${businessSlug || 'default'}/login`} replace />;
  }

  // Cargar mesas sin refresco periódico mientras la comanda está abierta
  const { data: tables = [] } = useTablesStatus({ enabledPolling: false });
  const currentTable = tables.find((t) => t.id === tableId);
  const rawTableNumber = String(currentTable?.number || '').trim();
  const cleanNumber = rawTableNumber.replace(/^(mesa\s*)+/i, '').trim() || rawTableNumber || '?';
  const tablePart = /^\d+$/.test(cleanNumber)
    ? `Mesa ${cleanNumber}`
    : (rawTableNumber.toLowerCase().startsWith('mesa') ? rawTableNumber : `Mesa ${cleanNumber}`);
  const zoneName = currentTable?.zoneName?.trim();
  const tableDisplayName = zoneName
    ? `${zoneName} · ${tablePart}`
    : tablePart;
  const tableNumber = cleanNumber;

  // Pedido activo de la mesa
  const { data: activeOrder } = useActiveOrder(tableId || '');

  // Rondas de cocina de la mesa
  const { data: rounds = [] } = useTableOrderRounds(tableId || '', Boolean(tableId));

  // Ticker para frescura de timer de 60 segundos
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Perfil del negocio: Taller vs Restaurante
  const [isKitchenDisabled, setIsKitchenDisabled] = useState(false);
  const isTaller = useMemo(() => {
    return Boolean(
      activeOrder?.workshopVehicleId ||
      activeOrder?.vehicleInfo ||
      tables.some((t) => Boolean(t.vehicleInfo)) ||
      session?.business?.salonProfile === 'TALLER' ||
      businessSlug.toLowerCase().includes('taller')
    );
  }, [activeOrder, tables, session, businessSlug]);

  const isKitchenModeDisabled = useMemo(() => {
    const km = session?.business?.kitchenMode?.toUpperCase();
    return km === 'NO_PRINT' || km === 'NONE' || km === 'DISABLED';
  }, [session?.business?.kitchenMode]);

  const isRestaurante = !isTaller && !isKitchenDisabled;
  const isNoPrintMode = isKitchenModeDisabled;

  // Categorías y Productos
  const { data: categories = [] } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: products = [], isLoading: isLoadingProducts } = useProducts({
    categoryId: selectedCategoryId || undefined,
    search: search.trim() || undefined,
  });

  // Carrito / Lote nuevo a enviar
  const [newCartItems, setNewCartItems] = useState<CartItem[]>([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [lastSentRoundConfirmation, setLastSentRoundConfirmation] = useState<string | null>(null);

  // Modal de anulación autorizada con PIN
  const [voidModalState, setVoidModalState] = useState<{
    isOpen: boolean;
    item: TableOrderItem | null;
    voidQty?: number;
  }>({
    isOpen: false,
    item: null,
  });

  // Modal para dividir cuenta de la mesa (171c)
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  // Mutaciones
  const addItemsMutation = useAddOrderItems(tableId || '');
  const sendToKitchenMutation = useSendToKitchen(tableId || '');
  const voidMutation = useVoidOrderItem(tableId || '');
  const deleteItemMutation = useDeleteOrderItem(tableId || '');

  // Conteo de ítems sin enviar
  const newItemsCount = newCartItems.reduce((acc, item) => acc + item.quantity, 0);
  const savedUnsentCount = (activeOrder?.items || [])
    .filter((i) => !i.isSent)
    .reduce((acc, item) => acc + item.quantity, 0);
  const totalUnsentCount = newItemsCount + savedUnsentCount;

  // Manejo de productos en el carrito nuevo
  const handleAddProduct = (product: Product) => {
    setNewCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setNewCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleUpdateNotes = (productId: string, notes: string) => {
    setNewCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, notes } : item
      )
    );
  };

  // Quitar ítem sin enviar con deshacer breve (Requerimiento 4)
  const handleRemoveItem = (productId: string) => {
    const removed = newCartItems.find((i) => i.productId === productId);
    if (!removed) return;
    setNewCartItems((prev) => prev.filter((item) => item.productId !== productId));

    toast(
      (t) => (
        <div className="flex items-center justify-between gap-3 w-full">
          <span className="text-xs font-semibold">Producto quitado</span>
          <button
            type="button"
            onClick={() => {
              setNewCartItems((prev) => [...prev, removed]);
              toast.dismiss(t.id);
            }}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
          >
            Deshacer
          </button>
        </div>
      ),
      { duration: 4000 }
    );
  };

  // Quitar renglón sin enviar ya guardado en la orden
  const handleRemoveSavedUnsentItem = async (itemId: string) => {
    try {
      await deleteItemMutation.mutateAsync(itemId);
      toast.success('Renglón sin enviar eliminado');
    } catch {
      toast.error('No se pudo quitar el producto.');
    }
  };

  // Sumar 1 unidad más de un producto ya enviado para la siguiente ronda
  const handleAddMoreOfSentItem = (item: TableOrderItem) => {
    setNewCartItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: 1,
          notes: item.notes || '',
        },
      ];
    });
    toast.success(`Se sumó 1 ${item.productName} para la siguiente ronda`, { duration: 2500 });
  };

  // Abrir modal de anulación para ítem ya enviado (Requerimiento 4 y 5)
  const handleOpenVoidModal = (item: TableOrderItem, qty?: number) => {
    setVoidModalState({
      isOpen: true,
      item,
      voidQty: qty,
    });
  };

  // Confirmar anulación en el modal con motivo y PIN
  const handleConfirmVoid = async ({
    reason,
    pin,
    qty,
  }: {
    reason: string;
    pin: string;
    qty?: number;
  }) => {
    if (!tableId || !voidModalState.item) return;

    await voidMutation.mutateAsync({
      itemId: voidModalState.item.id,
      payload: {
        reason,
        authorizerPin: pin,
        qty,
      },
    });

    toast.success(
      qty
        ? `Anulación parcial de ${qty} unidad(es) autorizada`
        : 'Ítem anulado exitosamente'
    );
    setVoidModalState({ isOpen: false, item: null });
  };

  // Enviar a cocina con debounce contra doble toque y clientRequestId (Requerimiento 2)
  const handleConfirmSend = async () => {
    if (!tableId || totalUnsentCount === 0 || isSendingToKitchen) return;

    setIsSendingToKitchen(true);
    const clientRequestId = crypto.randomUUID();

    try {
      // 1. Guardar primero en backend los ítems del carrito local si hay
      if (newCartItems.length > 0) {
        await addItemsMutation.mutateAsync({
          items: newCartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes.trim() || undefined,
          })),
        });
        setNewCartItems([]);
      }

      // 2. Si es restaurante con cocina, crear ronda de cocina
      if (isRestaurante) {
        try {
          const res = await sendToKitchenMutation.mutateAsync({ clientRequestId });
          if ('vibrate' in navigator) {
            try {
              navigator.vibrate([40, 40, 60]);
            } catch {}
          }
          const roundNum = res?.round?.number ?? res?.round?.roundNumber;
          const confirmMsg = roundNum
            ? `Enviado a cocina · Ronda ${roundNum}`
            : 'Enviado a cocina';
          setLastSentRoundConfirmation(confirmMsg);
          toast.success(confirmMsg, { duration: 4000 });
        } catch (sendErr: any) {
          const errorMsg = sendErr?.response?.data?.message;
          if (errorMsg === 'NOTHING_TO_SEND') {
            toast.success('¡Comanda guardada en mesa!', { duration: 3000 });
          } else {
            throw sendErr;
          }
        }
      } else {
        toast.success('¡Comanda guardada!', { duration: 3000 });
      }

      setIsBottomSheetOpen(false);
    } catch (err: any) {
      if (err?.response?.data?.message === 'NOT_AVAILABLE') {
        setIsKitchenDisabled(true);
        toast.error('Módulo de cocina no disponible para este tipo de negocio.');
      }
      // Error de red y otros son manejados sin reintento automático por useSendToKitchen
    } finally {
      setIsSendingToKitchen(false);
    }
  };

  // Verificación de comanda sin imprimir tras 60 segundos (Requerimiento 3)
  const unprintedRound = useMemo(() => {
    if (!isRestaurante || isNoPrintMode) return null;
    return rounds.find((r) => {
      if (r.type !== 'SEND') return false;
      if (r.printStatus === 'NOT_REQUIRED') return false;
      if (r.printStatus === 'FAILED') return true;
      if (r.printStatus === 'PENDING') {
        const createdAtMs = new Date(r.createdAt).getTime();
        return now - createdAtMs >= 60000;
      }
      return false;
    });
  }, [rounds, now, isRestaurante, isNoPrintMode]);

  const unprintedAlert = unprintedRound
    ? 'La comanda no se ha impreso. Avisá en cocina o al cajero.'
    : null;

  const totalPendingAmount =
    newCartItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0) +
    (activeOrder?.total || 0);

  const existingItemsCount = activeOrder?.items.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Header Fijo */}
      <Header
        title={tableDisplayName}
        subtitle={
          activeOrder
            ? `Comanda abierta • C$ ${activeOrder.total.toFixed(2)}`
            : 'Nueva comanda'
        }
        onBack={() => navigate(`/mesas/${businessSlug}/tables`)}
        rightAction={
          <div className="flex items-center gap-1.5">
            {isRestaurante && ((activeOrder?.items?.length || 0) > 0 || (activeOrder?.subAccounts?.length || 0) > 0) && (
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(true)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation border ${
                  activeOrder?.splitMode
                    ? 'bg-purple-100 border-purple-300 text-purple-800 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title={activeOrder?.splitMode ? 'Gestionar cuentas divididas' : 'Dividir cuenta'}
              >
                <ArrowsLeftRight size={15} weight="bold" className={activeOrder?.splitMode ? 'text-purple-600' : 'text-gray-500'} />
                <span>
                  {activeOrder?.splitMode
                    ? `Dividida (${activeOrder.subAccounts?.length || 0})`
                    : 'Dividir'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-xl transition-colors cursor-pointer touch-manipulation ${
                isSearchOpen || search
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Buscar producto"
            >
              <MagnifyingGlass size={18} weight="bold" />
            </button>
          </div>
        }
      />

      {/* Main Content */}
      <main className="max-w-md w-full mx-auto p-4 space-y-4">
        {/* Banner de cuenta dividida (171c) */}
        {activeOrder?.splitMode && (
          <div
            onClick={() => setIsSplitModalOpen(true)}
            className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between gap-2.5 text-xs font-semibold shadow-2xs cursor-pointer hover:bg-purple-100/70 transition-colors animate-fadeIn"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-200/80 text-purple-800 flex items-center justify-center shrink-0">
                <ArrowsLeftRight size={17} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-purple-900 truncate">
                  Cuenta dividida ({activeOrder.subAccounts?.length || 0} cuentas)
                </p>
                <p className="text-[11px] text-purple-700 truncate">
                  {activeOrder.splitMode === 'ITEMS'
                    ? 'Dividida por productos'
                    : 'Dividida en partes iguales'}
                  {activeOrder.subAccounts?.some((s) => s.status === 'PAID') && ' · Pagos en caja'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-extrabold text-purple-700 underline shrink-0">
              Ver cuentas
            </span>
          </div>
        )}
        {/* Banner de alerta: comanda sin imprimir tras 60s (Requerimiento 3) */}
        {unprintedAlert && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 text-xs font-semibold shadow-xs animate-fadeIn">
            <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-extrabold text-amber-900">Atención en cocina</p>
              <p>{unprintedAlert}</p>
            </div>
          </div>
        )}

        {/* Banner de confirmación de última ronda enviada */}
        {lastSentRoundConfirmation && (
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-2 text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-blue-600 shrink-0" />
              <span>{lastSentRoundConfirmation}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastSentRoundConfirmation(null)}
              className="text-blue-400 hover:text-blue-700 p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Barra de búsqueda desplegable */}
        {isSearchOpen && (
          <div className="relative animate-fadeIn">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de producto..."
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 shadow-2xs"
            />
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Categorías (Pills Horizontales) */}
        {!isSearchOpen && (
          <CategoryPills
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        )}

        {/* Grilla de Productos (2 columnas, compactas) */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-white border border-gray-200 p-3 space-y-2"
              >
                <div className="w-full aspect-4/3 bg-gray-100 rounded-xl" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-12 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-gray-200 text-center space-y-2">
            <ForkKnife size={36} className="text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800">
              No se encontraron productos
            </h3>
            <p className="text-xs text-gray-500">
              {search
                ? 'No hay productos que coincidan con la búsqueda.'
                : 'Esta categoría no tiene productos activos.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 animate-fadeIn">
            {products.map((product) => {
              const inCart = newCartItems.find((i) => i.productId === product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={inCart ? inCart.quantity : 0}
                  onAdd={() => handleAddProduct(product)}
                  onEditNotes={() => setIsBottomSheetOpen(true)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Barra Flotante Inferior de Comanda con Botón Fijo "Enviar a cocina (N)" */}
      <FloatingCartBar
        tableNumber={tableNumber}
        tableDisplayName={tableDisplayName}
        newItemsCount={totalUnsentCount}
        totalPendingAmount={totalPendingAmount}
        existingItemsCount={existingItemsCount}
        isRestaurante={isRestaurante}
        onOpenBottomSheet={() => setIsBottomSheetOpen(true)}
        onSendToKitchen={handleConfirmSend}
        isSendingToKitchen={isSendingToKitchen}
      />

      {/* Bottom Sheet deslizable de Comanda */}
      <ComandaBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        tableNumber={tableNumber}
        tableDisplayName={tableDisplayName}
        newItems={newCartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateNotes={handleUpdateNotes}
        onRemoveItem={handleRemoveItem}
        activeOrder={activeOrder || null}
        rounds={rounds}
        onConfirmSend={handleConfirmSend}
        isSubmitting={isSendingToKitchen}
        isRestaurante={isRestaurante}
        isNoPrintMode={isNoPrintMode}
        onRequestVoid={handleOpenVoidModal}
        onRemoveSavedUnsentItem={handleRemoveSavedUnsentItem}
        onAddMoreOfSentItem={handleAddMoreOfSentItem}
        unprintedAlert={unprintedAlert}
        lastSentRoundConfirmation={lastSentRoundConfirmation}
        onOpenSplitModal={() => {
          setIsBottomSheetOpen(false);
          setIsSplitModalOpen(true);
        }}
      />

      {/* Modal de Anulación Autorizada con PIN (Requerimiento 4 y 5) */}
      <VoidItemModal
        isOpen={voidModalState.isOpen}
        onClose={() => setVoidModalState({ isOpen: false, item: null })}
        item={voidModalState.item}
        voidQty={voidModalState.voidQty}
        onConfirm={handleConfirmVoid}
        isLoading={voidMutation.isPending}
      />

      {/* Modal para Dividir Cuenta y Deshacer División (171c) */}
      <SplitAccountModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        tableId={tableId || ''}
        tableNumber={tableNumber}
        tableDisplayName={tableDisplayName}
        activeOrder={activeOrder || null}
      />
    </div>
  );
};
