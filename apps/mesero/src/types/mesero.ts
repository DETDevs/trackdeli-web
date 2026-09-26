export interface WaiterPublicInfo {
  id: string;
  name: string;
}

export interface BusinessPublicInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export interface WaiterAuthData {
  accessToken: string;
  refreshToken: string;
  waiter: {
    id: string;
    name: string;
    businessId: string;
    role: string;
  };
  business?: BusinessPublicInfo;
}

export type TableShape = 'SQUARE' | 'ROUND' | 'RECTANGLE';

export interface TableStatusSummary {
  id: string;
  number: number | string;
  capacity: number;
  shape: TableShape;
  gridX?: number;
  gridY?: number;
  isOccupied: boolean;
  status: 'FREE' | 'OCCUPIED';
  activeOrder: {
    id: string;
    openedAt: string;
    customerName?: string | null;
    itemCount: number;
    total: number;
  } | null;
}

export interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface TableOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  waiterName?: string | null;
  waiterId?: string | null;
  createdAt: string;
}

export interface ActiveTableOrder {
  id: string;
  tableId: string;
  status: string;
  total: number;
  openedAt: string;
  openedByWaiterName?: string | null;
  customerName?: string | null;
  items: TableOrderItem[];
}

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  notes: string;
}

export interface AddOrderItemsPayload {
  items: {
    productId: string;
    quantity: number;
    notes?: string;
  }[];
}
