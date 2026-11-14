import type { PosProductItem, CreateQuoteItemDto } from 'api-client';
import {
  calculateSaleTotals,
  type BusinessCalculationContext,
  type CalculatedSaleSummary,
} from './saleCalculation';

export interface EditableQuoteLine {
  key: string;
  productId: string | null;
  productName: string;
  barcode: string | null;
  unit: string;
  itemType: 'PRODUCT' | 'SERVICE' | 'CUSTOM';
  quantity: number;
  unitPrice: number;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  priceOverride: boolean;
  discount: number;
  taxable: boolean;
  listPrice: number | null;
  notes: string;
}

export interface QuoteEstimateBusinessContext extends BusinessCalculationContext {
  wholesaleEnabled?: boolean;
  currency?: string;
}

export function resolveCatalogLinePricing(
  line: EditableQuoteLine,
  quantity: number,
  wholesaleEnabled?: boolean,
): { unitPrice: number; priceTier: 'RETAIL' | 'WHOLESALE' } {
  const basePrice = Number(line.unitPrice || 0);
  if (line.itemType === 'CUSTOM' || line.priceOverride) {
    return { unitPrice: basePrice, priceTier: 'RETAIL' };
  }

  const minQty = Number(line.wholesaleMinQty || 0);
  const wPrice = Number(line.wholesalePrice || 0);
  if (wholesaleEnabled && wPrice > 0 && minQty > 0 && quantity >= minQty) {
    return { unitPrice: wPrice, priceTier: 'WHOLESALE' };
  }

  return { unitPrice: basePrice, priceTier: 'RETAIL' };
}

export function resolveProductInitialPrice(
  product: PosProductItem,
  quantity: number,
  wholesaleEnabled?: boolean,
): { unitPrice: number; priceTier: 'RETAIL' | 'WHOLESALE' } {
  const retail = Number(product.price || 0);
  const minQty = Number(product.wholesaleMinQty ?? product.wholesale_min_qty ?? 0);
  const wPrice = Number(product.wholesalePrice ?? product.wholesale_price ?? 0);
  const bizWholesale =
    wholesaleEnabled !== undefined
      ? Boolean(wholesaleEnabled)
      : Boolean(product.wholesaleEnabled ?? product.wholesale_enabled);

  if (bizWholesale && wPrice > 0 && minQty > 0 && quantity >= minQty) {
    return { unitPrice: wPrice, priceTier: 'WHOLESALE' };
  }

  return { unitPrice: retail, priceTier: 'RETAIL' };
}

/**
 * Estima los totales de la proforma usando la misma aritmética en centavos que el backend.
 * El cálculo oficial al guardar siempre proviene del API.
 */
export function estimateQuoteTotals(
  lines: EditableQuoteLine[],
  discountAmount: number,
  context: QuoteEstimateBusinessContext,
): CalculatedSaleSummary {
  const rawItems = lines.map((line) => {
    const qty = Number(line.quantity || 0);
    const { unitPrice, priceTier } =
      line.itemType !== 'CUSTOM' && !line.priceOverride && line.wholesalePrice
        ? resolveCatalogLinePricing(line, qty, context.wholesaleEnabled)
        : { unitPrice: Number(line.unitPrice || 0), priceTier: 'RETAIL' as const };

    return {
      productId: line.productId,
      productName: line.productName,
      barcode: line.barcode,
      unitPrice,
      quantity: qty,
      discount: Number(line.discount || 0),
      priceTier,
      listPrice: line.listPrice,
      taxable: Boolean(line.taxable),
    };
  });

  return calculateSaleTotals(rawItems, Math.max(0, Number(discountAmount || 0)), {
    useListPrice: Boolean(context.useListPrice),
    taxEnabled: context.taxEnabled !== undefined ? Boolean(context.taxEnabled) : true,
    taxIncluded: Boolean(context.taxIncluded),
    taxRate: context.taxRate !== undefined && context.taxRate > 0 ? context.taxRate : 15,
  });
}

export function mapLinesToQuotePayload(
  lines: EditableQuoteLine[],
  includeUnitPriceForCatalog: boolean,
): CreateQuoteItemDto[] {
  return lines.map((line) => {
    const qty = Number(line.quantity || 0);
    const base: CreateQuoteItemDto = {
      quantity: qty,
      discount: Number(line.discount || 0) > 0 ? Number(line.discount) : undefined,
      taxable: Boolean(line.taxable),
      notes: line.notes.trim() || undefined,
    };

    if (line.itemType === 'CUSTOM' || !line.productId) {
      return {
        ...base,
        productName: line.productName.trim(),
        unit: line.unit.trim() || 'UND',
        unitPrice: Number(line.unitPrice || 0),
      };
    }

    return {
      ...base,
      productId: line.productId,
      unitPrice:
        includeUnitPriceForCatalog && line.priceOverride
          ? Number(line.unitPrice || 0)
          : undefined,
    };
  });
}

