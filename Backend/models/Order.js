import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: Number,
    price: Number,
    selectedVariant: String,
    selectedSize: String,
    imgSrc: String
  }],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    name: String, phone: String, street: String, city: String, state: String, zip: String, country: String
  },
  paymentStatus: { type: String, enum: ['Pending Payment', 'Paid', 'Failed'], default: 'Pending Payment' },
  paymentMode: { type: String, enum: ['Online', 'COD'], default: 'Online' },
  orderStatus: { type: String, enum: ['Pending', 'Completed', 'Cancelled'], default: 'Pending' },
  shipmentStatus: { type: String, enum: ['Ordered', 'Ready to Ship', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Ordered' },
  awb: String,
  courier: { type: String, default: 'Delhivery' },
  trackingUrl: String,
  invoiceNumber: String,
  invoiceUrl: String,
  paymentId: String,
  paidAt: Date,
  refunded: { type: String, enum: ['yes', 'no'], default: 'no' }
}, { timestamps: true });

// Map to the existing 'orders' collection used by FitBox frontend
export default mongoose.model('Order', orderSchema, 'orders');
