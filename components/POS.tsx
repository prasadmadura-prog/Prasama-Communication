
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Transaction, Customer } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import Fuse from 'fuse.js';
import JsBarcode from 'jsbarcode';

interface POSProps {
  products: Product[];
  customers: Customer[];
  onUpsertCustomer: (c: Customer) => void;
  onCompleteSale: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  cashBalance: number;
}

const BarcodeImage: React.FC<{ value: string; height?: number; width?: number; fontSize?: number; displayValue?: boolean }> = ({ 
  value, 
  height = 40, 
  width = 1.2, 
  fontSize = 10,
  displayValue = false 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
          background: "transparent",
          lineColor: "#000000"
        });
      } catch (e) {
        console.error("Barcode gen failed", e);
      }
    }
  }, [value, height, width, fontSize, displayValue]);

  return (
    <div className="flex flex-col items-center justify-center overflow-hidden">
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};

const POS: React.FC<POSProps> = ({ products, customers, onUpsertCustomer, onCompleteSale, cashBalance }) => {
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CREDIT'>('CASH');
  const [isScanning, setIsScanning] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', limit: '10000' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [lastTx, setLastTx] = useState<{ id: string; date: string; items: any[]; total: number; method: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: 'sku', weight: 2 },
        { name: 'name', weight: 1 }
      ],
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

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      alert(`Product ${product.sku} is out of stock!`);
      return;
    }
    const requestedQty = Math.max(1, quantity);
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id 
          ? { ...item, qty: Math.min(item.qty + requestedQty, product.stock) } 
          : item
        );
      }
      return [...prev, { product, qty: Math.min(requestedQty, product.stock) }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CARD') {
      setShowCardModal(true);
    } else if (paymentMethod === 'CREDIT') {
      setShowCustomerModal(true);
    } else {
      completeTransaction();
    }
  };

  const completeTransaction = (customerId?: string) => {
    const txId = `SL-${Date.now()}`;
    const txDate = new Date().toISOString();
    
    const txSnapshot = {
      id: txId,
      date: txDate,
      items: cart.map(i => ({ 
        name: i.product.name, 
        sku: i.product.sku, 
        qty: i.qty, 
        price: i.product.price 
      })),
      total: total,
      method: paymentMethod
    };

    onCompleteSale({
      type: 'SALE',
      amount: total,
      paymentMethod,
      customerId,
      description: `POS Sale: ${cart.length} items via ${paymentMethod}${customerId ? ` to Customer ID ${customerId}` : ''}`,
      items: cart.map(i => ({ productId: i.product.id, quantity: i.qty, price: i.product.price }))
    });

    setLastTx(txSnapshot);
    setCart([]);
    setShowCardModal(false);
    setShowCustomerModal(false);
    setIsAddingNewCustomer(false);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setIsProcessingCard(false);
  };

  const handleAddNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.name || !newCustomerData.phone) return;

    const newC: Customer = {
      id: `CUS-${Date.now()}`,
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      email: '',
      address: '',
      totalCredit: 0,
      creditLimit: parseFloat(newCustomerData.limit) || 5000
    };

    onUpsertCustomer(newC);
    setSelectedCustomer(newC);
    setIsAddingNewCustomer(false);
    setNewCustomerData({ name: '', phone: '', limit: '10000' });
  };

  const printSingleLabel = (p: Product) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, p.sku, { format: "CODE128", width: 2, height: 60, displayValue: true, fontSize: 16 });
    const barcodeDataUrl = canvas.toDataURL();
    printWindow.document.write(`
      <html><body onload="window.print(); window.close();" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="font-family:sans-serif; font-weight:bold; font-size:14px; margin-bottom:5px;">${p.name}</div>
        <img src="${barcodeDataUrl}" />
        <div style="font-weight:bold; font-size:18px; margin-top:5px;">Rs. ${p.price.toFixed(2)}</div>
      </body></html>
    `);
    printWindow.document.close();
  };

  const printReceipt = (txData: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const canvas = document.createElement('canvas');
    JsBarcode(canvas, txData.id, {
      format: "CODE128",
      width: 1.2,
      height: 30,
      displayValue: false,
      margin: 0
    });
    const barcodeDataUrl = canvas.toDataURL();

    const itemsHtml = txData.items.map((item: any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
        <div style="flex: 1;">
          <div style="font-weight: bold;">${item.name}</div>
          <div style="font-size: 10px; color: #666;">${item.qty} x Rs. ${item.price.toFixed(2)}</div>
        </div>
        <div style="font-weight: bold;">Rs. ${(item.qty * item.price).toFixed(2)}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${txData.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            body { 
              font-family: 'JetBrains Mono', monospace; 
              width: 80mm; 
              margin: 0; 
              padding: 10mm; 
              color: #000;
              background: #fff;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 10px; }
            .meta { font-size: 10px; margin-bottom: 15px; }
            .items { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .totals { margin-bottom: 20px; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
            .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; }
            .footer { text-align: center; font-size: 9px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 15px; }
            .barcode { margin-top: 10px; }
            @page { margin: 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>OmniBusiness</h1>
            <p>Quality Goods & Services</p>
            <p>789 Business Ave, Tech Park</p>
            <p>Tel: (555) 012-3456</p>
          </div>
          <div class="meta">
            <div>DATE: ${new Date(txData.date).toLocaleDateString()} ${new Date(txData.date).toLocaleTimeString()}</div>
            <div>TXID: ${txData.id}</div>
            <div>CASHIER: Admin (M01)</div>
          </div>
          <div class="items">
            ${itemsHtml}
          </div>
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>Rs. ${txData.total.toFixed(2)}</span></div>
            <div class="total-row"><span>Tax (0%)</span><span>Rs. 0.00</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${txData.total.toFixed(2)}</span></div>
            <div class="total-row" style="margin-top: 8px;"><span>Method</span><span>${txData.method}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>Please keep this receipt for returns within 30 days.</p>
            <div class="barcode">
              <img src="${barcodeDataUrl}" />
            </div>
            <p style="margin-top: 5px;">${txData.id}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const simulateCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingCard(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    completeTransaction();
  };

  const toggleScanner = async () => {
    if (isScanning) {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } else {
      setIsScanning(true);
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              const product = products.find(p => p.sku.toLowerCase() === decodedText.toLowerCase());
              if (product) {
                addToCart(product, 1);
                if (navigator.vibrate) navigator.vibrate(100);
              }
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner error:", err);
          setIsScanning(false);
          alert("Failed to access camera.");
        }
      }, 100);
    }
  };

  if (lastTx) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">
            ✅
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sale Complete!</h2>
            <p className="text-slate-500">Transaction ID: {lastTx.id}</p>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Total Amount</span>
              <span className="text-xl font-black text-slate-900">Rs. {lastTx.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Payment Method</span>
              <span className="font-bold text-indigo-600">{lastTx.method}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => printReceipt(lastTx)}
              className="bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <span>🖨️</span> Print Receipt
            </button>
            <button 
              onClick={() => setLastTx(null)}
              className="bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={toggleScanner}
            className={`px-4 rounded-xl border transition-all flex items-center gap-2 font-bold text-sm ${
              isScanning ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-500'
            }`}
          >
            {isScanning ? '⏹ Stop' : '📷 Scan'}
          </button>
        </div>

        {isScanning && (
          <div className="relative w-full aspect-video md:aspect-[21/9] bg-black rounded-2xl overflow-hidden shadow-inner border-2 border-indigo-500">
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-white/50 rounded-lg shadow-[0_0_0_100vw_rgba(0,0,0,0.4)]"></div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filteredProducts.map(p => (
            <div key={p.id} className="p-4 rounded-xl border border-slate-200 transition-all flex flex-col bg-white hover:border-indigo-400 hover:shadow-md group">
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1 min-w-0 pr-3">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{p.category}</span>
                  <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-indigo-600 transition-colors">
                    {p.name}
                  </p>
                  <span className="block text-[10px] font-mono font-bold text-slate-400 tracking-wider mt-1">SKU: {p.sku}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-indigo-600 leading-none">Rs. {p.price.toLocaleString()}</p>
                  <span className={`text-[10px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full ${p.stock < 10 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.stock} units
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p, 1)}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-bold shadow-sm hover:bg-indigo-700 disabled:bg-slate-300 transition-all active:scale-[0.97]"
                >
                  Add to Cart
                </button>
                <button
                  title="Print Single Barcode Label"
                  onClick={() => printSingleLabel(p)}
                  className="px-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all active:scale-[0.97]"
                >
                  🖨️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">Checkout Terminal</h3>
          <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold">{cart.length} Items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-12 text-center">
              <span className="text-5xl mb-4">🛒</span>
              <p className="text-sm font-medium">Cart is empty.<br/>Select products or scan barcodes.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-100 transition-all group">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.product.name}</p>
                    <p className="text-xs font-mono text-slate-400">Rs. {item.product.price.toLocaleString()} × {item.qty}</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-1 uppercase">{item.product.sku}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-rose-500 transition-colors">✕</button>
                    <span className="font-black text-sm text-slate-900">Rs. {(item.product.price * item.qty).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-5">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</p>
            <div className="grid grid-cols-4 gap-1">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-1 rounded-lg text-[9px] font-bold transition-all border flex flex-col items-center gap-1 ${paymentMethod === 'CASH' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <span>💵</span> Cash
              </button>
              <button 
                onClick={() => setPaymentMethod('BANK')}
                className={`py-2 px-1 rounded-lg text-[9px] font-bold transition-all border flex flex-col items-center gap-1 ${paymentMethod === 'BANK' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <span>🏦</span> Bank
              </button>
              <button 
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-1 rounded-lg text-[9px] font-bold transition-all border flex flex-col items-center gap-1 ${paymentMethod === 'CARD' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <span>💳</span> Card
              </button>
              <button 
                onClick={() => setPaymentMethod('CREDIT')}
                className={`py-2 px-1 rounded-lg text-[9px] font-bold transition-all border flex flex-col items-center gap-1 ${paymentMethod === 'CREDIT' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <span>👤</span> Credit
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/50">
            <div className="flex justify-between items-center text-2xl font-black text-slate-900">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Total Due</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {paymentMethod === 'CARD' ? '💳 Secure Checkout' : paymentMethod === 'CREDIT' ? '👤 Pay on Credit' : '✨ Finalize Sale'}
          </button>
        </div>
      </div>

      {showCardModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-md:max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold italic">O</div>
                  <h3 className="font-bold text-lg text-slate-800">OmniPay Gateway</h3>
                </div>
                <button onClick={() => !isProcessingCard && setShowCardModal(false)} className="text-slate-400 hover:text-slate-600 leading-none text-2xl">&times;</button>
              </div>

              <div className="relative h-48 w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 p-6 text-white shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-10 bg-amber-400/80 rounded-md shadow-inner"></div>
                    <span className="font-bold italic text-xl">VISA</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white/60 font-bold uppercase tracking-widest">Card Number</p>
                    <p className="text-xl font-mono tracking-[0.2em]">{cardDetails.number ? cardDetails.number.replace(/\d{4}(?=.)/g, '$& ') : '•••• •••• •••• ••••'}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">Card Holder</p>
                      <p className="text-sm font-bold truncate max-w-[150px]">{cardDetails.name || 'YOUR NAME'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">Expires</p>
                      <p className="text-sm font-bold">{cardDetails.expiry || 'MM/YY'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={simulateCardPayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name on Card</label>
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" placeholder="Johnathan Doe" value={cardDetails.name} onChange={e => setCardDetails({...cardDetails, name: e.target.value})} disabled={isProcessingCard} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card Number</label>
                  <input required maxLength={16} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="0000 0000 0000 0000" value={cardDetails.number} onChange={e => setCardDetails({...cardDetails, number: e.target.value.replace(/\D/g, '')})} disabled={isProcessingCard} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</label>
                    <input required placeholder="MM/YY" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" value={cardDetails.expiry} onChange={e => setCardDetails({...cardDetails, expiry: e.target.value})} disabled={isProcessingCard} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVC / CVV</label>
                    <input required maxLength={3} placeholder="123" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" value={cardDetails.cvc} onChange={e => setCardDetails({...cardDetails, cvc: e.target.value.replace(/\D/g, '')})} disabled={isProcessingCard} />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={isProcessingCard} className={`w-full py-4 rounded-2xl text-white font-bold shadow-xl transition-all flex items-center justify-center gap-3 ${isProcessingCard ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {isProcessingCard ? 'Encrypting Payment...' : `Pay Rs. ${total.toLocaleString()} Now`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 space-y-6 flex flex-col h-full">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl">👤</div>
                  <h3 className="font-bold text-xl text-slate-800">
                    {isAddingNewCustomer ? 'Add New Credit Customer' : 'Select Credit Customer'}
                  </h3>
                </div>
                <button 
                  onClick={() => { 
                    setShowCustomerModal(false); 
                    setSelectedCustomer(null); 
                    setCustomerSearch(''); 
                    setIsAddingNewCustomer(false);
                  }} 
                  className="text-slate-400 hover:text-slate-600 leading-none text-2xl"
                >
                  &times;
                </button>
              </div>

              {isAddingNewCustomer ? (
                <form onSubmit={handleAddNewCustomer} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                    <input 
                      required 
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Ruwan Perera"
                      value={newCustomerData.name}
                      onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                    <input 
                      required 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. 077 123 4567"
                      value={newCustomerData.phone}
                      onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Limit (Rs.)</label>
                    <input 
                      required 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                      value={newCustomerData.limit}
                      onChange={e => setNewCustomerData({...newCustomerData, limit: e.target.value})}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsAddingNewCustomer(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-500 border border-slate-200"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700"
                    >
                      Save & Select
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col min-h-0 animate-in slide-in-from-left-4 duration-300">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                      <input 
                        type="text" 
                        placeholder="Search customers..." 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddingNewCustomer(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-indigo-700 transition-all"
                    >
                      + New Customer
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin">
                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => {
                      const remainingLimit = c.creditLimit - c.totalCredit;
                      const isOverLimit = total > remainingLimit;
                      const isSelected = selectedCustomer?.id === c.id;
                      
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className={`w-full p-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' 
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                               <p className={`font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{c.name}</p>
                               {isSelected && <span className="text-indigo-600">✓</span>}
                            </div>
                            <p className="text-xs text-slate-400">{c.phone}</p>
                            {isOverLimit && <p className="mt-1 text-[9px] font-black text-rose-500 uppercase tracking-tighter">⚠️ Limit Exceeded: Need Rs. { (total - remainingLimit).toLocaleString() } more</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Available</p>
                            <p className={`font-black ${isOverLimit ? 'text-rose-500' : 'text-emerald-600'}`}>Rs. {remainingLimit.toLocaleString()}</p>
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="h-32 flex flex-col items-center justify-center text-slate-400 italic text-sm text-center">
                        <p>No matching customers found.</p>
                        <button onClick={() => setIsAddingNewCustomer(true)} className="mt-3 text-indigo-600 font-bold hover:underline">+ Register new customer</button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3 mt-auto bg-white border-t border-slate-50">
                    <button 
                      type="button"
                      onClick={() => { setShowCustomerModal(false); setSelectedCustomer(null); setCustomerSearch(''); }} 
                      className="flex-1 py-3 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      disabled={!selectedCustomer || (total > (selectedCustomer.creditLimit - selectedCustomer.totalCredit))}
                      onClick={() => selectedCustomer && completeTransaction(selectedCustomer.id)}
                      className="flex-[2] bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]"
                    >
                      {selectedCustomer && (total > (selectedCustomer.creditLimit - selectedCustomer.totalCredit)) 
                        ? 'Limit Exceeded' 
                        : 'Confirm Credit Sale'
                      }
                    </button>
                  </div>
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
