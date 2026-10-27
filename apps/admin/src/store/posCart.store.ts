import { create } from 'zustand';
import { type PosProductItem } from 'api-client';
import {
  calculateSaleTotals,
  type BusinessCalculationContext,
  type CalculatedSaleSummary,
} from '../utils/saleCalculation';

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  regularPrice: number;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  isWholesale: boolean;
  quantity: number;
  stock?: number;
  type?: 'PRODUCT' | 'SERVICE';
  isRecipe?: boolean;
  unit?: string;
  barcode?: string;
  listPrice?: number | null;
  taxable?: boolean;
}

export function computeItemUnitPrice(
  regularPrice: number,
  quantity: number,
  wholesalePrice?: number | null,
  wholesaleMinQty?: number | null,
): { unitPrice: number; isWholesale: boolean } {
  const hasWholesale =
    wholesalePrice != null &&
    Number(wholesalePrice) > 0 &&
    wholesaleMinQty != null &&
    Number(wholesaleMinQty) >= 2 &&
    Number(wholesalePrice) < Number(regularPrice);

  if (hasWholesale && quantity >= Number(wholesaleMinQty)) {
    return {
      unitPrice: Number(wholesalePrice),
      isWholesale: true,
    };
  }

  return {
    unitPrice: Number(regularPrice) || 0,
    isWholesale: false,
  };
}

export type DiscountType = 'FIXED' | 'PERCENT';

interface PosCartState {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;
  businessContext: BusinessCalculationContext;

  setBusinessContext: (context: Partial<BusinessCalculationContext>) => void;
  addItem: (product: PosProductItem) => void;
  removeItem: (productId: string) => void;
  deleteItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  clearCart: () => void;

  getCalculationSummary: () => CalculatedSaleSummary;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  discountType: 'PERCENT',
  discountValue: 0,
  businessContext: {
    useListPrice: false,
    taxEnabled: true,
    taxIncluded: false,
    taxRate: 15,
  },

  setBusinessContext: (context) => {
    set((state) => ({
      businessContext: {
        ...state.businessContext,
        ...context,
      },
    }));
  },

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      const rawWholesalePrice =
        product.wholesalePrice !== undefined
          ? product.wholesalePrice
          : (product as any).wholesale_price;
      const rawWholesaleMinQty =
        product.wholesaleMinQty !== undefined
          ? product.wholesaleMinQty
          : (product as any).wholesale_min_qty;
      const rawListPrice =
        product.listPrice !== undefined && product.listPrice !== null
          ? Number(product.listPrice)
          : null;
      const taxable = product.taxable !== undefined ? Boolean(product.taxable) : undefined;

      if (existing) {
        const newQty = existing.quantity + 1;
        const pricing = computeItemUnitPrice(
          existing.regularPrice,
          newQty,
          existing.wholesalePrice,
          existing.wholesaleMinQty,
        );
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: newQty,
                  unitPrice: pricing.unitPrice,
                  isWholesale: pricing.isWholesale,
                  listPrice: rawListPrice !== null ? rawListPrice : i.listPrice,
                  taxable: taxable !== undefined ? taxable : i.taxable,
                }
              : i
          ),
        };
      }

      const regularPrice = Number(product.price) || 0;
      const pricing = computeItemUnitPrice(
        regularPrice,
        1,
        rawWholesalePrice,
        rawWholesaleMinQty,
      );

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            productName: product.name,
            regularPrice,
            wholesalePrice: rawWholesalePrice != null ? Number(rawWholesalePrice) : null,
            wholesaleMinQty: rawWholesaleMinQty != null ? Number(rawWholesaleMinQty) : null,
            unitPrice: pricing.unitPrice,
            isWholesale: pricing.isWholesale,
            quantity: 1,
            stock: product.stock,
            type: product.type || 'PRODUCT',
            isRecipe: Boolean(product.isRecipe),
            unit: product.unit || 'UND',
            barcode: product.barcode || undefined,
            listPrice: rawListPrice,
            taxable,
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
      const newQty = existing.quantity - 1;
      const pricing = computeItemUnitPrice(
        existing.regularPrice,
        newQty,
        existing.wholesalePrice,
        existing.wholesaleMinQty,
      );
      return {
        items: state.items.map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity: newQty,
                unitPrice: pricing.unitPrice,
                isWholesale: pricing.isWholesale,
              }
            : i
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
        items: state.items.map((i) => {
          if (i.productId !== productId) return i;
          const pricing = computeItemUnitPrice(
            i.regularPrice,
            quantity,
            i.wholesalePrice,
            i.wholesaleMinQty,
          );
          return {
            ...i,
            quantity,
            unitPrice: pricing.unitPrice,
            isWholesale: pricing.isWholesale,
          };
        }),
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

  getCalculationSummary: () => {
    const { items, discountType, discountValue, businessContext } = get();
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    let rawManualDiscount = 0;
    if (subtotal > 0 && discountValue > 0) {
      if (discountType === 'PERCENT') {
        const calculated = (subtotal * discountValue) / 100;
        rawManualDiscount = Math.min(subtotal, Math.round(calculated * 100) / 100);
      } else {
        rawManualDiscount = Math.min(subtotal, discountValue);
      }
    }

    return calculateSaleTotals(
      items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        barcode: i.barcode,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        discount: 0,
        priceTier: i.isWholesale ? 'WHOLESALE' : 'RETAIL',
        listPrice: i.listPrice !== undefined ? i.listPrice : null,
        taxable: i.taxable !== undefined ? i.taxable : null,
      })),
      rawManualDiscount,
      businessContext,
    );
  },

  getSubtotal: () => {
    return get().getCalculationSummary().subtotal;
  },

  getDiscountAmount: () => {
    return get().getCalculationSummary().discountAmount;
  },

  getTotal: () => {
    return get().getCalculationSummary().total;
  },
}));
