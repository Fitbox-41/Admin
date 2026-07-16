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

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  comment: { type: String, required: true },
  images: [{ type: String }],
  helpful: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  price: { type: Number },
  oldPrice: { type: Number },
  isNew: { type: Boolean, default: false },
  isOutOfStock: { type: Boolean, default: false },
  stock: { type: Number, default: 100 },
  qualities: [{ type: String }],
  longDesc: { type: String },
  features: [{ type: String }],
  material: { type: String },
  relatedIds: [{ type: Number }],
  variants: [variantSchema],
  showcaseImages: [{ type: String }],
  imgSrc: { type: String },
  hoverImgSrc: { type: String },
  reviews: [reviewSchema]
}, { timestamps: true, suppressReservedKeysWarning: true });

const Product = mongoose.model('Product', productSchema);

export default Product;


