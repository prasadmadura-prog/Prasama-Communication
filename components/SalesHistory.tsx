
import React, { useState, useMemo } from 'react';
import { Transaction, Product, Customer, UserProfile } from '../types';

interface SalesHistoryProps {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  userProfile: UserProfile;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ transactions = [], products = [], customers = [], userProfile }) => {
  const today = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(today);

  // Safely extract sales transactions
  const sales = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => t && t.type === 'SALE');
  }, [transactions]);

  // Robust filtering logic to prevent white screen crashes
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      try {
        const txId = (s.id || "").toLowerCase();
        const txDesc = (s.description || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        
        const matchesSearch = txId.includes(search) || txDesc.includes(search);
        
        // Ensure date exists and is a string before calling startsWith
        const matchesDate = !filterDate || (typeof s.date === 'string' && s.date.startsWith(filterDate));
        
        return matchesSearch && matchesDate;
      } catch (e) {
        console.error("Error filtering transaction:", s, e);
        return false;
      }
    });
  }, [sales, searchTerm, filterDate]);

  const stats = useMemo(() => {
    const total = filteredSales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const discount = filteredSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
    return { total, discount, count: filteredSales.length };
  }, [filteredSales]);

  const getCustomerName = (id?: string) => {
    if (!id) return 'Walk-in Customer';
    if (!Array.isArray(customers)) return 'Walk-in Customer';
    return customers.find(c => c && c.id === id)?.name || 'Unknown Customer';
  };

  const handlePrintFullReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredSales.map(tx => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-size: 11px;">${tx.date ? new Date(tx.date).toLocaleDateString() + ' ' + new Date(tx.date).toLocaleTimeString() : 'N/A'}</td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold;">${tx.id || 'N/A'}</td>
        <td style="padding: 10px; font-size: 11px;">${getCustomerName(tx.customerId)}</td>
        <td style="padding: 10px; font-size: 11px; text-transform: uppercase;">${tx.paymentMethod || 'N/A'}</td>
        <td style="padding: 10px; font-size: 11px; text-align: right;">Rs. ${(Number(tx.discount) || 0).toFixed(2)}</td>
        <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold;">Rs. ${(Number(tx.amount) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report - ${filterDate || 'Full History'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header img { max-width: 50mm; max-height: 20mm; margin-bottom: 10px; display: block; }
            h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px 10px; background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            .summary-box { background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 30px; display: flex; justify-content: flex-end; gap: 40px; }
            .summary-item { text-align: right; }
            .summary-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .summary-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            @page { margin: 20mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>
              ${userProfile.logo ? `<img src="${userProfile.logo}" alt="Logo" />` : ''}
              <h1>${userProfile.name}</h1>
              <p style="margin: 4px 0; font-size: 12px; font-weight: 600; color: #64748b;">${userProfile.branch}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 18px; color: #4f46e5;">SALES PERFORMANCE REPORT</h2>
              <p style="margin: 4px 0; font-size: 11px; font-weight: 700;">Date Range: ${filterDate || 'All Time'}</p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>TX ID</th>
                <th>Customer</th>
                <th>Method</th>
                <th style="text-align: right;">Discount</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Total Transactions</div>
              <div class="summary-value">${stats.count}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Discounts Given</div>
              <div class="summary-value">Rs. ${stats.discount.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Net Realized Revenue</div>
              <div class="summary-value" style="color: #4f46e5;">Rs. ${stats.total.toLocaleString()}</div>
            </div>
          </div>
          <div style="margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 10px; color: #94a3b8;">
            End of Report • PRASAMA Strategic ERP Systems
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Date', 'Time', 'Transaction ID', 'Customer', 'Method', 'Discount', 'Total Amount (Rs.)'];
    const rows = filteredSales.map(tx => [
      tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A',
      tx.date ? new Date(tx.date).toLocaleTimeString() : 'N/A',
      tx.id || 'N/A',
      getCustomerName(tx.customerId),
      tx.paymentMethod || 'N/A',
      (Number(tx.discount) || 0).toFixed(2),
      (Number(tx.amount) || 0).toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sales_History_${filterDate || 'all_time'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReceipt = (tx: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const subtotal = tx.items?.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0) || (Number(tx.amount) + (Number(tx.discount) || 0));
    const itemsHtml = tx.items?.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      return `
        <div style="margin-bottom: 8px;">
          <div style="font-weight: 800; font-size: 16px; color: #000;">${product?.name || 'Unknown Item'}</div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #000; margin-top: 2px;">
            <span>${item.quantity} x Rs. ${(Number(item.price) || 0).toFixed(2)}</span>
            <span>Rs. ${(Number(item.quantity) * Number(item.price) || 0).toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('') || '<p style="text-align:center">No item details available</p>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${tx.id || 'TX'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
            body { font-family: 'JetBrains Mono', monospace; width: 80mm; margin: 0; padding: 5mm; color: #000; background: #fff; font-size: 14px; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 1.5px dashed #000; padding-bottom: 10px; }
            .header img { max-width: 60mm; max-height: 25mm; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
            .meta { font-size: 13px; font-weight: 700; margin-bottom: 20px; }
            .items { margin-bottom: 20px; border-bottom: 1.5px dashed #000; padding-bottom: 10px; }
            .totals { margin-bottom: 25px; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
            .grand-total { font-size: 24px; font-weight: 800; border-top: 3px solid #000; margin-top: 10px; padding-top: 10px; }
            .footer { text-align: center; font-size: 12px; font-weight: 700; margin-top: 30px; border-top: 1.5px dashed #000; padding-top: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            ${userProfile.logo ? `<img src="${userProfile.logo}" alt="Logo" />` : ''}
            <h1>${userProfile.name}</h1>
            <p>${userProfile.branch}</p>
          </div>
          <div class="meta">
            <div>DATE: ${tx.date ? new Date(tx.date).toLocaleDateString() + ' ' + new Date(tx.date).toLocaleTimeString() : 'N/A'}</div>
            <div>TXID: ${tx.id || 'N/A'}</div>
            <div>CUSTOMER: ${getCustomerName(tx.customerId)}</div>
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>Rs. ${subtotal.toFixed(2)}</span></div>
            ${tx.discount && Number(tx.discount) > 0 ? `<div class="total-row"><span>Discount</span><span>- Rs. ${(Number(tx.discount)).toFixed(2)}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${(Number(tx.amount) || 0).toFixed(2)}</span></div>
            <div class="total-row" style="margin-top: 10px; font-size: 14px;"><span>Method</span><span>${tx.paymentMethod || 'CASH'}</span></div>
          </div>
          <div class="footer"><p>THANK YOU!</p></div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales History</h2>
          <p className="text-slate-500">View and manage past retail transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrintFullReport}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg"
          >
            <span>📄</span> Generate PDF Report
          </button>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by Transaction ID or Details..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
            <input 
              type="date" 
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium outline-none"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <button 
                onClick={() => setFilterDate('')}
                className="px-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 font-bold text-xs uppercase"
            >
                Clear
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Date & Time</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Transaction ID</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Customer</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Method</th>
                <th className="px-6 py-4 font-semibold text-right uppercase tracking-widest text-[10px]">Discount</th>
                <th className="px-6 py-4 font-semibold text-right uppercase tracking-widest text-[10px]">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-center uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? filteredSales.map(tx => (
                <tr key={tx.id || Math.random().toString()} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600">
                    <p className="font-medium">{tx.date ? new Date(tx.date).toLocaleDateString() : 'Invalid Date'}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{tx.date ? new Date(tx.date).toLocaleTimeString() : ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs">{tx.id || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{getCustomerName(tx.customerId)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      tx.paymentMethod === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                      tx.paymentMethod === 'BANK' ? 'bg-indigo-100 text-indigo-700' :
                      tx.paymentMethod === 'CREDIT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tx.paymentMethod || 'CASH'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-rose-500 font-bold">
                    {tx.discount && Number(tx.discount) > 0 ? `Rs. ${Number(tx.discount).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    Rs. {(Number(tx.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => printReceipt(tx)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all text-xs font-bold"
                    >
                      <span>🖨️</span> Reprint
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3 opacity-20">📁</span>
                      No sales records found for this period.
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

export default SalesHistory;
