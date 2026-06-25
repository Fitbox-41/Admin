import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subCategory: '',
    isNew: false,
    isOutOfStock: false,
    qualities: [''],
    longDesc: '',
    features: [''],
    material: '',
    relatedIds: [],
    price: '',
    oldPrice: '',
    imgSrc: '',
    hoverImgSrc: '',
    showcaseImages: [''],
    variants: [],
    sizes: []
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayChange = (index, field, value) => {
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArr }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (index, field) => {
    const newArr = formData[field].filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [field]: newArr }));
  };

  // Variants handlers
  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { color: '', images: [''], price: 0, oldPrice: 0, weight: 0 }]
    }));
  };

  const updateVariant = (vIndex, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[vIndex][field] = value;
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const updateVariantImage = (vIndex, imgIndex, value) => {
    const newVariants = [...formData.variants];
    newVariants[vIndex].images[imgIndex] = value;
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const addVariantImage = (vIndex) => {
    const newVariants = [...formData.variants];
    newVariants[vIndex].images.push('');
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const removeVariant = (vIndex) => {
    const newVariants = formData.variants.filter((_, i) => i !== vIndex);
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  // Sizes handlers
  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', weight: 0, price: 0, oldPrice: 0 }]
    }));
  };

  const updateSize = (sIndex, field, value) => {
    const newSizes = [...formData.sizes];
    newSizes[sIndex][field] = value;
    setFormData(prev => ({ ...prev, sizes: newSizes }));
  };

  const removeSize = (sIndex) => {
    const newSizes = formData.sizes.filter((_, i) => i !== sIndex);
    setFormData(prev => ({ ...prev, sizes: newSizes }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Clean up empty strings from arrays
      const cleanedData = {
        ...formData,
        qualities: formData.qualities.filter(q => q.trim()),
        features: formData.features.filter(f => f.trim()),
        showcaseImages: formData.showcaseImages.filter(i => i.trim()),
        price: Number(formData.price) || 0,
        oldPrice: Number(formData.oldPrice) || 0,
        relatedIds: typeof formData.relatedIds === 'string' 
          ? formData.relatedIds.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))
          : formData.relatedIds
      };

      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      });

      if (res.ok) {
        navigate('/products');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to add product');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/products')}
          className="p-2 rounded hover:bg-bg-light transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Add New Product</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-border space-y-8">
        {/* Basic Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Basic Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Product Name *</label>
              <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Category *</label>
              <input required name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Sub Category</label>
              <input name="subCategory" value={formData.subCategory} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Material</label>
              <input name="material" value={formData.material} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-mid">Long Description</label>
            <textarea name="longDesc" value={formData.longDesc} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isNew" checked={formData.isNew} onChange={handleChange} className="rounded border-border text-primary focus:ring-primary" />
              <span className="text-sm font-medium">Mark as New Arrival</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isOutOfStock" checked={formData.isOutOfStock} onChange={handleChange} className="rounded border-border text-primary focus:ring-primary" />
              <span className="text-sm font-medium">Out of Stock</span>
            </label>
          </div>
        </section>

        {/* Pricing & Display Images */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Base Pricing & Main Images</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Base Selling Price (₹)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Base MRP / Old Price (₹)</label>
              <input type="number" name="oldPrice" value={formData.oldPrice} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Main Thumbnail Image URL</label>
              <input name="imgSrc" placeholder="/Images/1.1.1.jpg" value={formData.imgSrc} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-mid">Hover Image URL</label>
              <input name="hoverImgSrc" placeholder="/Images/1.1.2.jpg" value={formData.hoverImgSrc} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
        </section>

        {/* Lists (Qualities, Features, Showcase Images) */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Details Lists</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-mid flex justify-between items-center">
              <span>Key Qualities (Bullet points)</span>
              <button type="button" onClick={() => addArrayItem('qualities')} className="text-xs text-primary hover:underline flex items-center"><Plus size={12}/> Add Quality</button>
            </label>
            {formData.qualities.map((q, idx) => (
              <div key={idx} className="flex gap-2">
                <input value={q} onChange={(e) => handleArrayChange(idx, 'qualities', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg bg-bg text-sm" placeholder="e.g., Adjustable Length" />
                <button type="button" onClick={() => removeArrayItem(idx, 'qualities')} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-mid flex justify-between items-center">
              <span>Features (Detailed)</span>
              <button type="button" onClick={() => addArrayItem('features')} className="text-xs text-primary hover:underline flex items-center"><Plus size={12}/> Add Feature</button>
            </label>
            {formData.features.map((f, idx) => (
              <div key={idx} className="flex gap-2">
                <input value={f} onChange={(e) => handleArrayChange(idx, 'features', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg bg-bg text-sm" placeholder="e.g., Premium build quality with high-durability..." />
                <button type="button" onClick={() => removeArrayItem(idx, 'features')} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-mid flex justify-between items-center">
              <span>Showcase Image URLs (Max 3 usually)</span>
              <button type="button" onClick={() => addArrayItem('showcaseImages')} className="text-xs text-primary hover:underline flex items-center"><Plus size={12}/> Add Image</button>
            </label>
            {formData.showcaseImages.map((img, idx) => (
              <div key={idx} className="flex gap-2">
                <input value={img} onChange={(e) => handleArrayChange(idx, 'showcaseImages', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg bg-bg text-sm" placeholder="/Images/1.1.3.jpg" />
                <button type="button" onClick={() => removeArrayItem(idx, 'showcaseImages')} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* Variants */}
        <section className="space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h2 className="text-lg font-semibold">Color Variants</h2>
            <button type="button" onClick={addVariant} className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-1">
              <Plus size={14}/> Add Variant
            </button>
          </div>
          
          {formData.variants.map((variant, vIdx) => (
            <div key={vIdx} className="p-4 border border-border rounded-lg bg-bg/50 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-sm">Variant {vIdx + 1}</h3>
                <button type="button" onClick={() => removeVariant(vIdx)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">Color Name</label>
                  <input value={variant.color} onChange={(e) => updateVariant(vIdx, 'color', e.target.value)} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" placeholder="e.g., Red & Black" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">Selling Price (₹)</label>
                  <input type="number" value={variant.price} onChange={(e) => updateVariant(vIdx, 'price', Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">MRP / Old Price (₹)</label>
                  <input type="number" value={variant.oldPrice} onChange={(e) => updateVariant(vIdx, 'oldPrice', Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">Weight (grams)</label>
                  <input type="number" value={variant.weight} onChange={(e) => updateVariant(vIdx, 'weight', Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-text-mid flex justify-between items-center">
                  <span>Variant Images</span>
                  <button type="button" onClick={() => addVariantImage(vIdx)} className="text-xs text-primary hover:underline">Add Image</button>
                </label>
                {variant.images.map((img, iIdx) => (
                  <input key={iIdx} value={img} onChange={(e) => updateVariantImage(vIdx, iIdx, e.target.value)} className="w-full px-2 py-1.5 mb-2 border border-border rounded text-sm bg-white" placeholder={`/Images/variant-${vIdx}-${iIdx}.jpg`} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Sizes */}
        <section className="space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h2 className="text-lg font-semibold">Size Options</h2>
            <button type="button" onClick={addSize} className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-1">
              <Plus size={14}/> Add Size
            </button>
          </div>
          
          {formData.sizes.map((size, sIdx) => (
            <div key={sIdx} className="p-4 border border-border rounded-lg bg-bg/50 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-sm">Size {sIdx + 1}</h3>
                <button type="button" onClick={() => removeSize(sIdx)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">Size Name</label>
                  <input value={size.name} onChange={(e) => updateSize(sIdx, 'name', e.target.value)} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" placeholder="e.g., 5kg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">Selling Price (₹)</label>
                  <input type="number" value={size.price} onChange={(e) => updateSize(sIdx, 'price', Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">MRP / Old Price (₹)</label>
                  <input type="number" value={size.oldPrice} onChange={(e) => updateSize(sIdx, 'oldPrice', Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-mid">Weight (grams)</label>
                  <input type="number" value={size.weight} onChange={(e) => updateSize(sIdx, 'weight', Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white" />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Submit */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {loading ? 'Saving Product...' : 'Save New Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
