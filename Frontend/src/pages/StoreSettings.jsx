import { useState, useEffect } from 'react';
import { Truck, Gift, Megaphone } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const DEFAULT_SALE_TEXT = 'SUMMER SALE IS LIVE! GET UP TO 50% OFF ON ALL GYM EQUIPMENT • USE CODE: FIT50 • LIMITED TIME OFFER • FREE DELIVERY ON ORDERS ABOVE ₹999 • ';
const DEFAULT_RIBBON_COLOR = '#e53935';
const DEFAULT_TEXT_COLOR = '#ffffff';

const StoreSettings = () => {
  const [deliveryFee, setDeliveryFee] = useState(99);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(999);
  const [saleRibbonText, setSaleRibbonText] = useState(DEFAULT_SALE_TEXT);
  const [saleRibbonColor, setSaleRibbonColor] = useState(DEFAULT_RIBBON_COLOR);
  const [saleRibbonTextColor, setSaleRibbonTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`);
        const data = await response.json();
        if (data) {
          if (data.deliveryFee !== undefined) {
            setDeliveryFee(data.deliveryFee);
          }
          if (data.freeDeliveryThreshold !== undefined) {
            setFreeDeliveryThreshold(data.freeDeliveryThreshold);
          }
          if (data.saleRibbonText !== undefined && data.saleRibbonText.trim() !== '') {
            setSaleRibbonText(data.saleRibbonText);
          }
          if (data.saleRibbonColor) {
            setSaleRibbonColor(data.saleRibbonColor);
          }
          if (data.saleRibbonTextColor) {
            setSaleRibbonTextColor(data.saleRibbonTextColor);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          deliveryFee: parseInt(deliveryFee, 10),
          freeDeliveryThreshold: parseInt(freeDeliveryThreshold, 10),
          saleRibbonText: saleRibbonText,
          saleRibbonColor: saleRibbonColor,
          saleRibbonTextColor: saleRibbonTextColor
        })
      });
      if (response.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Website Settings</h1>

      <div className="glass p-6 md:p-8 rounded-xl w-full space-y-8">
        <div>
          <h3 className="font-bold mb-6 text-text-dark text-lg border-b border-border pb-2">Delivery Settings</h3>
          
          <div className="space-y-6 py-2">
            {/* Delivery Fee */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="font-medium text-text-dark">Standard Delivery Fee (₹)</p>
                  <p className="text-sm text-text-mid">Applied to orders below the free delivery threshold</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <input 
                  type="number" 
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-24 px-3 py-1.5 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark font-medium"
                  min="0"
                />
              </div>
            </div>

            {/* Free Delivery Threshold */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
                  <Gift size={18} />
                </div>
                <div>
                  <p className="font-medium text-text-dark">Free Delivery Threshold (₹)</p>
                  <p className="text-sm text-text-mid">Orders at or above this value get free shipping</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <input 
                  type="number" 
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                  className="w-24 px-3 py-1.5 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark font-medium"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Offer / Header Ribbon Settings */}
        <div>
          <h3 className="font-bold mb-4 text-text-dark text-lg border-b border-border pb-2">Header Offer Ribbon Settings</h3>
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-500">
                <Megaphone size={18} />
              </div>
              <div>
                <p className="font-medium text-text-dark">Header Sale Ribbon Text & Styling</p>
                <p className="text-sm text-text-mid">Customize text content and background color for website header banner</p>
              </div>
            </div>

            {/* Live Banner Preview Box */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-mid uppercase tracking-wider">Live Preview</label>
              <div 
                style={{ backgroundColor: saleRibbonColor, color: saleRibbonTextColor }}
                className="w-full py-2.5 px-4 rounded-lg font-bold text-xs whitespace-nowrap overflow-hidden text-center shadow-inner transition-all duration-200"
              >
                {saleRibbonText || 'OFFER TEXT PREVIEW HERE • '}
              </div>
            </div>

            {/* Offer Text Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-mid">Offer Text</label>
              <textarea
                rows="3"
                value={saleRibbonText}
                onChange={(e) => setSaleRibbonText(e.target.value)}
                placeholder="Enter offer announcement text..."
                className="w-full p-3 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark font-medium text-sm"
              />
            </div>

            {/* Color Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Ribbon Background Color */}
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg">
                <span className="text-xs font-semibold text-text-dark">Ribbon Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={saleRibbonColor}
                    onChange={(e) => setSaleRibbonColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={saleRibbonColor}
                    onChange={(e) => setSaleRibbonColor(e.target.value)}
                    className="w-20 px-2 py-1 text-xs border border-border rounded font-mono uppercase bg-bg"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg">
                <span className="text-xs font-semibold text-text-dark">Text Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={saleRibbonTextColor}
                    onChange={(e) => setSaleRibbonTextColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={saleRibbonTextColor}
                    onChange={(e) => setSaleRibbonTextColor(e.target.value)}
                    className="w-20 px-2 py-1 text-xs border border-border rounded font-mono uppercase bg-bg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-text-mid pt-2 border-t border-border">
              <span>Tip: End text with " • " for smooth marquee scrolling.</span>
              <button
                type="button"
                onClick={() => {
                  setSaleRibbonText(DEFAULT_SALE_TEXT);
                  setSaleRibbonColor(DEFAULT_RIBBON_COLOR);
                  setSaleRibbonTextColor(DEFAULT_TEXT_COLOR);
                }}
                className="text-primary hover:underline font-semibold"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end pt-4 border-t border-border">
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all shadow-md hover:shadow-primary/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
