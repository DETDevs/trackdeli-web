import { create } from 'zustand';
import {
  type PosProductItem,
  type PosProductPresentation,
  type PrepareQuoteConversionResponse,
  type PosSalePreviewResult,
  type PreviewPosSalePayload,
  previewPosSale,
} from 'api-client';
import {
  calculateSaleTotals,
  isLineBlockedFromManualDiscount,
  type BusinessCalculationContext,
  type CalculatedSaleSummary,
} from '../utils/saleCalculation';

export interface CartItem {
  id: string; // Identificador único de la línea: presentationId ? `${productId}::pres::${presentationId}` : productId
  productId: string;
  productName: string;
  unitPrice: number;
  regularPrice: number;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  isWholesale: boolean;
  priceTier?: 'RETAIL' | 'WHOLESALE' | 'PROMO';
  priceOverridden?: boolean;
  allowDiscount?: boolean;
  promoDiscountPct?: number | null;
  lineDiscountType?: DiscountType;
  lineDiscountValue?: number;
  quantity: number;
  stock?: number;
  type?: 'PRODUCT' | 'SERVICE';
  isRecipe?: boolean;
  unit?: string;
  unitAllowsDecimals?: boolean;
  barcode?: string;
  listPrice?: number | null;
  taxable?: boolean;
  isCustomLine?: boolean;
  isPriceProtected?: boolean;

  // 294e2: Presentaciones y Promociones
  presentationId?: string | null;
  presentationName?: string | null;
  presentationFactor?: number;
  promotionName?: string | null;
  promoDiscount?: number;
  allowManualDiscount?: boolean;
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
  customerAddress: string | null;
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
  promoDiscountPct?: number | null,
  useListPrice?: boolean,
  listPrice?: number | null,
): { unitPrice: number; isWholesale: boolean; priceTier: 'RETAIL' | 'WHOLESALE' | 'PROMO' } {
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
      priceTier: 'WHOLESALE',
    };
  }

  const hasListPriceActive =
    Boolean(useListPrice) &&
    listPrice != null &&
    Number(listPrice) > 0 &&
    Number(listPrice) > Number(regularPrice);

  const promoPct = promoDiscountPct != null ? Number(promoDiscountPct) : 0;
  if (!hasListPriceActive && Number.isFinite(promoPct) && promoPct > 0 && promoPct < 100) {
    const base = Number(regularPrice) || 0;
    const promoUnitPrice = Math.round(base * (1 - promoPct / 100) * 100) / 100;
    if (promoUnitPrice < base) {
      return {
        unitPrice: promoUnitPrice,
        isWholesale: false,
        priceTier: 'PROMO',
      };
    }
  }

  return {
    unitPrice: Number(regularPrice) || 0,
    isWholesale: false,
    priceTier: 'RETAIL',
  };
}

export const checkIfUnitAllowsDecimals = (unit?: string | null): boolean => {
  if (!unit) return false;
  const u = unit.trim().toUpperCase();
  if (['LB', 'KG', 'ONZ', 'GR', 'LT', 'ML', 'GAL', 'MT', 'YD', 'METRO', 'LITRO', 'KILO', 'LIBRA'].includes(u)) {
    return true;
  }
  return false;
};

export type DiscountType = 'FIXED' | 'PERCENT';
export type PosSaleChannel = 'MOSTRADOR' | 'DOMICILIO';

let currentPreviewSeq = 0;
let previewDebounceTimer: any = null;
let activePreviewPromise: Promise<PosSalePreviewResult | null> | null = null;

const invalidatePreview = () => {
  currentPreviewSeq++;
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = null;
  }
};

const triggerCartPreview = () => {
  if (typeof window === 'undefined') return;
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    usePosCartStore.getState().fetchPreview();
  }, 100);
};

interface PosCartState {
  items: CartItem[];
  discountType: DiscountType;
  discountValue: number;
  businessContext: BusinessCalculationContext;
  sourceQuote: CartSourceQuote | null;
  channel: PosSaleChannel;
  deliveryFee: number;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryReference: string;
  deliveryDriverId: string;

  previewResult: PosSalePreviewResult | null;
  isPreviewLoading: boolean;
  previewError: string | null;

  setBusinessContext: (context: Partial<BusinessCalculationContext>) => void;
  addItem: (product: PosProductItem, presentation?: PosProductPresentation | null, initialQty?: number) => void;
  removeItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateUnitPrice: (itemId: string, newUnitPrice: number | null) => void;
  setItemDiscount: (itemId: string, type: DiscountType, value: number) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  setChannel: (channel: PosSaleChannel, defaultFee?: number) => void;
  setDeliveryFee: (fee: number) => void;
  setDeliveryAddress: (address: string) => void;
  setDeliveryPhone: (phone: string) => void;
  setDeliveryReference: (reference: string) => void;
  setDeliveryDriverId: (driverId: string) => void;
  resetChannel: () => void;
  clearCart: () => void;
  loadFromQuoteConversion: (conversion: PrepareQuoteConversionResponse) => void;
  discardSourceQuote: () => void;
  fetchPreview: () => Promise<PosSalePreviewResult | null>;
  flushPreview: () => Promise<PosSalePreviewResult | null>;
  clearPreview: () => void;

  getCalculationSummary: () => CalculatedSaleSummary;
  getEffectiveDeliveryFee: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  discountType: 'PERCENT',
  discountValue: 0,
  sourceQuote: null,
  channel: 'MOSTRADOR',
  deliveryFee: 0,
  deliveryAddress: '',
  deliveryPhone: '',
  deliveryReference: '',
  deliveryDriverId: '',
  previewResult: null,
  isPreviewLoading: false,
  previewError: null,
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

  addItem: (product, presentation, initialQty) => {
    invalidatePreview();
    set((state) => {
      const isPres = Boolean(presentation);
      const itemId = isPres ? `${product.id}::pres::${presentation!.id}` : product.id;
      const existing = state.items.find((i) => (i.id || i.productId) === itemId);

      const rawWholesalePrice = isPres
        ? presentation!.wholesalePrice
        : (product.wholesalePrice !== undefined ? product.wholesalePrice : (product as any).wholesale_price);
      const rawWholesaleMinQty = isPres
        ? presentation!.wholesaleMinQty
        : (product.wholesaleMinQty !== undefined ? product.wholesaleMinQty : (product as any).wholesale_min_qty);
      const basePrice = isPres ? Number(presentation!.price) : Number(product.price);
      const rawListPrice = isPres
        ? (presentation!.listPrice != null ? Number(presentation!.listPrice) : null)
        : (product.listPrice !== undefined && product.listPrice !== null ? Number(product.listPrice) : null);
      const rawAllowDiscount = product.allowDiscount !== undefined
        ? Boolean(product.allowDiscount)
        : (product as any).allow_discount !== undefined
          ? Boolean((product as any).allow_discount)
          : true;
      const rawPromo = isPres ? null : (product.promoDiscountPct !== undefined ? product.promoDiscountPct : (product as any).promo_discount_pct);
      const promoDiscountPct = rawPromo != null && Number(rawPromo) > 0 && Number(rawPromo) < 100 ? Number(rawPromo) : null;
      const taxable = product.taxable !== undefined ? Boolean(product.taxable) : undefined;
      const unitAllowsDecimals = isPres ? false : ((product as any).allowsDecimals !== undefined ? Boolean((product as any).allowsDecimals) : checkIfUnitAllowsDecimals(product.unit));

      const qtyToAdd = initialQty !== undefined ? initialQty : 1;

      if (existing) {
        const newQty = unitAllowsDecimals
          ? Math.round((existing.quantity + qtyToAdd) * 1000) / 1000
          : existing.quantity + qtyToAdd;

        const effectiveListPrice = rawListPrice !== null ? rawListPrice : existing.listPrice;
        const effectivePromoPct = promoDiscountPct !== null ? promoDiscountPct : existing.promoDiscountPct;
        const effectiveAllowDiscount = rawAllowDiscount !== undefined ? rawAllowDiscount : existing.allowDiscount !== false;
        const pricing = existing.isPriceProtected || existing.priceOverridden
          ? {
              unitPrice: existing.unitPrice,
              isWholesale: existing.isWholesale,
              priceTier: existing.priceTier || (existing.isWholesale ? 'WHOLESALE' : 'RETAIL'),
            }
          : computeItemUnitPrice(
              existing.regularPrice,
              newQty,
              existing.wholesalePrice,
              existing.wholesaleMinQty,
              effectivePromoPct,
              state.businessContext.useListPrice,
              effectiveListPrice,
            );
        const blocked = isLineBlockedFromManualDiscount(
          {
            unitPrice: pricing.unitPrice,
            priceTier: pricing.priceTier,
            allowDiscount: effectiveAllowDiscount,
            listPrice: effectiveListPrice,
            promotionId: (existing as any).promotionId,
            promoDiscount: existing.promoDiscount,
          },
          state.businessContext.useListPrice,
        );
        return {
          previewResult: null,
          previewError: null,
          items: state.items.map((i) =>
            (i.id || i.productId) === itemId
              ? {
                  ...i,
                  quantity: newQty,
                  unitPrice: pricing.unitPrice,
                  isWholesale: pricing.isWholesale,
                  priceTier: pricing.priceTier,
                  allowDiscount: effectiveAllowDiscount,
                  promoDiscountPct: effectivePromoPct,
                  lineDiscountValue: blocked ? 0 : i.lineDiscountValue,
                  listPrice: effectiveListPrice,
                  taxable: taxable !== undefined ? taxable : i.taxable,
                  promotionName: null,
                  promoDiscount: 0,
                }
              : i
          ),
        };
      }

      const initialPricing = computeItemUnitPrice(
        basePrice,
        qtyToAdd,
        rawWholesalePrice != null ? Number(rawWholesalePrice) : null,
        rawWholesaleMinQty != null ? Number(rawWholesaleMinQty) : null,
        promoDiscountPct,
        state.businessContext.useListPrice,
        rawListPrice,
      );

      const newItem: CartItem = {
        id: itemId,
        productId: product.id,
        productName: isPres ? `${product.name} · ${presentation!.name}` : product.name,
        unitPrice: initialPricing.unitPrice,
        regularPrice: basePrice,
        wholesalePrice: rawWholesalePrice != null ? Number(rawWholesalePrice) : null,
        wholesaleMinQty: rawWholesaleMinQty != null ? Number(rawWholesaleMinQty) : null,
        isWholesale: initialPricing.isWholesale,
        priceTier: initialPricing.priceTier,
        priceOverridden: false,
        allowDiscount: rawAllowDiscount,
        promoDiscountPct,
        lineDiscountType: 'PERCENT',
        lineDiscountValue: 0,
        quantity: qtyToAdd,
        stock: product.stock,
        type: product.type || 'PRODUCT',
        isRecipe: Boolean(product.isRecipe),
        unit: isPres ? presentation!.name : (product.unit || 'UND'),
        unitAllowsDecimals,
        barcode: isPres ? (presentation!.barcode || product.barcode || undefined) : (product.barcode || undefined),
        listPrice: rawListPrice,
        taxable,
        isCustomLine: false,
        isPriceProtected: false,
        presentationId: isPres ? presentation!.id : null,
        presentationName: isPres ? presentation!.name : null,
        presentationFactor: isPres ? Number(presentation!.factor) : undefined,
      };

      return {
        previewResult: null,
        previewError: null,
        items: [...state.items, newItem],
      };
    });
    triggerCartPreview();
  },

  removeItem: (itemId) => {
    invalidatePreview();
    set((state) => {
      const existing = state.items.find((i) => (i.id || i.productId) === itemId);
      if (!existing) return state;
      if (existing.quantity <= 1) {
        return {
          previewResult: null,
          previewError: null,
          items: state.items.filter((i) => (i.id || i.productId) !== itemId),
        };
      }
      const newQty = existing.unitAllowsDecimals
        ? Math.max(0.001, Math.round((existing.quantity - 1) * 1000) / 1000)
        : existing.quantity - 1;

      const pricing =
        existing.isPriceProtected || existing.priceOverridden
          ? {
              unitPrice: existing.unitPrice,
              isWholesale: existing.isWholesale,
              priceTier: existing.priceTier || (existing.isWholesale ? 'WHOLESALE' : 'RETAIL'),
            }
          : computeItemUnitPrice(
              existing.regularPrice,
              newQty,
              existing.wholesalePrice,
              existing.wholesaleMinQty,
              existing.promoDiscountPct,
              state.businessContext.useListPrice,
              existing.listPrice,
            );
      const blocked = isLineBlockedFromManualDiscount(
        {
          unitPrice: pricing.unitPrice,
          priceTier: pricing.priceTier,
          allowDiscount: existing.allowDiscount !== false,
          listPrice: existing.listPrice,
          promotionId: (existing as any).promotionId,
          promoDiscount: existing.promoDiscount,
        },
        state.businessContext.useListPrice,
      );
      return {
        previewResult: null,
        previewError: null,
        items: state.items.map((i) =>
          (i.id || i.productId) === itemId
            ? {
                ...i,
                quantity: newQty,
                unitPrice: pricing.unitPrice,
                isWholesale: pricing.isWholesale,
                priceTier: pricing.priceTier,
                lineDiscountValue: blocked ? 0 : i.lineDiscountValue,
                promotionName: null,
                promoDiscount: 0,
              }
            : i
        ),
      };
    });
    triggerCartPreview();
  },

  deleteItem: (itemId) => {
    invalidatePreview();
    set((state) => ({
      previewResult: null,
      previewError: null,
      items: state.items.filter((i) => (i.id || i.productId) !== itemId),
    }));
    triggerCartPreview();
  },

  updateQuantity: (itemId, quantity) => {
    invalidatePreview();
    set((state) => {
      if (quantity <= 0) {
        return {
          previewResult: null,
          previewError: null,
          items: state.items.filter((i) => (i.id || i.productId) !== itemId),
        };
      }
      return {
        previewResult: null,
        previewError: null,
        items: state.items.map((i) => {
          if ((i.id || i.productId) !== itemId) return i;
          const cleanQty = i.unitAllowsDecimals
            ? Math.round(quantity * 1000) / 1000
            : Math.max(1, Math.round(quantity));

          const pricing =
            i.isPriceProtected || i.priceOverridden
              ? {
                  unitPrice: i.unitPrice,
                  isWholesale: i.isWholesale,
                  priceTier: i.priceTier || (i.isWholesale ? 'WHOLESALE' : 'RETAIL'),
                }
              : computeItemUnitPrice(
                  i.regularPrice,
                  cleanQty,
                  i.wholesalePrice,
                  i.wholesaleMinQty,
                  i.promoDiscountPct,
                  state.businessContext.useListPrice,
                  i.listPrice,
                );
          const blocked = isLineBlockedFromManualDiscount(
            {
              unitPrice: pricing.unitPrice,
              priceTier: pricing.priceTier,
              allowDiscount: i.allowDiscount !== false,
              listPrice: i.listPrice,
              promotionId: (i as any).promotionId,
              promoDiscount: i.promoDiscount,
            },
            state.businessContext.useListPrice,
          );
          return {
            ...i,
            quantity: cleanQty,
            unitPrice: pricing.unitPrice,
            isWholesale: pricing.isWholesale,
            priceTier: pricing.priceTier,
            lineDiscountValue: blocked ? 0 : i.lineDiscountValue,
            promotionName: null,
            promoDiscount: 0,
          };
        }),
      };
    });
    triggerCartPreview();
  },

  updateUnitPrice: (itemId, newUnitPrice) => {
    invalidatePreview();
    set((state) => ({
      previewResult: null,
      previewError: null,
      items: state.items.map((i) => {
        if ((i.id || i.productId) !== itemId) return i;
        if (newUnitPrice === null || isNaN(newUnitPrice) || newUnitPrice < 0) {
          const pricing = computeItemUnitPrice(
            i.regularPrice,
            i.quantity,
            i.wholesalePrice,
            i.wholesaleMinQty,
            i.promoDiscountPct,
            state.businessContext.useListPrice,
            i.listPrice,
          );
          const blocked = isLineBlockedFromManualDiscount(
            {
              unitPrice: pricing.unitPrice,
              priceTier: pricing.priceTier,
              allowDiscount: i.allowDiscount !== false,
              listPrice: i.listPrice,
              promotionId: (i as any).promotionId,
              promoDiscount: i.promoDiscount,
            },
            state.businessContext.useListPrice,
          );
          return {
            ...i,
            unitPrice: pricing.unitPrice,
            isWholesale: pricing.isWholesale,
            priceTier: pricing.priceTier,
            priceOverridden: false,
            lineDiscountValue: blocked ? 0 : i.lineDiscountValue,
            promotionName: null,
            promoDiscount: 0,
          };
        }

        const cleanPrice = Math.max(0, Math.round(newUnitPrice * 100) / 100);
        const isLowered = cleanPrice < i.regularPrice - 0.005;
        return {
          ...i,
          unitPrice: cleanPrice,
          isWholesale: false,
          priceTier: 'RETAIL',
          priceOverridden: Math.abs(cleanPrice - i.regularPrice) > 0.005,
          lineDiscountValue: isLowered ? 0 : i.lineDiscountValue,
          promotionName: null,
          promoDiscount: 0,
        };
      }),
    }));
    triggerCartPreview();
  },

  setItemDiscount: (itemId, type, value) => {
    invalidatePreview();
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    set((state) => ({
      previewResult: null,
      previewError: null,
      items: state.items.map((i) => {
        if ((i.id || i.productId) !== itemId) return i;
        const isLoweredManually = Boolean(
          i.priceOverridden && i.unitPrice < i.regularPrice - 0.005,
        );
        const blocked =
          isLoweredManually ||
          isLineBlockedFromManualDiscount(
            {
              unitPrice: i.unitPrice,
              priceTier: i.priceTier || (i.isWholesale ? 'WHOLESALE' : 'RETAIL'),
              allowDiscount: i.allowDiscount !== false,
              listPrice: i.listPrice,
              promotionId: (i as any).promotionId,
              promoDiscount: i.promoDiscount,
            },
            state.businessContext.useListPrice,
          );
        if (blocked) {
          return { ...i, lineDiscountType: 'PERCENT', lineDiscountValue: 0 };
        }
        const lineGross = Math.round(i.unitPrice * i.quantity * 100) / 100;
        return {
          ...i,
          lineDiscountType: type,
          lineDiscountValue:
            type === 'PERCENT' ? Math.min(100, safeVal) : Math.min(lineGross, safeVal),
        };
      }),
    }));
    triggerCartPreview();
  },

  setDiscount: (type, value) => {
    invalidatePreview();
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    set({
      previewResult: null,
      previewError: null,
      discountType: type,
      discountValue: type === 'PERCENT' ? Math.min(100, safeVal) : safeVal,
    });
    triggerCartPreview();
  },

  setChannel: (channel, defaultFee) => {
    invalidatePreview();
    set((state) => {
      if (channel === 'DOMICILIO') {
        const feeToUse =
          defaultFee !== undefined
            ? Math.max(0, Number(defaultFee) || 0)
            : state.deliveryFee;
        const nextAddress =
          state.deliveryAddress.trim() ||
          state.sourceQuote?.customerAddress?.trim() ||
          '';
        const nextPhone =
          state.deliveryPhone.trim() ||
          state.sourceQuote?.customerPhone?.trim() ||
          '';
        return {
          previewResult: null,
          previewError: null,
          channel: 'DOMICILIO',
          deliveryFee: feeToUse,
          deliveryAddress: nextAddress,
          deliveryPhone: nextPhone,
        };
      }
      return {
        previewResult: null,
        previewError: null,
        channel: 'MOSTRADOR',
      };
    });
    triggerCartPreview();
  },

  setDeliveryFee: (fee) => {
    invalidatePreview();
    const safeFee = Math.max(0, Number.isFinite(fee) ? Math.round(fee * 100) / 100 : 0);
    set({ previewResult: null, previewError: null, deliveryFee: safeFee });
    triggerCartPreview();
  },

  setDeliveryAddress: (address) => {
    set({ deliveryAddress: address });
  },

  setDeliveryPhone: (phone) => {
    set({ deliveryPhone: phone });
  },

  setDeliveryReference: (reference) => {
    set({ deliveryReference: reference });
  },

  setDeliveryDriverId: (driverId) => {
    set({ deliveryDriverId: driverId });
  },

  resetChannel: () => {
    invalidatePreview();
    set({
      channel: 'MOSTRADOR',
      deliveryFee: 0,
      deliveryAddress: '',
      deliveryPhone: '',
      deliveryReference: '',
      deliveryDriverId: '',
      previewResult: null,
      previewError: null,
    });
    triggerCartPreview();
  },

  clearCart: () => {
    invalidatePreview();
    set({
      items: [],
      discountType: 'PERCENT',
      discountValue: 0,
      sourceQuote: null,
      channel: 'MOSTRADOR',
      deliveryFee: 0,
      deliveryAddress: '',
      deliveryPhone: '',
      deliveryReference: '',
      deliveryDriverId: '',
      previewResult: null,
      isPreviewLoading: false,
      previewError: null,
    });
  },

  loadFromQuoteConversion: (conversion) => {
    invalidatePreview();
    const sellable = conversion.items.filter(
      (item) => item.productExists && item.productActive,
    );
    const items: CartItem[] = sellable.map((item) => {
      const isCustom = !item.productId || item.itemType === 'CUSTOM';
      const chosenPrice =
        conversion.priceProtectionApplied || item.currentUnitPrice === null
          ? Number(item.quotedUnitPrice || 0)
          : Number(item.recommendedUnitPrice ?? item.currentUnitPrice ?? item.quotedUnitPrice ?? 0);
      const itemId = isCustom ? `quote-custom-${item.quoteItemId}` : item.productId!;

      return {
        id: itemId,
        productId: itemId,
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
        unitAllowsDecimals: checkIfUnitAllowsDecimals(item.unit),
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

    set((state) => ({
      previewResult: null,
      previewError: null,
      items,
      discountType: discountAmt > 0 ? 'FIXED' : 'PERCENT',
      discountValue: discountAmt > 0 ? discountAmt : 0,
      deliveryAddress:
        state.channel === 'DOMICILIO' && !state.deliveryAddress.trim()
          ? conversion.customerAddress?.trim() || ''
          : state.deliveryAddress,
      deliveryPhone:
        state.channel === 'DOMICILIO' && !state.deliveryPhone.trim()
          ? conversion.customerPhone?.trim() || ''
          : state.deliveryPhone,
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
        customerAddress: conversion.customerAddress || null,
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
    }));
    triggerCartPreview();
  },

  discardSourceQuote: () => {
    invalidatePreview();
    set({
      items: [],
      discountType: 'PERCENT',
      discountValue: 0,
      sourceQuote: null,
      channel: 'MOSTRADOR',
      deliveryFee: 0,
      deliveryAddress: '',
      deliveryPhone: '',
      deliveryReference: '',
      deliveryDriverId: '',
      previewResult: null,
      isPreviewLoading: false,
      previewError: null,
    });
  },

  fetchPreview: async () => {
    const { items, discountType, discountValue, channel } = get();
    if (items.length === 0) {
      invalidatePreview();
      set({ previewResult: null, isPreviewLoading: false, previewError: null });
      return null;
    }

    const seq = ++currentPreviewSeq;
    set({ isPreviewLoading: true, previewError: null });

    const previewPromise = (async (): Promise<PosSalePreviewResult | null> => {
      try {
        // Calcular base para descuento global
        const mappedItems = items.map((i) => {
          const lineGross = Math.round(i.unitPrice * i.quantity * 100) / 100;
          let lineDiscount = 0;
          if ((i.lineDiscountValue || 0) > 0) {
            if ((i.lineDiscountType || 'PERCENT') === 'PERCENT') {
              lineDiscount = Math.min(lineGross, Math.round(((lineGross * Number(i.lineDiscountValue)) / 100) * 100) / 100);
            } else {
              lineDiscount = Math.min(lineGross, Math.round(Number(i.lineDiscountValue) * 100) / 100);
            }
          }
          return {
            productId: i.isCustomLine ? undefined : i.productId,
            presentationId: i.presentationId || undefined,
            productName: i.productName,
            barcode: i.barcode || undefined,
            unitPrice: i.unitPrice,
            quantity: Number(Number(i.quantity).toFixed(3)),
            discount: lineDiscount,
            listPrice: i.listPrice != null ? i.listPrice : undefined,
            taxable: i.taxable,
            priceTier: i.priceTier,
            _lineGross: lineGross,
            _eligibleForGlobal: lineDiscount <= 0,
          };
        });

        const eligibleGlobalBase = mappedItems.reduce(
          (sum, item) => sum + (item._eligibleForGlobal ? item._lineGross : 0),
          0,
        );

        let rawManualDiscount = 0;
        if (eligibleGlobalBase > 0 && discountValue > 0) {
          if (discountType === 'PERCENT') {
            const calculated = (eligibleGlobalBase * discountValue) / 100;
            rawManualDiscount = Math.min(eligibleGlobalBase, Math.round(calculated * 100) / 100);
          } else {
            rawManualDiscount = Math.min(eligibleGlobalBase, discountValue);
          }
        }

        const previewPayload: PreviewPosSalePayload = {
          items: mappedItems.map(({ _lineGross, _eligibleForGlobal, ...it }) => it),
          discountAmount: rawManualDiscount > 0 ? rawManualDiscount : undefined,
          channel: channel,
          deliveryFee: channel === 'DOMICILIO' ? get().getEffectiveDeliveryFee() : 0,
          applyPromotions: true,
        };

        const res = await previewPosSale(previewPayload);

        // Descartar si una mutación posterior u otro request invalidó esta secuencia
        if (seq !== currentPreviewSeq) {
          return null;
        }

        // Sincronizar nombres y montos de promociones devueltas a cada ítem del carrito
        const currentItems = get().items;
        const updatedItems = currentItems.map((item, idx) => {
          const pItem = res.items?.[idx];
          if (!pItem) return item;
          return {
            ...item,
            promotionName: pItem.promotionName ?? null,
            promoDiscount: pItem.promoDiscount ?? 0,
            allowManualDiscount: pItem.allowManualDiscount ?? true,
          };
        });

        set({
          previewResult: res,
          items: updatedItems,
          isPreviewLoading: false,
          previewError: null,
        });
        return res;
      } catch (err: any) {
        if (seq !== currentPreviewSeq) {
          return null;
        }
        set({
          previewResult: null,
          isPreviewLoading: false,
          previewError: err?.response?.data?.message || err?.message || 'Error al calcular promociones',
          items: get().items.map((it) => ({ ...it, promoDiscount: 0, promotionName: null })),
        });
        return null;
      } finally {
        if (seq === currentPreviewSeq) {
          activePreviewPromise = null;
        }
      }
    })();

    activePreviewPromise = previewPromise;
    return previewPromise;
  },

  flushPreview: async (): Promise<PosSalePreviewResult | null> => {
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
      previewDebounceTimer = null;
      return get().fetchPreview();
    }
    if (get().isPreviewLoading && activePreviewPromise) {
      return activePreviewPromise;
    }
    if (get().previewResult) {
      return get().previewResult;
    }
    return get().fetchPreview();
  },

  clearPreview: () => {
    invalidatePreview();
    set({
      previewResult: null,
      isPreviewLoading: false,
      previewError: null,
      items: get().items.map((it) => ({ ...it, promoDiscount: 0, promotionName: null })),
    });
  },

  getCalculationSummary: () => {
    const { items, discountType, discountValue, businessContext, previewResult } = get();

    const mappedItems = items.map((i) => {
      const priceTier: 'RETAIL' | 'WHOLESALE' | 'PROMO' =
        i.priceTier || (i.isWholesale ? 'WHOLESALE' : 'RETAIL');
      const isLoweredManually = Boolean(
        i.priceOverridden && i.unitPrice < i.regularPrice - 0.005,
      );
      const allowDiscount = i.allowDiscount !== false && !isLoweredManually;
      const listPrice = i.listPrice !== undefined ? i.listPrice : null;
      const lineGross = Math.round(i.unitPrice * i.quantity * 100) / 100;
      const blocked = isLineBlockedFromManualDiscount(
        {
          unitPrice: i.unitPrice,
          priceTier,
          allowDiscount,
          listPrice,
          promotionId: (i as any).promotionId,
          promoDiscount: i.promoDiscount,
        },
        businessContext.useListPrice,
      );

      let lineDiscount = 0;
      if (!blocked && (i.lineDiscountValue || 0) > 0) {
        const val = Number(i.lineDiscountValue || 0);
        if ((i.lineDiscountType || 'PERCENT') === 'PERCENT') {
          lineDiscount = Math.min(lineGross, Math.round(((lineGross * val) / 100) * 100) / 100);
        } else {
          lineDiscount = Math.min(lineGross, Math.round(val * 100) / 100);
        }
      }

      return {
        productId: i.productId,
        productName: i.productName,
        barcode: i.barcode,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        discount: lineDiscount,
        priceTier,
        allowDiscount,
        listPrice,
        taxable: i.taxable !== undefined ? i.taxable : null,
        _eligibleForGlobal: !blocked && lineDiscount <= 0,
        _lineGross: lineGross,
      };
    });

    // Si el API ya dio preview exacto para este conjunto de ítems, usar directamente los números del API
    if (previewResult && Array.isArray(previewResult.items) && previewResult.items.length === mappedItems.length) {
      return {
        taxModel: previewResult.taxModel,
        subtotal: previewResult.subtotal,
        discountAmount: previewResult.discountAmount,
        lineDiscountTotal: previewResult.lineDiscountTotal,
        promoDiscountTotal: previewResult.promoDiscountTotal ?? 0,
        eligibleForGlobalDiscountSubtotal: previewResult.eligibleForGlobalDiscountSubtotal,
        subtotalBeforeTax: previewResult.subtotalBeforeTax,
        listPriceTotal: previewResult.listPriceTotal,
        listDiscountTotal: previewResult.listDiscountTotal,
        taxEnabled: previewResult.taxEnabled,
        taxIncluded: previewResult.taxIncluded,
        taxRate: previewResult.taxRate,
        taxAmount: previewResult.taxAmount,
        total: previewResult.total,
        lines: previewResult.items.map((pi, idx) => ({
          productId: mappedItems[idx]?.productId ?? pi.productId,
          productName: pi.productName,
          barcode: pi.barcode,
          unitPrice: pi.unitPrice,
          quantity: pi.quantity,
          discount: pi.discount,
          promoDiscount: pi.promoDiscount,
          promotionId: pi.promotionId,
          promotionName: pi.promotionName,
          subtotal: pi.subtotal,
          priceTier: pi.priceTier,
          listPrice: pi.listPrice,
          listPriceDiscount: pi.listPriceDiscount,
          manualDiscountShare: pi.manualDiscountShare,
          taxable: pi.taxable,
          taxRate: pi.taxRate,
          taxAmount: pi.taxAmount,
        })),
      };
    }

    const eligibleGlobalBase = mappedItems.reduce(
      (sum, item) => sum + (item._eligibleForGlobal ? item._lineGross : 0),
      0,
    );

    let rawManualDiscount = 0;
    if (eligibleGlobalBase > 0 && discountValue > 0) {
      if (discountType === 'PERCENT') {
        const calculated = (eligibleGlobalBase * discountValue) / 100;
        rawManualDiscount = Math.min(eligibleGlobalBase, Math.round(calculated * 100) / 100);
      } else {
        rawManualDiscount = Math.min(eligibleGlobalBase, discountValue);
      }
    }

    return calculateSaleTotals(
      mappedItems.map(({ _eligibleForGlobal, _lineGross, ...rest }) => rest),
      rawManualDiscount,
      businessContext,
    );
  },

  getEffectiveDeliveryFee: () => {
    const { channel, deliveryFee, items } = get();
    if (channel !== 'DOMICILIO' || items.length === 0) return 0;
    return Math.max(0, Math.round(Number(deliveryFee || 0) * 100) / 100);
  },

  getSubtotal: () => {
    return get().getCalculationSummary().subtotal;
  },

  getDiscountAmount: () => {
    return get().getCalculationSummary().discountAmount;
  },

  getTotal: () => {
    const { previewResult, channel } = get();
    if (previewResult) {
      return previewResult.total;
    }
    const productTotal = get().getCalculationSummary().total;
    const fee = channel === 'DOMICILIO' ? get().getEffectiveDeliveryFee() : 0;
    return Math.round((productTotal + fee) * 100) / 100;
  },
}));
