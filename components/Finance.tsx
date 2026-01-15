
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
  transactions, 
  accounts, 
  products,
  userProfile,
  daySessions,
  onOpenDay,
  onCloseDay,
  onAddExpense
}) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [showReportModal, setShowReportModal] = useState(false);
  
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
  }, [cashTransactions, currentSession, reportDate]);

  const handleOpenDayAction = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingInput) || 0;
    onOpenDay(val);
    setShowOpenModal(false);
    setOpeningInput('');
  };

  const handleCloseDayAction = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(closingInput) || 0;
    onCloseDay(val);
    setShowCloseModal(false);
    setClosingInput('');
    setShowReportModal(true); // Auto show report on close
  };

  const handleAddExpense = (e: React.FormEvent) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Finance & Cash Terminal</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Daily Ledger: <span className="text-indigo-600">{reportDate}</span></p>
        </div>
        <div className="flex items-center gap-3 no-print">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Select Date</span>
                <input type="date" className="border-none outline-none text-xs font-bold text-slate-700 bg-transparent" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
            {!currentSession ? (
              <button onClick={() => setShowOpenModal(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all">☀️ Open Day</button>
            ) : currentSession.status === 'OPEN' ? (
              <button onClick={() => setShowCloseModal(true)} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:scale-105 transition-all">🌙 Close Day</button>
            ) : (
              <span className="bg-slate-100 text-slate-500 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200">✅ Day Closed</span>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm no-print">
            <h3 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-xs">Real-time Asset Ledgers</h3>
            <div className="space-y-4">
              {accounts.map(acc => (
                <div key={acc.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-center group">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{acc.name}</p>
                    <p className="text-xl font-black text-slate-950 font-mono">Rs. {acc.balance.toLocaleString()}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-transform group-hover:rotate-12 ${acc.id === 'cash' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {acc.id === 'cash' ? '💵' : '🏦'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div onClick={() => setShowReportModal(true)} className="bg-slate-950 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group cursor-pointer active:scale-95 no-print transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <h3 className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.3em] mb-8">Session Cash Flow</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Opening Float</span><span className="font-bold text-slate-300 font-mono">Rs. {currentSession?.openingBalance.toLocaleString() || '0'}</span></div>
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Cash Inflows (+)</span><span className="font-black text-emerald-400 font-mono">Rs. {dayStats.cashIn.toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Cash Outflows (-)</span><span className="font-black text-rose-400 font-mono">Rs. {dayStats.cashOut.toLocaleString()}</span></div>
                <div className="border-t border-slate-800 pt-6 mt-4 flex justify-between items-end">
                  <div className="space-y-1"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Expected Final Cash</span><p className="text-3xl font-black font-mono tracking-tighter">Rs. {dayStats.expectedCash.toLocaleString()}</p></div>
                  <span className="text-[10px] font-black text-indigo-500 group-hover:translate-x-1 transition-transform">DETAILS →</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm no-print">
            <h3 className="font-black text-slate-800 mb-8 uppercase tracking-tighter text-xl">Quick Expense Logging</h3>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spending Description</label>
                <input required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value.toUpperCase()})} placeholder="E.G. OFFICE UTILITY REPAIR" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (LKR)</label>
                <input required type="number" step="0.01" className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono text-rose-600 outline-none focus:ring-4 focus:ring-indigo-500/10" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Source</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black bg-white cursor-pointer outline-none" value={expenseForm.method} onChange={e => setExpenseForm({...expenseForm, method: e.target.value as any})}>
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK">Bank Account</option>
                </select>
              </div>
              <button disabled={currentSession?.status === 'CLOSED'} className="md:col-span-2 bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[11px] disabled:opacity-50 disabled:cursor-not-allowed">Record Expenditure</button>
            </form>
          </div>
        </div>
      </div>

      {/* Manual Opening Balance Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
             <div className="p-10 space-y-8 text-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">☀️</div>
                <div className="space-y-2">
                    <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Open Day Session</h3>
                    <p className="text-slate-500 font-medium text-sm px-6">Manually enter the starting cash amount currently in your drawer.</p>
                </div>
                <form onSubmit={handleOpenDayAction} className="space-y-6">
                    <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">Rs.</span>
                        <input autoFocus type="number" step="0.01" className="w-full pl-16 pr-6 py-5 rounded-2xl border-2 border-slate-100 font-black text-2xl outline-none focus:border-indigo-600 text-indigo-600 bg-slate-50/50" value={openingInput} onChange={e => setOpeningInput(e.target.value)} placeholder="0.00" required />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowOpenModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase text-[10px]">Cancel</button>
                        <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-indigo-100">Initialize Float</button>
                    </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Manual Day Close / Audit Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
             <div className="p-10 space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                   <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🌙</div>
                   <div>
                       <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Close Day Audit</h3>
                       <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Mandatory Cash Count Confirmation</p>
                   </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Expected Cash</span>
                        <span className="font-black text-lg font-mono text-slate-900">Rs. {dayStats.expectedCash.toLocaleString()}</span>
                    </div>

                    <form onSubmit={handleCloseDayAction} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Cash Counted</label>
                            <input autoFocus type="number" step="0.01" className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 font-black text-3xl outline-none focus:border-rose-500 text-slate-900 bg-white shadow-inner" value={closingInput} onChange={e => setClosingInput(e.target.value)} placeholder="0.00" required />
                        </div>
                        
                        {closingInput && (
                            <div className={`p-5 rounded-2xl border ${Number(closingInput) - dayStats.expectedCash >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1">Variance Detected</p>
                                <p className="text-xl font-black font-mono">
                                    {Number(closingInput) - dayStats.expectedCash >= 0 ? '+' : ''}Rs. {(Number(closingInput) - dayStats.expectedCash).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setShowCloseModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase text-[10px]">Back</button>
                            <button type="submit" className="flex-[2] bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-2xl shadow-slate-200">Finalize & Lock Day</button>
                        </div>
                    </form>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Professional Close Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-12 duration-500 max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Day Closing Reconciliation</h3>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.3em] mt-1">Audit Record for {reportDate}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Print Report</button>
                <button onClick={() => setShowReportModal(false)} className="text-slate-300 text-4xl">&times;</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-12 print-content">
              <div className="grid grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Session Parameters</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between font-bold text-sm"><span>Opening Float (Manual)</span><span>Rs. {currentSession?.openingBalance.toLocaleString()}</span></div>
                        <div className="flex justify-between font-bold text-sm text-emerald-600"><span>Retail Inflows</span><span>+Rs. {dayStats.cashIn.toLocaleString()}</span></div>
                        <div className="flex justify-between font-bold text-sm text-rose-600"><span>Operational Outflows</span><span>-Rs. {dayStats.cashOut.toLocaleString()}</span></div>
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Cash Audit Results</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between font-bold text-sm"><span>System Expected Cash</span><span>Rs. {dayStats.expectedCash.toLocaleString()}</span></div>
                        <div className="flex justify-between font-bold text-sm text-indigo-600"><span>Actual Physical Cash</span><span>Rs. {currentSession?.actualClosing?.toLocaleString() || '0'}</span></div>
                        <div className={`flex justify-between font-black text-lg p-3 rounded-xl ${Number(currentSession?.actualClosing || 0) - dayStats.expectedCash >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            <span>Session Variance</span>
                            <span>Rs. {(Number(currentSession?.actualClosing || 0) - dayStats.expectedCash).toLocaleString()}</span>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4 pt-10 border-t border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Log</h4>
                 <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-black uppercase text-[9px] text-slate-400">
                        <tr><th className="px-6 py-3">Time</th><th className="px-6 py-3">Reference / Description</th><th className="px-6 py-3 text-right">Method</th><th className="px-6 py-3 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {cashTransactions.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 font-mono">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                <td className="px-6 py-4 font-bold">{t.description}</td>
                                <td className="px-6 py-4 text-right text-[10px] font-black">{t.paymentMethod}</td>
                                <td className={`px-6 py-4 text-right font-black ${t.type === 'SALE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type === 'SALE' ? '+' : '-'}Rs. {t.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
              </div>
            </div>

            <div className="p-10 bg-slate-950 text-white flex justify-between items-center">
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current System Balance</p>
                 <p className="text-3xl font-black font-mono">Rs. {accounts.find(a => a.id === 'cash')?.balance.toLocaleString()}</p>
               </div>
               <div className="text-right space-y-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Terminal Auditor</p>
                 <p className="text-xl font-bold uppercase tracking-widest">{userProfile.name}</p>
               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print-content, .print-content * { visibility: visible !important; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 20mm; background: white !important; color: black !important; }
          .print-header { display: block !important; visibility: visible !important; }
          .bg-slate-950 { background: white !important; color: black !important; border-top: 1px solid #000; }
          .text-white { color: black !important; }
          .print-content table { border-collapse: collapse; }
          .print-content td, .print-content th { border-bottom: 1px solid #eee; }
        }
      `}</style>
    </div>
  );
};

export default Finance;
