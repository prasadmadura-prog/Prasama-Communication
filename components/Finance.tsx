
import React, { useState, useMemo } from 'react';
import { Transaction, BankAccount } from '../types';

interface FinanceProps {
  transactions: Transaction[];
  accounts: BankAccount[];
  onAddExpense: (tx: Omit<Transaction, 'id' | 'date'>) => void;
}

const Finance: React.FC<FinanceProps> = ({ transactions, accounts, onAddExpense }) => {
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', method: 'CASH' as 'CASH' | 'BANK' });
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  const handleExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;
    
    onAddExpense({
      type: 'EXPENSE',
      amount: parseFloat(expenseForm.amount),
      paymentMethod: expenseForm.method,
      description: expenseForm.description
    });

    setExpenseForm({ description: '', amount: '', method: 'CASH' });
  };

  const dayStats = useMemo(() => {
    const dayTxs = transactions.filter(t => t.date.split('T')[0] === reportDate);
    return {
      sales: dayTxs.filter(t => t.type === 'SALE').reduce((acc, t) => acc + t.amount, 0),
      purchases: dayTxs.filter(t => t.type === 'PURCHASE').reduce((acc, t) => acc + t.amount, 0),
      expenses: dayTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0),
      cashIn: dayTxs.filter(t => t.paymentMethod === 'CASH' && t.type === 'SALE').reduce((acc, t) => acc + t.amount, 0),
      cashOut: dayTxs.filter(t => t.paymentMethod === 'CASH' && (t.type === 'EXPENSE' || t.type === 'PURCHASE')).reduce((acc, t) => acc + t.amount, 0),
    };
  }, [transactions, reportDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Finance & Cash Flow</h2>
          <p className="text-slate-500">Manage accounts and maintain daily balances</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-400 uppercase ml-2">Report Date:</label>
          <input type="date" className="border-none outline-none text-sm font-bold text-indigo-600 cursor-pointer" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><span>🏦</span> Current Balances</h3>
            <div className="space-y-4">
              {accounts.map(acc => (
                <div key={acc.id} className="p-4 rounded-xl bg-slate-50 flex justify-between items-center border border-slate-200/50 hover:border-indigo-200 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{acc.name}</p>
                    <p className="text-xl font-black text-slate-900">Rs. {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${acc.id === 'cash' ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                    {acc.id === 'cash' ? '💵' : '🏢'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Daily Cash Register</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-sm opacity-70">Cash Sales (+)</span><span className="font-bold text-emerald-400">+Rs. {dayStats.cashIn.toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm opacity-70">Cash Expenses (-)</span><span className="font-bold text-rose-400">-Rs. {dayStats.cashOut.toFixed(2)}</span></div>
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center"><span className="text-sm font-bold">Net Cash Flow</span><span className={`text-lg font-black ${(dayStats.cashIn - dayStats.cashOut) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Rs. {(dayStats.cashIn - dayStats.cashOut).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2"><span>📉</span> Record Expenditure</h3>
          <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Expense Description</label>
              <input required type="text" placeholder="Office supplies, utilities, rent..." className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount (Rs.)</label>
              <input required type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Payment Method</label>
              <select className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={expenseForm.method} onChange={(e) => setExpenseForm(prev => ({ ...prev, method: e.target.value as 'CASH' | 'BANK' }))}>
                <option value="CASH">Cash Drawer</option>
                <option value="BANK">Bank Account</option>
              </select>
            </div>
            <div className="md:col-span-2 pt-2"><button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"><span>➕</span> Record Expense</button></div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex justify-between items-center mb-4"><h4 className="text-xs font-bold text-slate-400 uppercase">Recent Financial Activity</h4></div>
            <div className="space-y-3">
              {transactions.filter(t => t.type !== 'SALE').slice(0, 5).map(tx => (
                <div key={tx.id} className="group flex justify-between items-center text-sm p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${tx.type === 'PURCHASE' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{tx.type === 'PURCHASE' ? '📦' : '📉'}</div>
                    <div><span className="font-bold block text-slate-800">{tx.description}</span><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{tx.paymentMethod} • {new Date(tx.date).toLocaleDateString()}</span></div>
                  </div>
                  <span className={`font-black ${tx.type === 'SALE' ? 'text-emerald-600' : 'text-rose-600'}`}>-Rs. {tx.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;
