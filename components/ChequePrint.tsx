
import React, { useState } from 'react';

const ChequePrint: React.FC = () => {
  const [cheque, setCheque] = useState({
    date: new Date().toISOString().split('T')[0],
    payee: '',
    amount: '',
    amountInWords: '',
    memo: '',
    chequeNumber: '000123',
    isAccountPayee: true
  });

  const handlePrint = () => {
    window.print();
  };

  const formattedAmount = cheque.amount ? parseFloat(cheque.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) : '0.00';

  // Helper to get individual date characters for the boxes
  const getDateChars = () => {
    if (!cheque.date) return Array(8).fill('');
    const d = cheque.date.split('-'); // [YYYY, MM, DD]
    const str = d[2] + d[1] + d[0]; // DDMMYYYY
    return str.split('');
  };

  const dateChars = getDateChars();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Professional Cheque Writer</h2>
          <p className="text-slate-500">Industry standard layouts for Sri Lankan bank cheques</p>
        </div>
        <div className="flex gap-3">
            <button 
              onClick={() => setCheque({...cheque, isAccountPayee: !cheque.isAccountPayee})}
              className={`px-4 py-2 rounded-xl font-bold transition-all border ${cheque.isAccountPayee ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
            >
              {cheque.isAccountPayee ? '✅ Account Payee' : '❌ No Crossing'}
            </button>
            <button 
              onClick={handlePrint}
              className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <span>🖨️</span> Print Cheque
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Editor Form */}
        <div className="xl:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 no-print space-y-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Cheque Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Payee Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700"
                placeholder="Payee Full Name"
                value={cheque.payee}
                onChange={e => setCheque({...cheque, payee: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Amount (Rs.)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-indigo-600"
                  placeholder="0.00"
                  value={cheque.amount}
                  onChange={e => setCheque({...cheque, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Date</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-600"
                  type="date"
                  value={cheque.date}
                  onChange={e => setCheque({...cheque, date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Amount in Words</label>
              <textarea 
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 italic text-sm font-medium leading-relaxed"
                placeholder="Rupees One Million and Two Hundred Only..."
                value={cheque.amountInWords}
                onChange={e => setCheque({...cheque, amountInWords: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Cheque #</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="000123"
                  value={cheque.chequeNumber}
                  onChange={e => setCheque({...cheque, chequeNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Memo (Internal)</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Invoice Ref"
                  value={cheque.memo}
                  onChange={e => setCheque({...cheque, memo: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cheque Preview / Print Template */}
        <div className="xl:col-span-8 flex justify-center py-4 bg-slate-200/50 rounded-3xl border-2 border-dashed border-slate-300">
          <div className="cheque-container relative w-[800px] h-[340px] bg-white border-[2px] border-slate-400 rounded-md p-6 shadow-2xl overflow-hidden text-slate-900 font-sans">
            
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none overflow-hidden" style={{ backgroundImage: 'radial-gradient(#6366f1 0.5px, transparent 0)', backgroundSize: '12px 12px' }}></div>
            
            {/* Account Payee Crossing */}
            {cheque.isAccountPayee && (
              <div className="absolute top-4 left-6 border-y-2 border-slate-400 p-1 rotate-[-15deg] opacity-80 z-20">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4">Account Payee Only</p>
              </div>
            )}

            {/* Header / Bank Details */}
            <div className="flex justify-between items-start relative z-10 mb-8">
              <div className="space-y-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white font-black italic text-lg">O</div>
                  <h3 className="text-2xl font-black italic tracking-tighter text-indigo-900 leading-none">OmniBank PLC</h3>
                </div>
                <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Institutional Banking • Global Gateway Branch</p>
                <p className="text-[8px] text-slate-400">88 Financial District, Colombo 02, Sri Lanka</p>
              </div>
              
              <div className="flex flex-col items-end">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Date (DD MM YYYY)</p>
                <div className="flex gap-1">
                  {dateChars.map((char, i) => (
                    <div key={i} className={`w-6 h-8 border border-slate-300 bg-white/50 flex items-center justify-center font-mono text-lg font-bold text-slate-800 ${i === 1 || i === 3 ? 'mr-1' : ''}`}>
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payee Line */}
            <div className="mt-8 flex items-end gap-3 relative z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap mb-2 tracking-tighter">Pay to the order of</span>
              <div className="flex-1 border-b-[1.5px] border-dotted border-slate-500 pb-1 text-2xl font-serif italic font-bold text-slate-900 px-4 min-h-[40px] leading-none">
                {cheque.payee}
              </div>
              <div className="w-[200px] border-[2px] border-slate-800 bg-slate-50 flex items-center px-3 py-1.5 h-12 shadow-inner">
                <span className="text-lg font-bold text-slate-400 mr-2 border-r border-slate-200 pr-2">Rs.</span>
                <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight flex-1 text-right">
                    {formattedAmount}
                </span>
              </div>
            </div>

            {/* Amount Words Line */}
            <div className="mt-8 relative z-10">
              <div className="flex items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap mb-2 mr-4 tracking-tighter">The sum of Rupees</span>
                <div className="flex-1 border-b-[1.5px] border-dotted border-slate-500 pb-1 text-lg font-serif italic text-slate-800 px-4 min-h-[36px] flex items-center">
                  {cheque.amountInWords ? `*** ${cheque.amountInWords} ***` : ''}
                </div>
              </div>
            </div>

            {/* Footer / Signature / MICR */}
            <div className="mt-12 flex justify-between items-end gap-16 relative z-10">
              <div className="flex-1 max-w-xs">
                <div className="flex items-end gap-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Memo / Ref</span>
                  <div className="flex-1 border-b-[1px] border-slate-300 pb-0.5 text-xs font-serif italic text-slate-600 px-2 min-h-[20px]">
                    {cheque.memo}
                  </div>
                </div>
              </div>
              
              <div className="w-[280px] flex flex-col items-center">
                <div className="w-full border-b-[1.5px] border-slate-800 h-10 mb-1 flex items-center justify-center">
                  {/* Digital Signature Placeholder */}
                  <span className="text-[10px] text-slate-300 italic">authorized signatory only</span>
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
              </div>
            </div>

            {/* MICR Line */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-14 font-mono text-2xl tracking-[0.3em] text-slate-800/60 select-none px-12 opacity-80">
              <span>⑆7002⑈</span>
              <span>100234567⑈</span>
              <span>{cheque.chequeNumber}</span>
              <span>⑆00⑈</span>
            </div>

          </div>
        </div>
      </div>
      
      <div className="no-print p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-6 shadow-xl max-w-6xl mx-auto border border-white/5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-3xl shrink-0">🖨️</div>
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-white">Printer Configuration Guide</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            For precise alignment, set your browser print options to <span className="text-white font-bold">Paper Size: A4</span> and <span className="text-white font-bold">Scale: 100%</span>. 
            The system automatically centers the cheque on the page. Use <span className="text-indigo-400 font-bold">manual tray feed</span> for individual cheque leaves.
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .no-print { 
            display: none !important; 
          }
          .cheque-container {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
            background: white !important;
            width: 210mm !important; /* Forces A4 relative width */
            height: 90mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChequePrint;
