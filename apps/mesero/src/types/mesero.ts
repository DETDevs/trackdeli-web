export interface WaiterPublicInfo {
  id: string;
  name: string;
}

export interface BusinessPublicInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  salonProfile?: string | null;
  kitchenMode?: string | null;
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

export interface TableZone {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface TableStatusSummary {
  id: string;
  number: number | string;
  name?: string;
  capacity: number;
  shape: TableShape;
  gridX?: number;
  gridY?: number;
  zoneId?: string | null;
  zoneName?: string | null;
  isOccupied: boolean;
  status: 'FREE' | 'OCCUPIED';
  vehicleInfo?: string | null;
  workshopVehicleId?: string | null;
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
  subtotal?: number;
  subAccountId?: string | null;
  notes?: string | null;
  waiterName?: string | null;
  waiterId?: string | null;
  kitchenRoundId?: string | null;
  sentAt?: string | null;
  isSent?: boolean;
  product?: {
    id: string;
    name?: string;
    price?: number;
    sendToKitchen?: boolean;
    stock?: number;
    unit?: string;
  } | null;
  createdAt: string;
}

export interface OrderSubAccount {
  id: string;
  label: string;
  status: 'OPEN' | 'PAID' | string;
  saleId?: string | null;
  fixedAmount?: number | null;
  itemsCount?: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  createdBy?: string;
  createdAt?: string;
  items?: TableOrderItem[];
}

export interface ActiveTableOrder {
  id: string;
  tableId: string;
  status: string;
  total: number;
  subtotal?: number;
  openedAt: string;
  openedByWaiterName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleInfo?: string | null;
  workshopVehicleId?: string | null;
  items: TableOrderItem[];
  splitMode?: 'ITEMS' | 'EQUAL' | null;
  splitVersion?: number;
  subAccounts?: OrderSubAccount[];
  discountPercent?: number;
  discountAmount?: number;
  discountTotal?: number;
  taxRate?: number;
  taxTotal?: number;
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

export interface KitchenRoundItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string | null;
  productId: string;
  voidReason?: string | null;
}

export interface KitchenRound {
  id: string;
  businessId: string;
  tableOrderId: string;
  tableId: string;
  number: number;
  roundNumber?: number;
  type: 'SEND' | 'VOID';
  status: string;
  printStatus: 'PENDING' | 'PRINTED' | 'FAILED' | 'NOT_REQUIRED';
  printAttempts?: number;
  printedAt?: string | null;
  claimedBy?: string | null;
  claimedAt?: string | null;
  createdBy?: string;
  createdAt: string;
  clientRequestId?: string | null;
  items: KitchenRoundItem[];
  reason?: string | null;
  authorizedBy?: string | null;
}

export interface SendToKitchenPayload {
  clientRequestId: string;
  itemIds?: string[];
}

export interface VoidOrderItemPayload {
  reason: string;
  authorizerPin?: string;
  qty?: number;
}

export type SplitMode = 'ITEMS' | 'EQUAL';

export interface StartSplitPayload {
  mode: SplitMode;
  parts?: number;
  discountPercent?: number;
  discountAmount?: number;
  splitVersion?: number;
}

export interface MoveSplitItemPayload {
  itemId: string;
  toSubAccountId: string;
  qty?: number;
  splitVersion?: number;
}

export interface AddSubAccountPayload {
  label?: string;
  splitVersion?: number;
}

export interface MergeSubAccountsPayload {
  fromSubAccountId: string;
  toSubAccountId: string;
  splitVersion?: number;
}

export interface UndoSplitPayload {
  splitVersion?: number;
}

