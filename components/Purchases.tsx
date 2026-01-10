
import React, { useState, useMemo } from 'react';
import { Product, PurchaseOrder, PurchaseOrderItem, POStatus, Vendor } from '../types';
import JsBarcode from 'jsbarcode';

interface PurchasesProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  onUpsertPO: (po: PurchaseOrder) => void;
  onReceivePO: (poId: string) => void;
  onUpsertVendor: (vendor: Vendor) => void;
}

type SortKey = 'name' | 'orderCount' | 'completionRate' | 'avgLeadTime' | 'totalSpent';
type SortOrder = 'asc' | 'desc';

const Purchases: React.FC<PurchasesProps> = ({ 
  products, 
  purchaseOrders, 
  vendors, 
  onUpsertPO, 
  onReceivePO,
  onUpsertVendor
}) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'VENDORS' | 'REPORTS'>('POS');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorHistoryId, setVendorHistoryId] = useState<string | null>(null);
  
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [vendorId, setVendorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD'>('BANK');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vAddress, setVAddress] = useState('');

  const handleAddItem = () => {
    setPoItems([...poItems, { productId: products[0]?.id || '', quantity: 1, cost: products[0]?.cost || 0 }]);
  };

  const updatePOItem = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    const updated = [...poItems];
    const item = updated[index];
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      item.productId = value as string;
      item.cost = prod?.cost || 0;
    } else if (field === 'quantity') {
      item.quantity = Number(value);
    } else if (field === 'cost') {
      item.cost = Number(value);
    }
    setPoItems(updated);
  };

  const removePOItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const totalAmount = poItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  const handleSavePO = (status: POStatus = 'PENDING') => {
    if (!vendorId || poItems.length === 0) {
      alert("Please select a vendor and at least one item.");
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

  const handleFinalizePO = (po: PurchaseOrder) => {
    if (confirm(`Finalize PO #${po.id}? Status will change to PENDING.`)) {
      onUpsertPO({ ...po, status: 'PENDING' });
    }
  };

  const handleConfirmReceipt = () => {
    if (selectedPO) {
      onReceivePO(selectedPO.id);
      setIsReceiptModalOpen(false);
      setSelectedPO(null);
    }
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

  const openReceiptModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsReceiptModalOpen(true);
  };

  const printPurchaseOrder = (po: PurchaseOrder) => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const canvas = document.createElement('canvas');
    JsBarcode(canvas, po.id, { format: "CODE128", width: 1.5, height: 40, displayValue: false, margin: 0 });
    const barcodeDataUrl = canvas.toDataURL();

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
              <div class="brand"><h1>OmniBusiness</h1><p>Financial Services Sri Lanka</p></div>
              <div class="po-meta"><h2>PURCHASE ORDER</h2><div style="font-weight: 600; color: #4f46e5;"># ${po.id}</div></div>
            </div>
            <table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="summary"><div class="summary-row total"><span>TOTAL DUE</span><span>Rs. ${po.totalAmount.toLocaleString()}</span></div></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const vendorPerformance = useMemo(() => {
    const stats = vendors.map(v => {
      const vPOs = purchaseOrders.filter(po => po.vendorId === v.id);
      const receivedPOs = vPOs.filter(po => po.status === 'RECEIVED');
      const totalSpent = receivedPOs.reduce((sum, po) => sum + po.totalAmount, 0);
      return { id: v.id, name: v.name, orderCount: vPOs.length, receivedCount: receivedPOs.length, totalSpent, avgLeadTime: 0, completionRate: 100 };
    });
    return stats;
  }, [vendors, purchaseOrders]);

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-200 text-slate-600';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'RECEIVED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700';
    }
  };

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown Vendor';

  const filteredPOs = useMemo(() => purchaseOrders, [purchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Procurement & Vendors</h2>
          <p className="text-slate-500">Inventory supply management</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-200 p-1 rounded-lg flex">
            <button onClick={() => setActiveTab('POS')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'POS' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}>Orders</button>
            <button onClick={() => setActiveTab('VENDORS')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'VENDORS' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}>Vendors</button>
          </div>
          <button onClick={() => activeTab === 'POS' ? openPOModal() : openVendorModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">+ Add</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">PO #</th>
              <th className="px-6 py-4 font-semibold">Vendor</th>
              <th className="px-6 py-4 font-semibold text-right">Total</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPOs.map(po => (
              <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-indigo-600">{po.id}</td>
                <td className="px-6 py-4 font-semibold">{getVendorName(po.vendorId)}</td>
                <td className="px-6 py-4 text-right font-bold">Rs. {po.totalAmount.toLocaleString()}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(po.status)}`}>{po.status}</span></td>
                <td className="px-6 py-4 text-center space-x-2">
                  <button onClick={() => printPurchaseOrder(po)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">🖨️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isReceiptModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <h3 className="text-xl font-bold">Stock Receipt Verification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Deduction</p>
                  <p className="text-2xl font-black text-indigo-700">Rs. {selectedPO.totalAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsReceiptModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-500">Cancel</button>
                <button onClick={handleConfirmReceipt} className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl">Confirm Receipt</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
