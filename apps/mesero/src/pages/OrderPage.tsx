import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  X,
  ForkKnife,
} from '@phosphor-icons/react';
import {
  useTablesStatus,
  useCategories,
  useProducts,
  useActiveOrder,
  useAddOrderItems,
} from '../hooks/useMesero';
import { useWaiterAuth } from '../store/authStore';
import { Header } from '../components/Header';
import { CategoryPills } from '../components/CategoryPills';
import { ProductCard } from '../components/ProductCard';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { ComandaBottomSheet } from '../components/ComandaBottomSheet';
import type { CartItem, Product } from '../types/mesero';
import toast from 'react-hot-toast';

export const OrderPage: React.FC = () => {
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const navigate = useNavigate();
  const { session } = useWaiterAuth();

  const businessSlug = slug || session?.slug || '';

  if (!session) {
    return <Navigate to={`/mesas/${businessSlug || 'default'}/login`} replace />;
  }

  // Cargar mesas para saber el número de mesa actual
  const { data: tables = [] } = useTablesStatus();
  const currentTable = tables.find((t) => t.id === tableId);
  const tableNumber = currentTable?.number || '?';

  // Pedido activo de la mesa
  const { data: activeOrder } = useActiveOrder(tableId || '');

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

  // Mutación de agregar ítems a la comanda
  const addItemsMutation = useAddOrderItems(tableId || '');

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

  const handleRemoveItem = (productId: string) => {
    setNewCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Enviar a cocina
  const handleConfirmSend = async () => {
    if (!tableId || newCartItems.length === 0 || addItemsMutation.isPending) return;

    try {
      await addItemsMutation.mutateAsync({
        items: newCartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes.trim() || undefined,
        })),
      });

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([40, 40, 60]);
        } catch {}
      }

      toast.success('¡Comanda enviada a cocina!', { duration: 3000 });
      setNewCartItems([]);
      setIsBottomSheetOpen(false);
    } catch {
      // El hook useAddOrderItems ya dispara el toast de error
    }
  };

  const totalPendingAmount =
    newCartItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0) +
    (activeOrder?.total || 0);

  const newItemsCount = newCartItems.reduce((acc, item) => acc + item.quantity, 0);
  const existingItemsCount = activeOrder?.items.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Header Fijo */}
      <Header
        title={`Mesa ${tableNumber}`}
        subtitle={
          activeOrder
            ? `Comanda abierta • C$ ${activeOrder.total.toFixed(2)}`
            : 'Nueva comanda'
        }
        onBack={() => navigate(`/mesas/${businessSlug}/tables`)}
        rightAction={
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
        }
      />

      {/* Main Content */}
      <main className="max-w-md w-full mx-auto p-4 space-y-4">
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

      {/* Barra Flotante Inferior de Comanda */}
      <FloatingCartBar
        tableNumber={tableNumber}
        newItemsCount={newItemsCount}
        totalPendingAmount={totalPendingAmount}
        existingItemsCount={existingItemsCount}
        onOpenBottomSheet={() => setIsBottomSheetOpen(true)}
      />

      {/* Bottom Sheet deslizable de Comanda */}
      <ComandaBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        tableNumber={tableNumber}
        newItems={newCartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateNotes={handleUpdateNotes}
        onRemoveItem={handleRemoveItem}
        activeOrder={activeOrder || null}
        onConfirmSend={handleConfirmSend}
        isSubmitting={addItemsMutation.isPending}
      />
    </div>
  );
};
