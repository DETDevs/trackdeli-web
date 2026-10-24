/**
 * Tipos para el módulo Finanzas (Cuentas por Pagar, Gastos, Estado de Resultados, Por Cobrar)
 * Ticket 183c
 */

// ==========================================
// Cuentas por Pagar (Payables)
// ==========================================

export type PayableStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface PayableSupplier {
  id: string;
  name: string;
  phone?: string | null;
  taxId?: string | null;
  email?: string | null;
}

export interface PayableItem {
  id: string;
  purchaseId: string;
  supplier: PayableSupplier;
  invoiceNumber?: string | null;
  purchaseDate: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  status: PayableStatus;
  isOverdue: boolean;
  daysToDue: number;
  notes?: string | null;
  createdAt: string;
}

export interface PayablePayment {
  id: string;
  payableId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  notes?: string | null;
  paidBy?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  isVoided: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedBy?: {
    id: string;
    name: string;
  } | null;
  hasCashMovement: boolean;
  createdAt: string;
}

export interface PayablePurchaseItem {
  id: string;
  productName: string;
  quantity: number;
  cost: number;
  subtotal: number;
}

export interface PayableDetail extends PayableItem {
  purchase?: {
    id: string;
    invoiceNumber?: string | null;
    purchaseDate: string;
    total: number;
    items?: PayablePurchaseItem[];
  } | null;
  payments: PayablePayment[];
}

export interface PayablesSummary {
  totalPayable: number;
  totalOverdue: number;
  dueNext7Days: number;
  suppliersWithDebt: number;
}

export interface PayablesListResponse {
  items: PayableItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PayablesQueryParams {
  status?: string;
  supplierId?: string;
  onlyOverdue?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePayablePaymentDto {
  amount: number;
  paymentMethod: string;
  notes?: string;
  deductFromCurrentShift?: boolean;
}

export interface VoidPayablePaymentDto {
  reason: string;
}

// ==========================================
// Gastos (Expenses)
// ==========================================

export interface ExpenseCategory {
  id: string;
  businessId?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface ExpenseItem {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    color?: string | null;
  };
  amount: number;
  description: string;
  expenseDate: string;
  paymentMethod: string;
  receiptNumber?: string | null;
  hasCashMovement: boolean;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  isVoided: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface ExpensesResponse {
  items: ExpenseItem[];
  total: number;
  totalAmount: number;
  page: number;
  pageSize: number;
}

export interface ExpensesQueryParams {
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethod?: string;
  includeVoided?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateExpenseDto {
  categoryId: string;
  amount: number;
  description: string;
  expenseDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  deductFromCurrentShift?: boolean;
}

export interface VoidExpenseDto {
  reason: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

// ==========================================
// Estado de Resultados (Income Statement)
// ==========================================

export interface IncomeStatementExpenseCategory {
  categoryId: string;
  category: string;
  amount: number;
  percent: number;
}

export interface IncomeStatementResponse {
  period: {
    from: string;
    to: string;
  };
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  coveredRevenue?: number;
  uncoveredRevenue?: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: {
    total: number;
    byCategory: IncomeStatementExpenseCategory[];
  };
  operatingProfit: number;
  operatingMarginPercent: number;
  interestIncome?: number;
  netProfit?: number;
  isPartial: boolean;
  coverage: {
    coveragePercent: number;
    missingCostCount: number;
  };
  comparison: {
    previousPeriod: {
      from: string;
      to: string;
    };
    netSalesChange: number;
    grossProfitChange: number;
    operatingProfitChange: number;
    interestIncomeChange?: number | null;
    netProfitChange?: number | null;
  };
}

export interface IncomeStatementQueryParams {
  period?: 'today' | 'week' | 'month' | 'year' | 'custom';
  from?: string;
  to?: string;
}

// ==========================================
// Por Cobrar (Receivables, Cuotas y Planes de Pago)
// Ticket 189c
// ==========================================

export type CreditInstallmentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface CreditInstallmentItem {
  id: string;
  creditAccountId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: CreditInstallmentStatus;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreditAccountItem {
  id: string;
  invoiceNumber?: string | null;
  originalAmount: number;
  balance: number;
  dueDate: string;
  isOverdue?: boolean;
  status: string;
  installments: CreditInstallmentItem[];
  daysOverdue?: number;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    ruc?: string | null;
  };
}

export interface CreditCustomerBreakdown {
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    ruc?: string | null;
    creditLimit?: number | null;
  };
  totalDebt: number;
  overdueDebt: number;
  currentDebt: number;
  accountsCount: number;
  hasOverdue: boolean;
  daysOverdue: number;
  accounts: CreditAccountItem[];
}

export interface CreditPortfolioSummary {
  totalPortfolio: number;
  overduePortfolio: number;
  currentPortfolio: number;
  unpaidAccountsCount: number;
  customersCount?: number;
  breakdownByCustomer?: CreditCustomerBreakdown[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface CreditAccountDetailPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  receivedAt: string;
  notes?: string | null;
  interestPortion: number;
  principalPortion: number;
  receivedByUser?: {
    id: string;
    name: string;
  } | null;
}

export interface CreditAccountDetail {
  id: string;
  businessId: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    ruc?: string | null;
  };
  sale?: {
    id: string;
    invoiceNumber?: string | null;
    total: number;
    createdAt: string;
  } | null;
  originalAmount: number;
  balance: number;
  dueDate: string;
  status: string;
  interestType?: 'FLAT' | 'MONTHLY' | string | null;
  interestRate?: number | null;
  interestAmount?: number;
  principalAmount?: number | null;
  downPaymentAmount?: number;
  installmentsCount?: number;
  frequency?: string | null;
  finalDueDate?: string | null;
  installments: CreditInstallmentItem[];
  payments: CreditAccountDetailPayment[];
  desglose: {
    totalProductos: number;
    prima: number;
    fiado: number;
    interestType?: string | null;
    interestRate: number;
    interestAmount: number;
    totalAPagar: number;
    balance: number;
  };
}

export interface PosCreditPolicies {
  creditInterestEnabled: boolean;
  creditInterestType: 'FLAT' | 'MONTHLY' | string;
  creditInterestRate: number;
  creditMaxInstallments: number;
  creditAllowedFrequencies: string;
}
