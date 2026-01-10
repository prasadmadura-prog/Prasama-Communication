
import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import JsBarcode from 'jsbarcode';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts }) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (filterCategory === 'All') return products;
    return products.filter(p => p.category === filterCategory);
  }, [products, filterCategory]);

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (id: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedProductIds(next);
  };

  const generatePrintContent = (items: Product[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = items.map(p => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, p.sku, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10
        });
        const barcodeDataUrl = canvas.toDataURL();
        return `
          <div class="barcode-card">
            <div class="product-name">${p.name}</div>
            <img src="${barcodeDataUrl}" />
            <div class="product-price">Rs. ${p.price.toFixed(2)}</div>
          </div>
        `;
      } catch (e) {
        return `<div class="barcode-card">Error generating barcode for ${p.sku}</div>`;
      }
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Inventory Barcodes</title>
          <style>
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #fff; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .barcode-card { border: 1px dashed #ccc; padding: 15px; text-align: center; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .product-name { font-size: 10px; font-weight: bold; margin-bottom: 5px; color: #333; }
            .product-price { font-size: 12px; font-weight: bold; margin-top: 5px; color: #000; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="grid">${itemsHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printSingleBarcode = (p: Product) => {
    generatePrintContent([p]);
  };

  const printSelectedBarcodes = () => {
    const selected = products.filter(p => selectedProductIds.has(p.id));
    if (selected.length === 0) return;
    generatePrintContent(selected);
  };

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as string,
      cost: parseFloat(formData.get('cost') as string),
      price: parseFloat(formData.get('price') as string),
      stock: parseInt(formData.get('stock') as string),
      lowStockThreshold: parseInt(formData.get('lowStockThreshold') as string) || 5,
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
    } else {
      setProducts(prev => [...prev, productData]);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-slate-500">Track stock and manage categories</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>
          {selectedProductIds.size > 0 && (
            <button onClick={printSelectedBarcodes} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-700 transition-colors">
              <span>🖨️</span> Print Labels ({selectedProductIds.size})
            </button>
          )}
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">
            + Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold w-10">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Cost</th>
                <th className="px-6 py-4 font-semibold text-right">Price</th>
                <th className="px-6 py-4 font-semibold text-center">Stock</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${selectedProductIds.has(p.id) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={selectedProductIds.has(p.id)} onChange={() => toggleSelectProduct(p.id)} /></td>
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{p.sku}</td>
                  <td className="px-6 py-4 font-semibold">{p.name}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{p.category}</span></td>
                  <td className="px-6 py-4 text-right">Rs. {p.cost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold">Rs. {p.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock <= p.lowStockThreshold ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.stock}</span></td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button onClick={() => printSingleBarcode(p)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">🖨️</button>
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Product Name</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">SKU</label><input name="sku" defaultValue={editingProduct?.sku} required className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label><input name="category" defaultValue={editingProduct?.category} required className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cost (Rs.)</label><input name="cost" type="number" step="0.01" defaultValue={editingProduct?.cost} required className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price (Rs.)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stock</label><input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Low Stock Limit</label><input name="lowStockThreshold" type="number" defaultValue={editingProduct?.lowStockThreshold || 5} required className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
