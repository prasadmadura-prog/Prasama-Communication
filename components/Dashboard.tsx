
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Product, BankAccount, Category, Vendor } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBusinessSummary } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  accounts: BankAccount[];
  vendors: Vendor[];
  categories?: Category[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, products, accounts, vendors, categories = [] }) => {
  const [aiInsight, setAiInsight] = useState<string>('Crunching real-time ledger data...');

  const stats = useMemo(() => ({
    revenue: transactions.filter(t => t.type === 'SALE').reduce((acc, t) => acc + Number(t.amount), 0),
    expenses: transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0),
    stockValue: products.reduce((acc, p) => acc + (Number(p.cost) * Number(p.stock)), 0),
    netBalance: accounts.reduce((acc, a) => acc + Number(a.balance), 0),
  }), [transactions, products, accounts]);

  // Cheque Notification Logic - Reminders 1 day before chequeDate
  const chequeAlerts = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return transactions.filter(t => 
      t.paymentMethod === 'CHEQUE' && 
      t.chequeDate === tomorrowStr
    );
  }, [transactions]);

  // Critical Inventory Logic
  const lowStockAlerts = useMemo(() => {
    return products.filter(p => p.stock <= p.lowStockThreshold).sort((a, b) => a.stock - b.stock);
  }, [products]);

  useEffect(() => {
    const fetchInsight = async () => {
      if (transactions.length > 0) {
        const text = await getBusinessSummary({ stats, recentTxs: transactions.slice(0, 5) });
        setAiInsight(text || '');
      } else {
        setAiInsight("Welcome. Process your first transaction to unlock AI-driven business intelligence.");
      }
    };
    fetchInsight();
  }, [transactions.length, stats]);

  const chartData = useMemo(() => {
    return transactions
      .filter(t => t.type === 'SALE')
      .slice(0, 10)
      .reverse()
      .map(t => ({ 
        date: new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), 
        amount: Number(t.amount) 
      }));
  }, [transactions]);

  const getPayeeName = (tx: Transaction) => {
    if (tx.vendorId) return vendors.find(v => v.id === tx.vendorId)?.name || 'Unknown Supplier';
    return tx.description || 'General Payee';
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Executive Summary</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">Performance metrics for the current cycle</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full animate-pulse ${lowStockAlerts.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {lowStockAlerts.length > 0 ? `${lowStockAlerts.length} Stock Alerts` : 'Inventory Healthy'}
          </span>
        </div>
      </header>

      {/* Critical Stock Alerts - HIGH PRIORITY */}
      {lowStockAlerts.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-rose-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
              <span className="text-8xl">📦</span>
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-200">Inventory Depletion Alert</p>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Critical Stock Shortfall</h3>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                  <span className="text-xs font-black uppercase tracking-widest">{lowStockAlerts.length} Items Below Threshold</span>
                </div>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {lowStockAlerts.map(p => (
                  <div key={p.id} className="min-w-[280px] bg-white/10 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/20 flex flex-col justify-between group hover:bg-white/20 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-200 font-mono">{p.sku}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${p.stock === 0 ? 'bg-rose-950 text-rose-300' : 'bg-amber-500/30 text-amber-200'}`}>
                          {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </div>
                      <p className="font-bold text-sm uppercase truncate mb-3">{p.name}</p>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/10 pt-3">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase text-rose-200 opacity-60 tracking-widest">Available</p>
                        <p className="text-xl font-black font-mono">{p.stock}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[9px] font-black uppercase text-rose-200 opacity-60 tracking-widest">Threshold</p>
                        <p className="text-sm font-bold opacity-80">{p.lowStockThreshold}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Notifications - HIGH PRIORITY */}
      {chequeAlerts.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <span className="text-8xl">✍️</span>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Financial Maturity Alert</p>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Settlements Due Tomorrow</h3>
                <p className="text-indigo-100 text-sm font-medium opacity-80">System has identified {chequeAlerts.length} cheques requiring clearance verification in 24 hours.</p>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                {chequeAlerts.map(tx => (
                  <div key={tx.id} className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 flex justify-between items-center gap-8">
                    <div className="min-w-[150px]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">CHQ: {tx.chequeNumber}</p>
                      <p className="font-bold text-sm uppercase truncate">{getPayeeName(tx)}</p>
                    </div>
                    <p className="font-black font-mono text-lg whitespace-nowrap">Rs. {Number(tx.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Sales', value: stats.revenue, trend: '+14%', color: 'text-indigo-600', bg: 'bg-indigo-50/50', icon: '󰄿' },
          { label: 'Expenditure', value: stats.expenses, trend: '-2%', color: 'text-rose-600', bg: 'bg-rose-50/50', icon: '󰈀' },
          { label: 'Asset Value', value: stats.stockValue, trend: 'Stable', color: 'text-amber-600', bg: 'bg-amber-50/50', icon: '󰏖' },
          { label: 'Available Liquidity', value: stats.netBalance, trend: 'Net', color: 'text-emerald-600', bg: 'bg-emerald-50/50', icon: '󰟵' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-xl hover:border-indigo-100 transition-all group">
            <div className="flex justify-between items-center mb-5">
              <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center text-xl`}>
                <span className={item.color}>•</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${item.color} ${item.bg}`}>
                {item.trend}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={`text-2xl font-bold text-slate-900 tracking-tight`}>
              Rs. {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">Revenue Velocity</h3>
            <select className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border-none outline-none">
              <option>Last 7 Days</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Sales']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#chartGrad)" animationDuration={1000}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden ring-1 ring-white/10 h-full flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-xs">✨</div>
                <h3 className="font-bold text-sm tracking-tight uppercase">AI Business Advisory</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic font-medium">"{aiInsight}"</p>
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gemini Intelligent Engine</span>
                <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors">Re-analyze Data</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
