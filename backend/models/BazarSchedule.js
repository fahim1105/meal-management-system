import mongoose from 'mongoose';

const rangeEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
});

const bazarScheduleSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  month: { type: String, required: true },
  ranges: [rangeEntrySchema],
  createdAt: { type: Date, default: Date.now }
});

bazarScheduleSchema.index({ groupId: 1, month: 1 }, { unique: true });

export default mongoose.model('BazarSchedule', bazarScheduleSchema);
