import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  deliveryFee: { type: Number, default: 99 },
  freeDeliveryThreshold: { type: Number, default: 999 },
  saleRibbonText: { 
    type: String, 
    default: 'SUMMER SALE IS LIVE! GET UP TO 50% OFF ON ALL GYM EQUIPMENT • USE CODE: FIT50 • LIMITED TIME OFFER • FREE DELIVERY ON ORDERS ABOVE ₹999 • ' 
  },
  saleRibbonColor: { type: String, default: '#e53935' },
  saleRibbonTextColor: { type: String, default: '#ffffff' },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
