import mongoose from 'mongoose';

const territorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  polygon: [{
    lat: Number,
    lng: Number
  }],
  center: {
    lat: Number,
    lng: Number
  },
  currentOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  history: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capturedAt: { type: Date, default: Date.now },
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'Run' }
  }]
}, { timestamps: true });

export default mongoose.model('Territory', territorySchema);
