import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  deliveryFee: { type: Number, default: 99 },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
