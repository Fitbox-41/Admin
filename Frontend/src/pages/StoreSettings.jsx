import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const StoreSettings = () => {
  const [deliveryFee, setDeliveryFee] = useState(99);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`);
        const data = await response.json();
        if (data && data.deliveryFee !== undefined) {
          setDeliveryFee(data.deliveryFee);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveDeliveryFee = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deliveryFee: parseInt(deliveryFee, 10) })
      });
      if (response.ok) {
        alert('Delivery fee saved successfully');
      } else {
        alert('Failed to save delivery fee');
      }
    } catch (error) {
      console.error('Error saving delivery fee:', error);
      alert('Error saving delivery fee');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Store Settings</h1>

      <div className="glass p-6 rounded-xl max-w-2xl">
        <h3 className="font-bold mb-4 text-text-dark text-lg border-b border-border pb-2">Delivery Settings</h3>
        
        <div className="space-y-4 py-2">
          {/* Delivery Fee */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
                <Truck size={18} />
              </div>
              <div>
                <p className="font-medium text-text-dark">Standard Delivery Fee (₹)</p>
                <p className="text-sm text-text-mid">Applied to orders under ₹999</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-20 px-3 py-1.5 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-dark"
                min="0"
              />
              <button 
                onClick={handleSaveDeliveryFee}
                disabled={isSaving}
                className="px-4 py-1.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
