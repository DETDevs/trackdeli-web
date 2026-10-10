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
  price: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number | null;
  unit?: string;
  barcode?: string | null;
  type?: 'PRODUCT' | 'SERVICE';
  isRecipe?: boolean;
  trackInventory?: boolean;
  categoryId?: string | null;
  isActive?: boolean;
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
}

export interface CreateSalePaymentPayload {
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  amount: number;
  amountTendered?: number;
  reference?: string;
  currency?: string;
}

export interface CreateSalePayload {
  cashRegisterId?: string;
  items: CreateSaleItemPayload[];
  discountAmount?: number;
  discount?: number;
  subtotal?: number;
  total?: number;
  clientTotal?: number;
  paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  amountPaid?: number;
  reference?: string;
  payments?: CreateSalePaymentPayload[];
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

export interface SaleResponse {
  id: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  discountAmount?: number;
  amountPaid?: number;
  change?: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: any[];
  payments: any[];
  business?: {
    name: string;
    phone?: string | null;
    address?: string | null;
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
}): Promise<PosProductItem[]> => {
  const res = await apiClient.get<PosProductItem[]>('/pos/products', {
    params: {
      categoryId: params?.categoryId || undefined,
      search: params?.search || undefined,
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
