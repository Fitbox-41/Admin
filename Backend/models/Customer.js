import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    orders: { type: Array, default: [] },
  },
  { timestamps: true }
);

// Map to the existing 'users' collection used by FitBox frontend
export default mongoose.model('Customer', customerSchema, 'users');
