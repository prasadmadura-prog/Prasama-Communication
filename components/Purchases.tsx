
import React, { useState, useMemo } from 'react';
import { Product, PurchaseOrder, PurchaseOrderItem, POStatus, Vendor, UserProfile } from '../types';
import JsBarcode from 'jsbarcode';

interface PurchasesProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  userProfile: UserProfile;
  onUpsertPO: (po: PurchaseOrder) => void;
  onReceivePO: (poId: string) => void;
  onUpsertVendor: (vendor: Vendor) => void;
}

const Purchases: React.FC<PurchasesProps> = ({ 
  products, 
  purchaseOrders, 
  vendors, 
  userProfile,
  onUpsertPO, 
  onReceivePO,
  onUpsertVendor
}) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'VENDORS'>('POS');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  const [vendorId, setVendorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CREDIT'>('BANK');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vAddress, setVAddress] = useState('');

  const totalAmount = useMemo(() => 
    poItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
  , [poItems]);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setPoItems([...poItems, { productId: products[0].id, quantity: 1, cost: products[0].cost }]);
  };

  const updatePOItem = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    const updated = [...poItems];
    const item = { ...updated[index] };
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      item.productId = value as string;
      item.cost = prod?.cost || 0;
    } else if (field === 'quantity') {
      item.quantity = Number(value);
    } else if (field === 'cost') {
      item.cost = Number(value);
    }
    updated[index] = item;
    setPoItems(updated);
  };

  const removePOItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleSavePO = (status: POStatus = 'PENDING') => {
    if (!vendorId || poItems.length === 0) {
      alert("Please select a vendor and add at least one item.");
      return;
    }
    const po: PurchaseOrder = {
      id: selectedPO?.id || `PO-${Date.now()}`,
      date: selectedPO?.date || new Date().toISOString(),
      vendorId,
      items: poItems,
      status: status,
      totalAmount,
      paymentMethod
    };
    onUpsertPO(po);
    closePOModal();
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) return;
    const vendor: Vendor = {
      id: selectedVendor?.id || `VEN-${Date.now()}`,
      name: vName,
      contactPerson: vContact,
      email: vEmail,
      phone: vPhone,
      address: vAddress
    };
    onUpsertVendor(vendor);
    closeVendorModal();
  };

  const openPOModal = (po?: PurchaseOrder) => {
    if (po) {
      setSelectedPO(po);
      setVendorId(po.vendorId);
      setPaymentMethod(po.paymentMethod);
      setPoItems(po.items);
    } else {
      setSelectedPO(null);
      setVendorId(vendors[0]?.id || '');
      setPaymentMethod('BANK');
      setPoItems([{ productId: products[0]?.id || '', quantity: 1, cost: products[0]?.cost || 0 }]);
    }
    setIsPOModalOpen(true);
  };

  const closePOModal = () => {
    setIsPOModalOpen(false);
    setSelectedPO(null);
  };

  const openVendorModal = (v?: Vendor) => {
    if (v) {
      setSelectedVendor(v);
      setVName(v.name);
      setVContact(v.contactPerson);
      setVEmail(v.email);
      setVPhone(v.phone);
      setVAddress(v.address);
    } else {
      setSelectedVendor(null);
      setVName('');
      setVContact('');
      setVEmail('');
      setVPhone('');
      setVAddress('');
    }
    setIsVendorModalOpen(true);
  };

  const closeVendorModal = () => {
    setIsVendorModalOpen(false);
    setSelectedVendor(null);
  };

  const printPurchaseOrder = (po: PurchaseOrder) => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = po.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 600; color: #1e293b;">${product?.name || 'Unknown Item'}</div>
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">SKU: ${product?.sku || 'N/A'}</div>
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${item.quantity}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">Rs. ${item.cost.toFixed(2)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">Rs. ${(item.quantity * item.cost).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order ${po.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 0; margin: 0; background: #fff; }
            .container { padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
            .brand img { max-width: 50mm; max-height: 20mm; margin-bottom: 10px; display: block; }
            .brand h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
            .po-meta h2 { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px 8px; background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #64748b; }
            .summary { float: right; width: 300px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .summary-row.total { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; margin-top: 4px; padding-top: 12px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">
            <div class="header">
              <div class="brand">
                ${userProfile.logo ? `<img src="${userProfile.logo}" alt="Logo" />` : ''}
                <h1>${userProfile.name}</h1>
                <p>${userProfile.branch}</p>
              </div>
              <div class="po-meta"><h2>PURCHASE ORDER</h2><div style="font-weight: 600; color: #4f46e5;"># ${po.id}</div></div>
            </div>
            <div style="margin-bottom: 30px;">
              <p style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 4px;">VENDOR:</p>
              <div style="font-size: 14px; font-weight: 700;">${vendor?.name}</div>
              <div style="font-size: 12px; color: #475569;">${vendor?.address}</div>
              <div style="font-size: 12px; color: #475569;">${vendor?.phone}</div>
            </div>
            <table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="summary">
              <div class="summary-row"><span>Subtotal</span><span>Rs. ${po.totalAmount.toLocaleString()}</span></div>
              <div class="summary-row total"><span>TOTAL DUE</span><span>Rs. ${po.totalAmount.toLocaleString()}</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-200 text-slate-600';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'RECEIVED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700';
    }
  };

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown Vendor';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Procurement & Vendors</h2>
          <p className="text-slate-500 font-medium">Manage supply chain and inventory intake</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-200 p-1 rounded-xl flex shadow-inner">
            <button onClick={() => setActiveTab('POS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'POS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}>Purchase Orders</button>
            <button onClick={() => setActiveTab('VENDORS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'VENDORS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}>Suppliers</button>
          </div>
          <button onClick={() => activeTab === 'POS' ? openPOModal() : openVendorModal()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">
            + Create New
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'POS' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">PO Reference</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Vendor / Supplier</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px] text-right">Order Value</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Status</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 font-mono font-bold text-indigo-600">{po.id}</td>
                    <td className="px-8 py-5 font-bold text-slate-800">{getVendorName(po.vendorId)}</td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 font-mono">Rs. {po.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center space-x-2">
                      <button onClick={() => printPurchaseOrder(po)} className="p-2 rounded-xl border border-slate-200 hover:bg-white hover:text-indigo-600 transition-all" title="Print PO">🖨️</button>
                      {po.status === 'DRAFT' && (
                        <button onClick={() => openPOModal(po)} className="p-2 rounded-xl border border-slate-200 hover:bg-white hover:text-indigo-600 transition-all" title="Edit Draft">✏️</button>
                      )}
                      {po.status === 'PENDING' && (
                        <button onClick={() => { setSelectedPO(po); setIsReceiptModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all" title="Confirm Receipt">Receive Items</button>
                      )}
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">No purchase orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Supplier Name</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Contact Person</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Phone</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px]">Email</th>
                  <th className="px-8 py-5 font-bold uppercase tracking-widest text-[10px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 font-bold text-slate-800">{v.name}</td>
                    <td className="px-8 py-5 font-medium text-slate-600">{v.contactPerson}</td>
                    <td className="px-8 py-5 font-mono text-slate-600">{v.phone}</td>
                    <td className="px-8 py-5 font-medium text-slate-600">{v.email}</td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => openVendorModal(v)} className="p-2 rounded-xl border border-slate-200 hover:bg-white hover:text-indigo-600 transition-all">✏️ Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Purchase Order Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedPO ? 'Update Purchase Order' : 'Create Purchase Order'}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {selectedPO?.id || 'New Record'}</p>
              </div>
              <button onClick={closePOModal} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Vendor</label>
                  <select 
                    value={vendorId} 
                    onChange={e => setVendorId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="" disabled>Select a Supplier</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Strategy</label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash Payment</option>
                    <option value="CARD">Company Card</option>
                    <option value="CREDIT">Supplier Credit</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Items</h4>
                  <button onClick={handleAddItem} className="text-indigo-600 text-xs font-bold hover:underline">+ Add Product</button>
                </div>
                
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-end p-4 bg-slate-50 rounded-2xl border border-slate-100 group animate-in slide-in-from-right-4 duration-200">
                    <div className="flex-[3]">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Product</label>
                      <select 
                        value={item.productId}
                        onChange={e => updatePOItem(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white text-sm font-bold"
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Qty</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={e => updatePOItem(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-bold"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Unit Cost</label>
                      <input 
                        type="number" 
                        value={item.cost}
                        onChange={e => updatePOItem(idx, 'cost', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-bold text-indigo-600"
                      />
                    </div>
                    <button onClick={() => removePOItem(idx)} className="p-2 mb-0.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Total</p>
                <p className="text-2xl font-black text-slate-900 font-mono">Rs. {totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleSavePO('DRAFT')} className="px-6 py-3 rounded-2xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-white transition-all">Save as Draft</button>
                <button onClick={() => handleSavePO('PENDING')} className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Finalize & Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-900">{selectedVendor ? 'Edit Supplier' : 'Register Supplier'}</h3>
              <button onClick={closeVendorModal} className="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Business Name</label>
                <input required value={vName} onChange={e => setVName(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Global Imports Ltd" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Person</label>
                <input value={vContact} onChange={e => setVContact(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                  <input value={vPhone} onChange={e => setVPhone(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-mono" placeholder="+94 11 2..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" value={vEmail} onChange={e => setVEmail(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="sales@global.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Physical Address</label>
                <textarea value={vAddress} onChange={e => setVAddress(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full business address..." />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all mt-4">Save Supplier Record</button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation of Receipt Modal */}
      {isReceiptModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">📥</div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Confirm Inventory Intake?</h3>
                <p className="text-slate-500 mt-2">Proceeding will update stock levels for all {selectedPO.items.length} items and record a transaction of <b>Rs. {selectedPO.totalAmount.toLocaleString()}</b>.</p>
              </div>
              
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Summary</p>
                <div className="flex justify-between text-sm font-bold">
                  <span>PO Reference</span>
                  <span className="font-mono text-indigo-600">{selectedPO.id}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Vendor</span>
                  <span>{getVendorName(selectedPO.vendorId)}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => { setIsReceiptModalOpen(false); setSelectedPO(null); }} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-500">Cancel</button>
                <button 
                  onClick={() => {
                    onReceivePO(selectedPO.id);
                    setIsReceiptModalOpen(false);
                    setSelectedPO(null);
                  }} 
                  className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
