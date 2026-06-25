import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const emptySize = () => ({ name: '', price: 0, oldPrice: 0, weight: 0 });
const emptyVariant = () => ({ color: '', images: [''], sizes: [emptySize()] });

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedVariants, setCollapsedVariants] = useState({});

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
    variants: [emptyVariant()],
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleArrayChange = (index, field, value) => {
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArr }));
  };

  const addArrayItem = (field) => setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  const removeArrayItem = (index, field) => {
    const newArr = formData[field].filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [field]: newArr }));
  };

  // ---- Variant handlers ----
  const addVariant = () => {
    setFormData(prev => ({ ...prev, variants: [...prev.variants, emptyVariant()] }));
  };

  const removeVariant = (vIdx) => {
    setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== vIdx) }));
  };

  const updateVariantField = (vIdx, field, value) => {
    const v = [...formData.variants];
    v[vIdx] = { ...v[vIdx], [field]: value };
    setFormData(prev => ({ ...prev, variants: v }));
  };

  const addVariantImage = (vIdx) => {
    const v = [...formData.variants];
    v[vIdx].images = [...v[vIdx].images, ''];
    setFormData(prev => ({ ...prev, variants: v }));
  };

  const updateVariantImage = (vIdx, imgIdx, value) => {
    const v = [...formData.variants];
    v[vIdx].images[imgIdx] = value;
    setFormData(prev => ({ ...prev, variants: v }));
  };

  const removeVariantImage = (vIdx, imgIdx) => {
    const v = [...formData.variants];
    v[vIdx].images = v[vIdx].images.filter((_, i) => i !== imgIdx);
    setFormData(prev => ({ ...prev, variants: v }));
  };

  // ---- Size handlers (nested inside variant) ----
  const addSize = (vIdx) => {
    const v = [...formData.variants];
    v[vIdx].sizes = [...(v[vIdx].sizes || []), emptySize()];
    setFormData(prev => ({ ...prev, variants: v }));
  };

  const removeSize = (vIdx, sIdx) => {
    const v = [...formData.variants];
    v[vIdx].sizes = v[vIdx].sizes.filter((_, i) => i !== sIdx);
    setFormData(prev => ({ ...prev, variants: v }));
  };

  const updateSize = (vIdx, sIdx, field, value) => {
    const v = [...formData.variants];
    v[vIdx].sizes[sIdx] = { ...v[vIdx].sizes[sIdx], [field]: value };
    setFormData(prev => ({ ...prev, variants: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price) || 0,
        oldPrice: Number(formData.oldPrice) || 0,
        qualities: formData.qualities.filter(Boolean),
        features: formData.features.filter(Boolean),
        showcaseImages: formData.showcaseImages.filter(Boolean),
        variants: formData.variants.map(v => ({
          ...v,
          images: v.images.filter(Boolean),
          sizes: v.sizes.map(s => ({
            ...s,
            price: Number(s.price) || 0,
            oldPrice: Number(s.oldPrice) || 0,
            weight: Number(s.weight) || 0,
          }))
        }))
      };

      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create product');
      }

      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleVariantCollapse = (vIdx) => {
    setCollapsedVariants(prev => ({ ...prev, [vIdx]: !prev[vIdx] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/products')} className="p-2 hover:bg-bg rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Add New Product</h1>
          <p className="text-sm text-text-mid">Fill in all details. Variants = Colors with nested sizes and prices.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Basic Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-text-mid">Product Name *</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="FitBox Sports..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-mid">Category *</label>
              <input name="category" value={formData.category} onChange={handleChange} required className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="Weights & Dumbbells" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-mid">Sub Category</label>
              <input name="subCategory" value={formData.subCategory} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="Dumbbells" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-mid">Base Selling Price (₹) — Fallback</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="999" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-mid">Base MRP (₹) — Fallback</label>
              <input type="number" name="oldPrice" value={formData.oldPrice} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="1499" />
            </div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="isNew" checked={formData.isNew} onChange={handleChange} className="rounded" />
                New Arrival
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="isOutOfStock" checked={formData.isOutOfStock} onChange={handleChange} className="rounded" />
                Out of Stock
              </label>
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Product Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-text-mid">Main Image (imgSrc)</label>
              <input name="imgSrc" value={formData.imgSrc} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="/Images/1.1.1.jpg" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-mid">Hover Image (hoverImgSrc)</label>
              <input name="hoverImgSrc" value={formData.hoverImgSrc} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded text-sm bg-white" placeholder="/Images/1.2.1.jpg" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-text-mid">Showcase Images (3 recommended)</label>
              <button type="button" onClick={() => addArrayItem('showcaseImages')} className="text-xs text-primary hover:underline">+ Add</button>
            </div>
            {formData.showcaseImages.map((img, i) => (
              <div key={i} className="flex gap-2">
                <input value={img} onChange={(e) => handleArrayChange(i, 'showcaseImages', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded text-sm bg-white" placeholder="/Images/1.1.1.jpg" />
                {formData.showcaseImages.length > 1 && <button type="button" onClick={() => removeArrayItem(i, 'showcaseImages')} className="text-red-500 p-1"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </section>

        {/* Description */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Description</h2>
          <div className="space-y-1">
            <label className="text-xs text-text-mid">Long Description</label>
            <textarea name="longDesc" value={formData.longDesc} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-border rounded text-sm bg-white resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-mid">Material</label>
            <input name="material" value={formData.material} onChange={handleChange} className="w-full px-3 py-2 border border-border rounded text-sm bg-white" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-text-mid">Qualities / Highlights</label>
              <button type="button" onClick={() => addArrayItem('qualities')} className="text-xs text-primary hover:underline">+ Add</button>
            </div>
            {formData.qualities.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input value={q} onChange={(e) => handleArrayChange(i, 'qualities', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded text-sm bg-white" placeholder="Anti-Slip Grip" />
                {formData.qualities.length > 1 && <button type="button" onClick={() => removeArrayItem(i, 'qualities')} className="text-red-500 p-1"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-text-mid">Features</label>
              <button type="button" onClick={() => addArrayItem('features')} className="text-xs text-primary hover:underline">+ Add</button>
            </div>
            {formData.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <textarea value={f} onChange={(e) => handleArrayChange(i, 'features', e.target.value)} rows={2} className="flex-1 px-3 py-2 border border-border rounded text-sm bg-white resize-none" />
                {formData.features.length > 1 && <button type="button" onClick={() => removeArrayItem(i, 'features')} className="text-red-500 p-1 mt-1"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </section>

        {/* ---- VARIANTS (Color > Sizes) ---- */}
        <section className="space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <div>
              <h2 className="text-lg font-semibold">Variants (Color → Sizes → Prices)</h2>
              <p className="text-xs text-text-mid mt-0.5">Each variant = one color. Inside each color, add sizes with individual prices.</p>
            </div>
            <button type="button" onClick={addVariant} className="text-sm px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-1">
              <Plus size={14}/> Add Color
            </button>
          </div>

          {formData.variants.map((variant, vIdx) => (
            <div key={vIdx} className="border border-border rounded-xl overflow-hidden shadow-sm">
              {/* Variant Header */}
              <div className="flex items-center justify-between bg-bg/80 px-4 py-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs text-text-mid">Color Name (leave blank if product has no color)</label>
                    <input
                      value={variant.color}
                      onChange={(e) => updateVariantField(vIdx, 'color', e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded text-sm bg-white"
                      placeholder="e.g., Red & Black, or leave blank"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button type="button" onClick={() => toggleVariantCollapse(vIdx)} className="p-1.5 text-text-mid hover:text-primary rounded">
                    {collapsedVariants[vIdx] ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}
                  </button>
                  {formData.variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(vIdx)} className="text-red-500 p-1.5 hover:bg-red-50 rounded">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              </div>

              {!collapsedVariants[vIdx] && (
                <div className="p-4 space-y-4">
                  {/* Images */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-text-mid">Images for this color</label>
                      <button type="button" onClick={() => addVariantImage(vIdx)} className="text-xs text-primary hover:underline">+ Add Image</button>
                    </div>
                    {variant.images.map((img, imgIdx) => (
                      <div key={imgIdx} className="flex gap-2">
                        <input
                          value={img}
                          onChange={(e) => updateVariantImage(vIdx, imgIdx, e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-border rounded text-sm bg-white"
                          placeholder={`/Images/${vIdx + 1}.${imgIdx + 1}.jpg`}
                        />
                        {variant.images.length > 1 && (
                          <button type="button" onClick={() => removeVariantImage(vIdx, imgIdx)} className="text-red-500 p-1"><Trash2 size={14}/></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sizes */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-text-mid">Sizes & Prices (leave size name blank if product has no sizes)</label>
                      <button type="button" onClick={() => addSize(vIdx)} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 flex items-center gap-1">
                        <Plus size={12}/> Add Size
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-[11px] font-medium text-text-mid px-1">
                      <span>Size Name</span>
                      <span>Selling Price (₹)</span>
                      <span>MRP (₹)</span>
                      <span>Weight (g)</span>
                      <span></span>
                    </div>
                    {(variant.sizes || []).map((size, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-5 gap-2 items-center">
                        <input
                          value={size.name}
                          onChange={(e) => updateSize(vIdx, sIdx, 'name', e.target.value)}
                          className="px-2 py-1.5 border border-border rounded text-sm bg-white"
                          placeholder="e.g., 5kg"
                        />
                        <input
                          type="number"
                          value={size.price}
                          onChange={(e) => updateSize(vIdx, sIdx, 'price', Number(e.target.value))}
                          className="px-2 py-1.5 border border-border rounded text-sm bg-white"
                        />
                        <input
                          type="number"
                          value={size.oldPrice}
                          onChange={(e) => updateSize(vIdx, sIdx, 'oldPrice', Number(e.target.value))}
                          className="px-2 py-1.5 border border-border rounded text-sm bg-white"
                        />
                        <input
                          type="number"
                          value={size.weight}
                          onChange={(e) => updateSize(vIdx, sIdx, 'weight', Number(e.target.value))}
                          className="px-2 py-1.5 border border-border rounded text-sm bg-white"
                        />
                        {(variant.sizes || []).length > 1 && (
                          <button type="button" onClick={() => removeSize(vIdx, sIdx)} className="text-red-500 p-1 hover:bg-red-50 rounded justify-self-start">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
