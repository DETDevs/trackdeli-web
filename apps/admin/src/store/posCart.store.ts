import { create } from 'zustand';
import { type PosProductItem, type PrepareQuoteConversionResponse } from 'api-client';
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
  isCustomLine?: boolean;
  isPriceProtected?: boolean;
}

export interface CartSourceQuote {
  quoteId: string;
  quoteNumber: string;
  expiresAt: string;
  validUntilLabel: string;
  isExpired: boolean;
  priceProtectionApplied: boolean;
  useCurrentPrices: boolean;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerRuc: string | null;
  vehicleInfo: string | null;
  discountAmount: number;
  hasPriceChanges: boolean;
  hasInsufficientStock: boolean;
  hasMissingProducts: boolean;
  priceChangeNotes: string[];
  insufficientStockNotes: string[];
  batchItemNotes: string[];
  missingProductNotes: string[];
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
  sourceQuote: CartSourceQuote | null;

  setBusinessContext: (context: Partial<BusinessCalculationContext>) => void;
  addItem: (product: PosProductItem) => void;
  removeItem: (productId: string) => void;
  deleteItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  clearCart: () => void;
  loadFromQuoteConversion: (conversion: PrepareQuoteConversionResponse) => void;
  discardSourceQuote: () => void;

  getCalculationSummary: () => CalculatedSaleSummary;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  discountType: 'PERCENT',
  discountValue: 0,
  sourceQuote: null,
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
        const pricing = existing.isPriceProtected
          ? { unitPrice: existing.unitPrice, isWholesale: existing.isWholesale }
          : computeItemUnitPrice(
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
      const pricing = existing.isPriceProtected
        ? { unitPrice: existing.unitPrice, isWholesale: existing.isWholesale }
        : computeItemUnitPrice(
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
          const pricing = i.isPriceProtected
            ? { unitPrice: i.unitPrice, isWholesale: i.isWholesale }
            : computeItemUnitPrice(
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
      sourceQuote: null,
    });
  },

  loadFromQuoteConversion: (conversion) => {
    const sellable = conversion.items.filter(
      (item) => item.productExists && item.productActive,
    );
    const items: CartItem[] = sellable.map((item) => {
      const isCustom = !item.productId || item.itemType === 'CUSTOM';
      const chosenPrice =
        conversion.priceProtectionApplied || item.currentUnitPrice === null
          ? Number(item.quotedUnitPrice || 0)
          : Number(item.recommendedUnitPrice ?? item.currentUnitPrice ?? item.quotedUnitPrice ?? 0);

      return {
        productId: isCustom ? `quote-custom-${item.quoteItemId}` : item.productId!,
        productName: item.productName,
        unitPrice: chosenPrice,
        regularPrice: chosenPrice,
        wholesalePrice: null,
        wholesaleMinQty: null,
        isWholesale: false,
        quantity: Number(item.quantity || 1),
        stock: item.availableStock ?? undefined,
        type: item.itemType === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
        isRecipe: false,
        unit: item.unit || 'UND',
        barcode: item.barcode || undefined,
        listPrice: null,
        taxable: Boolean(item.taxable),
        isCustomLine: isCustom,
        isPriceProtected: Boolean(conversion.priceProtectionApplied || isCustom),
      };
    });

    const priceChangeNotes = conversion.items
      .filter((i) => i.priceChanged)
      .map((i) => i.productName);
    const insufficientStockNotes = conversion.items
      .filter((i) => i.productExists && i.productActive && !i.hasSufficientStock)
      .map((i) => `${i.productName} (disp: ${i.availableStock ?? 0})`);
    const batchItemNotes = conversion.items
      .filter((i) => i.productExists && i.productActive && i.requiresBatches)
      .map((i) => i.productName);
    const missingProductNotes = conversion.items
      .filter((i) => !i.productExists || !i.productActive)
      .map((i) => i.productName);

    const discountAmt = Math.max(0, Number(conversion.discountAmount || 0));

    set({
      items,
      discountType: discountAmt > 0 ? 'FIXED' : 'PERCENT',
      discountValue: discountAmt > 0 ? discountAmt : 0,
      sourceQuote: {
        quoteId: conversion.quoteId,
        quoteNumber: conversion.quoteNumber,
        expiresAt: conversion.expiresAt,
        validUntilLabel: conversion.validUntilLabel,
        isExpired: conversion.isExpired,
        priceProtectionApplied: conversion.priceProtectionApplied,
        useCurrentPrices: conversion.useCurrentPrices,
        customerId: conversion.customerId,
        customerName: conversion.customerName,
        customerPhone: conversion.customerPhone,
        customerRuc: conversion.customerRuc,
        vehicleInfo: conversion.vehicleInfo,
        discountAmount: discountAmt,
        hasPriceChanges: conversion.hasPriceChanges,
        hasInsufficientStock: conversion.hasInsufficientStock,
        hasMissingProducts: conversion.hasMissingProducts,
        priceChangeNotes,
        insufficientStockNotes,
        batchItemNotes,
        missingProductNotes,
      },
    });
  },

  discardSourceQuote: () => {
    set({
      items: [],
      discountType: 'PERCENT',
      discountValue: 0,
      sourceQuote: null,
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
