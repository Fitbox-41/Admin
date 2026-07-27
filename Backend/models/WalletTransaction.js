import mongoose from 'mongoose';

const WalletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    required: true // e.g., 'run_reward', 'territory_reward', 'checkout_redeem'
  },
  sourceId: {
    type: String, // ID related to the source (e.g. orderId, runId)
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  }
}, { timestamps: true });

// Explicit shared-DB collection name. Must match the FitBox app backend exactly
// so the wallet ledger is a single source of truth across website + app + admin.
export default mongoose.model('WalletTransaction', WalletTransactionSchema, 'wallet_transactions');
