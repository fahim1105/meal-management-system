import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
  userId: String,
  amount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

const bazarSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  description: String,
  addedBy: String
});

const financeSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  deposits: [depositSchema],
  bazarCosts: [bazarSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

financeSchema.index({ groupId: 1, month: 1 }, { unique: true });

export default mongoose.model('Finance', financeSchema);
