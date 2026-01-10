
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  lowStockThreshold: number;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
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
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT';
}

export interface Transaction {
  id: string;
  date: string;
  type: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'CREDIT_PAYMENT';
  amount: number;
  items?: { productId: string; quantity: number; price: number }[];
  description: string;
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT';
  customerId?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
}

export type View = 'DASHBOARD' | 'POS' | 'SALES_HISTORY' | 'INVENTORY' | 'PURCHASES' | 'FINANCE' | 'CUSTOMERS' | 'CHEQUE_PRINT' | 'BARCODE_PRINT' | 'SETTINGS';
