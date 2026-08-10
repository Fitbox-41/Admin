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

  // FitBox Points economy — the same shared `settings` document the website and
  // the app read, so editing these here re-prices points everywhere with no
  // website deploy and no mobile app release. Keep in sync with
  // FitBox_Website/Backend/Models/Settings.js.
  pointValueInr: { type: Number, default: 0.1, min: 0.01, max: 100 },
  redeemCapPercent: { type: Number, default: 10, min: 0, max: 100 },
  // What winning a weekly territory season is worth, in rupees. Places 2–20 are
  // derived from it, so this one number sets the whole prize table.
  seasonTopRewardInr: { type: Number, default: 200, min: 0, max: 100000 },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
