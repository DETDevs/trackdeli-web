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
  id?: string;
  businessId?: string;
  quote?: string;
  rate?: number;
  officialRate?: number;
  parallelRate?: number | null;
  updatedAt?: string;
  [key: string]: any;
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
  wholesale_enabled?: boolean;
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





