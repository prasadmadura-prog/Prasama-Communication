
import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import JsBarcode from 'jsbarcode';

interface BarcodePrintProps {
  products: Product[];
}

interface PrintSelection {
  productId: string;
  copies: number;
}

const BarcodePrint: React.FC<BarcodePrintProps> = ({ products }) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const updateSelection = (productId: string, copies: number) => {
    setSelections(prev => ({
      ...prev,
      [productId]: Math.max(0, copies)
    }));
  };

  const handlePrint = () => {
    const itemsToPrint = products.filter(p => selections[p.id] > 0);
    if (itemsToPrint.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let allLabelsHtml = '';
    
    itemsToPrint.forEach(p => {
      const count = selections[p.id];
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, p.sku, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 16,
          margin: 10
        });
        const barcodeDataUrl = canvas.toDataURL();
        
        for (let i = 0; i < count; i++) {
          allLabelsHtml += `
            <div class="barcode-label">
              <div class="product-name">${p.name}</div>
              <img src="${barcodeDataUrl}" />
              <div class="product-price">Rs. ${p.price.toFixed(2)}</div>
            </div>
          `;
        }
      } catch (e) {
        console.error("Barcode generation failed for", p.sku);
      }
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Bulk Barcode Print</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: sans-serif; 
              margin: 0; 
              padding: 10px; 
              background: #fff; 
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .barcode-label { 
              width: 50mm; 
              height: 35mm; 
              border: 1px dashed #eee; 
              padding: 5px; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              page-break-inside: avoid;
              text-align: center;
            }
            .product-name { font-size: 10px; font-weight: bold; margin-bottom: 2px; height: 24px; overflow: hidden; }
            .product-price { font-size: 14px; font-weight: bold; margin-top: 2px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${allLabelsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Fixed error on line 118: Explicitly type a and b as number to fix the 'unknown' error in reduce
  const totalLabels = Object.values(selections).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Bulk Barcode Generator</h2>
          <p className="text-slate-500">Select products and quantities for label printing</p>
        </div>
        <button 
          onClick={handlePrint}
          disabled={totalLabels === 0}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg disabled:bg-slate-300 disabled:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <span>🖨️</span> Print Selected Labels ({totalLabels})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by SKU or Product Name..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold w-32">SKU</th>
                <th className="px-6 py-4 font-semibold">Product Details</th>
                <th className="px-6 py-4 font-semibold text-center w-48">Copies to Print</th>
                <th className="px-6 py-4 font-semibold text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{p.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{p.category} • In Stock: {p.stock}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => updateSelection(p.id, (selections[p.id] || 0) - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white active:scale-95 transition-all text-slate-400 hover:text-indigo-600"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        min="0"
                        className="w-16 text-center border-b-2 border-slate-100 font-bold text-slate-800 focus:border-indigo-500 outline-none"
                        value={selections[p.id] || 0}
                        onChange={(e) => updateSelection(p.id, parseInt(e.target.value) || 0)}
                      />
                      <button 
                        onClick={() => updateSelection(p.id, (selections[p.id] || 0) + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white active:scale-95 transition-all text-slate-400 hover:text-indigo-600"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    Rs. {p.price.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No products found matching your search criteria.
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

export default BarcodePrint;
