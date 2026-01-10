
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Product, BankAccount } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getBusinessSummary } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  accounts: BankAccount[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, products, accounts }) => {
  const [aiInsight, setAiInsight] = useState<string>('Analyzing real-time metrics...');

  const stats = useMemo(() => ({
    revenue: transactions.filter(t => t.type === 'SALE').reduce((acc, t) => acc + t.amount, 0),
    expenses: transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0),
    stockValue: products.reduce((acc, p) => acc + (p.cost * p.stock), 0),
    netBalance: accounts.reduce((acc, a) => acc + a.balance, 0),
  }), [transactions, products, accounts]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.lowStockThreshold);
  }, [products]);

  useEffect(() => {
    const fetchInsight = async () => {
      if (transactions.length > 0) {
        const text = await getBusinessSummary({ stats, recentTxs: transactions.slice(0, 5), lowStock: lowStockProducts.length });
        setAiInsight(text || '');
      } else {
        setAiInsight("Welcome back! Process transactions to activate your AI business coach.");
      }
    };
    fetchInsight();
  }, [transactions, lowStockProducts.length, stats]);

  const chartData = useMemo(() => {
    return transactions
      .filter(t => t.type === 'SALE')
      .slice(0, 15)
      .reverse()
      .map(t => ({ 
        date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        amount: t.amount 
      }));
  }, [transactions]);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">Strategic overview of your business operations</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Cash Register</p>
            <p className="text-xl font-extrabold text-indigo-600 leading-none mt-1">
              Rs. {accounts.find(a => a.id === 'cash')?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl shadow-inner">💵</div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: stats.revenue, color: 'text-indigo-600', icon: '💰', trend: '+12.5%' },
          { label: 'Operating Expenses', value: stats.expenses, color: 'text-rose-600', icon: '💸', trend: '-2.1%' },
          { label: 'Inventory Assets', value: stats.stockValue, color: 'text-amber-600', icon: '📦', trend: 'Stock ok' },
          { label: 'Liquid Capital', value: stats.netBalance, color: 'text-emerald-600', icon: '🏦', trend: '+Rs. 2.4k' },
        ].map((item, idx) => (
          <div key={idx} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm card-hover relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                item.color.replace('text', 'bg').replace('600', '100')
              } ${item.color}`}>
                {item.trend}
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={`text-2xl font-black ${item.color} tracking-tight`}>
              Rs. {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className="absolute -bottom-2 -right-2 opacity-[0.03] scale-[2] pointer-events-none group-hover:opacity-[0.06] transition-opacity">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Chart Area */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>📈</span> Revenue Trajectory
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Tracking last 15 successful transactions</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 rounded-lg">Daily</button>
                <button className="px-3 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-50 rounded-lg">Weekly</button>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                    tickFormatter={(val) => `Rs.${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px'}}
                    itemStyle={{fontSize: '14px', fontWeight: 'bold', color: '#4f46e5'}}
                    labelStyle={{fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px'}}
                    formatter={(val: number) => [`Rs. ${val.toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#4f46e5" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center gap-6 animate-in slide-in-from-left-4">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm border border-rose-200/50">⚠️</div>
              <div className="flex-1">
                <h4 className="font-bold text-rose-900 text-lg">Critical Inventory Alert</h4>
                <p className="text-sm text-rose-700 mt-1">
                  Action required: <span className="font-extrabold">{lowStockProducts.length}</span> units have fallen below safety thresholds.
                </p>
              </div>
              <button className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-rose-200">Refill Stock</button>
            </div>
          )}
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <div className="bg-slate-950 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50 group-hover:rotate-12 transition-transform">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-white tracking-tight">AI Insights</h3>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none">Powered by Gemini Pro</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-slate-300 leading-relaxed text-sm italic">
                  "{aiInsight}"
                </p>
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Suggested actions</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-bold text-indigo-400 border border-slate-800">Optimize Inventory</span>
                    <span className="bg-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-bold text-emerald-400 border border-slate-800">Check Margins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              <span>Quick Assets</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">Live</span>
            </h3>
            <div className="space-y-4">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm shadow-inner">
                      {acc.id === 'cash' ? '💵' : '🏦'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{acc.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Available Fund</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-900">Rs. {acc.balance.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Transaction Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Activity Log</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Detailed ledger of your latest operations</p>
          </div>
          <button className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50/50 text-slate-400">
              <tr>
                <th className="px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Timestamp</th>
                <th className="px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Classification</th>
                <th className="px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Operational Details</th>
                <th className="px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Method</th>
                <th className="px-8 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-slate-500 font-medium">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      tx.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 
                      tx.type === 'PURCHASE' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-800">{tx.description}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-tight">{tx.paymentMethod}</span>
                    </div>
                  </td>
                  <td className={`px-8 py-5 text-right font-black text-base ${tx.type === 'SALE' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.type === 'SALE' ? '+' : '-'}Rs. {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3 opacity-20">📁</span>
                      No operational records found for this period.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
