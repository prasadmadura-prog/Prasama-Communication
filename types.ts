
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  categoryId: string;
  vendorId?: string;
  lowStockThreshold: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  totalBalance: number; // Outstanding amount owed to this supplier
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalCredit: number;
  creditLimit: number;
}

export type POStatus = 'DRAFT' | 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  productId: string;
  quantity: number;
  cost: number;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  receivedDate?: string;
  vendorId: string;
  items: PurchaseOrderItem[];
  status: POStatus;
  totalAmount: number;
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT' | 'CHEQUE';
  accountId?: string; // Target bank/cash account ID
  chequeNumber?: string;
  chequeDate?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'CREDIT_PAYMENT' | 'TRANSFER';
  amount: number;
  discount?: number;
  items?: { productId: string; quantity: number; price: number }[];
  description: string;
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT' | 'CHEQUE';
  accountId?: string; // Target (or source for transfers) account ID
  destinationAccountId?: string; // Target account for transfers
  customerId?: string;
  vendorId?: string;
  chequeNumber?: string;
  chequeDate?: string;
}

export interface DaySession {
  date: string;
  openingBalance: number;
  expectedClosing: number;
  actualClosing?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK';
  accountId?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate: string;
  lastProcessedDate?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  accountNumber?: string;
}

export interface UserProfile {
  name: string;
  branch: string;
  logo?: string;
}

export type View = 'DASHBOARD' | 'POS' | 'SALES_HISTORY' | 'INVENTORY' | 'PURCHASES' | 'FINANCE' | 'CUSTOMERS' | 'CHEQUE_PRINT' | 'BARCODE_PRINT' | 'SETTINGS';
