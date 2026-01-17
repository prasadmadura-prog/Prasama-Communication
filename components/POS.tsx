
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Transaction, Customer, Category, UserProfile, DaySession, BankAccount } from '../types';
import Fuse from 'fuse.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface POSProps {
  products: Product[];
  customers: Customer[];
  categories: Category[];
  accounts: BankAccount[];
  userProfile: UserProfile;
  activeSession?: DaySession;
  onUpsertCustomer: (c: Customer) => void;
  onUpdateProduct: (p: Product) => void;
  onCompleteSale: (tx: any) => void;
  onQuickOpenDay: (opening: number) => void;
  posSession: {
    cart: { product: Product; qty: number; price: number }[];
    discount: number;
    discountPercent: number;
    paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT';
    accountId: string;
    search: string;
  };
  setPosSession: React.Dispatch<React.SetStateAction<any>>;
  onGoToFinance: () => void;
}

const POS: React.FC<POSProps> = ({ 
  products = [], 
  customers = [], 
  categories = [], 
  accounts = [],
  userProfile, 
  activeSession,
  onUpsertCustomer, 
  onUpdateProduct,
  onCompleteSale, 
  onQuickOpenDay,
  posSession,
  setPosSession,
  onGoToFinance
}) => {
  const { cart = [], discount = 0, paymentMethod = 'CASH', accountId = 'cash', search = '' } = posSession;
  
  const [lastTx, setLastTx] = useState<any>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [cashReceived, setCashReceived] = useState<string>('');
  
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCusName, setNewCusName] = useState('');
  const [newCusPhone, setNewCusPhone] = useState('');
  const [newCusLimit, setNewCusLimit] = useState('50000');

  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fuse = useMemo(() => new Fuse(products, { keys: ['sku', 'name'], threshold: 0.2 }), [products]);
  const filteredProducts = useMemo(() => !search.trim() ? products : fuse.search(search).map(r => r.item), [search, fuse, products]);
  const filteredCustomers = useMemo(() => customers.filter(c => c && c.name && (c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))), [customers, customerSearch]);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + ((item.price ?? item.product.price) * item.qty), 0), [cart]);
  const total = Math.max(0, subtotal - discount);
  const changeDue = Math.max(0, (parseFloat(cashReceived) || 0) - total);

  const isDayOpen = activeSession?.status === 'OPEN';

  const startAction = (action: () => void) => {
    action(); 
    stopAction(); 
    holdTimerRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(action, 80);
    }, 400);
  };

  const stopAction = () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  };

  const addToCart = (product: Product) => {
    if (!isDayOpen || product.stock <= 0) return;
    setFeedbackId(product.id);
    setTimeout(() => setFeedbackId(null), 300);

    setPosSession((prev: any) => {
      const existing = prev.cart.find((item: any) => item.product.id === product.id);
      if (existing) {
        return { ...prev, cart: prev.cart.map((item: any) => item.product.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item) };
      }
      return { ...prev, cart: [{ product, qty: 1, price: product.price }, ...prev.cart] };
    });
  };

  const updateCartQty = (id: string, newQty: number) => {
    setPosSession((prev: any) => {
      if (newQty <= 0) {
        return { ...prev, cart: prev.cart.filter((item: any) => item.product.id !== id) };
      }
      return {
        ...prev,
        cart: prev.cart.map((item: any) => item.product.id === id ? { ...item, qty: Math.min(newQty, item.product.stock) } : item)
      };
    });
  };

  const handleScan = (decodedText: string) => {
    const product = products.find(p => p.sku === decodedText || p.id === decodedText);
    if (product) {
      addToCart(product);
      setShowScanner(false);
    }
  };

  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(handleScan, (err) => console.debug(err));
      scannerRef.current = scanner;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  const handleQuickAddCustomer = () => {
    const trimmedName = newCusName.trim();
    const trimmedPhone = newCusPhone.trim();
    if (!trimmedName || !trimmedPhone) return;

    setIsProcessing(true);
    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      name: trimmedName.toUpperCase(),
      phone: trimmedPhone,
      email: '',
      address: '',
      totalCredit: 0,
      creditLimit: parseFloat(newCusLimit) || 50000
    };

    onUpsertCustomer(newCustomer);
    completeTransaction(newCustomer.id);
    setNewCusName('');
    setNewCusPhone('');
    setIsAddingCustomer(false);
  };

  const completeTransaction = (customerId?: string) => {
    setIsProcessing(true);
    const txId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const txPayload = {
      id: txId,
      type: 'SALE',
      amount: total,
      discount: discount,
      paymentMethod,
      accountId: (paymentMethod === 'BANK' || paymentMethod === 'CARD') ? accountId : 'cash',
      customerId,
      description: `Terminal Sale: ${cart.length} line items`,
      date: new Date().toISOString(),
      items: cart.map(i => ({ productId: i.product.id, quantity: i.qty, price: i.price ?? i.product.price }))
    };
    onCompleteSale(txPayload);
    setLastTx({ ...txPayload, subtotal, total });
    setPosSession({ cart: [], discount: 0, discountPercent: 0, paymentMethod: 'CASH', accountId: 'cash', search: '' });
    setShowCustomerModal(false);
    setShowCashModal(false);
    setCashReceived('');
    setIsProcessing(false);
  };

  const printReceipt = (tx: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoHtml = userProfile.logo
      ? `<div style="text-align: center; margin-bottom: 12px; width: 100%;">
           <img src="${userProfile.logo}" style="max-height: 90px; max-width: 220px; filter: grayscale(100%);" />
         </div>`
      : '';

    const itemsHtml = tx.items?.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      return `
        <div style="margin-bottom: 8px; border-bottom: 1px dashed #444; padding-bottom: 6px;">
          <div style="font-weight: 800; font-size: 13px; color: #000; text-transform: uppercase;">${product?.name || 'Unknown Item'}</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-top: 2px;">
            <span>${item.quantity} x ${(Number(item.price) || 0).toLocaleString()}</span>
            <span>${(Number(item.quantity) * Number(item.price) || 0).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');

    const dateStr = new Date(tx.date).toLocaleDateString();
    const timeStr = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    printWindow.document.write(`
      <html>
        <head>
          <title>RECEIPT - ${tx.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
            body { font-family: 'JetBrains Mono', monospace; padding: 10px; color: #000; max-width: 280px; margin: 0 auto; background: #fff; line-height: 1.2; }
            .center { text-align: center; }
            .header-info { margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .biz-name { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 4px 0; }
            .biz-branch { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #333; }
            .meta { font-size: 10px; font-weight: 700; margin: 10px 0; border-bottom: 1px solid #000; padding-bottom: 10px; }
            .total-section { margin-top: 15px; border-top: 3px double #000; padding-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; }
            .footer { text-align: center; font-size: 10px; margin-top: 25px; font-weight: 800; border-top: 1px dashed #000; padding-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            ${logoHtml}
            <div class="header-info">
               <div class="biz-name">${userProfile.name}</div>
               <div class="biz-branch">${userProfile.branch}</div>
            </div>
          </div>
          <div class="meta">
            REF: ${tx.id}<br/>
            DATE: ${dateStr} | TIME: ${timeStr}<br/>
            CASHIER: TERMINAL_01
          </div>
          <div style="margin-top: 10px;">${itemsHtml}</div>
          <div class="total-section">
             <div class="total-row">
                <span>TOTAL LKR:</span>
                <span>${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
             <div style="font-size: 10px; text-align: right; margin-top: 4px; font-weight: 700;">PAID BY: ${tx.paymentMethod}</div>
          </div>
          <div class="footer">THANK YOU FOR YOUR BUSINESS<br/>PRASAMA ERP SOLUTIONS</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isDayOpen) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl mb-6">🔒</div>
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Terminal Offline</h2>
        <p className="text-slate-400 text-sm mt-1 mb-8">Daily cash balance must be initialized before processing sales.</p>
        <button onClick={() => {
            const balance = prompt("Opening Float (Rs.):", "0");
            if (balance !== null) onQuickOpenDay(parseFloat(balance) || 0);
        }} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">Initialize Float</button>
      </div>
    );
  }

  if (lastTx) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-12 text-center space-y-8 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">✓</div>
          <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Checkout Successful</h2>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setLastTx(null)} className="bg-slate-900 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all">New Transaction</button>
            <button onClick={() => printReceipt(lastTx)} className="bg-indigo-600 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Print Receipt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-8">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Scan barcode or search master catalog..." 
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-semibold text-sm bg-white" 
              value={search} 
              onChange={(e) => setPosSession((prev:any) => ({...prev, search: e.target.value}))} 
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <button 
            onClick={() => setShowScanner(true)}
            className="px-6 bg-slate-100 rounded-2xl border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            📷 Scan
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Asset Details</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Price</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Add</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <tr key={p.id} onClick={() => addToCart(p)} className="cursor-pointer hover:bg-indigo-50/30 transition-all group">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-800 text-[13px] uppercase">{p.name}</p>
                    <p className="text-[10px] font-mono font-semibold text-indigo-500 mt-0.5">{p.sku}</p>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-900">Rs. {(Number(p.price) || 0).toLocaleString()}</td>
                  <td className="px-8 py-5 text-center">
                    <button className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold hover:bg-black transition-colors">+</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-[380px] flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs">Active Cart</h3>
          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter">{cart.length} Items</span>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {cart.map(item => (
            <div key={item.product.id} className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-100 shadow-sm relative group hover:border-indigo-200 transition-all">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-800 truncate uppercase tracking-tight">{item.product.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                   <span className="text-[10px] font-mono font-bold text-slate-400">Rs. {item.price.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 shadow-inner border border-slate-100">
                    <button 
                      onMouseDown={() => startAction(() => updateCartQty(item.product.id, item.qty - 1))}
                      onMouseUp={stopAction} onMouseLeave={stopAction}
                      onTouchStart={(e) => { e.preventDefault(); startAction(() => updateCartQty(item.product.id, item.qty - 1)); }}
                      onTouchEnd={stopAction}
                      className="w-6 h-6 rounded-md bg-white flex items-center justify-center font-black text-slate-500 select-none hover:bg-rose-50 hover:text-rose-600 transition-colors text-xs"
                    >-</button>
                    <span className="text-[11px] font-black w-5 text-center text-slate-700">{item.qty}</span>
                    <button 
                      onMouseDown={() => startAction(() => updateCartQty(item.product.id, item.qty + 1))}
                      onMouseUp={stopAction} onMouseLeave={stopAction}
                      onTouchStart={(e) => { e.preventDefault(); startAction(() => updateCartQty(item.product.id, item.qty + 1)); }}
                      onTouchEnd={stopAction}
                      className="w-6 h-6 rounded-md bg-white flex items-center justify-center font-black text-slate-500 select-none hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-xs"
                    >+</button>
                 </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
              <span className="text-4xl mb-4 grayscale opacity-30">🛒</span>
              <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
            </div>
          )}
        </div>
        <div className="p-6 space-y-4 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-4 gap-1.5">
            {['CASH', 'BANK', 'CARD', 'CREDIT'].map(m => (
              <button key={m} onClick={() => setPosSession((prev:any) => ({...prev, paymentMethod: m}))} className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${paymentMethod === m ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{m}</button>
            ))}
          </div>
          <div className="space-y-1">
             <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <span>Gross Total</span>
                <span className="font-mono">Rs. {subtotal.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-end text-xl font-black text-slate-900 tracking-tighter">
                <span className="text-xs uppercase tracking-widest mb-1.5">Net Pay</span>
                <span className="font-mono">Rs. {total.toLocaleString()}</span>
             </div>
          </div>
          <button 
            onClick={() => {
              if (paymentMethod === 'CREDIT') setShowCustomerModal(true);
              else if (paymentMethod === 'CASH') setShowCashModal(true);
              else completeTransaction();
            }} 
            disabled={cart.length === 0 || isProcessing} 
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none transition-all tracking-[0.1em]"
          >
            Authorize Payment
          </button>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Optical Scanner</h3>
              <button onClick={() => setShowScanner(false)} className="text-slate-300 hover:text-slate-900 text-4xl">&times;</button>
            </div>
            <div className="p-8">
              <div id="reader" className="w-full rounded-2xl overflow-hidden border-4 border-slate-100"></div>
              <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">Position barcode within the frame</p>
            </div>
          </div>
        </div>
      )}

      {showCashModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 bg-slate-50 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Cash Tender</h3>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Calculate change due</p>
                 </div>
                 <button onClick={() => { setShowCashModal(false); setCashReceived(''); }} className="text-slate-300 hover:text-slate-900 text-4xl leading-none">&times;</button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable</span>
                    <span className="text-2xl font-black text-slate-900 font-mono">Rs. {total.toLocaleString()}</span>
                 </div>
                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Amount Given by Customer</label>
                    <input autoFocus type="number" className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 text-4xl font-black font-mono text-center text-indigo-600 outline-none focus:border-indigo-500" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
                 </div>
                 <div className={`p-8 rounded-[2.5rem] transition-all border ${parseFloat(cashReceived) >= total ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex justify-between items-center">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${parseFloat(cashReceived) >= total ? 'text-emerald-500' : 'text-rose-500'}`}>{parseFloat(cashReceived) >= total ? 'Change Due' : 'Payment Shortfall'}</span>
                       <span className={`text-3xl font-black font-mono ${parseFloat(cashReceived) >= total ? 'text-emerald-700' : 'text-rose-700'}`}>Rs. {changeDue.toLocaleString()}</span>
                    </div>
                 </div>
                 <button disabled={isProcessing || (parseFloat(cashReceived) || 0) < total} onClick={() => completeTransaction()} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-widest text-xs disabled:opacity-30 shadow-2xl hover:bg-black transition-all">Finalize Sale</button>
              </div>
           </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-50 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Assign Credit Account</h3>
              <button onClick={() => { setShowCustomerModal(false); setIsAddingCustomer(false); }} className="text-slate-300 text-4xl leading-none">&times;</button>
            </div>
            <div className="p-10 space-y-6">
              {!isAddingCustomer ? (
                <>
                  <input placeholder="Search client directory..." className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold outline-none" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
                  <div className="max-h-72 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {filteredCustomers.map(c => (
                      <button key={c.id} onClick={() => completeTransaction(c.id)} className="w-full p-5 rounded-2xl border border-slate-100 hover:bg-indigo-50 text-left transition-all group">
                        <p className="font-black text-slate-900 text-[13px] uppercase tracking-tight group-hover:text-indigo-600">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold font-mono">{c.phone} • Due: Rs. {c.totalCredit.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setIsAddingCustomer(true)} className="w-full bg-slate-950 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">+ Register New Client</button>
                </>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <input className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold uppercase" placeholder="Full Client Name" value={newCusName} onChange={e => setNewCusName(e.target.value)} />
                  <input className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono" placeholder="Mobile Number" value={newCusPhone} onChange={e => setNewCusPhone(e.target.value)} />
                  <button onClick={handleQuickAddCustomer} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">Register & Sale</button>
                  <button onClick={() => setIsAddingCustomer(false)} className="w-full text-slate-400 text-[10px] font-black uppercase">Back to Directory</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
