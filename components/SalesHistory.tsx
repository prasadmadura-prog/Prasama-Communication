
import React, { useState, useMemo } from 'react';
import { Transaction, Product, Customer, UserProfile } from '../types';

interface SalesHistoryProps {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  userProfile: UserProfile;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ 
  transactions = [], 
  products = [], 
  customers = [], 
  userProfile, 
  onUpdateTransaction,
  onDeleteTransaction
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(today);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAID' | 'DUE'>('ALL');

  const sales = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => t && t.type === 'SALE');
  }, [transactions]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const txId = (s.id || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = txId.includes(search);
      const matchesDate = !filterDate || (typeof s.date === 'string' && s.date.startsWith(filterDate));
      
      const isDue = s.paymentMethod === 'CREDIT';
      const matchesTab = activeTab === 'ALL' || (activeTab === 'PAID' && !isDue) || (activeTab === 'DUE' && isDue);

      return matchesSearch && matchesDate && matchesTab;
    });
  }, [sales, searchTerm, filterDate, activeTab]);

  const summaryStats = useMemo(() => {
    const daySales = sales.filter(s => !filterDate || (typeof s.date === 'string' && s.date.startsWith(filterDate)));
    const paidAmount = daySales.filter(s => s.paymentMethod !== 'CREDIT').reduce((a, b) => a + Number(b.amount), 0);
    const dueAmount = daySales.filter(s => s.paymentMethod === 'CREDIT').reduce((a, b) => a + Number(b.amount), 0);
    return { paidAmount, dueAmount };
  }, [sales, filterDate]);

  const getCustomerName = (id?: string) => {
    if (!id) return 'Walk-in Customer';
    return customers.find(c => c && c.id === id)?.name || 'Credit Client';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sales Architecture</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Operational Ledger & Settlement Analysis</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveTab('ALL')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All</button>
            <button onClick={() => setActiveTab('PAID')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'PAID' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Settled</button>
            <button onClick={() => setActiveTab('DUE')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'DUE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Due</button>
          </div>
          <input type="date" className="px-6 py-2 rounded-2xl border border-slate-200 text-xs font-black outline-none bg-white" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Daily Volume</p>
            <p className="text-2xl font-black text-slate-900">{filteredSales.length} Entries</p>
         </div>
         <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Settled (Cash/Bank)</p>
            <p className="text-2xl font-black text-emerald-700 font-mono">Rs. {summaryStats.paidAmount.toLocaleString()}</p>
         </div>
         <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100 shadow-sm">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Due (Receivables)</p>
            <p className="text-2xl font-black text-rose-700 font-mono">Rs. {summaryStats.dueAmount.toLocaleString()}</p>
         </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-400">
            <tr>
              <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px]">Ref & Time</th>
              <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px]">Client</th>
              <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px]">Status</th>
              <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-right">Net Value</th>
              <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSales.map(tx => (
              <tr key={tx.id} className="hover:bg-indigo-50/30 transition-all cursor-pointer group">
                <td className="px-8 py-6">
                  <p className="font-black text-slate-900 text-[13px] uppercase">{tx.id}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-8 py-6 font-black text-slate-700 uppercase tracking-tighter">
                   {getCustomerName(tx.customerId)}
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${tx.paymentMethod === 'CREDIT' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {tx.paymentMethod === 'CREDIT' ? 'Due' : 'Settled'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right font-black font-mono text-slate-900 text-[15px]">
                  Rs. {Number(tx.amount).toLocaleString()}
                </td>
                <td className="px-8 py-6 text-center">
                  <button onClick={(e) => { e.stopPropagation(); onDeleteTransaction(tx.id); }} className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-rose-50 text-rose-500">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistory;
