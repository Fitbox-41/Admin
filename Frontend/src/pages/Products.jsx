import { useState, useEffect } from 'react';
import { Plus, Filter, CheckSquare, Square, MoreVertical, Loader2, Search, Tag, Edit2, Save, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceForm, setEditPriceForm] = useState({ price: '', oldPrice: '' });
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Derive unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    
    let isOutOfStock = undefined;
    let isNew = undefined;

    if (bulkAction === 'out_of_stock') isOutOfStock = true;
    if (bulkAction === 'in_stock') isOutOfStock = false;
    if (bulkAction === 'new_arrival') isNew = true;
    if (bulkAction === 'remove_new') isNew = false;

    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/products/bulk-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds, isOutOfStock, isNew })
      });
      if (res.ok) {
        await fetchProducts();
        setSelectedIds([]);
        setBulkAction('');
      }
    } catch (error) {
      console.error('Bulk update failed:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleIndividualStatus = async (id, statusType, value) => {
    try {
      const updateData = {};
      if (statusType === 'stock') updateData.isOutOfStock = value;
      if (statusType === 'new') updateData.isNew = value;

      const res = await fetch(`${API_URL}/products/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        await fetchProducts();
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleEditPriceClick = (product) => {
    setEditingPriceId(product.id);
    setEditPriceForm({ price: product.price || '', oldPrice: product.oldPrice || '' });
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setEditPriceForm({ price: '', oldPrice: '' });
  };

  const handleSavePrice = async (id) => {
    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          price: Number(editPriceForm.price), 
          oldPrice: Number(editPriceForm.oldPrice) 
        })
      });
      if (res.ok) {
        await fetchProducts();
        setEditingPriceId(null);
      }
    } catch (error) {
      console.error('Update price failed:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Filtered Products Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'in_stock') matchesStatus = !p.isOutOfStock;
    if (statusFilter === 'out_of_stock') matchesStatus = p.isOutOfStock;
    if (statusFilter === 'new_arrival') matchesStatus = p.isNew;

    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Group filtered products by category (only when "All" is selected)
  const groupedProducts = categoryFilter === 'All'
    ? categories.slice(1).reduce((acc, cat) => {
        const items = filteredProducts.filter(p => p.category === cat);
        if (items.length > 0) acc[cat] = items;
        return acc;
      }, {})
    : null;

  const renderProductRow = (product) => {
    const isEditing = editingPriceId === product.id;
    return (
    <tr key={product.id} className={`hover:bg-bg/50 transition-colors ${selectedIds.includes(product.id) ? 'bg-primary/5' : ''}`}>
      <td className="px-4 py-4 text-center">
        <input 
          type="checkbox" 
          className="rounded border-border"
          checked={selectedIds.includes(product.id)}
          onChange={() => handleSelectOne(product.id)}
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-bg overflow-hidden flex items-center justify-center">
            {product.imgSrc || (product.variants && product.variants[0]?.images[0]) ? (
              <img src={product.imgSrc || product.variants[0].images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-text-mid">No img</span>
            )}
          </div>
          <div>
            <div className="font-medium text-text-dark">{product.name}</div>
            <div className="text-xs text-text-mid">{product.category}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="flex flex-col gap-2 w-32">
            <div>
              <label className="text-xs text-text-mid mb-1 block">Price (₹)</label>
              <input 
                type="text" 
                value={editPriceForm.price} 
                onChange={(e) => setEditPriceForm({...editPriceForm, price: e.target.value})}
                className="w-full px-2 py-1 border border-border rounded text-sm bg-bg"
              />
            </div>
            <div>
              <label className="text-xs text-text-mid mb-1 block">MRP (₹)</label>
              <input 
                type="text" 
                value={editPriceForm.oldPrice} 
                onChange={(e) => setEditPriceForm({...editPriceForm, oldPrice: e.target.value})}
                className="w-full px-2 py-1 border border-border rounded text-sm bg-bg"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleSavePrice(product.id)} disabled={updating} className="flex-1 flex justify-center items-center py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors">
                <Save size={16} />
              </button>
              <button onClick={handleCancelEditPrice} disabled={updating} className="flex-1 flex justify-center items-center py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <div>
              <div className="text-text-dark font-medium">₹{product.price}</div>
              {product.oldPrice && <div className="text-xs text-text-mid line-through">₹{product.oldPrice}</div>}
            </div>
            <button onClick={() => handleEditPriceClick(product)} className="opacity-0 group-hover:opacity-100 p-1.5 text-text-mid hover:text-primary transition-opacity bg-bg rounded">
              <Edit2 size={14} />
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block ${
          product.isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
        </span>
      </td>
      <td className="px-6 py-4">
        {product.isNew && (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold leading-none bg-orange-100 text-orange-700">
            New Arrival
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => handleIndividualStatus(product.id, 'stock', !product.isOutOfStock)}
            className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-bg"
          >
            {product.isOutOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}
          </button>
          <button 
            onClick={() => handleIndividualStatus(product.id, 'new', !product.isNew)}
            className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-bg"
          >
            {product.isNew ? 'Remove New' : 'Mark New'}
          </button>
        </div>
      </td>
    </tr>
    );
  };

  const TableHeader = () => (
    <thead>
      <tr className="bg-bg text-text-mid text-sm uppercase tracking-wider">
        <th className="px-4 py-4 w-12 text-center">
          <input 
            type="checkbox" 
            className="rounded border-border"
            checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
            onChange={handleSelectAll}
          />
        </th>
        <th className="px-6 py-4 font-medium">Product Name</th>
        <th className="px-6 py-4 font-medium">Price</th>
        <th className="px-6 py-4 font-medium">Stock Status</th>
        <th className="px-6 py-4 font-medium">Badge</th>
        <th className="px-6 py-4 font-medium text-right">Quick Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Products</h1>
      </div>

      {/* Category Tabs */}
      {!loading && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => {
            const count = cat === 'All' ? products.length : products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                  categoryFilter === cat
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-bg text-text-mid border-border hover:border-primary hover:text-primary'
                }`}
              >
                {cat !== 'All' && <Tag size={12} />}
                {cat}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-border text-text-mid'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg/30">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-medium text-text-mid whitespace-nowrap">{selectedIds.length} selected</span>
                <select 
                  className="px-3 py-2 border border-border rounded-lg text-sm bg-bg outline-none flex-1 min-w-[120px]"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                >
                  <option value="">Bulk Actions</option>
                  <option value="out_of_stock">Mark Out of Stock</option>
                  <option value="in_stock">Mark In Stock</option>
                  <option value="new_arrival">Mark New Arrival</option>
                  <option value="remove_new">Remove New Arrival</option>
                </select>
                <button 
                  onClick={handleBulkAction}
                  disabled={!bulkAction || updating}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {updating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Apply'}
                </button>
              </div>
            )}
            
            {!selectedIds.length && (
              <div className="relative flex-1 min-w-[200px] w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" size={18} />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg text-sm bg-bg outline-none focus:border-primary transition-colors w-full md:w-auto"
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="new_arrival">New Arrivals</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-text-mid">
              <Loader2 className="animate-spin w-8 h-8" />
            </div>
          ) : categoryFilter === 'All' && groupedProducts ? (
            /* Grouped by category view */
            Object.keys(groupedProducts).length === 0 ? (
              <div className="px-6 py-8 text-center text-text-mid">No products found matching your filters.</div>
            ) : (
              Object.entries(groupedProducts).map(([cat, items]) => (
                <div key={cat}>
                  {/* Category Section Header */}
                  <div className="flex items-center gap-3 px-6 py-3 bg-bg/50 border-b border-border sticky top-0 z-10">
                    <Tag size={14} className="text-primary" />
                    <span className="text-sm font-bold text-text-dark uppercase tracking-wider">{cat}</span>
                    <span className="text-xs text-text-mid bg-border px-2 py-0.5 rounded-full">{items.length} products</span>
                  </div>
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <TableHeader />
                    <tbody className="divide-y divide-border">
                      {items.map(product => renderProductRow(product))}
                    </tbody>
                  </table>
                </div>
              ))
            )
          ) : (
            /* Single category / filtered view */
            <table className="w-full text-left border-collapse min-w-[800px]">
              <TableHeader />
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => renderProductRow(product))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-text-mid">
                      No products found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
