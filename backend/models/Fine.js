import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  month: { type: String, required: true }, // "YYYY-MM"

  targetUserId: { type: String, required: true },
  targetUserName: { type: String, required: true },

  amount: { type: Number, required: true, min: 0.01 },
  reason: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: null },

  // "approved" = directly added by manager, "pending" = requested by member, "rejected"
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
  },

  requestedByUserId: { type: String, default: null },
  requestedByName: { type: String, default: null },
  rejectReason: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
});

fineSchema.index({ groupId: 1, month: 1 });

export default mongoose.model('Fine', fineSchema);
