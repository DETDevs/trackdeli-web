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
export type PosTableDisplayStatus = 'FREE' | 'OCCUPIED' | 'BILL_REQUESTED';
export type PosTableBillStatus = 'NONE' | 'REQUESTED';
export type PosTableBillRecordStatus = 'ACTIVE' | 'SUPERSEDED' | 'PAID' | 'CANCELLED';

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
  displayStatus?: PosTableDisplayStatus;
  billStatus?: PosTableBillStatus;
  billRequestedAt?: string | null;
  billRequestedByName?: string | null;
  vehicleInfo?: string | null;
  workshopVehicleId?: string | null;
  activeOrder: {
    id: string;
    openedAt: string;
    customerName?: string | null;
    itemCount: number;
    total: number;
    billStatus?: PosTableBillStatus;
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
  billStatus?: PosTableBillStatus;
  billRequestedAt?: string | null;
  tipMode?: string | null;
  tipPercent?: number | null;
  tipAmount?: number | null;
  tipCurrency?: string | null;
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
  billStatus?: PosTableBillStatus;
  billRequestedAt?: string | null;
  billRequestedByName?: string | null;
  billVersion?: number;
  tipMode?: 'NONE' | 'PERCENT' | 'CUSTOM' | string | null;
  tipPercent?: number | null;
  tipAmount?: number | null;
  tipCurrency?: string | null;
  tipPolicy?: {
    tipEnabled: boolean;
    tipDefaultPercent: number;
    tipPresets?: number[];
  };
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

// ============================================================
// Tipos de cuenta / pre-cuenta y propina (Ticket 267c)
// ============================================================

export interface RequestTableBillTipDto {
  mode: 'NONE' | 'PERCENT' | 'CUSTOM';
  percent?: number;
  amount?: number;
  currency?: 'NIO' | 'USD';
}

export interface RequestTableBillPayload {
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

export interface ReceiptSettings {
  businessName?: string;
  taxId?: string | null;
  phone?: string | null;
  address?: string | null;
  receiptFooter?: string | null;
  paperWidth?: '58mm' | '80mm';
}

export interface RequestTableBillResponse {
  bill: PosTableBill;
  isReprint: boolean;
  tableOrder: ActiveTableOrder;
  receiptSettings: ReceiptSettings;
}

export interface CancelTableBillRequestPayload {
  subAccountId?: string;
}

export interface CancelTableBillRequestResponse {
  success: boolean;
  tableOrder: ActiveTableOrder;
}

export interface SetOrderTipPayload {
  subAccountId?: string;
  mode: 'NONE' | 'PERCENT' | 'CUSTOM';
  percent?: number;
  amount?: number;
  currency?: 'NIO' | 'USD';
}


