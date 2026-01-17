
import React, { useState, useMemo } from 'react';
import { Product, PurchaseOrder, PurchaseOrderItem, POStatus, Vendor, UserProfile, BankAccount, Transaction } from '../types';

interface PurchasesProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  accounts: BankAccount[];
  transactions: Transaction[];
  userProfile: UserProfile;
  onUpsertPO: (po: PurchaseOrder) => void;
  onReceivePO: (poId: string) => void;
  onUpsertVendor: (vendor: Vendor) => void;
}

type SortField = 'name' | 'spending' | 'leadTime' | 'fulfillment';

const Purchases: React.FC<PurchasesProps> = ({ 
  products, 
  purchaseOrders, 
  vendors, 
  accounts,
  transactions = [],
  userProfile,
  onUpsertPO, 
  onReceivePO,
  onUpsertVendor
}) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'VENDORS' | 'AGING' | 'PERFORMANCE'>('POS');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  const [vendorId, setVendorId] = useState('');
  const [accountId, setAccountId] = useState('cash');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CREDIT' | 'CHEQUE'>('BANK');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vAddress, setVAddress] = useState('');

  // Performance Sorting State
  const [sortField, setSortField] = useState<SortField>('spending');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const totalAmount = useMemo(() => 
    poItems.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0)
  , [poItems]);

  const agingReport = useMemo(() => {
    const today = new Date();
    
    return vendors.map(v => {
      const vTxs = transactions.filter(t => t.vendorId === v.id && t.type === 'PURCHASE' && t.paymentMethod === 'CREDIT');
      
      const buckets = {
        current: 0, // 0-30
        thirtyPlus: 0, // 31-60
        sixtyPlus: 0, // 61-90
        ninetyPlus: 0 // 91+
      };

      vTxs.forEach(t => {
        const txDate = new Date(t.date);
        const diffTime = Math.abs(today.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) buckets.current += t.amount;
        else if (diffDays <= 60) buckets.thirtyPlus += t.amount;
        else if (diffDays <= 90) buckets.sixtyPlus += t.amount;
        else buckets.ninetyPlus += t.amount;
      });

      return {
        ...v,
        buckets,
        totalDue: Object.values(buckets).reduce((a, b) => a + b, 0)
      };
    }).sort((a, b) => b.totalDue - a.totalDue);
  }, [vendors, transactions]);

  const performanceReport = useMemo(() => {
    const report = vendors.map(v => {
      const vTxs = transactions.filter(t => t.vendorId === v.id && t.type === 'PURCHASE');
      const vPOs = purchaseOrders.filter(po => po.vendorId === v.id);
      
      const totalSpending = vTxs.reduce((sum, tx) => sum + tx.amount, 0);
      
      const receivedPOs = vPOs.filter(po => po.status === 'RECEIVED' && po.receivedDate);
      const fulfillmentRate = vPOs.length > 0 ? (receivedPOs.length / vPOs.length) * 100 : 0;
      
      let avgLeadTime = 0;
      if (receivedPOs.length > 0) {
        const leadTimes = receivedPOs.map(po => {
          const start = new Date(po.date).getTime();
          const end = new Date(po.receivedDate!).getTime();
          return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        });
        avgLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
      }

      return {
        id: v.id,
        name: v.name,
        spending: totalSpending,
        leadTime: avgLeadTime,
        fulfillment: fulfillmentRate,
        totalOrders: vPOs.length
      };
    });

    return report.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
  }, [vendors, transactions, purchaseOrders, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
      paymentMethod,
      accountId: (paymentMethod === 'BANK' || paymentMethod === 'CHEQUE' || paymentMethod === 'CARD') ? accountId : 'cash',
      chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : undefined,
      chequeDate: paymentMethod === 'CHEQUE' ? chequeDate : undefined,
    };
    onUpsertPO(po);
    closePOModal();
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) return;
    const vendor: Vendor = {
      id: selectedVendor?.id || `VEN-${Date.now()}`,
      name: vName.toUpperCase(),
      contactPerson: vContact,
      email: vEmail,
      phone: vPhone,
      address: vAddress,
      totalBalance: selectedVendor?.totalBalance || 0
    };
    onUpsertVendor(vendor);
    closeVendorModal();
  };

  const openPOModal = (po?: PurchaseOrder) => {
    if (po) {
      setSelectedPO(po);
      setVendorId(po.vendorId);
      setPaymentMethod(po.paymentMethod);
      setAccountId(po.accountId || 'cash');
      setChequeNumber(po.chequeNumber || '');
      setChequeDate(po.chequeDate || '');
      setPoItems(po.items);
    } else {
      setSelectedPO(null);
      setVendorId(vendors[0]?.id || '');
      setPaymentMethod('BANK');
      setAccountId(accounts.find(a => a.id !== 'cash')?.id || 'cash');
      setChequeNumber('');
      setChequeDate('');
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

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-200 text-slate-600';
      case 'PENDING': return 'bg-amber-100 text-amber-700 font-black';
      case 'RECEIVED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700';
    }
  };

  const getVendorName = (id: string) => vendors.find(v => v.id === id)?.name || 'Unknown Vendor';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Supplier Ecosystem</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Accounts Payable & Intake Management</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-100 p-1.5 rounded-[1.2rem] flex shadow-inner border border-slate-200 overflow-x-auto">
            <button onClick={() => setActiveTab('POS')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'POS' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Orders</button>
            <button onClick={() => setActiveTab('VENDORS')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'VENDORS' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Registry</button>
            <button onClick={() => setActiveTab('AGING')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'AGING' ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Aging Report</button>
            <button onClick={() => setActiveTab('PERFORMANCE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'PERFORMANCE' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>Performance</button>
          </div>
          {(activeTab === 'POS' || activeTab === 'VENDORS') && (
            <button onClick={() => activeTab === 'POS' ? openPOModal() : openVendorModal()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap">
              + New Entry
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
        {activeTab === 'POS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">PO Reference</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Vendor / Supplier</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-right">Order Value</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Payment</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Status</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 font-mono font-black text-indigo-600 underline cursor-pointer" onClick={() => openPOModal(po)}>{po.id}</td>
                    <td className="px-8 py-5 font-bold text-slate-900 uppercase">{getVendorName(po.vendorId)}</td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 font-mono">Rs. {po.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <p className="text-[10px] font-black uppercase text-slate-400">{po.paymentMethod}</p>
                      {po.paymentMethod === 'CHEQUE' && <p className="text-[9px] font-bold text-indigo-500 font-mono">CHQ#{po.chequeNumber}</p>}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(po.status === 'DRAFT' || po.status === 'PENDING') && (
                          <button onClick={() => openPOModal(po)} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300">✏️</button>
                        )}
                        {po.status === 'PENDING' && (
                          <button onClick={() => { setSelectedPO(po); setIsReceiptModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md">Receive</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'VENDORS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Supplier Name</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Contact Person</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Financial Pulse</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-right">Outstanding (Rs.)</th>
                  <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group font-medium">
                    <td className="px-8 py-5 font-black text-slate-900 uppercase">{v.name}</td>
                    <td className="px-8 py-5 text-slate-600 text-xs">
                       <p className="font-bold">{v.contactPerson}</p>
                       <p className="text-[10px] text-slate-400">{v.phone}</p>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${Number(v.totalBalance || 0) > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                          <span className="text-[10px] font-black uppercase text-slate-400">{Number(v.totalBalance || 0) > 0 ? 'Balance Due' : 'Zero Liability'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 font-mono">
                       {Number(v.totalBalance || 0).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => openVendorModal(v)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">✏️ Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'AGING' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 font-black uppercase tracking-[0.2em] text-[9px]">
                <tr>
                  <th className="px-8 py-6">Vendor Name</th>
                  <th className="px-6 py-6 text-right">0-30 Days</th>
                  <th className="px-6 py-6 text-right">31-60 Days</th>
                  <th className="px-6 py-6 text-right">61-90 Days</th>
                  <th className="px-6 py-6 text-right">90+ Days</th>
                  <th className="px-8 py-6 text-right bg-slate-900 text-indigo-400">Total Liability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] font-bold">
                {agingReport.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-5 bg-slate-50/30">
                       <p className="font-black text-slate-900 text-xs uppercase tracking-tight font-sans">{report.name}</p>
                       <p className="text-[9px] text-slate-400 font-sans">Contact: {report.phone}</p>
                    </td>
                    <td className="px-6 py-5 text-right text-emerald-600">{report.buckets.current.toLocaleString()}</td>
                    <td className="px-6 py-5 text-right text-amber-500">{report.buckets.thirtyPlus.toLocaleString()}</td>
                    <td className="px-6 py-5 text-right text-orange-600">{report.buckets.sixtyPlus.toLocaleString()}</td>
                    <td className="px-6 py-5 text-right text-rose-600">{report.buckets.ninetyPlus.toLocaleString()}</td>
                    <td className="px-8 py-5 text-right bg-indigo-50/30 text-slate-900 font-black text-sm">
                       Rs. {report.totalDue.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {agingReport.length === 0 && (
                  <tr><td colSpan={6} className="px-8 py-32 text-center text-slate-300 font-black uppercase tracking-widest font-sans italic">No outstanding liabilities detected in ledger.</td></tr>
                )}
              </tbody>
              <tfoot className="bg-slate-950 text-white font-black font-mono">
                <tr>
                   <td className="px-8 py-6 text-[10px] uppercase tracking-widest font-sans">Corporate Exposure</td>
                   <td className="px-6 py-6 text-right text-emerald-400">Rs. {agingReport.reduce((a,b) => a + b.buckets.current, 0).toLocaleString()}</td>
                   <td className="px-6 py-6 text-right text-amber-400">Rs. {agingReport.reduce((a,b) => a + b.buckets.thirtyPlus, 0).toLocaleString()}</td>
                   <td className="px-6 py-6 text-right text-orange-400">Rs. {agingReport.reduce((a,b) => a + b.buckets.sixtyPlus, 0).toLocaleString()}</td>
                   <td className="px-6 py-6 text-right text-rose-400">Rs. {agingReport.reduce((a,b) => a + b.buckets.ninetyPlus, 0).toLocaleString()}</td>
                   <td className="px-8 py-6 text-right text-indigo-400 text-lg">
                      Rs. {agingReport.reduce((a,b) => a + b.totalDue, 0).toLocaleString()}
                   </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === 'PERFORMANCE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th 
                    className="px-8 py-6 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    Vendor {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-right cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => toggleSort('spending')}
                  >
                    Total Spending {sortField === 'spending' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-right cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => toggleSort('fulfillment')}
                  >
                    Fulfillment Rate {sortField === 'fulfillment' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-6 font-black uppercase tracking-widest text-[10px] text-right cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => toggleSort('leadTime')}
                  >
                    Avg Lead Time (Days) {sortField === 'leadTime' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-center">Efficiency Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceReport.map(report => (
                  <tr key={report.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-8 py-6">
                       <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{report.name}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Orders: {report.totalOrders}</p>
                    </td>
                    <td className="px-6 py-6 text-right font-black font-mono text-slate-900">
                       Rs. {report.spending.toLocaleString()}
                    </td>
                    <td className="px-6 py-6 text-right">
                       <div className="flex flex-col items-end gap-1">
                          <span className="font-black text-slate-900 text-xs">{report.fulfillment.toFixed(1)}%</span>
                          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${report.fulfillment > 80 ? 'bg-emerald-500' : report.fulfillment > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${report.fulfillment}%`}}></div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-right font-black font-mono text-slate-500">
                       {report.leadTime.toFixed(1)} d
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          report.fulfillment >= 90 && report.leadTime <= 3 ? 'bg-emerald-100 text-emerald-700' :
                          report.fulfillment >= 70 ? 'bg-indigo-100 text-indigo-700' :
                          'bg-amber-100 text-amber-700'
                       }`}>
                          {report.fulfillment >= 90 && report.leadTime <= 3 ? 'Elite' : report.fulfillment >= 70 ? 'Standard' : 'Needs Review'}
                       </span>
                    </td>
                  </tr>
                ))}
                {performanceReport.length === 0 && (
                  <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-300 font-black uppercase tracking-widest italic">No data available for performance analysis.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedPO ? 'Modify Order' : 'Inventory Intake'}</h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Ref: {selectedPO?.id || 'New Acquisition'}</p>
              </div>
              <button onClick={closePOModal} className="text-slate-300 hover:text-slate-900 text-4xl leading-none">&times;</button>
            </div>
            
            <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Supplier</label>
                  <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-bold bg-white text-sm outline-none focus:border-indigo-500 uppercase">
                    <option value="" disabled>Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Settlement Pipeline</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-black bg-white text-[11px] outline-none focus:border-indigo-500 uppercase tracking-widest">
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash Payment</option>
                    <option value="CREDIT">Supplier Credit (Aging)</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                  </select>
                </div>

                {paymentMethod === 'CHEQUE' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cheque Number</label>
                      <input className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-black font-mono" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="000XXX" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Maturity Date</label>
                      <input type="date" className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-bold" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Manifest</h4>
                  <button onClick={handleAddItem} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all">+ Add Product</button>
                </div>
                
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-end p-6 bg-slate-50 rounded-[1.8rem] border border-slate-100 group animate-in slide-in-from-right-4 duration-300">
                    <div className="flex-[3]">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">SKU / Asset</label>
                      <select value={item.productId} onChange={e => updatePOItem(idx, 'productId', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white text-xs uppercase">
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Qty</label>
                      <input type="number" value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black font-mono text-xs" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Landed Cost</label>
                      <input type="number" value={item.cost} onChange={e => updatePOItem(idx, 'cost', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black font-mono text-xs text-indigo-600" />
                    </div>
                    <button onClick={() => removePOItem(idx)} className="p-3 bg-white text-rose-500 hover:bg-rose-50 rounded-xl border border-slate-100 shadow-sm transition-all">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Exposure</p>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">Rs. {totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleSavePO('DRAFT')} className="px-8 py-4 rounded-2xl border-2 border-slate-200 font-black text-slate-400 uppercase tracking-widest text-[10px] hover:bg-white transition-all">Save Draft</button>
                <button onClick={() => handleSavePO('PENDING')} className="px-12 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Authorize PO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Supplier Profile</h3>
              <button onClick={closeVendorModal} className="text-slate-300 hover:text-slate-900 text-4xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Legal Entity Name</label>
                <input required value={vName} onChange={e => setVName(e.target.value.toUpperCase())} className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-bold uppercase text-sm" placeholder="GLOBAL LOGISTICS LTD" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liaison Name</label>
                <input value={vContact} onChange={e => setVContact(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-bold text-sm" placeholder="Director of Sales" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact Link</label>
                  <input value={vPhone} onChange={e => setVPhone(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-black font-mono text-sm" placeholder="+94 11 ..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <input type="email" value={vEmail} onChange={e => setVEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-bold text-sm" placeholder="hq@vendor.com" />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-950 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-black transition-all mt-4 uppercase tracking-[0.2em] text-[10px]">Commit Supplier Profile</button>
            </form>
          </div>
        </div>
      )}

      {isReceiptModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-12 text-center space-y-8">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner border border-emerald-100">📥</div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Inventory Influx</h3>
                <p className="text-slate-500 font-medium mt-3 leading-relaxed px-4">Authorizing this receipt will update your warehouse stock and initialize a liability for <b>Rs. {selectedPO.totalAmount.toLocaleString()}</b>.</p>
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => setIsReceiptModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancel Manifest</button>
                <button 
                  onClick={() => { onReceivePO(selectedPO.id); setIsReceiptModalOpen(false); }} 
                  className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Authorize Receipt
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
