
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (v: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: 'DASHBOARD', icon: 'grid-outline', label: 'Dashboard', emoji: '📊' },
    { id: 'POS', icon: 'cart-outline', label: 'POS Terminal', emoji: '🛒' },
    { id: 'SALES_HISTORY', icon: 'time-outline', label: 'Sales History', emoji: '📜' },
    { id: 'INVENTORY', icon: 'cube-outline', label: 'Inventory', emoji: '📦' },
    { id: 'BARCODE_PRINT', icon: 'barcode-outline', label: 'Barcode Print', emoji: '🏷️' },
    { id: 'PURCHASES', icon: 'document-text-outline', label: 'Purchases', emoji: '📑' },
    { id: 'CUSTOMERS', icon: 'people-outline', label: 'Customers', emoji: '👥' },
    { id: 'FINANCE', icon: 'wallet-outline', label: 'Finance', emoji: '💰' },
    { id: 'CHEQUE_PRINT', icon: 'card-outline', label: 'Cheques', emoji: '🏦' },
  ];

  return (
    <div className="w-72 h-full bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl z-20">
      <div className="p-8 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <span className="font-black text-xl italic tracking-tighter">O</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">OmniBusiness</h1>
            <p className="text-[10px] text-indigo-400 mt-1 uppercase font-bold tracking-[0.2em]">Enterprise ERP</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`w-full group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className={`mr-4 text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.emoji}
              </span>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-200 animate-pulse"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 mt-4 border-t border-slate-900 bg-slate-950/50">
        <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-800/50">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-indigo-400 shadow-inner">
            AD
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Administrator</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Main Branch v4.2</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
