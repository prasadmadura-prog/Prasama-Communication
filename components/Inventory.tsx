
import React, { useState, useMemo } from 'react';
import { Product, Category, Vendor, UserProfile } from '../types';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  vendors: Vendor[];
  userProfile: UserProfile;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpsertVendor: (vendor: Vendor) => void;
}

const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  setProducts, 
  categories, 
  vendors, 
  userProfile,
  onAddCategory, 
  onDeleteCategory,
  onUpsertVendor
}) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [filterCategoryId, setFilterCategoryId] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = filterCategoryId === 'All' || p.categoryId === filterCategoryId;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, filterCategoryId, searchTerm]);

  const valuationStats = useMemo(() => {
    const cost = filteredProducts.reduce((acc, p) => acc + (p.cost * p.stock), 0);
    const sale = filteredProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
    return { cost, sale, margin: sale - cost };
  }, [filteredProducts]);

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (id: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedProductIds(next);
  };

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData: Product = {
      id: editingProduct?.id || `P-${Date.now()}`,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      categoryId: formData.get('categoryId') as string,
      vendorId: formData.get('vendorId') as string,
      cost: parseFloat(formData.get('cost') as string) || 0,
      price: parseFloat(formData.get('price') as string) || 0,
      stock: parseInt(formData.get('stock') as string) || 0,
      lowStockThreshold: parseInt(formData.get('lowStockThreshold') as string) || 5,
    };
    
    setProducts(prev => editingProduct 
      ? prev.map(p => p.id === editingProduct.id ? productData : p)
      : [productData, ...prev]
    );
    
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'General';
  const getVendorName = (id?: string) => vendors.find(v => v.id === id)?.name || 'Local Store';

  const quickAddCategory = () => {
    const name = prompt("Enter New Category Name:");
    if (name) onAddCategory(name);
  };

  const quickAddVendor = () => {
    const name = prompt("Enter New Supplier/Vendor Name:");
    if (name) onUpsertVendor({ id: `V-${Date.now()}`, name, contactPerson: '', email: '', phone: '', address: '' });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Strategic Inventory</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Real-time Asset Valuation: <span className="text-indigo-600">Rs. {valuationStats.cost.toLocaleString()}</span></p>
        </div>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
          + Register New Asset
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by SKU, Name or Description..." 
            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="px-6 py-4 rounded-2xl border border-slate-200 text-xs font-black uppercase tracking-widest bg-white outline-none cursor-pointer"
        >
          <option value="All">Full Catalogue</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400">
              <tr>
                <th className="px-8 py-5 text-center w-12"><input type="checkbox" checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length} onChange={toggleSelectAll} className="w-4 h-4 rounded" /></th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px]">Asset Identity</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px]">Supply Category</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-right">Retail Price</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-center">In-Stock</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-center">Status</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-center"><input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => toggleSelectProduct(p.id)} className="w-4 h-4 rounded" /></td>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-900 leading-tight mb-1">{p.name}</p>
                    <p className="font-mono text-[10px] font-bold text-indigo-500 uppercase">{p.sku}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCategoryName(p.categoryId)}</p>
                    <p className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">Src: {getVendorName(p.vendorId)}</p>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 font-mono">Rs. {p.price.toLocaleString()}</td>
                  <td className="px-8 py-5 text-center font-bold text-slate-800">{p.stock}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.stock <= p.lowStockThreshold ? 'bg-rose-100 text-rose-600 shadow-sm shadow-rose-100' : 'bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-100'}`}>
                      {p.stock <= p.lowStockThreshold ? 'Critical' : 'Stable'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2.5 rounded-xl border border-slate-200 hover:bg-white hover:text-indigo-600 transition-all shadow-sm">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">{editingProduct ? 'Edit Asset Parameters' : 'Register New Enterprise Asset'}</h3>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">Strategic ERP Management</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="text-slate-300 hover:text-slate-900 text-4xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-12 space-y-8">
              <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                <div className="col-span-2 space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Description</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="e.g. Arabica Roast Coffee" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Global SKU / Barcode</label>
                  <input name="sku" defaultValue={editingProduct?.sku} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-mono font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="BAR-102938" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                    <button type="button" onClick={quickAddCategory} className="text-[9px] font-black text-indigo-600 uppercase">+ Add New</button>
                  </div>
                  <select name="categoryId" defaultValue={editingProduct?.categoryId} className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold bg-white cursor-pointer outline-none transition-all">
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Supplier</label>
                    <button type="button" onClick={quickAddVendor} className="text-[9px] font-black text-indigo-600 uppercase">+ Register Vendor</button>
                  </div>
                  <select name="vendorId" defaultValue={editingProduct?.vendorId} className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold bg-white cursor-pointer outline-none transition-all">
                    <option value="">Direct / Local Purchase</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Cost (LKR)</label>
                  <input name="cost" type="number" step="0.01" defaultValue={editingProduct?.cost} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Price (LKR)</label>
                  <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Buffer Threshold</label>
                  <input name="lowStockThreshold" type="number" defaultValue={editingProduct?.lowStockThreshold || 5} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono text-rose-500 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-950 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-black transition-all uppercase tracking-widest text-xs mt-4 active:scale-95">Commit Asset to Ledger</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
