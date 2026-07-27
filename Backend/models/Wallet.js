import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    ref: 'User'
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  }
}, { timestamps: true });

// Explicit shared-DB collection name (matches the FitBox app backend).
export default mongoose.model('Wallet', WalletSchema, 'wallets');
