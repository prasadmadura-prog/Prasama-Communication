
import React, { useState, useMemo } from 'react';
import { Transaction, Product, Customer } from '../types';
import JsBarcode from 'jsbarcode';

interface SalesHistoryProps {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ transactions, products, customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const sales = useMemo(() => {
    return transactions.filter(t => t.type === 'SALE');
  }, [transactions]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !filterDate || s.date.startsWith(filterDate);
      return matchesSearch && matchesDate;
    });
  }, [sales, searchTerm, filterDate]);

  const getCustomerName = (id?: string) => {
    if (!id) return 'Walk-in Customer';
    return customers.find(c => c.id === id)?.name || 'Unknown Customer';
  };

  const printReceipt = (tx: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const canvas = document.createElement('canvas');
    JsBarcode(canvas, tx.id, {
      format: "CODE128",
      width: 1.2,
      height: 30,
      displayValue: false,
      margin: 0
    });
    const barcodeDataUrl = canvas.toDataURL();

    const itemsHtml = tx.items?.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: bold;">${product?.name || 'Unknown'}</div>
            <div style="font-size: 10px; color: #666;">${item.quantity} x Rs. ${item.price.toFixed(2)}</div>
          </div>
          <div style="font-weight: bold;">Rs. ${(item.quantity * item.price).toFixed(2)}</div>
        </div>
      `;
    }).join('') || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${tx.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            body { 
              font-family: 'JetBrains Mono', monospace; 
              width: 80mm; 
              margin: 0; 
              padding: 10mm; 
              color: #000;
              background: #fff;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 10px; }
            .meta { font-size: 10px; margin-bottom: 15px; }
            .items { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .totals { margin-bottom: 20px; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
            .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; }
            .footer { text-align: center; font-size: 9px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 15px; }
            .barcode { margin-top: 10px; text-align: center; }
            @page { margin: 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>OmniBusiness</h1>
            <p>Quality Goods & Services</p>
            <p>789 Business Ave, Tech Park</p>
            <p>Tel: (555) 012-3456</p>
          </div>
          <div class="meta">
            <div>DATE: ${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString()}</div>
            <div>TXID: ${tx.id}</div>
            <div>CUSTOMER: ${getCustomerName(tx.customerId)}</div>
            <div>CASHIER: Admin (M01)</div>
          </div>
          <div class="items">
            ${itemsHtml}
          </div>
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>Rs. ${tx.amount.toFixed(2)}</span></div>
            <div class="total-row"><span>Tax (0%)</span><span>Rs. 0.00</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${tx.amount.toFixed(2)}</span></div>
            <div class="total-row" style="margin-top: 8px;"><span>Method</span><span>${tx.paymentMethod}</span></div>
          </div>
          <div class="footer">
            <p>REPRINTED RECEIPT</p>
            <p>Thank you for shopping with us!</p>
            <div class="barcode">
              <img src="${barcodeDataUrl}" />
            </div>
            <p style="margin-top: 5px;">${tx.id}</p>
          </div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by Transaction ID or Description..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <input 
          type="date" 
          className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Transaction ID</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? filteredSales.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600">
                    <p className="font-medium">{new Date(tx.date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(tx.date).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">{tx.id}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {getCustomerName(tx.customerId)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      tx.paymentMethod === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                      tx.paymentMethod === 'BANK' ? 'bg-indigo-100 text-indigo-700' :
                      tx.paymentMethod === 'CREDIT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    Rs. {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => printReceipt(tx)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all text-xs font-bold"
                      title="Reprint Receipt"
                    >
                      <span>🖨️</span> Reprint
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No sales records found.
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
