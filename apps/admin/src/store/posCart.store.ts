import { create } from 'zustand';
import { type PosProductItem } from 'api-client';

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  stock?: number;
  type?: 'PRODUCT' | 'SERVICE';
  isRecipe?: boolean;
  unit?: string;
  barcode?: string;
}

export type DiscountType = 'FIXED' | 'PERCENT';

interface PosCartState {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;

  addItem: (product: PosProductItem) => void;
  removeItem: (productId: string) => void;
  deleteItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  discountType: 'PERCENT',
  discountValue: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            productName: product.name,
            unitPrice: Number(product.price) || 0,
            quantity: 1,
            stock: product.stock,
            type: product.type || 'PRODUCT',
            isRecipe: Boolean(product.isRecipe),
            unit: product.unit || 'UND',
            barcode: product.barcode || undefined,
          },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId);
      if (!existing) return state;
      if (existing.quantity <= 1) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    });
  },

  deleteItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        ),
      };
    });
  },

  setDiscount: (type, value) => {
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    set({
      discountType: type,
      discountValue: type === 'PERCENT' ? Math.min(100, safeVal) : safeVal,
    });
  },

  clearCart: () => {
    set({
      items: [],
      discountType: 'PERCENT',
      discountValue: 0,
    });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  },

  getDiscountAmount: () => {
    const { getSubtotal, discountType, discountValue } = get();
    const subtotal = getSubtotal();
    if (subtotal <= 0 || discountValue <= 0) return 0;

    if (discountType === 'PERCENT') {
      const calculated = (subtotal * discountValue) / 100;
      return Math.min(subtotal, Math.round(calculated * 100) / 100);
    }

    return Math.min(subtotal, discountValue);
  },

  getTotal: () => {
    const { getSubtotal, getDiscountAmount } = get();
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  },
}));
