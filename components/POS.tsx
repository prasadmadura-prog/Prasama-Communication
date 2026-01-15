
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Transaction, Customer, Category, UserProfile } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import Fuse from 'fuse.js';

interface POSProps {
  products: Product[];
  customers: Customer[];
  categories: Category[];
  userProfile: UserProfile;
  onUpsertCustomer: (c: Customer) => void;
  onUpdateProduct: (p: Product) => void;
  onCompleteSale: (tx: any) => void;
  cashBalance: number;
  posSession: {
    cart: { product: Product; qty: number }[];
    discount: number;
    discountPercent: number;
    paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'CREDIT';
    search: string;
  };
  setPosSession: React.Dispatch<React.SetStateAction<any>>;
}

const POS: React.FC<POSProps> = ({ 
  products = [], 
  customers = [], 
  categories = [], 
  userProfile, 
  onUpsertCustomer, 
  onUpdateProduct,
  onCompleteSale, 
  cashBalance,
  posSession,
  setPosSession 
}) => {
  const { cart = [], discount = 0, discountPercent = 0, paymentMethod = 'CASH', search = '' } = posSession;
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastTx, setLastTx] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Credit specific state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);

  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [{ name: 'sku', weight: 2 }, { name: 'name', weight: 1 }],
      threshold: 0.3,
      includeScore: true,
      shouldSort: true
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    return fuse.search(search).map(result => result.item);
  }, [search, fuse, products]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const subtotal = useMemo(() => 
    cart.reduce((acc, item) => acc + (Number(item.product.price) * Number(item.qty)), 0)
  , [cart]);
  
  const total = Math.max(0, subtotal - Number(discount));

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      alert(`Product ${product.sku} is out of stock!`);
      return;
    }
    setFeedbackId(product.id);
    setTimeout(() => setFeedbackId(null), 400);

    const requestedQty = Math.max(1, quantity);
    
    setPosSession((prev: any) => {
      const existing = prev.cart.find((item: any) => item.product.id === product.id);
      let newCart;
      if (existing) {
        newCart = prev.cart.map((item: any) => item.product.id === product.id 
          ? { ...item, qty: Math.min(item.qty + requestedQty, product.stock) } 
          : item
        );
      } else {
        newCart = [{ product, qty: Math.min(requestedQty, product.stock) }, ...prev.cart];
      }
      return { ...prev, cart: newCart };
    });
  };

  const updateCartQty = (id: string, newQty: number) => {
    setPosSession((prev: any) => ({
      ...prev,
      cart: prev.cart.map((item: any) => {
        if (item.product.id === id) {
          const qty = Math.max(1, Math.min(newQty, item.product.stock));
          return { ...item, qty };
        }
        return item;
      })
    }));
  };

  const removeFromCart = (id: string) => {
    setPosSession((prev: any) => ({
      ...prev,
      cart: prev.cart.filter((item: any) => item.product.id !== id)
    }));
  };

  const handleAmountChange = (val: number) => {
    const a = Math.max(0, val);
    let pct = subtotal > 0 ? Number(((a / subtotal) * 100).toFixed(2)) : 0;
    setPosSession((prev: any) => ({ ...prev, discount: a, discountPercent: pct }));
  };

  const handlePercentChange = (val: number) => {
    const p = Math.max(0, val);
    const amount = Math.round((subtotal * p) / 100);
    setPosSession((prev: any) => ({ ...prev, discount: amount, discountPercent: p }));
  };

  const applyPercentQuick = (p: number) => handlePercentChange(p);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CREDIT') {
      setShowCustomerModal(true);
    } else {
      completeTransaction();
    }
  };

  const completeTransaction = (customerId?: string) => {
    setIsProcessing(true);
    
    try {
      const txId = `SL-${Date.now()}`;
      const txDate = new Date().toISOString();
      
      const txPayload = {
        id: txId,
        date: txDate,
        type: 'SALE',
        amount: total,
        discount: Number(discount),
        paymentMethod,
        customerId,
        description: `POS Retail Sale: ${cart.length} items via ${paymentMethod}${selectedCustomer ? ` to ${selectedCustomer.name}` : ''}`,
        items: cart.map((i: any) => ({ productId: i.product.id, quantity: i.qty, price: i.product.price }))
      };

      onCompleteSale(txPayload);

      const txSnapshot = {
        ...txPayload,
        subtotal,
        total,
        customerName: selectedCustomer?.name,
        items: cart.map((i: any) => ({ name: i.product.name, qty: i.qty, price: i.product.price }))
      };

      setLastTx(txSnapshot);
      setPosSession({ cart: [], discount: 0, discountPercent: 0, paymentMethod: 'CASH', search: '' });
      setShowCustomerModal(false);
      setShowCreditConfirm(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Sale Completion Error:", error);
      alert("System failed to finalize transaction. Please check logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMasterProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
  };

  const printReceipt = (txData: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = txData.items.map((item: any) => `
      <div style="margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
        <div style="font-weight: 800; font-size: 14px;">${item.name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 12px;">
          <span>${item.qty} x Rs. ${(Number(item.price) || 0).toFixed(2)}</span>
          <span>Rs. ${(Number(item.qty) * Number(item.price) || 0).toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${txData.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
            body { font-family: 'JetBrains Mono', monospace; width: 80mm; padding: 5mm; color: #000; font-size: 13px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .total-row { display: flex; justify-content: space-between; font-weight: 700; margin-top: 5px; }
            .grand { font-size: 18px; border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; }
            @page { margin: 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>${userProfile.name}</h1>
            <p>${userProfile.branch}</p>
          </div>
          <div style="margin-bottom: 15px;">
            <div>DATE: ${new Date(txData.date).toLocaleString()}</div>
            <div>TXID: ${txData.id}</div>
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="totals">
            <div class="total-row"><span>SUBTOTAL</span><span>Rs. ${(Number(txData.subtotal) || 0).toFixed(2)}</span></div>
            ${txData.discount > 0 ? `<div class="total-row"><span>DISCOUNT</span><span>- Rs. ${(Number(txData.discount) || 0).toFixed(2)}</span></div>` : ''}
            <div class="total-row grand"><span>TOTAL</span><span>Rs. ${(Number(txData.total) || 0).toFixed(2)}</span></div>
          </div>
          <div style="text-align: center; margin-top: 20px;">THANK YOU!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'General';

  if (lastTx) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-slate-50/50">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-lg p-10 text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner ring-8 ring-emerald-50/50">✓</div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Hit: Success!</h2>
            <p className="text-slate-500 font-medium">Reference: <span className="font-mono text-indigo-600 font-bold">{lastTx.id}</span></p>
          </div>
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-3 text-left">
            <div className="flex justify-between items-center text-sm font-bold text-slate-400">
              <span>Sale Value</span>
              <span className="text-slate-900">Rs. {(Number(lastTx.subtotal) || 0).toLocaleString()}</span>
            </div>
            {(Number(lastTx.discount) || 0) > 0 && (
              <div className="flex justify-between items-center text-sm font-bold text-rose-500">
                <span>Discount</span>
                <span>- Rs. {(Number(lastTx.discount) || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
              <span className="text-xs font-black uppercase">Net Total</span>
              <span className="text-3xl font-black">Rs. {(Number(lastTx.total) || Number(lastTx.amount) || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => printReceipt(lastTx)} className="bg-indigo-600 text-white font-bold py-5 rounded-2xl active:scale-95 transition-all">Print Receipt</button>
            <button onClick={() => setLastTx(null)} className="bg-slate-950 text-white font-bold py-5 rounded-2xl active:scale-95 transition-all">Next Customer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-5 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <header className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 group w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Live Search Inventory..." 
              className="w-full pl-11 pr-5 py-3 rounded-2xl border border-slate-200 outline-none transition-all font-semibold text-slate-700 bg-white focus:ring-4 focus:ring-indigo-500/10 text-sm shadow-sm"
              value={search}
              onChange={(e) => setPosSession((prev: any) => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className={`px-5 py-3 rounded-2xl border font-bold flex items-center gap-2 active:scale-95 transition-all text-sm ${isScanning ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
          >
            <span>📷</span> {isScanning ? 'Stop' : 'Scan'}
          </button>
        </header>

        {isScanning && (
          <div className="relative w-full aspect-[32/8] bg-black rounded-2xl overflow-hidden shadow-xl ring-2 ring-slate-900">
            <div id="reader" className="w-full h-full"></div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-400 sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-bold uppercase tracking-widest text-[9px]">Product / SKU</th>
                <th className="px-6 py-3 font-bold uppercase tracking-widest text-[9px] text-right">Price</th>
                <th className="px-6 py-3 font-bold uppercase tracking-widest text-[9px] text-center">Stock</th>
                <th className="px-6 py-3 font-bold uppercase tracking-widest text-[9px] text-center">Add</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${feedbackId === p.id ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-500 font-black uppercase mb-0.5">{getCategoryName(p.categoryId)}</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-tight">{p.name}</span>
                      <span className="font-mono text-[9px] text-slate-400">{p.sku}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-black text-slate-900 text-sm font-mono">Rs. {p.price.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${p.stock < p.lowStockThreshold ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">✏️</button>
                       <button onClick={() => addToCart(p, 1)} className="w-10 h-10 bg-slate-950 text-white rounded-xl text-xl font-black shadow-md hover:bg-black active:scale-90 transition-all flex items-center justify-center">+</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full md:w-[350px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
          <div className="space-y-0.5">
            <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Checkout Terminal</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active retail Session</p>
          </div>
          <span className="bg-slate-950 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{(cart || []).length} ITEMS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-white">
          {!cart || cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
               <div className="text-4xl mb-2">🛒</div>
               <p className="font-black uppercase text-[9px] tracking-widest">Waiting for items...</p>
            </div>
          ) : (
            cart.map((item: any) => (
              <div key={item.product.id} className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all group relative">
                <button onClick={() => removeFromCart(item.product.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-100 text-slate-400 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm z-10">×</button>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-tight">{item.product.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">Rs. {Number(item.product.price).toLocaleString()} x {item.qty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 text-sm font-mono mb-1.5">Rs. {(Number(item.product.price) * Number(item.qty)).toLocaleString()}</p>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm scale-90 origin-right">
                      <button onClick={() => updateCartQty(item.product.id, item.qty - 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 font-black">-</button>
                      <input readOnly value={item.qty} className="w-5 text-center text-[9px] font-black bg-transparent outline-none text-slate-900" />
                      <button onClick={() => updateCartQty(item.product.id, item.qty + 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 font-black">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 space-y-4 border-t border-slate-100 bg-slate-50/50">
          <div className="space-y-2.5 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
             <div className="flex justify-between items-center">
               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Adjustments</label>
               <div className="flex gap-1">
                  {[5, 10, 15].map(p => (
                    <button key={p} onClick={() => applyPercentQuick(p)} className="px-1.5 py-0.5 bg-slate-50 text-[7px] font-black rounded border border-slate-200 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all">{p}%</button>
                  ))}
               </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
               <div className="relative">
                 <span className="absolute left-2 top-[19px] text-[7px] font-black text-slate-400">Rs.</span>
                 <label className="text-[7px] font-black text-slate-400 uppercase mb-0.5 block">Flat Amount</label>
                 <input type="number" value={discount || ''} onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-[11px] font-black outline-none font-mono text-slate-900" placeholder="0.00" />
               </div>
               <div className="relative">
                 <span className="absolute right-2 top-[19px] text-[7px] font-black text-slate-400">%</span>
                 <label className="text-[7px] font-black text-slate-400 uppercase mb-0.5 block">Percent %</label>
                 <input type="number" value={discountPercent || ''} onChange={(e) => handlePercentChange(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 text-[11px] font-black outline-none font-mono text-slate-900 text-right" placeholder="0" />
               </div>
             </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Payment Method</p>
            <div className="grid grid-cols-4 gap-1">
              {[{ id: 'CASH', icon: '💵' }, { id: 'BANK', icon: '🏦' }, { id: 'CARD', icon: '💳' }, { id: 'CREDIT', icon: '👤' }].map(m => (
                <button 
                  key={m.id}
                  onClick={() => setPosSession((prev: any) => ({ ...prev, paymentMethod: m.id }))}
                  className={`py-1.5 rounded-lg text-[7px] font-black uppercase flex flex-col items-center gap-0.5 transition-all border-2 ${paymentMethod === m.id ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-transparent text-slate-400 shadow-sm'}`}
                >
                  <span className="text-xs">{m.icon}</span> {m.id}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
              <span className="uppercase tracking-widest">Gross Subtotal</span>
              <span className="font-mono text-slate-600">Rs. {subtotal.toLocaleString()}</span>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between items-center text-[9px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg">
                <span className="uppercase tracking-widest">Adjustments</span>
                <span className="font-mono">- Rs. {Number(discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
               <div className="space-y-0.5">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Amount Due</span>
                 <p className="text-2xl font-black text-slate-950 tracking-tighter font-mono leading-none">Rs. {total.toLocaleString()}</p>
               </div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={!cart || cart.length === 0 || isProcessing}
              className="w-full bg-slate-950 hover:bg-black text-white py-3.5 rounded-xl font-black text-sm uppercase shadow-xl transition-all active:scale-[0.98] disabled:bg-slate-200 mt-1 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Processing...' : '✨ Finalize Sale'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Quick Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Quick Edit Master</h3>
                <p className="text-[10px] font-bold text-indigo-500 font-mono tracking-widest uppercase">{editingProduct.sku}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-300 text-3xl hover:text-slate-900">&times;</button>
            </div>
            <form onSubmit={handleUpdateMasterProduct} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Product Name</label>
                <input required className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold text-slate-900" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value.toUpperCase()})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Retail Price</label>
                  <input type="number" required className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black font-mono text-indigo-600" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Stock</label>
                  <input type="number" required className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black font-mono text-slate-900" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all">Update Record</button>
            </form>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 uppercase">Select Credit Account</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <input placeholder="Search name or phone..." className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none font-bold text-sm" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
              <div className="max-h-80 overflow-y-auto space-y-1.5 custom-scrollbar">
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCreditConfirm(true); setShowCustomerModal(false); }} className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-xs">{c.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tight">{c.phone}</p>
                    </div>
                    <p className={`font-black text-xs font-mono ${(Number(c.totalCredit) || 0) + total > (Number(c.creditLimit) || 0) ? 'text-rose-500' : 'text-emerald-500'}`}>Rs. {(Number(c.totalCredit) || 0).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreditConfirm && selectedCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 text-center space-y-6 animate-in zoom-in duration-400">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto ring-4 ring-indigo-50/50">👤</div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Confirm Credit Sale</h3>
              <p className="text-sm text-slate-500 font-medium px-4 text-center">Assigning <b className="text-slate-900">Rs. {total.toLocaleString()}</b> to <b className="text-slate-900">{selectedCustomer.name}</b></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowCreditConfirm(false); setSelectedCustomer(null); }} className="py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-400 uppercase text-[10px]">Back</button>
              <button onClick={() => completeTransaction(selectedCustomer.id)} className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
