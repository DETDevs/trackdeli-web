import { apiClient } from '../client';

export type PosQuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export type PosQuoteItemType = 'PRODUCT' | 'SERVICE' | 'CUSTOM';

export interface PosQuoteItem {
  id: string;
  quoteId: string;
  sortOrder: number;
  productId: string | null;
  productName: string;
  barcode: string | null;
  unit: string;
  itemType: PosQuoteItemType;
  quantity: number;
  unitPrice: number;
  priceTier: 'RETAIL' | 'WHOLESALE' | string;
  priceOverride: boolean;
  discount: number;
  subtotal: number;
  listPrice: number | null;
  listPriceDiscount: number;
  manualDiscountShare: number;
  taxable: boolean;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
}

export interface PosQuoteIssuer {
  name: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  headerLines: string[];
  footerLines: string[];
}

export interface PosQuote {
  id: string;
  businessId: string;
  number: number;
  quoteNumber: string;
  status: PosQuoteStatus;
  createdById: string;
  createdByName: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerRuc: string | null;
  customerAddress: string | null;
  vehicleInfo: string | null;
  validityDays: number;
  expiresAt: string;
  validUntilLabel: string;
  notes: string | null;
  conditions: string | null;
  subtotal: number;
  discountAmount: number;
  listPriceTotal: number;
  listDiscountTotal: number;
  taxModel: 'PER_LINE' | 'LEGACY' | string;
  taxRate: number;
  taxEnabled: boolean;
  taxIncluded: boolean;
  taxAmount: number;
  total: number;
  currency: string;
  sentAt: string | null;
  acceptedAt: string | null;
  convertedAt: string | null;
  convertedById: string | null;
  convertedSaleId: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  expiredAt: string | null;
  clientRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  items: PosQuoteItem[];
  itemsCount?: number;
  issuer?: PosQuoteIssuer | null;
}

export interface QuoteListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface QuoteListResponse {
  data: PosQuote[];
  pagination: QuoteListPagination;
}

export interface CreateQuoteItemDto {
  productId?: string | null;
  productName?: string;
  unit?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  taxable?: boolean;
  notes?: string | null;
}

export interface CreateQuoteDto {
  items: CreateQuoteItemDto[];
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerRuc?: string | null;
  customerAddress?: string | null;
  vehicleInfo?: string | null;
  validityDays?: number;
  discountAmount?: number;
  approvalToken?: string;
  notes?: string | null;
  conditions?: string | null;
  status?: 'DRAFT' | 'SENT';
  clientRequestId?: string;
}

export interface UpdateQuoteDto {
  items?: CreateQuoteItemDto[];
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerRuc?: string | null;
  customerAddress?: string | null;
  vehicleInfo?: string | null;
  validityDays?: number;
  discountAmount?: number;
  approvalToken?: string;
  notes?: string | null;
  conditions?: string | null;
}

export interface UpdateQuoteStatusDto {
  status: 'SENT' | 'ACCEPTED' | 'CANCELLED';
  cancelReason?: string;
}

export interface DuplicateQuoteDto {
  validityDays?: number;
  clientRequestId?: string;
}

export interface ListPosQuotesParams {
  status?: PosQuoteStatus | '';
  q?: string;
  from?: string;
  to?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  businessId?: string;
}

export const QUOTE_STATUS_META: Record<
  PosQuoteStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Borrador',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    dotClass: 'bg-slate-500',
  },
  SENT: {
    label: 'Emitida',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-600',
  },
  ACCEPTED: {
    label: 'Aceptada',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-600',
  },
  EXPIRED: {
    label: 'Vencida',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-600',
  },
  CONVERTED: {
    label: 'Convertida',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dotClass: 'bg-indigo-600',
  },
  CANCELLED: {
    label: 'Cancelada',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-600',
  },
};

export const QUOTE_ERROR_MESSAGES: Record<string, string> = {
  QUOTE_NOT_FOUND: 'La proforma no fue encontrada o no pertenece a este negocio.',
  QUOTE_NOT_EDITABLE: 'Solo podés editar proformas en estado borrador.',
  QUOTE_EXPIRED:
    'La proforma está vencida y ya no se puede modificar. Duplicala para crear una nueva.',
  QUOTE_CANCELLED: 'La proforma ya fue cancelada.',
  QUOTE_ALREADY_CONVERTED: 'Esta proforma ya fue convertida en una venta.',
  QUOTE_NOT_SENT: 'La proforma aún no ha sido emitida.',
  QUOTE_FORBIDDEN: 'No tenés permiso para realizar esta acción sobre esta proforma.',
  INVALID_STATUS_TRANSITION:
    'El cambio de estado solicitado no es válido para esta proforma.',
  CANCEL_REASON_REQUIRED: 'Tenés que indicar un motivo para cancelar la proforma.',
  FREE_LINE_NOT_ALLOWED:
    'Tu rol no permite agregar líneas libres; seleccioná productos o servicios del catálogo.',
  FREE_LINE_NAME_REQUIRED: 'Toda línea libre debe incluir una descripción.',
  FREE_LINE_PRICE_REQUIRED: 'Toda línea libre debe incluir un precio unitario válido.',
  PRODUCT_NOT_FOUND: 'Uno de los productos seleccionados no existe en el catálogo.',
  PRODUCT_INACTIVE: 'Uno de los productos seleccionados está inactivo en el catálogo.',
  PRODUCT_NOT_AVAILABLE: 'Uno de los productos ya no está disponible en el catálogo actual.',
  PRICE_MISMATCH:
    'El precio unitario no coincide con el catálogo y la política actual no permite modificar precios.',
  DISCOUNTS_DISABLED: 'Los descuentos están deshabilitados en las políticas del negocio.',
  DISCOUNT_NOT_ALLOWED: 'Tu rol no tiene permiso para aplicar descuentos globales.',
  DISCOUNT_LIMIT_EXCEEDED:
    'El descuento supera el máximo permitido para cajeros y requiere autorización de encargado.',
  CUSTOMER_NOT_FOUND: 'El cliente seleccionado no existe o no pertenece a este negocio.',
  QUOTE_NOT_SHAREABLE: 'Solo podés compartir proformas emitidas o convertidas que no estén canceladas.',
};

export interface QuoteParsedError {
  code: string;
  message: string;
  maxAllowedPercent?: number;
  requestedPercent?: number;
}

export function generateQuoteRequestId(prefix = 'quote'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatQuoteApiError(
  err: any,
  fallbackMessage = 'No se pudo completar la operación de proforma.',
): QuoteParsedError {
  if (!err?.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Sin conexión con el servidor. Las proformas requieren conexión a internet.',
    };
  }

  const data = err.response?.data;
  const rawCode =
    data?.code ||
    (typeof data?.message === 'object' ? data?.message?.code : '') ||
    '';

  if (rawCode && QUOTE_ERROR_MESSAGES[rawCode]) {
    const serverMsg = typeof data?.message === 'string' ? data.message : '';
    return {
      code: rawCode,
      message:
        rawCode === 'DISCOUNT_LIMIT_EXCEEDED' && serverMsg
          ? serverMsg
          : QUOTE_ERROR_MESSAGES[rawCode],
      maxAllowedPercent:
        typeof data?.maxAllowedPercent === 'number' ? data.maxAllowedPercent : undefined,
      requestedPercent:
        typeof data?.requestedPercent === 'number' ? data.requestedPercent : undefined,
    };
  }

  const rawMessage = Array.isArray(data?.message)
    ? data.message.filter((item: unknown) => typeof item === 'string').join('. ')
    : typeof data?.message === 'string'
      ? data.message
      : typeof data?.error === 'string'
        ? data.error
        : '';

  return {
    code: rawCode || 'API_ERROR',
    message: rawMessage || fallbackMessage,
    maxAllowedPercent:
      typeof data?.maxAllowedPercent === 'number' ? data.maxAllowedPercent : undefined,
    requestedPercent:
      typeof data?.requestedPercent === 'number' ? data.requestedPercent : undefined,
  };
}

export function canPrintQuote(status: PosQuoteStatus): boolean {
  return status !== 'DRAFT' && status !== 'CANCELLED';
}

export function canConvertQuote(status: PosQuoteStatus, userRole?: string | null): boolean {
  if (!['SUPERADMIN', 'ENCARGADO', 'CAJERO'].includes(userRole || '')) {
    return false;
  }
  if (status === 'SENT' || status === 'ACCEPTED') {
    return true;
  }
  if (status === 'EXPIRED') {
    return userRole === 'ENCARGADO' || userRole === 'SUPERADMIN';
  }
  return false;
}

export function canShareQuote(
  quote: Pick<PosQuote, 'status' | 'createdById'>,
  userRole?: string | null,
  currentUserId?: string | null,
): boolean {
  if (!canPrintQuote(quote.status)) {
    return false;
  }
  if (userRole === 'VENDEDOR') {
    return Boolean(currentUserId && quote.createdById === currentUserId);
  }
  return ['SUPERADMIN', 'ENCARGADO', 'CAJERO'].includes(userRole || '');
}

export interface PrepareQuoteConversionItem {
  quoteItemId: string;
  sortOrder: number;
  productId: string | null;
  productName: string;
  barcode: string | null;
  unit: string;
  itemType: PosQuoteItemType | string;
  quantity: number;
  taxable: boolean;
  quotedUnitPrice: number;
  currentUnitPrice: number | null;
  recommendedUnitPrice: number | null;
  priceChanged: boolean;
  priceDiff: number | null;
  productExists: boolean;
  productActive: boolean;
  availableStock: number | null;
  hasSufficientStock: boolean;
  requiresBatches: boolean;
}

export interface PrepareQuoteConversionResponse {
  quoteId: string;
  quoteNumber: string;
  status: PosQuoteStatus;
  isExpired: boolean;
  priceProtectionApplied: boolean;
  useCurrentPrices: boolean;
  currency: string;
  expiresAt: string;
  validUntilLabel: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerRuc: string | null;
  customerAddress: string | null;
  vehicleInfo: string | null;
  discountAmount: number;
  quotedTotal: number;
  hasPriceChanges: boolean;
  hasInsufficientStock: boolean;
  hasMissingProducts: boolean;
  items: PrepareQuoteConversionItem[];
}

export interface UploadQuoteReceiptLinkResponse {
  token: string;
  url: string;
  expiresAt: string;
  documentKind: 'QUOTE';
  quoteNumber: string;
}

export async function getPosQuotes(
  params: ListPosQuotesParams = {},
): Promise<QuoteListResponse> {
  const cleanParams: Record<string, string | number> = {};
  if (params.status) cleanParams.status = params.status;
  if (params.q?.trim()) cleanParams.q = params.q.trim();
  if (params.from) cleanParams.from = params.from;
  if (params.to) cleanParams.to = params.to;
  if (params.customerId) cleanParams.customerId = params.customerId;
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;
  if (params.businessId) cleanParams.businessId = params.businessId;

  const res = await apiClient.get<QuoteListResponse>('/pos/quotes', {
    params: cleanParams,
  });
  return res.data;
}

export async function getPosQuoteById(
  id: string,
  businessId?: string,
): Promise<PosQuote> {
  const res = await apiClient.get<PosQuote>(
    `/pos/quotes/${encodeURIComponent(id)}`,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
}

export async function createPosQuote(
  payload: CreateQuoteDto,
  businessId?: string,
): Promise<PosQuote> {
  const requestId = payload.clientRequestId || generateQuoteRequestId('quote-create');
  const res = await apiClient.post<PosQuote>(
    '/pos/quotes',
    { ...payload, clientRequestId: requestId },
    {
      params: businessId ? { businessId } : undefined,
      headers: {
        'x-client-request-id': requestId,
      },
    },
  );
  return res.data;
}

export async function updatePosQuote(
  id: string,
  payload: UpdateQuoteDto,
  businessId?: string,
): Promise<PosQuote> {
  const res = await apiClient.patch<PosQuote>(
    `/pos/quotes/${encodeURIComponent(id)}`,
    payload,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
}

export async function updatePosQuoteStatus(
  id: string,
  payload: UpdateQuoteStatusDto,
  businessId?: string,
): Promise<PosQuote> {
  const res = await apiClient.patch<PosQuote>(
    `/pos/quotes/${encodeURIComponent(id)}/status`,
    payload,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
}

export async function duplicatePosQuote(
  id: string,
  payload: DuplicateQuoteDto = {},
  businessId?: string,
): Promise<PosQuote> {
  const requestId = payload.clientRequestId || generateQuoteRequestId('quote-dup');
  const res = await apiClient.post<PosQuote>(
    `/pos/quotes/${encodeURIComponent(id)}/duplicate`,
    { ...payload, clientRequestId: requestId },
    {
      params: businessId ? { businessId } : undefined,
      headers: {
        'x-client-request-id': requestId,
      },
    },
  );
  return res.data;
}

export async function prepareQuoteConversion(
  id: string,
  businessId?: string,
): Promise<PrepareQuoteConversionResponse> {
  const res = await apiClient.get<PrepareQuoteConversionResponse>(
    `/pos/quotes/${encodeURIComponent(id)}/prepare-conversion`,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
}

export async function uploadQuoteReceiptPdf(
  id: string,
  file: Blob,
  businessId?: string,
  filename = `Proforma-${id.slice(0, 8)}.pdf`,
): Promise<UploadQuoteReceiptLinkResponse> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const res = await apiClient.post<UploadQuoteReceiptLinkResponse>(
    `/pos/quotes/${encodeURIComponent(id)}/receipt-link`,
    formData,
    {
      params: businessId ? { businessId } : undefined,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return res.data;
}
