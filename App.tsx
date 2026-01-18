import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/database';
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
import Auth from './components/Auth';
import { loadCloudData } from './services/database';

const PERSISTENCE_KEY = 'prasama_erp_production_v5_stable';

const INITIAL_DATA = {
  version: "5.0",
  userProfile: {
    name: "PRASAMA(PVT)LTD",
    branch: "No 16,Kirulapana Supermarket, Colombo 05",
    logo: ""
  },
  products: [],
  categories: [],
  transactions: [],
  accounts: [
    { id: "cash", name: "Main Cash Drawer", balance: 0 },
    { id: "bank_default", name: "Commercial Bank", balance: 0 }
  ],
  purchaseOrders: [],
  vendors: [],
  customers: [],
  recurringExpenses: [],
  daySessions: []
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('IDLE');
  
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_DATA.userProfile);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [daySessions, setDaySessions] = useState<DaySession[]>([]);
  const [posSession, setPosSession] = useState({ cart: [], discount: 0, discountPercent: 0, paymentMethod: 'CASH', accountId: 'cash', search: '' });

  const saveTimeoutRef = useRef<number | null>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    }, (error) => {
      console.error("Auth observer error:", error);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Initialization
  useEffect(() => {
    if (isLoadingAuth || !currentUser) return;

    const initData = async () => {
      try {
        const cloudData = await loadCloudData();
        const local = localStorage.getItem(PERSISTENCE_KEY);
        const parsedLocal = local ? JSON.parse(local) : null;
        
        const source = (parsedLocal && typeof parsedLocal === 'object') ? parsedLocal : cloudData || INITIAL_DATA;

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
      } catch (err) {
        console.error("Critical: Storage corruption. Reverting to initial state.", err);
      } finally {
        setSyncStatus('OFFLINE');
        setIsLoading(false);
      }
    };
    initData();
  }, [currentUser, isLoadingAuth]);

  // Persistence Engine
  useEffect(() => {
    if (isLoading || !currentUser) return;
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      const dataToSave = { 
        products, categories, transactions, accounts, purchaseOrders, vendors, customers, userProfile, recurringExpenses, posSession, daySessions 
      };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(dataToSave));
      setSyncStatus('OFFLINE');
    }, 1000);

    return () => { if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current); };
  }, [products, categories, transactions, accounts, purchaseOrders, vendors, customers, userProfile, recurringExpenses, posSession, daySessions, isLoading, currentUser]);

  const applyTransactionImpact = (tx: Transaction) => {
    if (tx.type === 'TRANSFER' && tx.accountId && tx.destinationAccountId) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === tx.accountId) return { ...acc, balance: Number(acc.balance) - Number(tx.amount) };
        if (acc.id === tx.destinationAccountId) return { ...acc, balance: Number(acc.balance) + Number(tx.amount) };
        return acc;
      }));
      return;
    }

    if (tx.paymentMethod !== 'CREDIT' && tx.paymentMethod !== 'CHEQUE') {
      const targetAccount = tx.accountId || (tx.paymentMethod === 'CASH' ? 'cash' : 'bank_default');
      setAccounts(prev => prev.map(acc => {
        if (acc.id === targetAccount) {
          const isInflow = tx.type === 'SALE' || tx.type === 'CREDIT_PAYMENT';
          return { ...acc, balance: Number(acc.balance) + (isInflow ? Number(tx.amount) : -Number(tx.amount)) };
        }
        return acc;
      }));
    }

    if (tx.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === tx.customerId) {
          if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') return { ...c, totalCredit: Number(c.totalCredit) + Number(tx.amount) };
          if (tx.type === 'CREDIT_PAYMENT') return { ...c, totalCredit: Number(c.totalCredit) - Number(tx.amount) };
        }
        return c;
      }));
    }

    if (tx.items && Array.isArray(tx.items)) {
      setProducts(prev => prev.map(p => {
        const item = tx.items?.find((i: any) => i.productId === p.id);
        if (item) {
          const adjustment = tx.type === 'SALE' ? -Number(item.quantity) : Number(item.quantity);
          return { ...p, stock: Number(p.stock) + adjustment };
        }
        return p;
      }));
    }
  };

  const addTransaction = (partialTx: any) => {
    const tx: Transaction = {
      ...partialTx,
      id: partialTx.id || `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      date: partialTx.date || new Date().toISOString(),
      amount: Number(partialTx.amount) || 0,
      discount: Number(partialTx.discount) || 0,
    };
    setTransactions(prev => [tx, ...prev]);
    applyTransactionImpact(tx);
  };

  const handleOpenDay = (openingBalance: number) => {
    const date = new Date().toISOString().split('T')[0];
    const newSession: DaySession = { date, openingBalance, expectedClosing: openingBalance, status: 'OPEN' };
    setDaySessions(prev => [newSession, ...prev.filter(s => s.date !== date)]);
    setAccounts(prev => prev.map(acc => acc.id === 'cash' ? { ...acc, balance: openingBalance } : acc));
  };

  const activeSession = daySessions.find(s => s.date === new Date().toISOString().split('T')[0]);

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">Verifying Station Access...</p>
      </div>
    );
  }

  if (!currentUser) return <Auth />;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">Restoring Enterprise State...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="no-print h-full flex-shrink-0 relative">
        <Sidebar 
          currentView={currentView} 
          setView={setCurrentView} 
          userProfile={userProfile} 
          accounts={accounts} 
          onEditProfile={() => setCurrentView('SETTINGS')} 
        />
      </div>
      <main className="flex-1 overflow-y-auto relative bg-[#fcfcfc]">
        <div className="max-w-7xl mx-auto px-6 py-8 md:px-10 md:py-12">
            {currentView === 'DASHBOARD' && <Dashboard transactions={transactions} products={products} accounts={accounts} vendors={vendors} categories={categories} />}
            {currentView === 'POS' && <POS accounts={accounts} products={products} customers={customers} categories={categories} userProfile={userProfile} onUpsertCustomer={(c) => setCustomers(prev => [...prev.filter(old => old.id !== c.id), c])} onUpdateProduct={(p) => setProducts(prev => prev.map(old => old.id === p.id ? p : old))} onCompleteSale={addTransaction} posSession={posSession} setPosSession={setPosSession} activeSession={activeSession} onGoToFinance={() => setCurrentView('FINANCE')} onQuickOpenDay={handleOpenDay} />}
            {currentView === 'SALES_HISTORY' && <SalesHistory transactions={transactions} products={products} customers={customers} userProfile={userProfile} accounts={accounts} onUpdateTransaction={(tx) => setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t))} onDeleteTransaction={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} />}
            {currentView === 'INVENTORY' && <Inventory products={products} setProducts={setProducts} categories={categories} vendors={vendors} userProfile={userProfile} onAddCategory={(name) => setCategories(prev => [...prev, {id: `cat-${Date.now()}`, name}])} onDeleteCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))} onUpsertVendor={(v) => setVendors(prev => [...prev.filter(old => old.id !== v.id), v])} />}
            {currentView === 'BARCODE_PRINT' && <BarcodePrint products={products} categories={categories} />}
            {currentView === 'PURCHASES' && <Purchases transactions={transactions} accounts={accounts} products={products} purchaseOrders={purchaseOrders} vendors={vendors} userProfile={userProfile} onUpsertPO={(po) => setPurchaseOrders(prev => [po, ...prev.filter(old => old.id !== po.id)])} onReceivePO={(id) => {
              const po = purchaseOrders.find(o => o.id === id);
              if (po) {
                addTransaction({
                  type: 'PURCHASE',
                  amount: po.totalAmount,
                  description: `Receipt: ${po.id}`,
                  paymentMethod: po.paymentMethod,
                  accountId: po.accountId,
                  vendorId: po.vendorId,
                  items: po.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.cost }))
                });
                setPurchaseOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'RECEIVED', receivedDate: new Date().toISOString() } : o));
              }
            }} onUpsertVendor={(v) => setVendors(prev => [...prev.filter(old => old.id !== v.id), v])} />}
            {currentView === 'FINANCE' && <Finance onUpsertAccount={(acc) => setAccounts(prev => [...prev.filter(a => a.id !== acc.id), acc])} transactions={transactions} accounts={accounts} products={products} userProfile={userProfile} vendors={vendors} daySessions={daySessions} onOpenDay={handleOpenDay} onCloseDay={(actual) => setDaySessions(prev => prev.map(s => s.date === new Date().toISOString().split('T')[0] ? { ...s, actualClosing: actual, status: 'CLOSED' } : s))} onAddExpense={(tx) => addTransaction({ ...tx, type: 'EXPENSE' })} onAddTransfer={(tx) => addTransaction({ ...tx, type: 'TRANSFER' })} onUpdateTransaction={(tx) => setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t))} onDeleteTransaction={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} recurringExpenses={recurringExpenses} onAddRecurring={(schedule) => setRecurringExpenses(prev => [...prev, schedule])} onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(s => s.id !== id))} />}
            {currentView === 'CUSTOMERS' && <Customers customers={customers} transactions={transactions} onUpsertCustomer={(c) => setCustomers(prev => [...prev.filter(old => old.id !== c.id), c])} onReceivePayment={(tx) => addTransaction({ ...tx, type: 'CREDIT_PAYMENT' })} />}
            {currentView === 'CHEQUE_PRINT' && <ChequePrint />}
            {currentView === 'SETTINGS' && <Settings userProfile={userProfile} setUserProfile={setUserProfile} onExport={() => {
              const data = { products, categories, transactions, accounts, purchaseOrders, vendors, customers, recurringExpenses, daySessions };
              const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url; link.download = `prasama_erp_backup.json`;
              link.click();
            }} onImport={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                const data = JSON.parse(event.target?.result as string);
                if (data.products) setProducts(data.products);
                if (data.transactions) setTransactions(data.transactions);
                alert("Data restoration successful!");
              };
              reader.readAsText(file);
            }} syncStatus={syncStatus} />}
        </div>
      </main>
    </div>
  );
};

export default App;