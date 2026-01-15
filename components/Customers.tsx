
import React, { useState, useMemo } from 'react';
import { Customer, Transaction } from '../types';

interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  onUpsertCustomer: (customer: Customer) => void;
  onReceivePayment: (tx: Omit<Transaction, 'id' | 'date'>) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, transactions, onUpsertCustomer, onReceivePayment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedForPayment, setSelectedForPayment] = useState<Customer | null>(null);
  const [selectedForHistory, setSelectedForHistory] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  
  const [searchTerm, setSearchTerm] = useState('');

  const handleSaveCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerData: Customer = {
      id: editingCustomer?.id || `CUS-${Date.now()}`,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      creditLimit: parseFloat(formData.get('creditLimit') as string) || 0,
      totalCredit: editingCustomer?.totalCredit || 0,
    };

    onUpsertCustomer(customerData);
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForPayment || !paymentAmount) return;

    onReceivePayment({
      type: 'CREDIT_PAYMENT',
      amount: parseFloat(paymentAmount),
      paymentMethod,
      customerId: selectedForPayment.id,
      description: `Credit Payment from ${selectedForPayment.name}`
    });

    setIsPaymentModalOpen(false);
    setSelectedForPayment(null);
    setPaymentAmount('');
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) || 
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(lowerSearch)
    );
  }, [customers, searchTerm]);

  const customerHistory = useMemo(() => {
    if (!selectedForHistory) return [];
    return transactions
      .filter(t => t.customerId === selectedForHistory.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedForHistory]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Credit Portfolio</h2>
          <p className="text-slate-500 font-medium">Strategic debt management and receivable tracking</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} 
          className="bg-slate-950 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-2"
        >
          <span>👤</span> Add Client Account
        </button>
      </div>

      <div className="relative group max-w-2xl">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-indigo-500">🔍</span>
        <input 
          type="text" 
          placeholder="Filter clients by name, phone or email..." 
          className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-800 bg-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCustomers.map(c => {
          const usagePercent = Math.min((c.totalCredit / c.creditLimit) * 100, 100);
          return (
            <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all space-y-6 group">
              <div className="flex justify-between items-start">
                <div className="cursor-pointer" onClick={() => { setSelectedForHistory(c); setIsHistoryModalOpen(true); }}>
                  <h3 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight mb-1">{c.name}</h3>
                  <p className="text-xs font-bold text-slate-400 font-mono tracking-widest">{c.phone}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">👤</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                  <span className="text-slate-400">Credit Utilization</span>
                  <span className={c.totalCredit >= c.creditLimit ? 'text-rose-500' : 'text-slate-600'}>
                    {usagePercent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full transition-all duration-1000 ${usagePercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="flex justify-between items-end pt-1">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding</p>
                    <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">Rs. {c.totalCredit.toLocaleString()}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit</p>
                    <p className="text-sm font-bold text-slate-500 font-mono tracking-tighter">Rs. {c.creditLimit.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                   <button 
                    onClick={() => { setSelectedForPayment(c); setIsPaymentModalOpen(true); }} 
                    className="flex-1 bg-emerald-600 text-white text-[10px] font-black py-3 rounded-xl hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Receive Pay
                  </button>
                  <button 
                    onClick={() => { setSelectedForHistory(c); setIsHistoryModalOpen(true); }} 
                    className="flex-1 bg-indigo-50 text-indigo-600 text-[10px] font-black py-3 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 uppercase tracking-widest border border-indigo-100"
                  >
                    View Ledger
                  </button>
                </div>
                <button 
                  onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} 
                  className="w-full bg-slate-50 text-slate-600 text-[10px] font-black py-3 rounded-xl hover:bg-slate-100 transition-all active:scale-95 uppercase tracking-widest border border-slate-100"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )})}
        
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-32 text-center text-slate-300">
            <div className="flex flex-col items-center gap-6">
              <div className="text-7xl grayscale opacity-20">👥</div>
              <p className="text-xl font-black text-slate-500 tracking-tight">No match found for "{searchTerm}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Client Profile</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }} className="text-slate-400 text-3xl">&times;</button>
              </div>
              <form onSubmit={handleSaveCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Legal Entity Name</label>
                    <input name="name" defaultValue={editingCustomer?.name} required className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Contact</label>
                    <input name="phone" defaultValue={editingCustomer?.phone} required className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none font-mono font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Credit Limit (Rs.)</label>
                    <input name="creditLimit" type="number" defaultValue={editingCustomer?.creditLimit} required className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none font-black font-mono text-indigo-600" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                    <input name="email" type="email" defaultValue={editingCustomer?.email} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none font-bold" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Address</label>
                    <textarea name="address" defaultValue={editingCustomer?.address} rows={2} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none font-medium" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancel</button>
                  <button type="submit" className="flex-[2] bg-slate-950 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[10px]">Save Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedForPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 space-y-8 text-center">
              <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Debt Settlement</h3>
              
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Outstanding</p>
                <p className="text-3xl font-black text-emerald-700 font-mono tracking-tighter">Rs. {selectedForPayment.totalCredit.toLocaleString()}</p>
              </div>

              <form onSubmit={handleReceivePayment} className="space-y-6 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Amount (Rs.)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    max={selectedForPayment.totalCredit} 
                    required 
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-black font-mono text-2xl text-center text-emerald-600" 
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Method</p>
                   <div className="flex gap-2">
                     <button type="button" onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${paymentMethod === 'CASH' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>💵 Cash</button>
                     <button type="button" onClick={() => setPaymentMethod('BANK')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${paymentMethod === 'BANK' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>🏦 Bank</button>
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsPaymentModalOpen(false); setSelectedForPayment(null); }} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancel</button>
                  <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-[10px]">Authorize</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History / Ledger Modal */}
      {isHistoryModalOpen && selectedForHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Account Ledger</h3>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-[0.3em] mt-1">{selectedForHistory.name}</p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</p>
                    <p className="text-xl font-black text-rose-600 font-mono">Rs. {selectedForHistory.totalCredit.toLocaleString()}</p>
                 </div>
                 <button onClick={() => { setIsHistoryModalOpen(false); setSelectedForHistory(null); }} className="text-slate-300 text-4xl hover:text-slate-500 transition-colors">&times;</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10">
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Date & Time</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Transaction ID</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Description</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-right">Debit (+)</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-right">Credit (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {customerHistory.length > 0 ? customerHistory.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="text-slate-900">{new Date(tx.date).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{tx.id}</span>
                        </td>
                        <td className="px-8 py-5 text-slate-500 text-xs">
                          {tx.description}
                          <div className="flex gap-1 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-400">{tx.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-black font-mono text-rose-500">
                          {tx.type === 'SALE' ? `+Rs. ${tx.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-8 py-5 text-right font-black font-mono text-emerald-600">
                          {tx.type === 'CREDIT_PAYMENT' ? `-Rs. ${tx.amount.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-300 italic">
                           <p className="text-4xl mb-4 grayscale opacity-20">📜</p>
                           No credit history records found for this client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center no-print">
               <div className="flex gap-4">
                  <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase text-slate-500 hover:border-slate-400 transition-all">Print Statement</button>
                  <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase text-slate-500 hover:border-slate-400 transition-all">Export Excel</button>
               </div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">All values are in Sri Lankan Rupees (LKR)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
