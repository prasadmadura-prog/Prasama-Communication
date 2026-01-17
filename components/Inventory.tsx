
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
  onAddCategory, 
  onUpsertVendor
}) => {
  const [filterCategoryId, setFilterCategoryId] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Category Add State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Advanced Filter State
  const [minCost, setMinCost] = useState<string>('');
  const [maxCost, setMaxCost] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = filterCategoryId === 'All' || p.categoryId === filterCategoryId;
      const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.sku || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const cost = Number(p.cost) || 0;
      const price = Number(p.price) || 0;
      
      const matchesMinCost = minCost === '' || cost >= parseFloat(minCost);
      const matchesMaxCost = maxCost === '' || cost <= parseFloat(maxCost);
      const matchesMinPrice = minPrice === '' || price >= parseFloat(minPrice);
      const matchesMaxPrice = maxPrice === '' || price <= parseFloat(maxPrice);
      const matchesLowStock = !lowStockOnly || p.stock <= p.lowStockThreshold;

      return matchesCategory && matchesSearch && matchesMinCost && matchesMaxCost && matchesMinPrice && matchesMaxPrice && matchesLowStock;
    });
  }, [products, filterCategoryId, searchTerm, minCost, maxCost, minPrice, maxPrice, lowStockOnly]);

  const valuationStats = useMemo(() => {
    const cost = filteredProducts.reduce((acc, p) => acc + (p.cost * p.stock), 0);
    return { cost };
  }, [filteredProducts]);

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

  const handleQuickAddCategory = () => {
    if (newCategoryInput.trim()) {
      onAddCategory(newCategoryInput.trim());
      setNewCategoryInput('');
      setIsAddingCategory(false);
    }
  };

  const resetFilters = () => {
    setFilterCategoryId('All');
    setSearchTerm('');
    setMinCost('');
    setMaxCost('');
    setMinPrice('');
    setMaxPrice('');
    setLowStockOnly(false);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'General';
  const getVendorName = (id?: string) => vendors.find(v => v.id === id)?.name || 'Local Store';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Inventory Catalog</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Filtered Asset Valuation: <span className="text-indigo-600">Rs. {valuationStats.cost.toLocaleString()}</span>
          </p>
        </div>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0">
          + Add New Product
        </button>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="relative flex-1 w-full">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
            <input 
              type="text" 
              placeholder="Search by SKU or Name..." 
              className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="flex-1 md:w-48 px-8 py-4 rounded-[1.5rem] border border-slate-200 text-xs font-black uppercase tracking-widest bg-white outline-none cursor-pointer focus:border-indigo-500 transition-all"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-4 rounded-[1.5rem] border transition-all flex items-center justify-center ${showAdvancedFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-500'}`}
              title="Advanced Filters"
            >
              <span className="text-lg">⚙️</span>
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Range (Rs.)</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="Min" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={minCost} onChange={e => setMinCost(e.target.value)} />
                    <span className="text-slate-300">-</span>
                    <input type="number" placeholder="Max" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={maxCost} onChange={e => setMaxCost(e.target.value)} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Price Range (Rs.)</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="Min" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                    <span className="text-slate-300">-</span>
                    <input type="number" placeholder="Max" className="w-full px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-4 h-full pt-6">
                  <button 
                    onClick={() => setLowStockOnly(!lowStockOnly)}
                    className={`flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${lowStockOnly ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-300'}`}
                  >
                    {lowStockOnly ? '✓ Low Stock Filtered' : 'Filter Low Stock'}
                  </button>
                  <button 
                    onClick={resetFilters}
                    className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Reset All
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Results</p>
                <p className="text-2xl font-black text-slate-900 font-mono">{filteredProducts.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400">
              <tr>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px]">Product Information</th>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px]">Category</th>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-right">Cost (LKR)</th>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-right">Price (LKR)</th>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-center">Stock</th>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-center">Status</th>
                <th className="px-8 py-6 font-black uppercase tracking-widest text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-indigo-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-[13px] leading-tight uppercase mb-1">{p.name}</p>
                    <p className="font-mono text-[10px] font-bold text-indigo-500 tracking-tighter">{p.sku}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCategoryName(p.categoryId)}</p>
                    <p className="text-[10px] font-bold text-slate-300 truncate max-w-[150px]">Supplier: {getVendorName(p.vendorId)}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-400 font-mono text-[12px]">
                    {Number(p.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-900 font-mono text-[13px]">
                    {Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-center font-black text-slate-800">{p.stock}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${p.stock <= p.lowStockThreshold ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {p.stock <= p.lowStockThreshold ? 'Low Stock' : 'Good'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-3 rounded-xl border border-slate-200 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                      <span className="text-sm">✏️</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                    No matching products found for the applied filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 my-8">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">{editingProduct ? 'Update Inventory Asset' : 'New Inventory Record'}</h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1">Catalog Management System</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); setIsAddingCategory(false); }} className="text-slate-300 hover:text-slate-900 text-4xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                <div className="col-span-2 space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Product / Asset Name</label>
                  <input name="name" placeholder="E.G. ORGANIC HARVEST COFFEE" defaultValue={editingProduct?.name} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none bg-slate-50/30 uppercase text-[13px]" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU / Unique Identifier</label>
                  <input name="sku" placeholder="BAR-12345" defaultValue={editingProduct?.sku} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-mono font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none uppercase text-[13px]" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Category</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                      {isAddingCategory ? '× Cancel' : '+ New Category'}
                    </button>
                  </div>
                  {isAddingCategory ? (
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        placeholder="CAT NAME..."
                        className="flex-1 px-4 py-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 text-[12px] font-black uppercase outline-none focus:border-indigo-500"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value.toUpperCase())}
                      />
                      <button 
                        type="button"
                        onClick={handleQuickAddCategory}
                        className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select name="categoryId" defaultValue={editingProduct?.categoryId} className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold bg-white outline-none cursor-pointer hover:border-indigo-200 transition-colors uppercase text-[12px]">
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Landing Cost</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">RS.</span>
                    <input name="cost" type="number" step="0.01" defaultValue={editingProduct?.cost} required className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 font-black font-mono text-[14px] outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Sales Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-[10px]">RS.</span>
                    <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full pl-12 pr-6 py-4 rounded-2xl border border-indigo-100 font-black font-mono text-[14px] text-indigo-600 outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock On-Hand</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono text-[14px] outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alert Level</label>
                  <input name="lowStockThreshold" type="number" defaultValue={editingProduct?.lowStockThreshold || 5} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black font-mono text-[14px] text-rose-500 outline-none" />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Associated Vendor (Optional)</label>
                  <select name="vendorId" defaultValue={editingProduct?.vendorId} className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-bold bg-white outline-none cursor-pointer uppercase text-[12px]">
                    <option value="">Internal Stock / Local Source</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-slate-200 hover:bg-black transition-all uppercase tracking-[0.2em] text-xs hover:-translate-y-0.5 active:translate-y-0">
                  {editingProduct ? 'Commit Asset Updates' : 'Commit to Master Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
