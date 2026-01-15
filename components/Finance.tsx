
import React, { useState, useMemo } from 'react';
import { Transaction, BankAccount, RecurringExpense, Product, UserProfile, DaySession } from '../types';

interface FinanceProps {
  transactions: Transaction[];
  accounts: BankAccount[];
  products: Product[];
  userProfile: UserProfile;
  daySessions: DaySession[];
  onOpenDay: (opening: number) => void;
  onCloseDay: (actual: number) => void;
  onAddExpense: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  recurringExpenses: RecurringExpense[];
  onAddRecurring: (schedule: RecurringExpense) => void;
  onDeleteRecurring: (id: string) => void;
}

const Finance: React.FC<FinanceProps> = ({ 
  transactions, accounts, userProfile, daySessions, onOpenDay, onCloseDay, onAddExpense
}) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingInput, setOpeningInput] = useState('');
  const [closingInput, setClosingInput] = useState('');
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', method: 'CASH' as 'CASH' | 'BANK' });

  const currentSession = useMemo(() => daySessions.find(s => s.date === reportDate), [daySessions, reportDate]);
  const dayTransactions = useMemo(() => transactions.filter(t => t.date.split('T')[0] === reportDate), [transactions, reportDate]);
  const cashTransactions = useMemo(() => dayTransactions.filter(t => t.paymentMethod === 'CASH'), [dayTransactions]);
  
  const dayStats = useMemo(() => {
    const cashIn = cashTransactions.filter(t => t.type === 'SALE' || t.type === 'CREDIT_PAYMENT').reduce((acc, t) => acc + Number(t.amount), 0);
    const cashOut = cashTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'PURCHASE').reduce((acc, t) => acc + Number(t.amount), 0);
    const expectedCash = (currentSession?.openingBalance || 0) + cashIn - cashOut;
    return { cashIn, cashOut, expectedCash };
  }, [cashTransactions, currentSession]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;
    onAddExpense({ type: 'EXPENSE', amount: parseFloat(expenseForm.amount), paymentMethod: expenseForm.method, description: expenseForm.description });
    setExpenseForm({ description: '', amount: '', method: 'CASH' });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Finance & Ledger</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Strategic Cash Flow Audit: <span className="text-indigo-600">{reportDate}</span></p>
        </div>
        <div className="flex gap-3">
          <input type="date" className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black outline-none" value={reportDate} onChange={e => setReportDate(e.target.value)} />
          {!currentSession ? (
            <button onClick={() => setShowOpenModal(true)} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-xl">☀️ Open Session</button>
          ) : currentSession.status === 'OPEN' ? (
            <button onClick={() => setShowCloseModal(true)} className="bg-rose-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-xl">🌙 Close Session</button>
          ) : (
            <span className="bg-slate-100 text-slate-500 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase border border-slate-200">✅ Closed</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Asset Balances</h3>
            <div className="space-y-4">
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-black text-slate-600 uppercase">{acc.name}</span>
                  <span className="text-lg font-black font-mono">Rs. {acc.balance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <div className="relative z-10 space-y-4">
                <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest">Day Session Audit</p>
                <div className="flex justify-between text-xs"><span>Expected In-Hand</span><span className="font-mono font-black">Rs. {dayStats.expectedCash.toLocaleString()}</span></div>
                <div className="border-t border-slate-800 pt-4 flex justify-between">
                   <span className="text-slate-500 font-bold uppercase text-[10px]">Status</span>
                   <span className={`font-black text-[10px] uppercase ${currentSession?.status === 'OPEN' ? 'text-emerald-400' : 'text-rose-400'}`}>{currentSession?.status || 'NOT INITIALIZED'}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase mb-8">Expenditure Logging</h3>
          <form onSubmit={handleAddExpense} className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Description</label>
              <input required className="w-full px-5 py-3 rounded-xl border border-slate-200 font-bold uppercase" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Amount (Rs.)</label>
              <input type="number" required className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black font-mono text-rose-600" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Payment From</label>
              <select className="w-full px-5 py-3 rounded-xl border border-slate-200 font-black bg-white" value={expenseForm.method} onChange={e => setExpenseForm({...expenseForm, method: e.target.value as any})}>
                <option value="CASH">CASH DRAWER</option>
                <option value="BANK">BANK ACCOUNT</option>
              </select>
            </div>
            <button disabled={!currentSession || currentSession.status === 'CLOSED'} className="col-span-2 bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-30">Record Operational Expense</button>
          </form>
        </div>
      </div>

      {showOpenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center space-y-6">
              <h3 className="text-2xl font-black text-slate-900 uppercase">Initialize Float</h3>
              <input type="number" autoFocus className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 text-3xl font-black font-mono text-center text-indigo-600" placeholder="0.00" value={openingInput} onChange={e => setOpeningInput(e.target.value)} />
              <div className="flex gap-3">
                 <button onClick={() => setShowOpenModal(false)} className="flex-1 font-bold text-slate-400 uppercase text-[10px]">Cancel</button>
                 <button onClick={() => { onOpenDay(parseFloat(openingInput) || 0); setShowOpenModal(false); setOpeningInput(''); }} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-[10px]">Open Day Session</button>
              </div>
           </div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center space-y-6">
              <h3 className="text-2xl font-black text-slate-900 uppercase">Close Day Count</h3>
              <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center text-xs font-bold text-slate-400"><span>System Expected</span><span>Rs. {dayStats.expectedCash.toLocaleString()}</span></div>
              <input type="number" autoFocus className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 text-3xl font-black font-mono text-center text-rose-600" placeholder="0.00" value={closingInput} onChange={e => setClosingInput(e.target.value)} />
              <div className="flex gap-3">
                 <button onClick={() => setShowCloseModal(false)} className="flex-1 font-bold text-slate-400 uppercase text-[10px]">Back</button>
                 <button onClick={() => { onCloseDay(parseFloat(closingInput) || 0); setShowCloseModal(false); setClosingInput(''); }} className="flex-[2] bg-rose-600 text-white py-4 rounded-xl font-black uppercase text-[10px]">Authorize Close</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
