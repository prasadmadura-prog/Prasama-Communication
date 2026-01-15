
import React, { useState } from 'react';

const ChequePrint: React.FC = () => {
  const [cheque, setCheque] = useState({
    date: new Date().toISOString().split('T')[0],
    payee: '',
    amount: '',
    amountInWords: '',
    memo: '',
    chequeNumber: '000126',
    isAccountPayee: true
  });

  const numberToWords = (num: number): string => {
    if (isNaN(num) || num === 0) return "";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
      if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
      if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "");
      return "Amount too large";
    };

    const mainPart = Math.floor(num);
    const fractionPart = Math.round((num - mainPart) * 100);

    let words = convert(mainPart);
    if (fractionPart > 0) {
      words += " and " + convert(fractionPart) + " Cents";
    }
    return words + " Only";
  };

  const handleAmountChange = (val: string) => {
    const num = parseFloat(val);
    const words = val ? numberToWords(num) : '';
    setCheque(prev => ({
      ...prev,
      amount: val,
      amountInWords: words
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedAmount = cheque.amount ? parseFloat(cheque.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) : '';

  const getDateChars = () => {
    if (!cheque.date) return Array(8).fill('');
    const d = cheque.date.split('-'); 
    const str = d[2] + d[1] + d[0]; 
    return str.split('');
  };

  const dateChars = getDateChars();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cheque Printing Terminal</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Precision aligned for standard bank stationary</p>
        </div>
        <div className="flex gap-3">
            <button 
              onClick={() => setCheque({...cheque, isAccountPayee: !cheque.isAccountPayee})}
              className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${cheque.isAccountPayee ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
            >
              {cheque.isAccountPayee ? '✓ A/C PAYEE' : '× NO CROSSING'}
            </button>
            <button 
              onClick={handlePrint}
              className="bg-slate-900 text-white px-8 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-2"
            >
              <span>🖨️</span> Execute Print
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        <div className="xl:col-span-4 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
          <div className="space-y-1 border-b border-slate-50 pb-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cheque Parameters</h3>
             <p className="text-[11px] text-slate-400 font-medium italic">Standard format used by most SL Banks</p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Payee Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-900 transition-all uppercase"
                placeholder="BENEFICIARY NAME LTD"
                value={cheque.payee}
                onChange={e => setCheque({...cheque, payee: e.target.value.toUpperCase()})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Numeric Amount</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-sm text-indigo-600 transition-all"
                  placeholder="0.00"
                  value={cheque.amount}
                  onChange={e => handleAmountChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Issue Date</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-600 transition-all"
                  type="date"
                  value={cheque.date}
                  onChange={e => setCheque({...cheque, date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Amount in Words</label>
              <textarea 
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-bold leading-relaxed text-slate-700 transition-all"
                value={cheque.amountInWords}
                onChange={e => setCheque({...cheque, amountInWords: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 flex justify-center py-10 bg-slate-200/40 rounded-[3rem] border-2 border-dashed border-slate-300">
          <div className="relative w-[800px] h-[340px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 font-mono">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none p-10 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div className="text-4xl font-black italic">PRASAMA BANKING</div>
                 <div className="flex gap-4"><span>DD</span><span>MM</span><span>YYYY</span></div>
              </div>
              <div className="h-0.5 bg-black w-3/4"></div>
              <div className="h-0.5 bg-black w-3/4"></div>
              <div className="flex justify-end"><div className="w-48 h-12 border-2 border-black"></div></div>
            </div>

            <div className="cheque-data-preview select-none">
              {cheque.isAccountPayee && (
                <div className="absolute top-10 left-12 border-y-[1.5px] border-black p-0.5 rotate-[-15deg] z-20">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-black px-4 py-1">A/C PAYEE ONLY</p>
                </div>
              )}

              <div className="absolute top-10 right-14 flex gap-8 text-2xl font-black text-slate-950">
                 {dateChars.map((char, i) => (
                   <span key={i} className={i === 2 || i === 4 ? 'ml-2' : ''}>{char}</span>
                 ))}
              </div>

              <div className="absolute top-[105px] left-[160px] text-xl font-black tracking-tight text-slate-900">
                 {cheque.payee ? `**${cheque.payee}**` : ''}
              </div>

              <div className="absolute top-[160px] left-[130px] text-lg font-bold leading-[2] max-w-[500px] text-slate-800">
                 {cheque.amountInWords ? `**${cheque.amountInWords}**` : ''}
              </div>

              <div className="absolute top-[185px] right-14 text-2xl font-black border-[1.5px] border-indigo-100 p-2 min-w-[200px] text-right rounded-md text-indigo-700 bg-indigo-50/20">
                 {cheque.amount ? `Rs. ${formattedAmount}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cheque-print-layout">
        {cheque.isAccountPayee && (
          <div className="crossing-line">A/C PAYEE ONLY</div>
        )}
        
        <div className="date-line">
           {dateChars.map((char, i) => (
             <span key={i} className={i === 1 || i === 3 ? 'date-gap' : ''}>{char}</span>
           ))}
        </div>

        <div className="payee-line">
           {cheque.payee ? `**${cheque.payee}**` : ''}
        </div>

        <div className="words-line">
           {cheque.amountInWords ? `**${cheque.amountInWords}**` : ''}
        </div>

        <div className="numeric-line">
           {cheque.amount ? `**${formattedAmount}**` : ''}
        </div>
      </div>

      <style>{`
        .cheque-print-layout { display: none; }

        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; font-family: 'JetBrains Mono', monospace !important; }
          #root > *:not(.cheque-print-layout),
          main > *:not(.cheque-print-layout),
          .no-print, header, .max-w-7xl, .space-y-6 {
            display: none !important;
          }

          .cheque-print-layout {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 210mm;
            height: 90mm;
            background: transparent !important;
            color: black !important;
            font-weight: 800 !important;
          }

          .crossing-line {
            position: absolute;
            top: 15mm;
            left: 20mm;
            border-top: 1.5pt solid black;
            border-bottom: 1.5pt solid black;
            padding: 4px 25px;
            transform: rotate(-15deg);
            font-size: 11pt;
            letter-spacing: 1.5pt;
            white-space: nowrap;
          }

          .date-line {
            position: absolute;
            top: 10mm;
            right: 18mm;
            font-size: 21pt;
            letter-spacing: 13.5mm;
          }
          .date-gap { margin-right: 14mm; }

          .payee-line {
            position: absolute;
            top: 32mm;
            left: 48mm;
            font-size: 16pt;
            text-transform: uppercase;
          }

          .words-line {
            position: absolute;
            top: 50mm;
            left: 35mm;
            width: 130mm;
            font-size: 13pt;
            line-height: 2.2;
          }

          .numeric-line {
            position: absolute;
            top: 54mm; 
            right: 22mm;
            font-size: 21pt;
            text-align: right;
            min-width: 55mm;
            letter-spacing: 1pt;
          }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
};

export default ChequePrint;
