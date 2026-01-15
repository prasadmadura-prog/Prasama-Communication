
import React, { useState, useEffect, useRef } from 'react';
import { View, Product, Transaction, BankAccount, PurchaseOrder, Vendor, Customer, UserProfile, Category, RecurringExpense, DaySession } from './types';
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
import Settings from './components/Settings';
import { loadCloudData, saveCloudData } from './services/database';

const PERSISTENCE_KEY = 'prasama_erp_local_cache';
const OLD_PERSISTENCE_KEY = 'prasama_erp_production_v1';

const INITIAL_CATEGORIES: Category[] = [{ id: 'cat1', name: 'Beverages' }, { id: 'cat2', name: 'Accessories' }, { id: 'cat3', name: 'Tableware' }];
const INITIAL_VENDORS: Vendor[] = [{ id: 'v1', name: 'Global Supply Co.', contactPerson: 'Alice Smith', email: 'alice@global.com', phone: '555-0101', address: '123 Supply Ln' }];
const INITIAL_PRODUCTS: Product[] = [{ id: '1', name: 'Premium Coffee Beans', sku: 'COF-001', price: 25.0, cost: 12.0, stock: 45, categoryId: 'cat1', vendorId: 'v1', lowStockThreshold: 10 }];
const INITIAL_ACCOUNTS: BankAccount[] = [{ id: 'cash', name: 'Main Cash Drawer', balance: 0.0 }, { id: 'bank', name: 'Commercial Bank', balance: 0.0 }];
const INITIAL_CUSTOMERS: Customer[] = [{ id: 'c1', name: 'Starbucks NY', phone: '212-555-0199', email: 'billing@starbucks.com', address: 'Time Square, NYC', totalCredit: 0, creditLimit: 5000 }];
const INITIAL_USER: UserProfile = { name: 'PRASAMA(PVT)LTD', branch: 'Main Branch v4.6' };

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [daySessions, setDaySessions] = useState<DaySession[]>([]);
  const [posSession, setPosSession] = useState({ cart: [], discount: 0, discountPercent: 0, paymentMethod: 'CASH', search: '' });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const initData = async () => {
      const cloudData = await loadCloudData();
      const local = localStorage.getItem(PERSISTENCE_KEY) || localStorage.getItem(OLD_PERSISTENCE_KEY);
      const source = cloudData || (local ? JSON.parse(local) : null);

      if (source) {
        if (Array.isArray(source.products)) setProducts(source.products);
        if (Array.isArray(source.categories)) setCategories(source.categories);
        if (Array.isArray(source.transactions)) setTransactions(source.transactions);
        if (Array.isArray(source.accounts)) setAccounts(source.accounts);
        if (Array.isArray(source.purchaseOrders)) setPurchaseOrders(source.purchaseOrders);
        if (Array.isArray(source.vendors)) setVendors(source.vendors);
        if (Array.isArray(source.customers)) setCustomers(source.customers);
        if (source.userProfile) setUserProfile(source.userProfile);
        if (Array.isArray(source.recurringExpenses)) setRecurringExpenses(source.recurringExpenses);
        if (Array.isArray(source.daySessions)) setDaySessions(source.daySessions);
        if (source.posSession) setPosSession(source.posSession);
      }
      setIsLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(async () => {
      setSyncStatus('SYNCING');
      const dataToSave = { 
        products, categories, transactions, accounts, purchaseOrders, vendors, customers, userProfile, recurringExpenses, posSession, daySessions 
      };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(dataToSave));
      const success = await saveCloudData(dataToSave);
      setSyncStatus(success ? 'IDLE' : 'ERROR');
    }, 1000);

    return () => { if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current); };
  }, [products, categories, transactions, accounts, purchaseOrders, vendors, customers, userProfile, recurringExpenses, posSession, daySessions, isLoading]);

  const handleExportData = () => {
    const fullBackup = {
      version: "4.6",
      exportDate: new Date().toISOString(),
      userProfile,
      products,
      categories,
      transactions,
      accounts,
      purchaseOrders,
      vendors,
      customers,
      recurringExpenses,
      posSession,
      daySessions
    };
    
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PRASAMA_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("RESTORE ALERT: This will replace ALL current data with the backup file. Proceed?")) {
          if (Array.isArray(data.products)) setProducts(data.products);
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.transactions)) setTransactions(data.transactions);
          if (Array.isArray(data.accounts)) setAccounts(data.accounts);
          if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
          if (Array.isArray(data.vendors)) setVendors(data.vendors);
          if (Array.isArray(data.customers)) setCustomers(data.customers);
          if (data.userProfile) setUserProfile(data.userProfile);
          if (Array.isArray(data.recurringExpenses)) setRecurringExpenses(data.recurringExpenses);
          if (Array.isArray(data.daySessions)) setDaySessions(data.daySessions);
          if (data.posSession) setPosSession(data.posSession);
          
          alert("Restore successful.");
          setCurrentView('DASHBOARD');
        }
      } catch (err) {
        alert("CRITICAL ERROR: Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const addTransaction = (partialTx: any) => {
    const tx: Transaction = {
      ...partialTx,
      id: partialTx.id || `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      date: partialTx.date || new Date().toISOString(),
      amount: Number(partialTx.amount) || 0,
      discount: Number(partialTx.discount) || 0,
    };

    setTransactions(prev => [tx, ...(Array.isArray(prev) ? prev : [])]);

    if (tx.paymentMethod !== 'CREDIT') {
      setAccounts(prev => (Array.isArray(prev) ? prev : []).map(acc => {
        const targetAccount = tx.paymentMethod === 'CASH' ? 'cash' : 'bank';
        if (acc.id === targetAccount) {
          const isInflow = tx.type === 'SALE' || tx.type === 'CREDIT_PAYMENT';
          return { ...acc, balance: Number(acc.balance) + (isInflow ? Number(tx.amount) : -Number(tx.amount)) };
        }
        return acc;
      }));
    }

    if (tx.customerId) {
      setCustomers(prev => (Array.isArray(prev) ? prev : []).map(c => {
        if (c.id === tx.customerId) {
          if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') return { ...c, totalCredit: (Number(c.totalCredit) || 0) + Number(tx.amount) };
          if (tx.type === 'CREDIT_PAYMENT') return { ...c, totalCredit: (Number(c.totalCredit) || 0) - Number(tx.amount) };
        }
        return c;
      }));
    }

    if (tx.items && Array.isArray(tx.items) && (tx.type === 'SALE' || tx.type === 'PURCHASE')) {
      setProducts(prev => (Array.isArray(prev) ? prev : []).map(p => {
        const item = tx.items?.find((i: any) => i.productId === p.id);
        if (item) return { ...p, stock: Number(p.stock) + (tx.type === 'SALE' ? -Number(item.quantity) : Number(item.quantity)) };
        return p;
      }));
    }
  };

  const handleUpdateProduct = (p: Product) => {
    setProducts(prev => prev.map(old => old.id === p.id ? p : old));
  };

  const handleOpenDay = (openingBalance: number) => {
    const date = new Date().toISOString().split('T')[0];
    const newSession: DaySession = { date, openingBalance, expectedClosing: openingBalance, status: 'OPEN' };
    setDaySessions(prev => [newSession, ...prev.filter(s => s.date !== date)]);
    setAccounts(prev => prev.map(acc => acc.id === 'cash' ? { ...acc, balance: openingBalance } : acc));
  };

  const handleCloseDay = (actualClosing: number) => {
    const date = new Date().toISOString().split('T')[0];
    setDaySessions(prev => prev.map(s => s.date === date ? { ...s, actualClosing, status: 'CLOSED' } : s));
  };

  const receivePurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'RECEIVED') return;
    const vendor = vendors.find(v => v.id === po.vendorId);
    const receivedDate = new Date().toISOString();
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'RECEIVED', receivedDate } : p));
    addTransaction({
      type: 'PURCHASE',
      amount: Number(po.totalAmount),
      paymentMethod: po.paymentMethod,
      description: `Stock Intake: PO #${po.id} from ${vendor?.name || 'Supplier'}`,
      items: po.items.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.cost }))
    });
  };

  const upsertPurchaseOrder = (po: PurchaseOrder) => setPurchaseOrders(prev => prev.find(p => p.id === po.id) ? prev.map(p => p.id === po.id ? po : p) : [po, ...prev]);
  const upsertVendor = (vendor: Vendor) => setVendors(prev => prev.find(v => v.id === vendor.id) ? prev.map(v => v.id === vendor.id ? vendor : v) : [vendor, ...prev]);
  const upsertCustomer = (customer: Customer) => setCustomers(prev => prev.find(c => c.id === customer.id) ? prev.map(c => c.id === customer.id ? customer : c) : [customer, ...prev]);
  const addCategory = (name: string) => setCategories(prev => [...prev, { id: `cat-${Date.now()}`, name }]);
  const deleteCategory = (id: string) => products.some(p => p.categoryId === id) ? alert("Category in use!") : setCategories(prev => prev.filter(c => c.id !== id));

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">Initializing PRASAMA Enterprise Ledger...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="no-print h-full flex-shrink-0 relative">
        <Sidebar currentView={currentView} setView={setCurrentView} userProfile={userProfile} onEditProfile={() => setCurrentView('SETTINGS')} />
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'SYNCING' ? 'bg-amber-400 animate-pulse' : syncStatus === 'ERROR' ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} title={syncStatus}></div>
        </div>
      </div>
      
      <main className="flex-1 overflow-y-auto relative bg-[#fcfcfc]">
        <div className="max-w-7xl mx-auto px-6 py-8 md:px-10 md:py-12">
            {currentView === 'DASHBOARD' && <Dashboard transactions={transactions} products={products} accounts={accounts} />}
            {currentView === 'POS' && <POS products={products} customers={customers} categories={categories} userProfile={userProfile} onUpsertCustomer={upsertCustomer} onUpdateProduct={handleUpdateProduct} onCompleteSale={addTransaction} cashBalance={accounts.find(a => a.id === 'cash')?.balance || 0} posSession={posSession} setPosSession={setPosSession} />}
            {currentView === 'SALES_HISTORY' && <SalesHistory transactions={transactions} products={products} customers={customers} userProfile={userProfile} />}
            {currentView === 'INVENTORY' && <Inventory products={products} setProducts={setProducts} categories={categories} vendors={vendors} userProfile={userProfile} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onUpsertVendor={upsertVendor} />}
            {currentView === 'BARCODE_PRINT' && <BarcodePrint products={products} />}
            {currentView === 'PURCHASES' && <Purchases products={products} purchaseOrders={purchaseOrders} vendors={vendors} userProfile={userProfile} onUpsertPO={upsertPurchaseOrder} onReceivePO={receivePurchaseOrder} onUpsertVendor={upsertVendor} />}
            {currentView === 'FINANCE' && <Finance transactions={transactions} accounts={accounts} products={products} userProfile={userProfile} daySessions={daySessions} onOpenDay={handleOpenDay} onCloseDay={handleCloseDay} onAddExpense={(tx) => addTransaction({ ...tx, type: 'EXPENSE' })} recurringExpenses={recurringExpenses} onAddRecurring={(schedule) => setRecurringExpenses(prev => [...prev, schedule])} onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(s => s.id !== id))} />}
            {currentView === 'CUSTOMERS' && <Customers customers={customers} transactions={transactions} onUpsertCustomer={upsertCustomer} onReceivePayment={(tx) => addTransaction({ ...tx, type: 'CREDIT_PAYMENT' })} />}
            {currentView === 'CHEQUE_PRINT' && <ChequePrint />}
            {currentView === 'SETTINGS' && <Settings userProfile={userProfile} setUserProfile={setUserProfile} onExport={handleExportData} onImport={handleImportData} syncStatus={syncStatus} />}
        </div>
      </main>
    </div>
  );
};

export default App;
