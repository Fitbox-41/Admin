import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, CheckSquare, Square, MoreVertical, Loader2, Search, Tag, Edit2, Save, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceForm, setEditPriceForm] = useState({ price: '', oldPrice: '', variants: [] });
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Reviews expand state
  const [expandedReviewsProductId, setExpandedReviewsProductId] = useState(null);

  // Quick Stock Edit State
  const [editingStockProductId, setEditingStockProductId] = useState(null);
  const [tempStockVal, setTempStockVal] = useState('');

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

    // Listen for global Topbar refresh trigger
    window.addEventListener('refreshData', fetchProducts);
    return () => window.removeEventListener('refreshData', fetchProducts);
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

  const startEditingStock = (product) => {
    setEditingStockProductId(product.id);
    setTempStockVal(product.stock !== undefined ? product.stock : 100);
  };

  const saveQuickStock = async (product) => {
    const stockNum = Number(tempStockVal);
    if (isNaN(stockNum) || stockNum < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: stockNum })
      });
      if (res.ok) {
        await fetchProducts();
        setEditingStockProductId(null);
      } else {
        alert("Failed to update stock.");
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditPriceClick = (product) => {
    setEditingPriceId(product.id);
    setEditPriceForm({
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      stock: product.stock !== undefined ? product.stock : 100,
      variants: product.variants ? JSON.parse(JSON.stringify(product.variants)) : []
    });
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setEditPriceForm({ price: '', oldPrice: '', stock: '', variants: [] });
  };

  const handleSavePrice = async (id) => {
    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          price: Number(editPriceForm.price) || undefined, 
          oldPrice: Number(editPriceForm.oldPrice) || undefined,
          stock: editPriceForm.stock !== undefined ? Number(editPriceForm.stock) : undefined,
          variants: editPriceForm.variants.map(v => ({
            ...v,
            sizes: (v.sizes || []).map(s => ({
              ...s,
              price: Number(s.price) || 0,
              oldPrice: Number(s.oldPrice) || 0,
              weight: Number(s.weight) || 0
            }))
          }))
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
    const reviewsList = product.reviews || [];
    const totalReviewsCount = reviewsList.length;
    const isReviewsExpanded = expandedReviewsProductId === product.id;

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
          <div className="flex items-center gap-2 group">
            <div>
              <div className="text-text-dark font-medium">₹{product.price || (product.variants?.[0]?.sizes?.[0]?.price)}</div>
              {(product.oldPrice || product.variants?.[0]?.sizes?.[0]?.oldPrice) && (
                <div className="text-xs text-text-mid line-through">₹{product.oldPrice || product.variants?.[0]?.sizes?.[0]?.oldPrice}</div>
              )}
              {(product.variants?.length > 1 || (product.variants?.[0]?.sizes?.length > 1)) && (
                <div className="text-[13px] bg-primary text-white font-bold px-2 py-1 rounded inline-block mt-1 text-center whitespace-nowrap">Multiple Prices</div>
              )}
            </div>
            <button onClick={() => handleEditPriceClick(product)} className="p-2 text-text-mid hover:text-primary transition-colors bg-bg rounded shadow-sm border border-border/50 flex items-center justify-center cursor-pointer">
              <Edit2 size={16} />
            </button>
          </div>
        </td>
        <td className="px-6 py-4">
          <button 
            onClick={() => setExpandedReviewsProductId(isReviewsExpanded ? null : product.id)}
            className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-border/50 text-text-dark font-semibold py-1 px-3 rounded-full transition-all text-xs"
          >
            <span>{totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}</span>
            <svg 
              className={`w-3.5 h-3.5 text-text-mid transition-transform duration-200 ${isReviewsExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </td>
        <td className="px-6 py-4">
          {editingStockProductId === product.id ? (
            <div className="flex flex-col gap-1 w-24">
              <label className="text-[10px] text-text-mid font-medium">Stock Count</label>
              <input 
                type="number" 
                value={tempStockVal} 
                onChange={(e) => setTempStockVal(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveQuickStock(product);
                  if (e.key === 'Escape') setEditingStockProductId(null);
                }}
                className="px-2 py-1 border border-primary rounded text-xs bg-white w-full"
                autoFocus
              />
              <div className="flex gap-1">
                <button 
                  onClick={() => saveQuickStock(product)} 
                  disabled={updating}
                  className="flex-1 text-[10px] bg-green-100 text-green-700 font-bold py-0.5 rounded text-center border border-green-300 hover:bg-green-200"
                >
                  Save
                </button>
                <button 
                  onClick={() => setEditingStockProductId(null)} 
                  className="flex-1 text-[10px] bg-red-100 text-red-700 font-bold py-0.5 rounded text-center border border-red-300 hover:bg-red-200"
                >
                  X
                </button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="flex flex-col gap-1 w-24">
              <label className="text-[10px] text-text-mid font-medium">Stock Count</label>
              <input 
                type="number" 
                value={editPriceForm.stock ?? ''} 
                onChange={(e) => setEditPriceForm({ ...editPriceForm, stock: e.target.value })} 
                className="px-2 py-1 border border-border rounded text-xs bg-white w-full"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block text-center w-fit ${
                product.isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-text-mid font-semibold px-1">Stock: {product.stock !== undefined ? product.stock : 100}</span>
                <button 
                  onClick={() => startEditingStock(product)} 
                  className="p-1 text-text-mid hover:text-primary transition-colors rounded hover:bg-bg border border-border/30 bg-white shadow-sm flex items-center justify-center"
                  title="Quick Edit Stock"
                >
                  <Edit2 size={10} />
                </button>
              </div>
            </div>
          )}
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
              onClick={() => startEditingStock(product)}
              className="px-3 py-1.5 border border-primary/30 rounded-lg text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              Edit Stock
            </button>
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

  const renderProductRowWithBreakdown = (product) => {
    const isReviewsExpanded = expandedReviewsProductId === product.id;
    const reviewsList = product.reviews || [];
    const starBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsList.forEach(r => {
      if (starBreakdown[r.rating] !== undefined) {
        starBreakdown[r.rating]++;
      }
    });

    return (
      <tr key={`wrap-${product.id}`} className="contents">
        {renderProductRow(product)}
        {isReviewsExpanded && (
          <tr>
            <td colSpan={7} className="px-12 py-3 bg-gray-50/50 border-b border-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs font-medium">
                <span className="font-bold uppercase tracking-wider text-text-mid">Ratings Breakdown:</span>
                <div className="flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center bg-green-50 text-green-700 px-2.5 py-1 rounded-md font-semibold border border-green-200/80 shadow-sm">5 star: {starBreakdown[5]}</span>
                  <span className="inline-flex items-center bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-semibold border border-emerald-200/80 shadow-sm">4 star: {starBreakdown[4]}</span>
                  <span className="inline-flex items-center bg-yellow-50/70 text-yellow-700 px-2.5 py-1 rounded-md font-semibold border border-yellow-200/80 shadow-sm">3 star: {starBreakdown[3]}</span>
                  <span className="inline-flex items-center bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md font-semibold border border-orange-200/80 shadow-sm">2 star: {starBreakdown[2]}</span>
                  <span className="inline-flex items-center bg-red-50 text-red-700 px-2.5 py-1 rounded-md font-semibold border border-red-200/80 shadow-sm">1 star: {starBreakdown[1]}</span>
                </div>
              </div>
            </td>
          </tr>
        )}
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
        <th className="px-6 py-4 font-medium">Reviews</th>
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
        <Link 
          to="/products/new" 
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Product
        </Link>
      </div>

      {/* Category Tabs */}
      {!loading && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {categories.map(cat => {
            const count = cat === 'All' ? products.length : products.filter(p => p.category === cat).length;
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: isActive ? '1.5px solid #ff6b35' : '1.5px solid #e5e7eb',
                  background: isActive ? '#ff6b35' : '#ffffff',
                  color: isActive ? '#ffffff' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 2px 8px rgba(255,107,53,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {cat !== 'All' && <Tag size={12} />}
                {cat}
                <span style={{
                  fontSize: '11px',
                  padding: '1px 8px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                  color: isActive ? '#ffffff' : '#6b7280',
                  fontWeight: 600,
                }}>
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
                      {items.map(product => renderProductRowWithBreakdown(product))}
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
                {filteredProducts.map((product) => renderProductRowWithBreakdown(product))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-text-mid">
                      No products found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Price Edit Modal */}
      {editingPriceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] transform transition-all scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-dark">Edit Product Pricing & Stock</h3>
              <button 
                onClick={handleCancelEditPrice}
                className="p-1.5 rounded-lg text-text-mid hover:bg-bg hover:text-text-dark transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Base Price & Stock Edit */}
              <div className="space-y-3 bg-bg/20 p-4 rounded-xl border border-border/50">
                <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Base Pricing & Stock</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-mid font-semibold uppercase tracking-wider">Base Price (₹)</label>
                    <input 
                      type="text" 
                      value={editPriceForm.price ?? ''} 
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, price: e.target.value })} 
                      className="px-3 py-2 border border-border rounded-xl text-sm bg-white w-full focus:outline-none focus:border-primary transition-colors font-medium text-text-dark"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-mid font-semibold uppercase tracking-wider">Base MRP (₹)</label>
                    <input 
                      type="text" 
                      value={editPriceForm.oldPrice ?? ''} 
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, oldPrice: e.target.value })} 
                      className="px-3 py-2 border border-border rounded-xl text-sm bg-white w-full focus:outline-none focus:border-primary transition-colors font-medium text-text-dark"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-mid font-semibold uppercase tracking-wider">Stock Count</label>
                    <input 
                      type="number" 
                      value={editPriceForm.stock ?? ''} 
                      onChange={(e) => setEditPriceForm({ ...editPriceForm, stock: e.target.value })} 
                      className="px-3 py-2 border border-border rounded-xl text-sm bg-white w-full focus:outline-none focus:border-primary transition-colors font-medium text-text-dark"
                    />
                  </div>
                </div>
              </div>

              {/* Variants → nested sizes edit */}
              {editPriceForm.variants && editPriceForm.variants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Variants & Sizes Overrides</h4>
                  <div className="space-y-3">
                    {editPriceForm.variants.map((v, vIdx) => (
                      <div key={vIdx} className="border border-border rounded-xl overflow-hidden bg-bg/10">
                        {v.color && (
                          <div className="px-3 py-1.5 bg-primary/10 text-xs font-bold text-primary border-b border-border">{v.color}</div>
                        )}
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-4 gap-2 text-[10px] text-text-mid font-semibold px-1">
                            <span>Size</span><span>Price</span><span>MRP</span><span>Wt(g)</span>
                          </div>
                          {(v.sizes || []).map((s, sIdx) => (
                            <div key={sIdx} className="grid grid-cols-4 gap-2">
                              <span className="text-[11px] font-semibold self-center px-1 truncate text-text-dark" title={s.name}>{s.name || '—'}</span>
                              <input 
                                type="text" 
                                value={s.price ?? ''} 
                                onChange={(e) => {
                                  const nv = JSON.parse(JSON.stringify(editPriceForm.variants));
                                  nv[vIdx].sizes[sIdx].price = e.target.value;
                                  setEditPriceForm({...editPriceForm, variants: nv});
                                }} 
                                className="px-2 py-1 border border-border rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-text-dark font-medium" 
                              />
                              <input 
                                type="text" 
                                value={s.oldPrice ?? ''} 
                                onChange={(e) => {
                                  const nv = JSON.parse(JSON.stringify(editPriceForm.variants));
                                  nv[vIdx].sizes[sIdx].oldPrice = e.target.value;
                                  setEditPriceForm({...editPriceForm, variants: nv});
                                }} 
                                className="px-2 py-1 border border-border rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-text-dark font-medium" 
                              />
                              <input 
                                type="text" 
                                value={s.weight ?? ''} 
                                onChange={(e) => {
                                  const nv = JSON.parse(JSON.stringify(editPriceForm.variants));
                                  nv[vIdx].sizes[sIdx].weight = e.target.value;
                                  setEditPriceForm({...editPriceForm, variants: nv});
                                }} 
                                className="px-2 py-1 border border-border rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-text-dark font-medium" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons at bottom - Cancel red background */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button 
                onClick={handleCancelEditPrice} 
                disabled={updating} 
                className="flex-1 flex justify-center items-center py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors gap-1 cursor-pointer"
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={() => handleSavePrice(editingPriceId)} 
                disabled={updating} 
                className="flex-1 flex justify-center items-center py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors gap-1 cursor-pointer"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
