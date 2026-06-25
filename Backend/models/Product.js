import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  price: { type: Number, default: 0 },
  oldPrice: { type: Number, default: 0 },
  weight: { type: Number, default: 0 }
});

const variantSchema = new mongoose.Schema({
  color: { type: String, default: '' },
  images: [{ type: String }],
  sizes: [sizeSchema]
});

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  price: { type: Number },
  oldPrice: { type: Number },
  isNew: { type: Boolean, default: false },
  isOutOfStock: { type: Boolean, default: false },
  qualities: [{ type: String }],
  longDesc: { type: String },
  features: [{ type: String }],
  material: { type: String },
  relatedIds: [{ type: Number }],
  variants: [variantSchema],
  showcaseImages: [{ type: String }],
  imgSrc: { type: String },
  hoverImgSrc: { type: String }
}, { timestamps: true, suppressReservedKeysWarning: true });

const Product = mongoose.model('Product', productSchema);

export default Product;

