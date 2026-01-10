
import React, { useState, useEffect } from 'react';
import { View, Product, Transaction, BankAccount, PurchaseOrder, Vendor, Customer } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Purchases from './components/Purchases';
import Finance from './components/Finance';
import Customers from './components/Customers';
import ChequePrint from './components/ChequePrint';
import BarcodePrint from './components/BarcodePrint';
import SalesHistory from './components/SalesHistory';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Premium Coffee Beans', sku: 'COF-001', price: 25.0, cost: 12.0, stock: 45, category: 'Beverages', lowStockThreshold: 10 },
  { id: '2', name: 'Eco Paper Filters', sku: 'FIL-102', price: 8.5, cost: 3.2, stock: 120, category: 'Accessories', lowStockThreshold: 20 },
  { id: '3', name: 'Ceramic Mug Blue', sku: 'MUG-55', price: 15.0, cost: 5.5, stock: 30, category: 'Tableware', lowStockThreshold: 5 },
];

const INITIAL_ACCOUNTS: BankAccount[] = [
  { id: 'cash', name: 'Main Cash Drawer', balance: 1500.0 },
  { id: 'bank', name: 'Commercial Bank', balance: 25400.0 },
];

const INITIAL_VENDORS: Vendor[] = [
  { id: 'v1', name: 'Global Supply Co.', contactPerson: 'Alice Smith', email: 'alice@global.com', phone: '555-0101', address: '123 Supply Ln' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Starbucks NY', phone: '212-555-0199', email: 'billing@starbucks.com', address: 'Time Square, NYC', totalCredit: 0, creditLimit: 5000 },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('omni_business_data_v4');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.products) setProducts(data.products);
      if (data.transactions) setTransactions(data.transactions);
      if (data.accounts) setAccounts(data.accounts);
      if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
      if (data.vendors) setVendors(data.vendors);
      if (data.customers) setCustomers(data.customers);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('omni_business_data_v4', JSON.stringify({ 
      products, transactions, accounts, purchaseOrders, vendors, customers 
    }));
  }, [products, transactions, accounts, purchaseOrders, vendors, customers]);

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    
    // Update Accounts
    if (tx.paymentMethod !== 'CREDIT') {
      setAccounts(prev => prev.map(acc => {
        const targetAccount = tx.paymentMethod === 'CASH' ? 'cash' : 'bank';
        if (acc.id === targetAccount) {
          const isInflow = tx.type === 'SALE' || tx.type === 'CREDIT_PAYMENT';
          const change = isInflow ? tx.amount : -tx.amount;
          return { ...acc, balance: acc.balance + change };
        }
        return acc;
      }));
    }

    // Update Customer Credit Balance
    if (tx.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === tx.customerId) {
          if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') {
            return { ...c, totalCredit: c.totalCredit + tx.amount };
          }
          if (tx.type === 'CREDIT_PAYMENT') {
            return { ...c, totalCredit: c.totalCredit - tx.amount };
          }
        }
        return c;
      }));
    }

    // Update stock
    if (tx.items && (tx.type === 'SALE' || tx.type === 'PURCHASE')) {
      setProducts(prev => prev.map(p => {
        const item = tx.items?.find(i => i.productId === p.id);
        if (item) {
          const stockChange = tx.type === 'SALE' ? -item.quantity : item.quantity;
          return { ...p, stock: p.stock + stockChange };
        }
        return p;
      }));
    }
  };

  const receivePurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'RECEIVED') return;

    const vendor = vendors.find(v => v.id === po.vendorId);
    const receivedDate = new Date().toISOString();

    setPurchaseOrders(prev => prev.map(p => 
      p.id === poId ? { ...p, status: 'RECEIVED', receivedDate } : p
    ));

    addTransaction({
      id: `TX-${Date.now()}`,
      date: receivedDate,
      type: 'PURCHASE',
      amount: po.totalAmount,
      paymentMethod: po.paymentMethod,
      description: `Purchase from PO #${po.id} (${vendor?.name || 'Unknown Vendor'})`,
      items: po.items.map(item => ({ 
        productId: item.productId, 
        quantity: item.quantity, 
        price: item.cost 
      }))
    });
  };

  const upsertPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders(prev => {
      const exists = prev.find(p => p.id === po.id);
      if (exists) return prev.map(p => p.id === po.id ? po : p);
      return [po, ...prev];
    });
  };

  const upsertVendor = (vendor: Vendor) => {
    setVendors(prev => {
      const exists = prev.find(v => v.id === vendor.id);
      if (exists) return prev.map(v => v.id === vendor.id ? vendor : v);
      return [vendor, ...prev];
    });
  };

  const upsertCustomer = (customer: Customer) => {
    setCustomers(prev => {
      const exists = prev.find(c => c.id === customer.id);
      if (exists) return prev.map(c => c.id === customer.id ? customer : c);
      return [customer, ...prev];
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 selection:bg-indigo-100 selection:text-indigo-700">
      <div className="no-print h-full flex-shrink-0">
        <Sidebar currentView={currentView} setView={setCurrentView} />
      </div>
      
      <main className="flex-1 overflow-y-auto relative scroll-smooth">
        {/* Subtle background element */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-100 to-transparent pointer-events-none -z-10 opacity-60"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-8 md:px-10 md:py-12">
          <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            {currentView === 'DASHBOARD' && (
              <Dashboard 
                transactions={transactions} 
                products={products} 
                accounts={accounts} 
              />
            )}
            {currentView === 'POS' && (
              <POS 
                products={products}
                customers={customers}
                onUpsertCustomer={upsertCustomer}
                onCompleteSale={(tx) => addTransaction({ 
                  ...tx, 
                  id: `SL-${Date.now()}`, 
                  date: new Date().toISOString() 
                })}
                cashBalance={accounts.find(a => a.id === 'cash')?.balance || 0}
              />
            )}
            {currentView === 'SALES_HISTORY' && (
              <SalesHistory 
                transactions={transactions} 
                products={products}
                customers={customers}
              />
            )}
            {currentView === 'INVENTORY' && (
              <Inventory 
                products={products} 
                setProducts={setProducts} 
              />
            )}
            {currentView === 'BARCODE_PRINT' && (
              <BarcodePrint products={products} />
            )}
            {currentView === 'PURCHASES' && (
              <Purchases 
                products={products}
                purchaseOrders={purchaseOrders}
                vendors={vendors}
                onUpsertPO={upsertPurchaseOrder}
                onReceivePO={receivePurchaseOrder}
                onUpsertVendor={upsertVendor}
              />
            )}
            {currentView === 'FINANCE' && (
              <Finance 
                transactions={transactions} 
                accounts={accounts}
                onAddExpense={(tx) => addTransaction({ 
                  ...tx, 
                  id: `EX-${Date.now()}`, 
                  date: new Date().toISOString() 
                })}
              />
            )}
            {currentView === 'CUSTOMERS' && (
              <Customers 
                customers={customers}
                transactions={transactions}
                onUpsertCustomer={upsertCustomer}
                onReceivePayment={(tx) => addTransaction({
                  ...tx,
                  id: `PAY-${Date.now()}`,
                  date: new Date().toISOString(),
                  type: 'CREDIT_PAYMENT'
                })}
              />
            )}
            {currentView === 'CHEQUE_PRINT' && <ChequePrint />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
