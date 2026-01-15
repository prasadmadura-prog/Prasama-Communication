
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

const PERSISTENCE_KEY = 'prasama_erp_production_v5';

const INITIAL_CATEGORIES: Category[] = [{ id: 'cat1', name: 'Beverages' }, { id: 'cat2', name: 'Accessories' }, { id: 'cat3', name: 'Tableware' }];
const INITIAL_VENDORS: Vendor[] = [{ id: 'v1', name: 'Global Supply Co.', contactPerson: 'Alice Smith', email: 'alice@global.com', phone: '555-0101', address: '123 Supply Ln' }];
const INITIAL_PRODUCTS: Product[] = [{ id: '1', name: 'Premium Coffee Beans', sku: 'COF-001', price: 25.0, cost: 12.0, stock: 45, categoryId: 'cat1', vendorId: 'v1', lowStockThreshold: 10 }];
const INITIAL_ACCOUNTS: BankAccount[] = [{ id: 'cash', name: 'Main Cash Drawer', balance: 0.0 }, { id: 'bank', name: 'Commercial Bank', balance: 0.0 }];
const INITIAL_CUSTOMERS: Customer[] = [{ id: 'c1', name: 'Starbucks NY', phone: '212-555-0199', email: 'billing@starbucks.com', address: 'Time Square, NYC', totalCredit: 0, creditLimit: 5000 }];
const INITIAL_USER: UserProfile = { name: 'PRASAMA(PVT)LTD', branch: 'Main Branch v5.0' };

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

  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const initData = async () => {
      const cloudData = await loadCloudData();
      const local = localStorage.getItem(PERSISTENCE_KEY);
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

  const addTransaction = (partialTx: any) => {
    const tx: Transaction = {
      ...partialTx,
      id: partialTx.id || `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      date: partialTx.date || new Date().toISOString(),
      amount: Number(partialTx.amount) || 0,
      discount: Number(partialTx.discount) || 0,
    };

    setTransactions(prev => [tx, ...(Array.isArray(prev) ? prev : [])]);

    // Financial balancing
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

    // Customer Credit Management
    if (tx.customerId) {
      setCustomers(prev => (Array.isArray(prev) ? prev : []).map(c => {
        if (c.id === tx.customerId) {
          if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') return { ...c, totalCredit: (Number(c.totalCredit) || 0) + Number(tx.amount) };
          if (tx.type === 'CREDIT_PAYMENT') return { ...c, totalCredit: (Number(c.totalCredit) || 0) - Number(tx.amount) };
        }
        return c;
      }));
    }

    // Inventory Balancing
    if (tx.items && Array.isArray(tx.items) && (tx.type === 'SALE' || tx.type === 'PURCHASE')) {
      setProducts(prev => (Array.isArray(prev) ? prev : []).map(p => {
        const item = tx.items?.find((i: any) => i.productId === p.id);
        if (item) return { ...p, stock: Number(p.stock) + (tx.type === 'SALE' ? -Number(item.quantity) : Number(item.quantity)) };
        return p;
      }));
    }
  };

  const handleUpdateProduct = (p: Product) => setProducts(prev => prev.map(old => old.id === p.id ? p : old));

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
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'RECEIVED', receivedDate: new Date().toISOString() } : p));
    addTransaction({
      type: 'PURCHASE',
      amount: Number(po.totalAmount),
      paymentMethod: po.paymentMethod,
      description: `Stock Intake: PO #${po.id} from ${vendor?.name || 'Supplier'}`,
      items: po.items.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.cost }))
    });
  };

  const activeSession = daySessions.find(s => s.date === new Date().toISOString().split('T')[0]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">Initializing PRASAMA Strategic Suite...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="no-print h-full flex-shrink-0 relative">
        <Sidebar currentView={currentView} setView={setCurrentView} userProfile={userProfile} onEditProfile={() => setCurrentView('SETTINGS')} />
      </div>
      
      <main className="flex-1 overflow-y-auto relative bg-[#fcfcfc]">
        <div className="max-w-7xl mx-auto px-6 py-8 md:px-10 md:py-12">
            {currentView === 'DASHBOARD' && <Dashboard transactions={transactions} products={products} accounts={accounts} />}
            {currentView === 'POS' && <POS products={products} customers={customers} categories={categories} userProfile={userProfile} onUpsertCustomer={(c) => setCustomers(prev => [...prev.filter(old => old.id !== c.id), c])} onUpdateProduct={handleUpdateProduct} onCompleteSale={addTransaction} posSession={posSession} setPosSession={setPosSession} activeSession={activeSession} onGoToFinance={() => setCurrentView('FINANCE')} />}
            {currentView === 'SALES_HISTORY' && <SalesHistory transactions={transactions} products={products} customers={customers} userProfile={userProfile} />}
            {currentView === 'INVENTORY' && <Inventory products={products} setProducts={setProducts} categories={categories} vendors={vendors} userProfile={userProfile} onAddCategory={(name) => setCategories(prev => [...prev, {id: `cat-${Date.now()}`, name}])} onDeleteCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))} onUpsertVendor={(v) => setVendors(prev => [...prev.filter(old => old.id !== v.id), v])} />}
            {currentView === 'BARCODE_PRINT' && <BarcodePrint products={products} />}
            {currentView === 'PURCHASES' && <Purchases products={products} purchaseOrders={purchaseOrders} vendors={vendors} userProfile={userProfile} onUpsertPO={(po) => setPurchaseOrders(prev => [po, ...prev.filter(old => old.id !== po.id)])} onReceivePO={receivePurchaseOrder} onUpsertVendor={(v) => setVendors(prev => [...prev.filter(old => old.id !== v.id), v])} />}
            {currentView === 'FINANCE' && <Finance transactions={transactions} accounts={accounts} products={products} userProfile={userProfile} daySessions={daySessions} onOpenDay={handleOpenDay} onCloseDay={handleCloseDay} onAddExpense={(tx) => addTransaction({ ...tx, type: 'EXPENSE' })} recurringExpenses={recurringExpenses} onAddRecurring={(schedule) => setRecurringExpenses(prev => [...prev, schedule])} onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(s => s.id !== id))} />}
            {currentView === 'CUSTOMERS' && <Customers customers={customers} transactions={transactions} onUpsertCustomer={(c) => setCustomers(prev => [...prev.filter(old => old.id !== c.id), c])} onReceivePayment={(tx) => addTransaction({ ...tx, type: 'CREDIT_PAYMENT' })} />}
            {currentView === 'CHEQUE_PRINT' && <ChequePrint />}
            {currentView === 'SETTINGS' && <Settings userProfile={userProfile} setUserProfile={setUserProfile} onExport={() => {}} onImport={() => {}} syncStatus={syncStatus} />}
        </div>
      </main>
    </div>
  );
};

export default App;
