import { apiClient } from '../client';

export interface WebBillingStatusResponse {
  webAdminEnabled: boolean;
  enabled: boolean;
  maxWebDevices: number | null;
  activeWebDevices: number;
  hasOpenShift: boolean;
}

export interface RegisterWebDeviceDto {
  deviceId: string;
  name: string;
}

export interface RegisterWebDeviceResponse {
  success: boolean;
  device: {
    id: string;
    deviceId: string;
    name: string;
    category: string;
    platform: string;
    status: string;
    [key: string]: any;
  };
  secret: string;
}

export interface CashRegisterTipsByBank {
  bankId: string | null;
  bankName: string;
  card: number;
  transfer: number;
  totalBase: number;
}

export interface CashRegisterTipsSummary {
  cashNio: number;
  cashUsd: number;
  card: number;
  transfer: number;
  totalBase: number;
  byBank: CashRegisterTipsByBank[];
}

export interface CashRegisterStatusResponse {
  isOpen: boolean;
  shiftId: string | null;
  openedAt: string | null;
  cashierName: string | null;
  shift?: {
    id?: string;
    deviceId?: string | null;
    deviceName?: string | null;
    registerSource?: 'WEB' | 'DESKTOP' | 'MOBILE' | string;
    tipsSummary?: CashRegisterTipsSummary | null;
    [key: string]: any;
  } | null;
}

export interface PosOpenCashRegisterItem {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  registerSource?: 'WEB' | 'DESKTOP' | 'MOBILE';
  registerType?: 'WEB' | 'DESKTOP' | 'MOBILE';
  cashierId: string;
  cashierName: string | null;
  openedAt: string;
  openingCash: number;
  status: string;
  lastSeenAt?: string | null;
  hasPendingOfflineSales?: boolean;
  pendingOfflineSalesCount?: number;
}

export interface OpenCashRegisterDto {
  initialAmount?: number;
  openingCash?: number;
  notes?: string;
}

export interface PosCategory {
  id: string;
  name: string;
  sortOrder?: number;
  color?: string;
  icon?: string;
  _count?: {
    products: number;
  };
}

export interface PosProductItem {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number | null;
  unit?: string;
  baseUnitName?: string | null;
  barcode?: string | null;
  type?: 'PRODUCT' | 'SERVICE';
  isService?: boolean;
  isRecipe?: boolean;
  trackStock?: boolean;
  trackInventory?: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string };
  supplierId?: string | null;
  supplier?: { id: string; name: string };
  isActive?: boolean;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  wholesale_enabled?: boolean;
  wholesaleEnabled?: boolean;
  allowDiscount?: boolean;
  allow_discount?: boolean;
  promoDiscountPct?: number | null;
  promo_discount_pct?: number | null;
  listPrice?: number | null;
  markupPct?: number | null;
  taxable?: boolean;
  taxIncluded?: boolean;
  sendToKitchen?: boolean;
  laboratorio?: string;
  presentacion?: string;
  principio_activo?: string;
  attributes?: Record<string, any>;
  hasBatches?: boolean;
  tracksBatches?: boolean;
  batchesCount?: number;
  activeBatchCount?: number;
  nextExpiryDate?: string | null;
  nextExpiryBatchCode?: string | null;
  expiredQty?: number;
  hasBatchWithoutDate?: boolean;
  initialLotNumber?: string;
  initialExpiryDate?: string;
  isVariantParent?: boolean;
  parentProductId?: string | null;
  variantAxes?: string[];
  variantValues?: Record<string, string>;
  variants?: PosProductVariantSummary[];
  presentations?: PosProductPresentation[];
  components?: Array<{
    id?: string;
    productId: string;
    quantity: number;
    productName?: string;
    name?: string;
    unit?: string;
    currentStock?: number;
    price?: number;
    cost?: number | null;
  }>;
}

export interface PosRecipeComponentItem {
  id?: string;
  productId: string;
  name: string;
  unit: string;
  currentStock: number;
  quantity: number;
  price?: number;
  cost?: number | null;
}

export interface CreateSaleItemPayload {
  productId?: string;
  presentationId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  promoDiscount?: number;
  promotionName?: string | null;
  priceTier?: 'RETAIL' | 'WHOLESALE' | 'PROMO' | string;
  barcode?: string;
  listPrice?: number | null;
  listPriceDiscount?: number;
  manualDiscountShare?: number;
  taxable?: boolean;
  taxRate?: number;
  taxAmount?: number;
}

export interface CreateSalePaymentPayload {
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  amount: number;
  amountTendered?: number;
  reference?: string;
  currency?: string;
  exchangeRate?: number;
  bankId?: string;
  bankName?: string;
}

export interface CreditPlanPayload {
  mode?: 'SINGLE' | 'INSTALLMENTS';
  dueDate?: string;
  installmentsCount?: number;
  frequency?: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
  firstDueDate?: string;
  interestRate?: number;
  interestAmount?: number;
  prima?: number;
  approvalToken?: string;
}

export interface CustomerCreditSummary {
  customer: {
    id: string;
    name: string;
    phone: string;
    ruc?: string | null;
    creditLimit?: number | null;
  };
  summary: {
    totalDebt: number;
    overdueDebt: number;
    activeAccountsCount: number;
    paidAccountsCount: number;
    creditLimit?: number | null;
    availableCredit: number | null;
  };
  accounts: any[];
}

export interface PosCustomer {
  id: string;
  name: string;
  phone?: string | null;
  ruc?: string | null;
  creditLimit?: number | null;
  lastAddressText?: string | null;
  deliveryReference?: string | null;
}

export interface PosBankItem {
  id: string;
  name: string;
  code?: string;
  accountNumber?: string;
  isActive: boolean;
  order?: number;
}

export interface PosExchangeRateData {
  id?: string;
  businessId?: string;
  quote?: string;
  rate?: number;
  officialRate?: number;
  parallelRate?: number | null;
  updatedAt?: string;
  [key: string]: any;
}

export interface PosStaffOption {
  id: string;
  name: string;
  role: 'ENCARGADO' | 'SUPERADMIN' | 'CAJERO' | 'VENDEDOR' | string;
}

export const getPosStaffOptions = async (businessId?: string): Promise<PosStaffOption[]> => {
  const res = await apiClient.get<PosStaffOption[]>('/pos/users/staff-options', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export interface CreateSaleTipPayload {
  mode: 'PERCENT' | 'CUSTOM';
  percent?: number;
  amount?: number;
  currency?: 'NIO' | 'USD';
  exchangeRate?: number;
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  bankId?: string;
  reference?: string;
  waiterId?: string;
}

export interface PosTipData {
  id: string;
  saleId: string;
  cashRegisterId?: string | null;
  waiterId?: string | null;
  waiterName?: string | null;
  amount: number;
  currency: 'NIO' | 'USD' | string;
  exchangeRate?: number | null;
  amountBase: number;
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | string;
  bankId?: string | null;
  bankName?: string | null;
  reference?: string | null;
  status: 'ACTIVE' | 'VOIDED' | string;
  createdAt: string;
}

export interface CreateSalePayload {
  cashRegisterId?: string;
  clientGeneratedId?: string;
  channel?: string;
  deliveryFee?: number;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryReference?: string;
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  applyPromotions?: boolean;
  promoDiscountTotal?: number;
  items: CreateSaleItemPayload[];
  discountAmount?: number;
  discount?: number;
  subtotal?: number;
  total?: number;
  clientTotal?: number;
  subtotalBeforeTax?: number;
  taxModel?: 'PER_LINE' | 'LEGACY';
  taxAmount?: number;
  taxEnabled?: boolean;
  taxRate?: number;
  listPriceTotal?: number;
  listDiscountTotal?: number;
  clientListPriceTotal?: number;
  clientListDiscountTotal?: number;
  clientTaxRate?: number;
  clientTaxEnabled?: boolean;
  clientTaxIncluded?: boolean;
  clientTaxAmount?: number;
  paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'MIXTO';
  amountPaid?: number;
  reference?: string;
  bankId?: string;
  bankName?: string;
  payments?: CreateSalePaymentPayload[];
  tip?: CreateSaleTipPayload;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerRuc?: string;
  creditDueDate?: string;
  creditPlan?: CreditPlanPayload;
  approvalToken?: string;
  discountApprovalToken?: string;
  quoteId?: string;
  sellerId?: string;
  sellerName?: string;
  vehicleInfo?: string;
  notes?: string;
}

export interface SaleResponse {
  id: string;
  invoiceNumber: string;
  channel?: string;
  deliveryFee?: number | null;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  deliveryReference?: string | null;
  deliveryDriverId?: string | null;
  deliveryDriverName?: string | null;
  total: number;
  subtotal: number;
  subtotalBeforeTax?: number;
  taxModel?: string;
  listPriceTotal?: number;
  listDiscountTotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  amountPaid?: number;
  change?: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  sellerId?: string | null;
  sellerName?: string | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: any[];
  payments: any[];
  tip?: PosTipData | null;
  cashier?: {
    id: string;
    name: string;
  };
  business?: {
    name: string;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
    logoUrl?: string | null;
  };
}

export const getWebBillingStatus = async (businessId?: string): Promise<WebBillingStatusResponse> => {
  const res = await apiClient.get<WebBillingStatusResponse>('/pos/web-billing/status', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const registerWebDevice = async (
  dto: RegisterWebDeviceDto,
  headers?: Record<string, string>,
): Promise<RegisterWebDeviceResponse> => {
  const res = await apiClient.post<RegisterWebDeviceResponse>('/pos/web-devices/register', dto, {
    headers,
  });
  return res.data;
};

export const getCashRegisterStatus = async (
  businessId?: string,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string },
): Promise<CashRegisterStatusResponse> => {
  const res = await apiClient.get<CashRegisterStatusResponse>('/pos/cash-register/status', {
    params: businessId ? { businessId } : undefined,
    headers: deviceHeaders,
  });
  return res.data;
};

export const getOpenCashRegistersList = async (businessId?: string): Promise<PosOpenCashRegisterItem[]> => {
  const res = await apiClient.get<PosOpenCashRegisterItem[]>('/pos/cash-register/open-list', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const openCashRegister = async (
  dto: OpenCashRegisterDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
): Promise<any> => {
  const res = await apiClient.post('/pos/cash-register/open', dto, {
    headers: deviceHeaders,
  });
  return res.data;
};

export const getPosCategories = async (): Promise<PosCategory[]> => {
  const res = await apiClient.get<PosCategory[]>('/pos/categories');
  return res.data;
};

export const getPosProducts = async (params?: {
  categoryId?: string;
  search?: string;
  lowStock?: boolean;
  isActive?: boolean;
  expiry?: string;
  expiryMonth?: string;
  type?: string;
  sort?: string;
  groupVariants?: boolean;
}): Promise<PosProductItem[]> => {
  const res = await apiClient.get<PosProductItem[]>('/pos/products', {
    params: {
      categoryId: params?.categoryId || undefined,
      search: params?.search || undefined,
      lowStock: params?.lowStock !== undefined ? params.lowStock : undefined,
      isActive: params?.isActive !== undefined ? params.isActive : undefined,
      expiry: params?.expiry || undefined,
      expiryMonth: params?.expiryMonth || undefined,
      type: params?.type || undefined,
      sort: params?.sort || undefined,
      groupVariants: params?.groupVariants !== undefined ? params.groupVariants : undefined,
    },
  });
  return res.data;
};

export const createPosSale = async (
  payload: CreateSalePayload,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
): Promise<SaleResponse> => {
  const res = await apiClient.post<SaleResponse>('/pos/sales', payload, {
    headers: deviceHeaders,
  });
  return res.data;
};

export interface PosSalePreviewItemResult {
  productId?: string | null;
  productName: string;
  barcode?: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  promoDiscount: number;
  promotionId: string | null;
  promotionName: string | null;
  subtotal: number;
  priceTier: string;
  listPrice: number | null;
  listPriceDiscount: number;
  manualDiscountShare: number;
  taxable: boolean;
  taxRate: number;
  taxAmount: number;
  unit: string;
  presentationId: string | null;
  presentationName: string | null;
  conversionFactor: number;
  allowManualDiscount: boolean;
}

export interface PosSalePreviewResult {
  channel: string;
  applyPromotions: boolean;
  taxModel: 'PER_LINE' | 'LEGACY';
  subtotal: number;
  promoDiscountTotal: number;
  lineDiscountTotal: number;
  discountAmount: number;
  totalDiscount: number;
  eligibleForGlobalDiscountSubtotal: number;
  subtotalBeforeTax: number;
  deliveryFee: number;
  listPriceTotal: number;
  listDiscountTotal: number;
  taxEnabled: boolean;
  taxIncluded: boolean;
  taxRate: number;
  taxAmount: number;
  total: number;
  items: PosSalePreviewItemResult[];
}

export interface PreviewPosSalePayload {
  items: Array<{
    productId?: string;
    presentationId?: string;
    productName?: string;
    barcode?: string;
    unitPrice?: number;
    quantity: number;
    discount?: number;
    listPrice?: number;
    taxable?: boolean;
    priceTier?: string;
  }>;
  discountAmount?: number;
  channel?: string;
  deliveryFee?: number;
  applyPromotions?: boolean;
  isSplitSale?: boolean;
}

export const previewPosSale = async (
  payload: PreviewPosSalePayload,
  businessId?: string,
): Promise<PosSalePreviewResult> => {
  const res = await apiClient.post<PosSalePreviewResult>('/pos/sales/preview', payload, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getRecentPosSales = async (limit: number = 5): Promise<any[]> => {
  const res = await apiClient.get<any>('/pos/sales', {
    params: { limit },
  });
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

export interface WholesaleSettingsResponse {
  available: boolean;
  wholesale_enabled: boolean;
}

export interface UpdateWholesaleSettingsDto {
  wholesale_enabled?: boolean;
  wholesaleEnabled?: boolean;
  enabled?: boolean;
}

export const getPosWholesaleSettings = async (businessId?: string): Promise<WholesaleSettingsResponse> => {
  const res = await apiClient.get<WholesaleSettingsResponse>('/pos/settings/wholesale', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosWholesaleSettings = async (
  dto: UpdateWholesaleSettingsDto,
  businessId?: string,
): Promise<WholesaleSettingsResponse> => {
  const res = await apiClient.patch<WholesaleSettingsResponse>('/pos/settings/wholesale', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface DeliveryChannelConfig {
  enabled: boolean;
  defaultFee: number;
  taxable: boolean;
  requireDriver: boolean;
}

export interface PedidosYaChannelConfig {
  enabled: boolean;
  commissionPct: number;
  taxPct: number;
  priceMode: 'MANTENER_GANANCIA' | 'RECARGO' | 'MISMO_PRECIO';
  rounding: 'SIN_REDONDEO' | 'REDONDEO_0_50' | 'REDONDEO_1' | 'REDONDEO_5';
  capAtListPrice: boolean;
  requireOrderNumber: boolean;
}

export interface ChannelConfigResponse {
  delivery: DeliveryChannelConfig;
  pedidosYa: PedidosYaChannelConfig;
}

export interface UpdateChannelConfigDto {
  delivery?: {
    defaultFee?: number;
    taxable?: boolean | null;
    requireDriver?: boolean;
  };
  pedidosYa?: {
    commissionPct?: number;
    taxPct?: number;
    priceMode?: 'MANTENER_GANANCIA' | 'RECARGO' | 'MISMO_PRECIO';
    rounding?: 'SIN_REDONDEO' | 'REDONDEO_0_50' | 'REDONDEO_1' | 'REDONDEO_5';
    capAtListPrice?: boolean;
    requireOrderNumber?: boolean;
  };
  deliveryDefaultFee?: number;
  deliveryTaxable?: boolean | null;
  deliveryRequireDriver?: boolean;
  pedidosYaCommissionPct?: number;
  pedidosYaTaxPct?: number;
  pedidosYaPriceMode?: string;
  pedidosYaRounding?: string;
  pedidosYaCapAtListPrice?: boolean;
  pedidosYaRequireOrderNumber?: boolean;
}

export const getChannelConfig = async (businessId?: string): Promise<ChannelConfigResponse> => {
  const res = await apiClient.get<ChannelConfigResponse>('/pos/channels/config', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updateChannelConfig = async (
  dto: UpdateChannelConfigDto,
  businessId?: string,
): Promise<ChannelConfigResponse> => {
  const res = await apiClient.patch<ChannelConfigResponse>('/pos/channels/config', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface PosChannelDriver {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  isActive: boolean;
}

export const getPosChannelDrivers = async (businessId?: string): Promise<PosChannelDriver[]> => {
  const res = await apiClient.get<PosChannelDriver[]>('/pos/channels/drivers', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export interface DenominationItemDto {
  value: number;
  qty: number;
}

export interface CloseCashRegisterDto {
  closingCash?: number;
  closingCashUsd?: number;
  actualAmount?: number;
  amount?: number;
  counted?: {
    CASH?: number;
    CASH_USD?: number;
    CARD?: number;
    TRANSFER?: number;
    OTHER?: number;
    denominations?: DenominationItemDto[];
    countMode?: 'DENOMINATIONS' | 'TOTAL';
  };
  denominations?: DenominationItemDto[];
  countMode?: 'DENOMINATIONS' | 'TOTAL';
  notes?: string;
  reason?: string;
  discrepancyReason?: string;
  discrepancyNote?: string;
  authorizerPin?: string;
  authorizerEmail?: string;
  deviceId?: string;
}

export interface CashMovementDto {
  type: 'ENTRADA' | 'SALIDA' | 'IN' | 'OUT';
  amount: number;
  concept?: string;
  reason?: string;
  currency?: string;
}

export const closeCashRegister = async (
  dto: CloseCashRegisterDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
): Promise<any> => {
  const res = await apiClient.post('/pos/cash-register/close', dto, {
    headers: deviceHeaders,
  });
  return res.data;
};

export const closeCashRegisterById = async (
  id: string,
  dto: CloseCashRegisterDto,
  options?: {
    businessId?: string;
    deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string };
  },
): Promise<any> => {
  const res = await apiClient.post(`/pos/cash-register/${id}/close`, dto, {
    params: options?.businessId ? { businessId: options.businessId } : undefined,
    headers: options?.deviceHeaders,
  });
  return res.data;
};

export const forceCloseCashRegisterById = async (
  id: string,
  dto: CloseCashRegisterDto,
  options?: {
    businessId?: string;
    deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string };
  },
): Promise<any> => {
  const res = await apiClient.post(`/pos/cash-register/${id}/force-close`, dto, {
    params: options?.businessId ? { businessId: options.businessId } : undefined,
    headers: options?.deviceHeaders,
  });
  return res.data;
};

export const addCashMovement = async (
  dto: CashMovementDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
): Promise<any> => {
  const res = await apiClient.post('/pos/cash-register/movements', dto, {
    headers: deviceHeaders,
  });
  return res.data;
};

export const getCashRegisterSummary = async (
  shiftId: string,
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.get(`/pos/cash-register/${shiftId}/summary`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getCustomerCreditAccounts = async (
  customerId: string,
  businessId?: string,
): Promise<CustomerCreditSummary> => {
  const res = await apiClient.get<CustomerCreditSummary>(`/pos/customers/${customerId}/credit-accounts`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getPosExchangeRate = async (
  businessId?: string,
): Promise<PosExchangeRateData> => {
  const res = await apiClient.get<PosExchangeRateData>('/pos/exchange-rate', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getPosBanks = async (
  businessId?: string,
): Promise<PosBankItem[]> => {
  const res = await apiClient.get<PosBankItem[]>('/pos/banks', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const createPosApprovalToken = async (
  dto: { action: string; approverEmail: string; approverPassword: string; cashRegisterId?: string; entityType?: string; entityId?: string },
  businessId?: string,
): Promise<{ token: string }> => {
  const res = await apiClient.post<{ token: string }>('/pos/approvals', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const searchPosCustomers = async (
  q: string,
  businessId?: string,
): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/pos/customers/search', {
    params: { q, ...(businessId ? { businessId } : {}) },
  });
  return Array.isArray(res.data) ? res.data : [];
};

export interface CreatePosCustomerDto {
  name: string;
  phone?: string;
  ruc?: string;
  creditLimit?: number;
  address?: string;
  deliveryReference?: string;
  businessId?: string;
}

export const createPosCustomer = async (
  dto: CreatePosCustomerDto,
): Promise<PosCustomer> => {
  const res = await apiClient.post<PosCustomer>('/pos/customers', dto);
  return res.data;
};

export const createPosProduct = async (
  dto: any,
  headers?: { 'Idempotency-Key'?: string },
): Promise<PosProductItem> => {
  const res = await apiClient.post<PosProductItem>('/pos/products', dto, {
    headers,
  });
  return res.data;
};

export const updatePosProduct = async (
  id: string,
  dto: any,
  headers?: { 'Idempotency-Key'?: string },
): Promise<PosProductItem> => {
  const res = await apiClient.put<PosProductItem>(`/pos/products/${id}`, dto, {
    headers,
  });
  return res.data;
};

export const deletePosProduct = async (id: string): Promise<any> => {
  const res = await apiClient.delete<any>(`/pos/products/${id}`);
  return res.data;
};

export const getPosProductComponents = async (
  productId: string,
  businessId?: string,
): Promise<PosRecipeComponentItem[]> => {
  const res = await apiClient.get<PosRecipeComponentItem[]>(
    `/pos/products/${productId}/components`,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const setPosProductComponents = async (
  productId: string,
  components: Array<{ productId: string; quantity: number }>,
  businessId?: string,
): Promise<PosRecipeComponentItem[]> => {
  const res = await apiClient.put<PosRecipeComponentItem[]>(
    `/pos/products/${productId}/components`,
    { components },
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const adjustPosProductStock = async (
  id: string,
  dto: { quantity: number; type?: string; concept: string; cost?: number; reference?: string },
): Promise<any> => {
  const res = await apiClient.post<any>(`/pos/products/${id}/stock`, {
    ...dto,
    type: dto.type || 'AJUSTE',
  });
  return res.data;
};

export const createPosCategory = async (dto: { name: string; color?: string; icon?: string }): Promise<PosCategory> => {
  const res = await apiClient.post<PosCategory>('/pos/categories', dto);
  return res.data;
};

export const updatePosCategory = async (id: string, dto: { name?: string; color?: string; icon?: string }): Promise<PosCategory> => {
  const res = await apiClient.patch<PosCategory>(`/pos/categories/${id}`, dto);
  return res.data;
};

export const deletePosCategory = async (id: string): Promise<any> => {
  const res = await apiClient.delete<any>(`/pos/categories/${id}`);
  return res.data;
};

export const getPosProductFields = async (businessId?: string): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/pos/product-fields', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const getPosProductFieldOptions = async (
  fieldId: string,
  businessId?: string,
): Promise<any[]> => {
  const res = await apiClient.get<any[]>(`/pos/product-fields/${fieldId}/options`, {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export interface CreatePosProductFieldOptionDto {
  label: string;
  sortOrder?: number;
}

export const createPosProductFieldOption = async (
  fieldId: string,
  dto: CreatePosProductFieldOptionDto,
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.post<any>(`/pos/product-fields/${fieldId}/options`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface PosSupplier {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
    purchases: number;
  };
}

export interface CreatePosSupplierDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  notes?: string;
}

export interface UpdatePosSupplierDto {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export const getPosSuppliers = async (businessId?: string): Promise<PosSupplier[]> => {
  const res = await apiClient.get<PosSupplier[]>('/pos/suppliers', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const getPosSupplierById = async (id: string, businessId?: string): Promise<PosSupplier> => {
  const res = await apiClient.get<PosSupplier>(`/pos/suppliers/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const createPosSupplier = async (
  dto: CreatePosSupplierDto,
  businessId?: string,
): Promise<PosSupplier> => {
  const res = await apiClient.post<PosSupplier>('/pos/suppliers', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosSupplier = async (
  id: string,
  dto: UpdatePosSupplierDto,
  businessId?: string,
): Promise<PosSupplier> => {
  const res = await apiClient.patch<PosSupplier>(`/pos/suppliers/${id}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosSupplier = async (
  id: string,
  businessId?: string,
): Promise<PosSupplier> => {
  const res = await apiClient.delete<PosSupplier>(`/pos/suppliers/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface VoidPosSaleDto {
  reason: string;
  restock?: boolean;
  approvalToken?: string;
}

export const voidPosSale = async (
  saleId: string,
  dto: VoidPosSaleDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.post<any>(`/pos/sales/${saleId}/void`, dto, {
    headers: deviceHeaders,
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface ReturnPosSaleItemDto {
  saleItemId: string;
  qty: number;
}

export interface ReturnPosSaleDto {
  items: ReturnPosSaleItemDto[];
  reason: string;
  refundMethod: string;
  affectCashRegister?: boolean;
  approvalToken?: string;
}

export const returnPosSale = async (
  saleId: string,
  dto: ReturnPosSaleDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.post<any>(`/pos/sales/${saleId}/returns`, dto, {
    headers: deviceHeaders,
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface RegisterCreditPaymentDto {
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export const registerCreditPayment = async (
  accountId: string,
  dto: RegisterCreditPaymentDto,
  businessId?: string,
  headers?: { 'Idempotency-Key'?: string },
): Promise<{ payment: any; account: any }> => {
  const res = await apiClient.post<{ payment: any; account: any }>(
    `/pos/credit-accounts/${accountId}/payments`,
    dto,
    {
      params: businessId ? { businessId } : undefined,
      headers,
    }
  );
  return res.data;
};

export interface CreatePurchaseItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  updatePrice?: boolean;
  newPrice?: number;
}

export interface CreatePurchaseDto {
  supplierId?: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  notes?: string;
  force?: boolean;
  paymentCondition?: 'CONTADO' | 'CREDITO';
  dueDate?: string;
  downPayment?: number;
  downPaymentMethod?: string;
  deductFromCurrentShift?: boolean;
  items: CreatePurchaseItemDto[];
}

export interface PosPurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  product?: PosProductItem | null;
  quantity: number;
  unitCost: number;
  subtotal: number;
  lotNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  createdAt?: string;
}

export interface PosPurchasePayablePayment {
  id: string;
  payableAccountId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  notes?: string | null;
  isVoided: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
  paidBy?: { id: string; name: string } | null;
  paidByUser?: { id: string; name: string } | null;
}

export interface PosPurchasePayableAccount {
  id: string;
  businessId: string;
  purchaseId: string;
  supplierId: string;
  originalAmount: number;
  balance: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | string;
  dueDate: string;
  notes?: string | null;
  payments?: PosPurchasePayablePayment[];
}

export interface PosPurchase {
  id: string;
  businessId: string;
  supplierId?: string | null;
  supplier?: PosSupplier | null;
  invoiceNumber?: string | null;
  purchaseDate: string;
  notes?: string | null;
  status: 'RECEIVED' | 'VOIDED' | string;
  total: number;
  createdById: string;
  createdBy?: { id: string; name: string; email?: string } | null;
  voidedAt?: string | null;
  voidedById?: string | null;
  voidedBy?: { id: string; name: string; email?: string } | null;
  voidReason?: string | null;
  items: PosPurchaseItem[];
  payableAccount?: PosPurchasePayableAccount | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosPurchasesListResponse {
  data: PosPurchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetPosPurchasesParams {
  from?: string;
  to?: string;
  supplierId?: string;
  status?: 'RECEIVED' | 'VOIDED' | string;
  page?: number;
  limit?: number;
  businessId?: string;
}

export interface VoidPosPurchaseDto {
  reason: string;
}

export const createPosPurchase = async (
  dto: CreatePurchaseDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
  businessId?: string,
): Promise<PosPurchase> => {
  const res = await apiClient.post<PosPurchase>('/pos/purchases', dto, {
    headers: deviceHeaders,
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getPosPurchases = async (
  params?: GetPosPurchasesParams,
): Promise<PosPurchasesListResponse> => {
  const res = await apiClient.get<any>('/pos/purchases', { params });
  const raw = res.data;
  if (Array.isArray(raw)) {
    return {
      data: raw,
      pagination: { page: 1, limit: raw.length || 20, total: raw.length, totalPages: 1 },
    };
  }
  const items: PosPurchase[] = Array.isArray(raw?.data) ? raw.data : [];
  const p = raw?.pagination || {};
  const limit = Number(p.limit) || Number(params?.limit) || 20;
  const total = Number(p.total) ?? items.length;
  return {
    data: items,
    pagination: {
      page: Number(p.page) || Number(params?.page) || 1,
      limit,
      total,
      totalPages: Number(p.totalPages) || Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getPosPurchaseById = async (
  id: string,
  businessId?: string,
): Promise<PosPurchase> => {
  const res = await apiClient.get<PosPurchase>(`/pos/purchases/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const voidPosPurchase = async (
  id: string,
  dto: VoidPosPurchaseDto,
  headers?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
  businessId?: string,
): Promise<PosPurchase> => {
  const res = await apiClient.post<PosPurchase>(`/pos/purchases/${id}/void`, dto, {
    headers,
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface PosPoliciesData {
  businessId?: string;
  returnsEnabled?: boolean;
  returnsRequireApproval?: boolean;
  returnsMaxDays?: number;
  voidsCompletedEnabled?: boolean;
  voidsRequireApproval?: boolean;
  discountsEnabled?: boolean;
  cashierMaxDiscountPercent?: number;
  priceOverrideEnabled?: boolean;
  paymentMethodsEnabled?: string;
  requireReferenceCard?: boolean;
  requireReferenceTransfer?: boolean;
  requireReferenceOther?: boolean;
  requireBankCardTransfer?: boolean;
  multiCurrencyEnabled?: boolean;
  acceptedCurrencies?: string;
  blindCashClose?: boolean;
  cashDifferenceTolerance?: number;
  cashCloseDiscrepancyPolicy?: 'AUTORIZACION' | 'LIBRE';
  cashCloseTolerance?: number;
  cashCloseMaxRecounts?: number;
  noSaleDrawerOpenAllowed?: boolean;
  allowNegativeStock?: boolean;
  inventoryAdjustRequireApproval?: boolean;
  creditLimitOverrideRequiresApproval?: boolean;
  creditInterestEnabled?: boolean;
  creditInterestType?: string;
  creditInterestRate?: number;
  creditMaxInstallments?: number;
  creditAllowedFrequencies?: string;
  requireOpenShiftToSell?: boolean;
  tipEnabled?: boolean;
  tipDefaultPercent?: number;
  [key: string]: any;
}

export const getPosPolicies = async (businessId?: string): Promise<PosPoliciesData> => {
  const res = await apiClient.get<PosPoliciesData>('/pos/policies', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosPolicies = async (
  dto: Partial<PosPoliciesData>,
  businessId?: string,
): Promise<PosPoliciesData> => {
  const res = await apiClient.patch<PosPoliciesData>('/pos/policies', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const createPosBank = async (
  dto: { name: string; code?: string; order?: number; isActive?: boolean },
  businessId?: string,
): Promise<PosBankItem> => {
  const res = await apiClient.post<PosBankItem>('/pos/banks', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosBank = async (
  id: string,
  dto: { name?: string; code?: string; order?: number; isActive?: boolean },
  businessId?: string,
): Promise<PosBankItem> => {
  const res = await apiClient.patch<PosBankItem>(`/pos/banks/${id}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosBank = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.delete(`/pos/banks/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface PosSettingsData {
  id?: string;
  businessId?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  taxIncluded?: boolean;
  taxName?: string;
  invoicePrefix?: string;
  posAddress?: string;
  posPhone?: string;
  posFooter?: string;
  posVertical?: string;
  hasCarteraCobro?: boolean;
  wholesale_enabled?: boolean;
  channels?: {
    delivery?: {
      enabled?: boolean;
      defaultFee?: number;
      taxable?: boolean;
      requireDriver?: boolean;
    };
    pedidosYa?: {
      enabled?: boolean;
      [key: string]: any;
    };
  };
  [key: string]: any;
}

export const getPosSettings = async (businessId?: string): Promise<PosSettingsData> => {
  const res = await apiClient.get<PosSettingsData>('/pos/settings', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosSettings = async (
  dto: Partial<PosSettingsData>,
  businessId?: string,
): Promise<PosSettingsData> => {
  const res = await apiClient.put<PosSettingsData>('/pos/settings', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface PosReceiptSettingsData {
  id?: string;
  businessId?: string;
  logoImage?: string | null;
  showLogo?: boolean;
  headerLines?: string[];
  footerLines?: string[];
  showBusinessName?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTaxId?: boolean;
  showCashier?: boolean;
  showCustomer?: boolean;
  showCustomerAddress?: boolean;
  showTaxBreakdown?: boolean;
  showBatches?: boolean;
  showListPrice?: boolean;
  paperWidthMm?: number;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessTaxId?: string;
  [key: string]: any;
}

export const getPosReceiptSettings = async (businessId?: string): Promise<PosReceiptSettingsData> => {
  const res = await apiClient.get<PosReceiptSettingsData>('/pos/receipt-settings', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosReceiptSettings = async (
  dto: Partial<PosReceiptSettingsData>,
  businessId?: string,
): Promise<PosReceiptSettingsData> => {
  const res = await apiClient.put<PosReceiptSettingsData>('/pos/receipt-settings', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosExchangeRate = async (
  dto: { officialRate: number; parallelRate?: number },
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.put('/pos/exchange-rate', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getPosExchangeRateHistory = async (businessId?: string): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/pos/exchange-rate/history', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export interface PosUserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ENCARGADO' | 'SUPERADMIN' | 'CAJERO' | 'WAITER' | 'VENDEDOR';
  isActive: boolean;
  hasPin?: boolean;
  createdAt: string;
  [key: string]: any;
}

export const getPosUsers = async (businessId?: string): Promise<PosUserData[]> => {
  const res = await apiClient.get<PosUserData[]>('/pos/users', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const createPosUser = async (dto: any, businessId?: string): Promise<any> => {
  const res = await apiClient.post('/pos/users', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosUser = async (id: string, dto: any, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/users/${id}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const setPosUserPin = async (id: string, pin: string, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/users/${id}/pin`, { pin }, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const activatePosUser = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/users/${id}/activate`, {}, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deactivatePosUser = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/users/${id}/deactivate`, {}, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const resetPosUserPassword = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.post(`/pos/users/${id}/reset-password`, {}, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const createPosProductField = async (dto: any, businessId?: string): Promise<any> => {
  const res = await apiClient.post('/pos/product-fields', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosProductField = async (id: string, dto: any, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/product-fields/${id}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const activatePosProductField = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/product-fields/${id}/activate`, {}, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deactivatePosProductField = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.patch(`/pos/product-fields/${id}/deactivate`, {}, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosProductField = async (id: string, businessId?: string): Promise<any> => {
  const res = await apiClient.delete(`/pos/product-fields/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosProductFieldOption = async (
  fieldId: string,
  optionId: string,
  dto: { label?: string; isActive?: boolean; sortOrder?: number },
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.patch(`/pos/product-fields/${fieldId}/options/${optionId}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosProductFieldOption = async (
  fieldId: string,
  optionId: string,
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.delete(`/pos/product-fields/${fieldId}/options/${optionId}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

// ==========================================
// Comprobantes de Venta y Enlaces Digitales
// ==========================================

export interface UploadReceiptPdfResponse {
  token: string;
  url: string;
  expiresAt: string;
}

/**
 * Sube el comprobante de venta en PDF generado por el cliente al API y R2,
 * devolviendo la URL pública segura con vigencia de 90 días (/comprobante/:token).
 */
export const uploadPosReceiptPdf = async (
  saleId: string,
  file: Blob | File,
  businessId?: string,
): Promise<UploadReceiptPdfResponse> => {
  const formData = new FormData();
  formData.append('file', file, `Comprobante-${saleId.slice(0, 8)}.pdf`);

  const res = await apiClient.post<UploadReceiptPdfResponse>(
    `/pos/sales/${saleId}/receipt-pdf`,
    formData,
    {
      params: businessId ? { businessId } : undefined,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return res.data;
};

/**
 * Obtiene los datos del comprobante de venta e incrementa el contador de impresiones (printCount)
 * en el backend para registro y auditoría.
 */
export const getPosSaleReceipt = async (
  saleId: string,
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.get<any>(`/pos/sales/${saleId}/receipt`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

// ==========================================
// Lotes, Vencimientos y Ajustes de Inventario
// ==========================================

export type PosBatchStatus = 'VENCIDO' | 'CRITICO' | 'PROXIMO' | 'NORMAL';

export interface PosProductBatchItem {
  id: string;
  batchNumber: string;
  expiryDate: string | null;
  quantity: number;
  cost: number | null;
  status: PosBatchStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosProductBatchesResponse {
  product: {
    id: string;
    name: string;
    tracksBatches: boolean;
    stock: number;
  };
  batches: PosProductBatchItem[];
}

export interface UpdatePosBatchDto {
  batchNumber?: string;
  expiryDate?: string | null;
}

export const getPosProductBatches = async (
  productId: string,
  businessId?: string,
): Promise<PosProductBatchesResponse> => {
  const res = await apiClient.get<PosProductBatchesResponse>('/pos/inventory/batches', {
    params: {
      productId,
      ...(businessId ? { businessId } : {}),
    },
  });
  return res.data;
};

export const updatePosBatch = async (
  batchId: string,
  dto: UpdatePosBatchDto,
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.patch<any>(`/pos/inventory/batches/${batchId}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getPosExpiringBatches = async (
  days: number = 30,
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.get<any>('/pos/inventory/batches/expiring', {
    params: {
      days,
      ...(businessId ? { businessId } : {}),
    },
  });
  return res.data;
};

export type PosInventoryAdjustmentType =
  | 'CORRECTION'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'SHRINKAGE'
  | 'THEFT'
  | 'COUNT';

export interface CreatePosInventoryAdjustmentDto {
  productId: string;
  type: PosInventoryAdjustmentType;
  qtyDelta?: number;
  countedQty?: number;
  reason: string;
  notes?: string;
  approvalToken?: string;
  batchId?: string;
}

export const createPosInventoryAdjustment = async (
  dto: CreatePosInventoryAdjustmentDto,
  headers?: { 'Idempotency-Key'?: string },
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.post<any>('/pos/inventory/adjustments', dto, {
    params: businessId ? { businessId } : undefined,
    headers,
  });
  return res.data;
};

export const getPosInventoryAdjustments = async (params?: {
  productId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  businessId?: string;
}): Promise<any> => {
  const res = await apiClient.get<any>('/pos/inventory/adjustments', { params });
  return res.data;
};

export const getPosSaleById = async (
  saleId: string,
  businessId?: string,
): Promise<SaleResponse> => {
  const res = await apiClient.get<SaleResponse>(`/pos/sales/${saleId}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface PosTipsReportByMethodItem {
  paymentMethod: string;
  count: number;
  baseTotal: number;
}

export interface PosTipsReportByCurrencyItem {
  currency: string;
  count: number;
  amount: number;
  baseTotal: number;
}

export interface PosTipsReportByWaiterItem {
  waiterId: string | null;
  waiterName: string;
  count: number;
  baseTotal: number;
}

export interface PosTipsReportResponse {
  period: {
    from: string;
    to: string;
  };
  totals: {
    count: number;
    baseTotal: number;
    byMethod: PosTipsReportByMethodItem[];
    byCurrency: PosTipsReportByCurrencyItem[];
  };
  byWaiter: PosTipsReportByWaiterItem[];
}

export interface PosTipsReportParams {
  period?: string;
  from?: string;
  to?: string;
  waiterId?: string;
  paymentMethod?: string;
  cashRegisterId?: string;
  businessId?: string;
}

export const getPosTipsReport = async (
  params: PosTipsReportParams,
): Promise<PosTipsReportResponse> => {
  const res = await apiClient.get<PosTipsReportResponse>('/pos/reports/tips', { params });
  return res.data;
};

export interface PosWaiterData {
  id: string;
  businessId?: string;
  name: string;
  active?: boolean;
  openOrdersCount?: number;
  available?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getPosWaiters = async (businessId?: string): Promise<PosWaiterData[]> => {
  const res = await apiClient.get<PosWaiterData[]>('/pos/waiters', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export interface BatchTraceabilityFinancials {
  unitCost: number;
  unitPrice: number;
  initialInvestedCost: number;
  currentInvestedCost: number;
  currentSaleValue: number;
  soldRevenue: number;
  writtenOffUnits: number;
  writtenOffLossAmount: number;
  pendingExpiredUnits: number;
  pendingExpiredLossAmount: number;
  totalExpiredUnits: number;
  totalExpiredLossAmount: number;
  potentialRevenueLost: number;
}

export interface BatchProductInvestment {
  activeBatchCount: number;
  totalStock: number;
  sellableStock: number;
  expiredStock: number;
  totalInvestedCost: number;
  sellableInvestedCost: number;
  expiredInvestedCost: number;
  totalSaleValue: number;
}

export interface BatchTraceabilityData {
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string | null;
    currentQuantity: number;
    cost: number | null;
    effectiveCost?: number;
    status?: 'SIN_FECHA' | 'VENCIDO' | 'CRITICO' | 'PROXIMO' | 'NORMAL';
    isExpired?: boolean;
    daysToExpiry?: number | null;
    createdAt: string;
    product: {
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      unit: string;
      cost: number | null;
      price: number;
    };
    purchase: {
      id: string;
      invoiceNumber: string;
      purchaseDate: string;
      supplierName: string | null;
    } | null;
  };
  totals: {
    totalReceived: number;
    totalSold: number;
    totalReturned: number;
    totalExpired: number;
    totalAdjusted: number;
    currentBalance: number;
    sellableBalance?: number;
    expiredInStock?: number;
    totalExpiredWithPending?: number;
  };
  financials?: BatchTraceabilityFinancials;
  productInvestment?: BatchProductInvestment;
  sales: Array<{
    saleId: string;
    invoiceNumber: string;
    date: string;
    quantity: number;
    unitPrice: number;
    cashierName: string | null;
    status: string;
  }>;
  movements: Array<{
    id: string;
    date: string;
    type: string;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    concept: string;
    reference: string | null;
    userName: string | null;
  }>;
}

export interface ExpiredLossItem {
  id: string;
  date: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productUnit?: string;
  productStock?: number;
  batchId: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  daysExpired?: number;
  quantity: number;
  unitCost: number;
  unitPrice?: number;
  lossAmount: number;
  potentialRevenueLoss?: number;
  reason?: string;
  notes?: string;
  userName: string | null;
  source?: 'WRITE_OFF' | 'EXPIRED_IN_STOCK';
}

export interface ExpiredLossResponse {
  data: ExpiredLossItem[];
  pendingBatches?: ExpiredLossItem[];
  totals: {
    totalQuantityExpired: number;
    totalLossAmount: number;
    writtenOffQuantity?: number;
    writtenOffLossAmount?: number;
    writtenOffCount?: number;
    pendingQuantity?: number;
    pendingLossAmount?: number;
    pendingBatchesCount?: number;
    totalPotentialRevenueLoss?: number;
  };
}

export const getPosBatchTraceability = async (params: {
  batchId?: string;
  productId?: string;
  batchNumber?: string;
  businessId?: string;
}): Promise<BatchTraceabilityData> => {
  const res = await apiClient.get<BatchTraceabilityData>('/pos/reports/batch-traceability', {
    params,
  });
  return res.data;
};

export const getPosExpiredLossReport = async (params?: {
  from?: string;
  to?: string;
  businessId?: string;
}): Promise<ExpiredLossResponse> => {
  const res = await apiClient.get<ExpiredLossResponse>('/pos/reports/expired-loss', {
    params,
  });
  return res.data;
};

export const getPosSalesByBatch = async (params?: {
  from?: string;
  to?: string;
  productId?: string;
  page?: number;
  limit?: number;
  businessId?: string;
}): Promise<any> => {
  const res = await apiClient.get<any>('/pos/reports/sales-by-batch', {
    params,
  });
  return res.data;
};

export interface PosImportTarget {
  id: string;
  label: string;
  kind: 'core' | 'dynamic';
  dataType: string;
  required: boolean;
  options?: string[];
}

export interface PosProductImportAnalyzeResponse {
  sheets: string[];
  selectedSheet: string;
  headerRow: number;
  headers: string[];
  sampleRows: any[][];
  suggestedMapping: Record<string, { target: string }>;
  targets: PosImportTarget[];
}

export interface PosProductImportResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: Array<{ row: number; column?: string; message: string }>;
  warnings: Array<{ row: number; column?: string; message: string }>;
  ignoredColumns?: string[];
  totalRows: number;
}

export const downloadPosProductsImportTemplate = async (
  businessId?: string,
): Promise<Blob> => {
  const res = await apiClient.get<Blob>('/pos/products/import-template', {
    params: businessId ? { businessId } : undefined,
    responseType: 'blob',
  });
  return res.data;
};

export const analyzePosProductsImport = async (
  file: File | Blob,
  options?: {
    sheet?: string;
    headerRow?: number;
    businessId?: string;
  },
): Promise<PosProductImportAnalyzeResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.sheet) formData.append('sheet', options.sheet);
  if (options?.headerRow !== undefined) {
    formData.append('headerRow', String(options.headerRow));
  }

  const res = await apiClient.post<PosProductImportAnalyzeResponse>(
    '/pos/products/import/analyze',
    formData,
    {
      params: options?.businessId ? { businessId: options.businessId } : undefined,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    },
  );
  return res.data;
};

export const importPosProducts = async (params: {
  file: File | Blob;
  mapping: Record<string, { target: string }>;
  sheet: string;
  headerRow: number;
  dryRun: boolean;
  businessId?: string;
}): Promise<PosProductImportResult> => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('mapping', JSON.stringify(params.mapping));
  formData.append('sheet', params.sheet);
  formData.append('headerRow', String(params.headerRow));

  const res = await apiClient.post<PosProductImportResult>('/pos/products/import', formData, {
    params: {
      dryRun: String(params.dryRun),
      ...(params.businessId ? { businessId: params.businessId } : {}),
    },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
  return res.data;
};

// ============================================================
// Salón y mesas (Ticket 269b — solo zonas, estado y abrir orden)
// ============================================================

export type PosTableShape = 'ROUND' | 'SQUARE';
export type PosTableStatus = 'FREE' | 'OCCUPIED';
export type PosTableDisplayStatus = 'FREE' | 'OCCUPIED' | 'BILL_REQUESTED';
export type PosTableBillStatus = 'NONE' | 'REQUESTED';
export type PosTableBillRecordStatus = 'ACTIVE' | 'SUPERSEDED' | 'PAID' | 'CANCELLED';

export interface PosSalonZoneTablesCount {
  total: number;
  free: number;
  occupied: number;
  libres: number;
  ocupadas: number;
}

export interface PosSalonZone {
  id: string;
  businessId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  tablesCount?: PosSalonZoneTablesCount;
}

export interface PosTableWaiterSummary {
  id: string;
  name: string;
}

export interface PosTableCurrentOrder {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED' | string;
  openedAt: string;
  createdAt: string;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  vehicleInfo: string | null;
  assignedWaiterId: string | null;
  assignedWaiter: PosTableWaiterSummary | null;
  itemsCount: number;
  total: number;
  billStatus?: PosTableBillStatus;
  billRequestedAt?: string | null;
  billRequestedByName?: string | null;
  billVersion?: number;
}

export interface PosTableStatusItem {
  id: string;
  number: string;
  capacity: number;
  shape: PosTableShape;
  gridX: number | null;
  gridY: number | null;
  zoneId: string | null;
  zoneName: string;
  customerName: string | null;
  customerPhone: string | null;
  vehicleInfo: string | null;
  assignedWaiterId: string | null;
  assignedWaiter: PosTableWaiterSummary | null;
  status: PosTableStatus;
  displayStatus?: PosTableDisplayStatus;
  billStatus?: PosTableBillStatus;
  billRequestedAt?: string | null;
  billRequestedByName?: string | null;
  currentOrder: PosTableCurrentOrder | null;
}

export interface PosOpenedTableOrder {
  id: string;
  tableId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  assignedWaiterId?: string | null;
  assignedWaiter?: PosTableWaiterSummary | null;
  openedByWaiterId?: string | null;
  openedByWaiterName?: string | null;
  table?: {
    id: string;
    number: string;
    capacity: number;
    shape: PosTableShape;
    zoneId: string | null;
    zone?: { id: string; name: string } | null;
  } | null;
  subtotal?: number;
  total?: number;
  items?: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
  }>;
}

export const getPosSalonZones = async (businessId?: string): Promise<PosSalonZone[]> => {
  const res = await apiClient.get<PosSalonZone[]>('/pos/salon/zones', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const getPosTablesStatus = async (params?: {
  zoneId?: string;
  businessId?: string;
}): Promise<PosTableStatusItem[]> => {
  const res = await apiClient.get<PosTableStatusItem[]>('/pos/tables/status', {
    params,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const openPosTableOrder = async (
  tableId: string,
  businessId?: string,
): Promise<PosOpenedTableOrder> => {
  const res = await apiClient.post<PosOpenedTableOrder>(
    `/pos/tables/${tableId}/open-order`,
    undefined,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

// ============================================================
// Salón y mesas — Orden, cocina, división, cobro y configuración (269c, 269d, 269e)
// ============================================================

export type PosWebDeviceHeaders = {
  'X-Device-Id'?: string;
  'X-Device-Secret'?: string;
  'Idempotency-Key'?: string;
};

export interface PosTableOrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
  waiterId: string | null;
  waiterName: string | null;
  kitchenRoundId: string | null;
  sentAt: string | null;
  isSent: boolean;
  subAccountId: string | null;
  product?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    price: number;
    unit?: string;
    stock?: number;
    sendToKitchen?: boolean;
  } | null;
  createdAt: string;
}

export interface PosTableSubAccountItem {
  id?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal?: number;
  notes?: string | null;
  isSent?: boolean;
  kitchenRoundId?: string | null;
  subAccountId?: string | null;
  discount?: number;
}

export interface PosTableSubAccount {
  id: string;
  label: string;
  status: 'OPEN' | 'PAID';
  saleId: string | null;
  fixedAmount: number | null;
  tipMode: 'NONE' | 'PERCENT' | 'CUSTOM' | string | null;
  tipPercent: number | null;
  tipAmount: number | null;
  tipCurrency: 'NIO' | 'USD' | string | null;
  itemsCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdBy?: string | null;
  createdAt?: string;
  items: PosTableSubAccountItem[];
}

export interface PosTableOrder {
  id: string;
  businessId: string;
  tableId: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED' | string;
  notes: string | null;
  openedByWaiterId: string | null;
  openedByWaiterName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  vehicleInfo: string | null;
  workshopVehicleId?: string | null;
  customerId: string | null;
  mileage?: number | null;
  assignedWaiterId: string | null;
  assignedWaiter: PosTableWaiterSummary | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelledByUserName: string | null;
  cancellationReason: string | null;
  createdAt: string;
  closedAt: string | null;
  saleId: string | null;
  table: {
    id: string;
    number: string;
    capacity: number;
    shape: PosTableShape;
    zoneId: string | null;
    zoneName: string;
  } | null;
  itemsCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  discountTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
  splitVersion: number;
  splitMode: 'ITEMS' | 'EQUAL' | null;
  billStatus?: PosTableBillStatus;
  billRequestedAt?: string | null;
  billRequestedByName?: string | null;
  billVersion?: number;
  tipMode: 'NONE' | 'PERCENT' | 'CUSTOM' | string | null;
  tipPercent: number | null;
  tipAmount: number | null;
  tipCurrency: 'NIO' | 'USD' | string | null;
  tipPolicy?: {
    tipEnabled: boolean;
    tipDefaultPercent: number;
  };
  subAccounts: PosTableSubAccount[];
  items: PosTableOrderItem[];
}

export interface AddPosTableOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface AddPosTableOrderItemsDto {
  items: AddPosTableOrderItemInput[];
}

export interface UpdatePosTableOrderItemDto {
  quantity: number;
  notes?: string;
}

export interface VoidPosTableOrderItemDto {
  reason?: string;
  authorizerPin?: string;
  qty?: number;
}

export interface VoidPosTableOrderItemResponse {
  success: boolean;
  voided: {
    itemId: string;
    productName: string;
    quantity: number;
  };
  tableOrder: PosTableOrder;
}

export interface PosKitchenRoundItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  productId: string;
  voidReason?: string;
}

export interface PosKitchenRound {
  id: string;
  businessId: string;
  tableOrderId: string;
  tableId: string;
  number: number;
  type: 'SEND' | 'VOID' | string;
  status: string;
  printStatus: 'PENDING' | 'PRINTED' | 'FAILED' | 'NOT_REQUIRED' | string;
  printedAt?: string | null;
  createdBy: string;
  clientRequestId?: string | null;
  items: PosKitchenRoundItem[];
  reason?: string | null;
  authorizedBy?: string | null;
  createdAt: string;
}

export interface SendPosToKitchenDto {
  clientRequestId?: string;
  itemIds?: string[];
}

export interface SendPosToKitchenResponse {
  round: PosKitchenRound;
  tableOrder: PosTableOrder;
}

export interface SetPosTableOrderDiscountDto {
  discountPercent?: number;
  discountAmount?: number;
}

export interface CancelPosTableOrderDto {
  reason?: string;
}

export interface CancelPosTableOrderResponse {
  success: boolean;
  message: string;
  tableOrder: {
    id: string;
    tableId: string;
    status: string;
    cancelledAt: string | null;
    cancelledByUserId: string | null;
    cancelledByUserName: string | null;
    reason: string | null;
    cancellationReason: string | null;
  };
}

export interface PosKitchenSettingsResponse {
  mode: 'NONE' | 'PRINT' | string;
}

export interface StartPosTableSplitDto {
  mode: 'ITEMS' | 'EQUAL';
  parts?: number;
  discountPercent?: number;
  discountAmount?: number;
  splitVersion?: number;
}

export interface MovePosTableSplitItemDto {
  itemId: string;
  toSubAccountId: string;
  qty?: number;
  splitVersion?: number;
}

export interface AddPosTableSubAccountDto {
  label?: string;
  splitVersion?: number;
}

export interface MergePosTableSubAccountsDto {
  fromSubAccountId: string;
  toSubAccountId: string;
  splitVersion?: number;
}

export interface UndoPosTableSplitDto {
  splitVersion?: number;
}

export interface SetPosTableOrderTipDto {
  subAccountId?: string;
  mode: 'NONE' | 'PERCENT' | 'CUSTOM';
  percent?: number;
  amount?: number;
  currency?: 'NIO' | 'USD';
}

export interface CheckoutPosTableOrderDto {
  subAccountId?: string;
  paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'MIXTO';
  amountPaid?: number;
  discountAmount?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerRuc?: string;
  cashRegisterId?: string;
  notes?: string;
  reference?: string;
  paymentReference?: string;
  bankId?: string;
  bankName?: string;
  payments?: CreateSalePaymentPayload[];
  tip?: CreateSaleTipPayload;
}

export interface CheckoutPosTableOrderResponse {
  sale: SaleResponse;
  tableOrder: {
    id: string;
    tableId: string;
    status: string;
    closedAt: string | null;
    saleId: string | null;
  };
  allAccountsPaid: boolean;
  remainingOpenAccounts?: number;
}

export interface CreatePosSalonZoneDto {
  name: string;
}

export interface UpdatePosSalonZoneDto {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface PosTableConfigItem {
  id: string;
  businessId: string;
  zoneId: string | null;
  zoneName: string;
  number: string;
  capacity: number;
  shape: PosTableShape;
  gridX: number | null;
  gridY: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosTableDto {
  number: string;
  capacity: number;
  shape?: PosTableShape;
  gridX?: number;
  gridY?: number;
  zoneId?: string;
}

export interface UpdatePosTableDto {
  number?: string;
  capacity?: number;
  shape?: PosTableShape;
  gridX?: number;
  gridY?: number;
  isActive?: boolean;
  zoneId?: string;
}

export const getPosTableOrder = async (
  tableId: string,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.get<PosTableOrder>(`/pos/tables/${tableId}/order`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const addPosTableOrderItems = async (
  tableId: string,
  dto: AddPosTableOrderItemsDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/items`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const updatePosTableOrderItem = async (
  tableId: string,
  itemId: string,
  dto: UpdatePosTableOrderItemDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.patch<PosTableOrder>(
    `/pos/tables/${tableId}/order/items/${itemId}`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const deletePosTableOrderItem = async (
  tableId: string,
  itemId: string,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.delete<PosTableOrder>(
    `/pos/tables/${tableId}/order/items/${itemId}`,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const voidPosTableOrderItem = async (
  tableId: string,
  itemId: string,
  dto: VoidPosTableOrderItemDto,
  headers?: PosWebDeviceHeaders,
  businessId?: string,
): Promise<VoidPosTableOrderItemResponse> => {
  const res = await apiClient.post<VoidPosTableOrderItemResponse>(
    `/pos/tables/${tableId}/order/items/${itemId}/void`,
    dto,
    {
      headers,
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

export const sendPosTableOrderToKitchen = async (
  tableId: string,
  dto: SendPosToKitchenDto = {},
  businessId?: string,
): Promise<SendPosToKitchenResponse> => {
  const res = await apiClient.post<SendPosToKitchenResponse>(
    `/pos/tables/${tableId}/order/send-to-kitchen`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const getPosTableOrderRounds = async (
  tableId: string,
  businessId?: string,
): Promise<PosKitchenRound[]> => {
  const res = await apiClient.get<PosKitchenRound[]>(
    `/pos/tables/${tableId}/order/rounds`,
    { params: businessId ? { businessId } : undefined },
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const setPosTableOrderDiscount = async (
  tableId: string,
  dto: SetPosTableOrderDiscountDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/discount`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const cancelPosTableOrder = async (
  tableId: string,
  dto: CancelPosTableOrderDto = {},
  headers?: PosWebDeviceHeaders,
  businessId?: string,
): Promise<CancelPosTableOrderResponse> => {
  const res = await apiClient.post<CancelPosTableOrderResponse>(
    `/pos/tables/${tableId}/order/cancel`,
    dto,
    {
      headers,
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

export const getPosKitchenSettings = async (
  businessId?: string,
): Promise<PosKitchenSettingsResponse> => {
  const res = await apiClient.get<PosKitchenSettingsResponse>('/pos/settings/kitchen', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const startPosTableOrderSplit = async (
  tableId: string,
  dto: StartPosTableSplitDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/split/start`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const movePosTableSplitItem = async (
  tableId: string,
  dto: MovePosTableSplitItemDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/split/move`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const addPosTableSubAccount = async (
  tableId: string,
  dto: AddPosTableSubAccountDto = {},
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/split/add-account`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const mergePosTableSubAccounts = async (
  tableId: string,
  dto: MergePosTableSubAccountsDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/split/merge`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const undoPosTableOrderSplit = async (
  tableId: string,
  dto: UndoPosTableSplitDto = {},
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.post<PosTableOrder>(
    `/pos/tables/${tableId}/order/split/undo`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const setPosTableOrderTip = async (
  tableId: string,
  dto: SetPosTableOrderTipDto,
  businessId?: string,
): Promise<PosTableOrder> => {
  const res = await apiClient.patch<PosTableOrder>(
    `/pos/tables/${tableId}/order/tip`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const checkoutPosTableOrder = async (
  tableId: string,
  dto: CheckoutPosTableOrderDto,
  headers?: PosWebDeviceHeaders,
  businessId?: string,
): Promise<CheckoutPosTableOrderResponse> => {
  const res = await apiClient.post<CheckoutPosTableOrderResponse>(
    `/pos/tables/${tableId}/order/checkout`,
    dto,
    {
      headers,
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

export const createPosSalonZone = async (
  dto: CreatePosSalonZoneDto,
  businessId?: string,
): Promise<PosSalonZone> => {
  const res = await apiClient.post<PosSalonZone>('/pos/salon/zones', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosSalonZone = async (
  zoneId: string,
  dto: UpdatePosSalonZoneDto,
  businessId?: string,
): Promise<PosSalonZone> => {
  const res = await apiClient.patch<PosSalonZone>(`/pos/salon/zones/${zoneId}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const reorderPosSalonZones = async (
  ids: string[],
  businessId?: string,
): Promise<PosSalonZone[]> => {
  const res = await apiClient.patch<PosSalonZone[]>(
    '/pos/salon/zones/reorder',
    { ids },
    { params: businessId ? { businessId } : undefined },
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const deletePosSalonZone = async (
  zoneId: string,
  businessId?: string,
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.delete<{ success: boolean; message: string }>(
    `/pos/salon/zones/${zoneId}`,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const getPosTables = async (params?: {
  zoneId?: string;
  businessId?: string;
}): Promise<PosTableConfigItem[]> => {
  const res = await apiClient.get<PosTableConfigItem[]>('/pos/tables', {
    params,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const createPosTable = async (
  dto: CreatePosTableDto,
  businessId?: string,
): Promise<PosTableConfigItem> => {
  const res = await apiClient.post<PosTableConfigItem>('/pos/tables', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosTable = async (
  tableId: string,
  dto: UpdatePosTableDto,
  businessId?: string,
): Promise<PosTableConfigItem> => {
  const res = await apiClient.patch<PosTableConfigItem>(`/pos/tables/${tableId}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosTable = async (
  tableId: string,
  businessId?: string,
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.delete<{ success: boolean; message: string }>(
    `/pos/tables/${tableId}`,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

// ============================================================
// Salón y mesas — Pedir la cuenta / Cuenta pedida (Ticket 267d)
// ============================================================

export interface RequestTableBillTipDto {
  mode: 'NONE' | 'PERCENT' | 'CUSTOM';
  percent?: number;
  amount?: number;
  currency?: 'NIO' | 'USD';
}

export interface RequestTableBillDto {
  subAccountId?: string;
  tip?: RequestTableBillTipDto;
  clientRequestId?: string;
}

export interface PosTableBillSnapshotLine {
  id?: string | null;
  itemId?: string | null;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  manualDiscountShare?: number;
  taxable?: boolean;
  taxRate?: number;
  taxAmount?: number;
  notes?: string | null;
}

export interface PosTableBillSnapshotTip {
  mode: 'NONE' | 'PERCENT' | 'CUSTOM' | string;
  percent: number | null;
  amount: number;
  currency: string;
}

export interface PosTableBillSnapshot {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessTaxId: string | null;
  currency: string;
  tableId: string;
  tableNumber: string;
  tableLabel: string;
  zoneName: string;
  subAccountId: string | null;
  subAccountLabel: string | null;
  splitMode: 'ITEMS' | 'EQUAL' | null;
  waiterId: string | null;
  waiterName: string | null;
  customerName: string | null;
  requestedById: string | null;
  requestedByRole: string | null;
  requestedByName: string | null;
  requestedAt: string;
  lines: PosTableBillSnapshotLine[];
  items?: PosTableBillSnapshotLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  discountTotal: number;
  subtotalBeforeTax: number;
  taxEnabled: boolean;
  taxIncluded: boolean;
  taxRate: number;
  taxAmount: number;
  taxTotal: number;
  total: number;
  tipMode: string | null;
  tipPercent: number | null;
  tipAmount: number;
  tipCurrency: string | null;
  tip: PosTableBillSnapshotTip | null;
  totalWithTip: number;
  legend: string;
  disclaimer?: string;
  sequence: number;
  isReprint: boolean;
}

export interface PosTableBill {
  id: string;
  businessId: string;
  tableOrderId: string;
  tableId: string;
  subAccountId: string | null;
  sequence: number;
  status: PosTableBillRecordStatus;
  supersededReason: string | null;
  supersededAt: string | null;
  requestedById: string | null;
  requestedByRole: string | null;
  requestedByName: string | null;
  snapshot: PosTableBillSnapshot;
  clientRequestId: string | null;
  createdAt: string;
  isReprint: boolean;
}

export interface RequestTableBillResponse {
  bill: PosTableBill;
  isReprint: boolean;
  tableOrder: PosTableOrder;
  receiptSettings: PosReceiptSettingsData;
}

export interface CancelTableBillRequestDto {
  subAccountId?: string;
}

export interface CancelTableBillRequestResponse {
  success: boolean;
  tableOrder: PosTableOrder;
}

export const requestPosTableBill = async (
  tableId: string,
  dto: RequestTableBillDto = {},
  businessId?: string,
): Promise<RequestTableBillResponse> => {
  const res = await apiClient.post<RequestTableBillResponse>(
    `/pos/tables/${tableId}/order/request-bill`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const getPosTableOrderBills = async (
  tableId: string,
  params?: { orderId?: string; businessId?: string },
): Promise<PosTableBill[]> => {
  const res = await apiClient.get<PosTableBill[]>(`/pos/tables/${tableId}/order/bills`, {
    params,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const cancelPosTableBillRequest = async (
  tableId: string,
  dto: CancelTableBillRequestDto = {},
  businessId?: string,
): Promise<CancelTableBillRequestResponse> => {
  const res = await apiClient.post<CancelTableBillRequestResponse>(
    `/pos/tables/${tableId}/order/cancel-bill-request`,
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

// 277b - Dispositivos y App Móvil
export interface CreateMobilePairingCodeResponse {
  code: string;
  expiresAt: string;
}

export interface PairMobileDeviceDto {
  code: string;
  deviceId: string;
  deviceName?: string;
  platform?: string;
}

export interface PairMobileDeviceResponse {
  businessId: string;
  businessName: string;
  deviceSecret: string;
}

export interface PosDevice {
  id: string;
  businessId: string;
  deviceId: string;
  name?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  status: 'ACTIVE' | 'REVOKED';
  category: 'DESKTOP' | 'WEB' | 'MOBILE' | string;
  userId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  firstSeenAt: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt?: string;
  revokedAt?: string | null;
  archivedAt?: string | null;
}

export interface PosDevicesSummary {
  active: number;
  revoked: number;
  archived: number;
}

export const createMobilePairingCode = async (
  businessId?: string,
): Promise<CreateMobilePairingCodeResponse> => {
  const res = await apiClient.post<CreateMobilePairingCodeResponse>(
    '/pos/mobile-devices/pairing-codes',
    {},
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const pairMobileDevice = async (
  dto: PairMobileDeviceDto,
): Promise<PairMobileDeviceResponse> => {
  const res = await apiClient.post<PairMobileDeviceResponse>(
    '/pos/mobile-devices/pair',
    dto,
  );
  return res.data;
};

export const getPosDevices = async (
  businessId?: string,
  includeArchived?: boolean,
): Promise<PosDevice[]> => {
  const res = await apiClient.get<PosDevice[]>('/pos/devices', {
    params: {
      ...(businessId ? { businessId } : {}),
      ...(includeArchived ? { includeArchived: 'true' } : {}),
    },
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const revokePosDevice = async (
  deviceId: string,
  businessId?: string,
): Promise<PosDevice> => {
  const res = await apiClient.patch<PosDevice>(
    `/pos/devices/${deviceId}/revoke`,
    {},
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const archivePosDevice = async (
  deviceId: string,
): Promise<PosDevice> => {
  const res = await apiClient.patch<PosDevice>(`/pos/devices/${deviceId}/archive`);
  return res.data;
};

export const unarchivePosDevice = async (
  deviceId: string,
): Promise<PosDevice> => {
  const res = await apiClient.patch<PosDevice>(`/pos/devices/${deviceId}/unarchive`);
  return res.data;
};

export const archiveRevokedDevices = async (
  businessId: string,
): Promise<{ archived: number }> => {
  const res = await apiClient.post<{ archived: number }>(
    `/superadmin/businesses/${businessId}/devices/archive-revoked`
  );
  return res.data;
};

export const getBusinessDevicesSummary = async (
  businessId: string,
): Promise<PosDevicesSummary> => {
  const res = await apiClient.get<PosDevicesSummary>(
    `/superadmin/businesses/${businessId}/devices/summary`
  );
  return res.data;
};

// ==========================================
// UNIDADES DE MEDIDA (TICKET 294)
// ==========================================

export interface PosUnit {
  id: string;
  businessId?: string;
  code: string;
  name: string;
  allowsDecimals: boolean;
  isSystem?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePosUnitDto {
  code: string;
  name: string;
  allowsDecimals: boolean;
  sortOrder?: number;
}

export interface UpdatePosUnitDto {
  code?: string;
  name?: string;
  allowsDecimals?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export const getPosUnits = async (params?: {
  includeInactive?: boolean;
  businessId?: string;
}): Promise<PosUnit[]> => {
  const res = await apiClient.get<PosUnit[]>('/pos/units', {
    params: {
      includeInactive: params?.includeInactive ? true : undefined,
      businessId: params?.businessId || undefined,
    },
  });
  return res.data;
};

export const createPosUnit = async (
  dto: CreatePosUnitDto,
  businessId?: string,
): Promise<PosUnit> => {
  const res = await apiClient.post<PosUnit>('/pos/units', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosUnit = async (
  id: string,
  dto: UpdatePosUnitDto,
  businessId?: string,
): Promise<PosUnit> => {
  const res = await apiClient.patch<PosUnit>(`/pos/units/${id}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosUnit = async (
  id: string,
  businessId?: string,
): Promise<{ success: boolean; id: string }> => {
  const res = await apiClient.delete<{ success: boolean; id: string }>(`/pos/units/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

// ==========================================
// SUBIDA DE FOTO DE PRODUCTO (TICKET 294)
// ==========================================

export const uploadPosProductImage = async (
  file: Blob | File,
  businessId?: string,
): Promise<{ imageUrl: string }> => {
  const formData = new FormData();
  formData.append('file', file, 'product.jpg');
  const res = await apiClient.post<{ imageUrl: string }>('/pos/products/upload-image', formData, {
    params: businessId ? { businessId } : undefined,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// ==========================================
// PRESENTACIONES (TICKET 294)
// ==========================================

export interface PosProductPresentation {
  id: string;
  businessId?: string;
  productId: string;
  name: string;
  factor: number;
  price: number;
  listPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  barcode?: string | null;
  sku?: string | null;
  cost?: number | null;
  isDefaultPurchase?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  availableUnits?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePosPresentationDto {
  name: string;
  factor: number;
  price: number;
  listPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  barcode?: string | null;
  sku?: string | null;
  cost?: number | null;
  isDefaultPurchase?: boolean;
  sortOrder?: number;
}

export interface UpdatePosPresentationDto {
  name?: string;
  factor?: number;
  price?: number;
  listPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  barcode?: string | null;
  sku?: string | null;
  cost?: number | null;
  isDefaultPurchase?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export const getPosPresentations = async (
  productId: string,
  businessId?: string,
): Promise<PosProductPresentation[]> => {
  const res = await apiClient.get<PosProductPresentation[]>(`/pos/products/${productId}/presentations`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const createPosPresentation = async (
  productId: string,
  dto: CreatePosPresentationDto,
  businessId?: string,
): Promise<PosProductPresentation> => {
  const res = await apiClient.post<PosProductPresentation>(`/pos/products/${productId}/presentations`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosPresentation = async (
  productId: string,
  presentationId: string,
  dto: UpdatePosPresentationDto,
  businessId?: string,
): Promise<PosProductPresentation> => {
  const res = await apiClient.patch<PosProductPresentation>(
    `/pos/products/${productId}/presentations/${presentationId}`,
    dto,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

export const deletePosPresentation = async (
  productId: string,
  presentationId: string,
  businessId?: string,
): Promise<{ deleted: boolean; id: string }> => {
  const res = await apiClient.delete<{ deleted: boolean; id: string }>(
    `/pos/products/${productId}/presentations/${presentationId}`,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

// ==========================================
// VARIANTES (TICKET 294)
// ==========================================

export interface PosProductVariantSummary {
  id: string;
  name: string;
  variantValues: Record<string, string>;
  price: number;
  cost?: number | null;
  stock: number;
  barcode?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface PosProductVariantDetail extends PosProductVariantSummary {
  parentProductId: string | null;
  unit: string;
  minStock: number;
  maxStock?: number | null;
  taxable?: boolean;
  taxIncluded?: boolean;
  allowDiscount?: boolean;
  categoryId?: string | null;
  attributes?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeneratePosVariantsAxis {
  key: string;
  values: string[];
}

export interface GeneratePosVariantsDto {
  axes: GeneratePosVariantsAxis[];
}

export interface UpdatePosVariantDto {
  price?: number;
  cost?: number | null;
  barcode?: string | null;
  sku?: string | null;
  isActive?: boolean;
  imageUrl?: string | null;
}

export const getPosVariants = async (
  productId: string,
  businessId?: string,
): Promise<PosProductVariantDetail[]> => {
  const res = await apiClient.get<PosProductVariantDetail[]>(`/pos/products/${productId}/variants`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const generatePosVariants = async (
  productId: string,
  dto: GeneratePosVariantsDto,
  businessId?: string,
): Promise<{ parent: any; createdCount: number; totalCount: number; variants: PosProductVariantDetail[] }> => {
  const res = await apiClient.post<{ parent: any; createdCount: number; totalCount: number; variants: PosProductVariantDetail[] }>(
    `/pos/products/${productId}/variants/generate`,
    dto,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

export const updatePosVariant = async (
  productId: string,
  variantId: string,
  dto: UpdatePosVariantDto,
  businessId?: string,
): Promise<PosProductVariantDetail> => {
  const res = await apiClient.patch<PosProductVariantDetail>(
    `/pos/products/${productId}/variants/${variantId}`,
    dto,
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};

// ==========================================
// PROMOCIONES (TICKET 294)
// ==========================================

export type PromotionType = 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'BUY_N_PAY_M' | 'QTY_PRICE_TIER';
export type PromotionScope = 'PRODUCT' | 'CATEGORY';

export interface PosPromotion {
  id: string;
  businessId: string;
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  productIds?: string[];
  categoryIds?: string[];
  discountPct?: number | null;
  discountAmount?: number | null;
  buyQty?: number | null;
  payQty?: number | null;
  minQty?: number | null;
  tierUnitPrice?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  channels?: string[];
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePosPromotionDto {
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  productIds?: string[];
  categoryIds?: string[];
  discountPct?: number | null;
  discountAmount?: number | null;
  buyQty?: number | null;
  payQty?: number | null;
  minQty?: number | null;
  tierUnitPrice?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  channels?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface UpdatePosPromotionDto {
  name?: string;
  type?: PromotionType;
  scope?: PromotionScope;
  productIds?: string[];
  categoryIds?: string[];
  discountPct?: number | null;
  discountAmount?: number | null;
  buyQty?: number | null;
  payQty?: number | null;
  minQty?: number | null;
  tierUnitPrice?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  channels?: string[];
  priority?: number;
  isActive?: boolean;
}

export const getPosPromotions = async (params?: {
  activeNow?: boolean;
  channel?: string;
  includeInactive?: boolean;
  businessId?: string;
}): Promise<PosPromotion[]> => {
  const res = await apiClient.get<PosPromotion[]>('/pos/promotions', {
    params: {
      activeNow: params?.activeNow ? true : undefined,
      channel: params?.channel || undefined,
      includeInactive: params?.includeInactive !== undefined ? params.includeInactive : true,
      businessId: params?.businessId || undefined,
    },
  });
  return res.data;
};

export const getPosPromotion = async (
  id: string,
  businessId?: string,
): Promise<PosPromotion> => {
  const res = await apiClient.get<PosPromotion>(`/pos/promotions/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const createPosPromotion = async (
  dto: CreatePosPromotionDto,
  businessId?: string,
): Promise<PosPromotion> => {
  const res = await apiClient.post<PosPromotion>('/pos/promotions', dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const updatePosPromotion = async (
  id: string,
  dto: UpdatePosPromotionDto,
  businessId?: string,
): Promise<PosPromotion> => {
  const res = await apiClient.patch<PosPromotion>(`/pos/promotions/${id}`, dto, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const deletePosPromotion = async (
  id: string,
  businessId?: string,
): Promise<{ deleted: boolean; id: string }> => {
  const res = await apiClient.delete<{ deleted: boolean; id: string }>(`/pos/promotions/${id}`, {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TICKET 303a / 303c: CÓDIGOS DE BARRAS EAN-13 INTERNOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PosNextBarcodeResponse {
  barcode: string;
  sequenceNumber: number;
}

export interface PosGenerateMissingBarcodesDto {
  dryRun?: boolean;
  limit?: number;
}

export interface PosGenerateMissingBarcodesResponse {
  dryRun: boolean;
  eligible: number;
  wouldGenerate?: number;
  generated: number;
  skipped: number;
  remaining: number;
  maxPerCall: number;
  errors: Array<{ productId: string; name: string; code: string; message: string }>;
}

export const generateNextPosBarcode = async (
  businessId?: string,
): Promise<PosNextBarcodeResponse> => {
  const res = await apiClient.post<PosNextBarcodeResponse>(
    '/pos/products/barcodes/next',
    {},
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const generateMissingPosBarcodes = async (
  dto: PosGenerateMissingBarcodesDto = { dryRun: true },
  businessId?: string,
): Promise<PosGenerateMissingBarcodesResponse> => {
  const res = await apiClient.post<PosGenerateMissingBarcodesResponse>(
    '/pos/products/barcodes/generate-missing',
    dto,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};

export const findPosProductByBarcode = async (
  barcode: string,
  businessId?: string,
): Promise<PosProductItem> => {
  const res = await apiClient.get<PosProductItem>(
    `/pos/products/barcode/${encodeURIComponent(barcode.trim())}`,
    { params: businessId ? { businessId } : undefined },
  );
  return res.data;
};











