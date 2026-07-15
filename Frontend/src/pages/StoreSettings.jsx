import { useState, useEffect } from 'react';
import { Truck, Gift } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const StoreSettings = () => {
  const [deliveryFee, setDeliveryFee] = useState(99);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(999);
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
          freeDeliveryThreshold: parseInt(freeDeliveryThreshold, 10)
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
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Store Settings</h1>

      <div className="glass p-6 rounded-xl max-w-2xl">
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

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
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
