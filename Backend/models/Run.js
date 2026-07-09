import mongoose from 'mongoose';

const runSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  distance: { type: Number, required: true },
  duration: { type: Number, required: true },
  steps: { type: Number, default: 0 },
  calories: { type: Number, default: 0 },
  path: [{
    lat: Number,
    lng: Number,
    timestamp: Date
  }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  territoryConquered: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Run', runSchema);
