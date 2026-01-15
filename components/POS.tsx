
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Transaction, Customer, Category, UserProfile, DaySession } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import Fuse from 'fuse.js';

interface POSProps {
  products: Product[];
  customers: Customer[];
  categories: Category[];
  userProfile: UserProfile;
  activeSession?: DaySession;
  onUpsertCustomer: (c: Customer) => void;
  onUpdateProduct: (p: Product) => void;
  onCompleteSale: (tx: any) => void;
  posSession: {
    cart: { product: Product; qty: number }[];
    discount: number;
    discountPercent: number;
    paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT';
    search: string;
  };
  setPosSession: React.Dispatch<React.SetStateAction<any>>;
  onGoToFinance: () => void;
}

const POS: React.FC<POSProps> = ({ 
  products = [], 
  customers = [], 
  categories = [], 
  userProfile, 
  activeSession,
  onUpsertCustomer, 
  onUpdateProduct,
  onCompleteSale, 
  posSession,
  setPosSession,
  onGoToFinance
}) => {
  const { cart = [], discount = 0, discountPercent = 0, paymentMethod = 'CASH', search = '' } = posSession;
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastTx, setLastTx] = useState<any>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);

  const fuse = useMemo(() => new Fuse(products, { keys: ['sku', 'name'], threshold: 0.3 }), [products]);
  const filteredProducts = useMemo(() => !search.trim() ? products : fuse.search(search).map(r => r.item), [search, fuse, products]);
  const filteredCustomers = useMemo(() => !customerSearch.trim() ? customers : customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)), [customers, customerSearch]);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.product.price) * Number(item.qty)), 0), [cart]);
  const total = Math.max(0, subtotal - Number(discount));

  const isDayOpen = activeSession?.status === 'OPEN';

  const addToCart = (product: Product) => {
    if (!isDayOpen) return;
    if (product.stock <= 0) return alert(`Product ${product.sku} is out of stock!`);
    setFeedbackId(product.id);
    setTimeout(() => setFeedbackId(null), 400);

    setPosSession((prev: any) => {
      const existing = prev.cart.find((item: any) => item.product.id === product.id);
      if (existing) {
        return { ...prev, cart: prev.cart.map((item: any) => item.product.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item) };
      }
      return { ...prev, cart: [{ product, qty: 1 }, ...prev.cart] };
    });
  };

  const updateCartQty = (id: string, newQty: number) => {
    setPosSession((prev: any) => ({
      ...prev,
      cart: prev.cart.map((item: any) => {
        if (item.product.id === id) return { ...item, qty: Math.max(1, Math.min(newQty, item.product.stock)) };
        return item;
      })
    }));
  };

  const handleCheckout = () => {
    if (!isDayOpen) return;
    if (cart.length === 0) return;
    if (paymentMethod === 'CREDIT') setShowCustomerModal(true);
    else completeTransaction();
  };

  const completeTransaction = (customerId?: string) => {
    setIsProcessing(true);
    try {
      const txPayload = {
        type: 'SALE',
        amount: total,
        discount: Number(discount),
        paymentMethod,
        customerId,
        description: `POS Retail Sale: ${cart.length} items`,
        items: cart.map((i: any) => ({ productId: i.product.id, quantity: i.qty, price: i.product.price }))
      };
      onCompleteSale(txPayload);
      setLastTx({ ...txPayload, subtotal, total, items: cart.map((i: any) => ({ name: i.product.name, qty: i.qty, price: i.product.price })) });
      setPosSession({ cart: [], discount: 0, discountPercent: 0, paymentMethod: 'CASH', search: '' });
      setShowCustomerModal(false);
      setShowCreditConfirm(false);
    } catch (e) { alert("Finalize Error"); }
    finally { setIsProcessing(false); }
  };

  if (!isDayOpen) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-8 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-5xl mb-6">🔒</div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Terminal Locked</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 max-w-sm">Day session must be initialized in the Finance module before processing retail sales.</p>
        <button onClick={onGoToFinance} className="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Go to Finance Module</button>
      </div>
    );
  }

  if (lastTx) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-lg p-10 text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">✓</div>
          <h2 className="text-3xl font-black text-slate-900">Sale Complete</h2>
          <div className="bg-slate-50 rounded-3xl p-6 text-left space-y-2">
            <div className="flex justify-between font-bold text-slate-400 text-xs"><span>Subtotal</span><span>Rs. {lastTx.subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between font-black text-slate-900 text-2xl pt-2 border-t border-slate-200"><span>Net Total</span><span>Rs. {lastTx.total.toLocaleString()}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setLastTx(null)} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Next Customer</button>
            <button onClick={() => window.print()} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Print Receipt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input type="text" placeholder="Search Master Product List..." className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-sm" value={search} onChange={(e) => setPosSession((prev:any) => ({...prev, search: e.target.value}))} />
        </div>
        <div className="flex-1 overflow-y-auto bg-white rounded-3xl border border-slate-100 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-black uppercase text-[10px]">Product / SKU</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-right">Price</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-center">Stock</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-all ${feedbackId === p.id ? 'bg-indigo-50' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-800 uppercase text-xs">{p.name}</p>
                    <p className="text-[10px] font-mono text-indigo-500">{p.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-black font-mono">Rs. {p.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center font-bold">{p.stock}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => addToCart(p)} className="bg-slate-900 text-white w-10 h-10 rounded-xl font-black text-xl active:scale-90 transition-transform">+</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full md:w-[380px] flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter">Cart Summary</h3>
          <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{cart.length} ITEMS</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {cart.map(item => (
            <div key={item.product.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800 truncate uppercase">{item.product.name}</p>
                <p className="text-[10px] font-mono text-slate-400">Rs. {item.product.price} x {item.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => updateCartQty(item.product.id, item.qty - 1)} className="w-6 h-6 rounded bg-white border border-slate-200 font-black">-</button>
                 <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                 <button onClick={() => updateCartQty(item.product.id, item.qty + 1)} className="w-6 h-6 rounded bg-white border border-slate-200 font-black">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 space-y-4 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-4 gap-2">
            {['CASH', 'BANK', 'CARD', 'CREDIT'].map(m => (
              <button key={m} onClick={() => setPosSession((prev:any) => ({...prev, paymentMethod: m}))} className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${paymentMethod === m ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-transparent text-slate-400'}`}>{m}</button>
            ))}
          </div>
          <div className="pt-2 space-y-1">
             <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
             <div className="flex justify-between text-2xl font-black text-slate-900"><span>TOTAL DUE</span><span>Rs. {total.toLocaleString()}</span></div>
          </div>
          <button onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 disabled:bg-slate-200">✨ Finalize Transaction</button>
        </div>
      </div>
      
      {showCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-black text-slate-900 uppercase mb-4">Select Credit Account</h3>
            <input placeholder="Search client..." className="w-full px-5 py-3 rounded-xl border border-slate-200 mb-4" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
            <div className="max-h-60 overflow-y-auto space-y-2">
               {filteredCustomers.map(c => (
                 <button key={c.id} onClick={() => { setSelectedCustomer(c); completeTransaction(c.id); }} className="w-full p-4 rounded-xl border border-slate-100 hover:border-indigo-600 text-left font-bold text-sm uppercase flex justify-between">
                   <span>{c.name}</span>
                   <span className="text-indigo-600">Rs. {c.totalCredit.toLocaleString()}</span>
                 </button>
               ))}
            </div>
            <button onClick={() => setShowCustomerModal(false)} className="w-full mt-4 py-2 text-slate-400 font-bold uppercase text-[10px]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
