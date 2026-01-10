
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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedForPayment, setSelectedForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');

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

  const customerHistory = useMemo(() => {
    if (!editingCustomer) return [];
    return transactions.filter(t => t.customerId === editingCustomer.id);
  }, [transactions, editingCustomer]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Credit Customers</h2>
          <p className="text-slate-500">Manage debtors and receive payments</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">
          + Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(c => {
          const usagePercent = Math.min((c.totalCredit / c.creditLimit) * 100, 100);
          return (
            <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{c.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{c.phone}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-400">Credit Used</span>
                  <span className={c.totalCredit >= c.creditLimit ? 'text-rose-500' : 'text-slate-600'}>
                    Rs. {c.totalCredit.toLocaleString()} / Rs. {c.creditLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${usagePercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button onClick={() => { setSelectedForPayment(c); setIsPaymentModalOpen(true); }} className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-700 transition-colors">Receive Pay</button>
                <button onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} className="px-4 bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors">Edit</button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-200">
            <div className="flex-1 p-8 space-y-6">
              <h3 className="font-bold text-xl">Customer Profile</h3>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</label><input name="name" defaultValue={editingCustomer?.name} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</label><input name="phone" defaultValue={editingCustomer?.phone} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credit Limit (Rs.)</label><input name="creditLimit" type="number" step="1" defaultValue={editingCustomer?.creditLimit} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200" /></div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }} className="flex-1 py-3 font-bold text-slate-500">Close</button>
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg">Save Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 space-y-6">
              <h3 className="font-bold text-xl">Receive Debt Payment</h3>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Outstanding Debt</p>
                <p className="text-3xl font-black text-indigo-700">Rs. {selectedForPayment.totalCredit.toLocaleString()}</p>
              </div>
              <form onSubmit={handleReceivePayment} className="space-y-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount (Rs.)</label><input type="number" step="0.01" max={selectedForPayment.totalCredit} required className="w-full px-4 py-3 rounded-xl border border-slate-200" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-emerald-700">Record Payment</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
