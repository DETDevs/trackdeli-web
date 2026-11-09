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

export interface CashRegisterStatusResponse {
  isOpen: boolean;
  shiftId: string | null;
  openedAt: string | null;
  cashierName: string | null;
  shift?: any;
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
  listPrice?: number | null;
  markupPct?: number | null;
  taxable?: boolean;
  laboratorio?: string;
  presentacion?: string;
  principio_activo?: string;
  attributes?: Record<string, any>;
  hasBatches?: boolean;
  tracksBatches?: boolean;
  batchesCount?: number;
  components?: Array<{
    productId: string;
    quantity: number;
    productName?: string;
  }>;
}

export interface CreateSaleItemPayload {
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
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
  id: string;
  businessId: string;
  quote: string;
  rate: number;
  updatedAt: string;
}

export interface CreateSalePayload {
  cashRegisterId?: string;
  clientGeneratedId?: string;
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
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerRuc?: string;
  creditDueDate?: string;
  creditPlan?: CreditPlanPayload;
  approvalToken?: string;
  notes?: string;
}

export interface SaleResponse {
  id: string;
  invoiceNumber: string;
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
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: any[];
  payments: any[];
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

export const getCashRegisterStatus = async (businessId?: string): Promise<CashRegisterStatusResponse> => {
  const res = await apiClient.get<CashRegisterStatusResponse>('/pos/cash-register/status', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const openCashRegister = async (
  dto: OpenCashRegisterDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string },
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
  sort?: string;
}): Promise<PosProductItem[]> => {
  const res = await apiClient.get<PosProductItem[]>('/pos/products', {
    params: {
      categoryId: params?.categoryId || undefined,
      search: params?.search || undefined,
      lowStock: params?.lowStock !== undefined ? params.lowStock : undefined,
      isActive: params?.isActive !== undefined ? params.isActive : undefined,
      sort: params?.sort || undefined,
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

export const createPosCustomer = async (
  dto: { name: string; phone?: string; ruc?: string; creditLimit?: number; businessId?: string },
): Promise<any> => {
  const res = await apiClient.post<any>('/pos/customers', dto);
  return res.data;
};

export const createPosProduct = async (dto: any): Promise<PosProductItem> => {
  const res = await apiClient.post<PosProductItem>('/pos/products', dto);
  return res.data;
};

export const updatePosProduct = async (id: string, dto: any): Promise<PosProductItem> => {
  const res = await apiClient.put<PosProductItem>(`/pos/products/${id}`, dto);
  return res.data;
};

export const deletePosProduct = async (id: string): Promise<any> => {
  const res = await apiClient.delete<any>(`/pos/products/${id}`);
  return res.data;
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

export const getPosSuppliers = async (businessId?: string): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/pos/suppliers', {
    params: businessId ? { businessId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
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
): Promise<{ payment: any; account: any }> => {
  const res = await apiClient.post<{ payment: any; account: any }>(
    `/pos/credit-accounts/${accountId}/payments`,
    dto,
    {
      params: businessId ? { businessId } : undefined,
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
  paymentCondition?: 'CONTADO' | 'CREDITO';
  dueDate?: string;
  downPayment?: number;
  downPaymentMethod?: string;
  deductFromCurrentShift?: boolean;
  items: CreatePurchaseItemDto[];
}

export const createPosPurchase = async (
  dto: CreatePurchaseDto,
  deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string },
  businessId?: string,
): Promise<any> => {
  const res = await apiClient.post<any>('/pos/purchases', dto, {
    headers: deviceHeaders,
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};

export const getPosPurchases = async (
  params?: {
    from?: string;
    to?: string;
    supplierId?: string;
    status?: string;
    page?: number;
    limit?: number;
    businessId?: string;
  }
): Promise<any> => {
  const res = await apiClient.get<any>('/pos/purchases', { params });
  return res.data;
};





