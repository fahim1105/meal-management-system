import mongoose from 'mongoose';

const mealEntrySchema = new mongoose.Schema({
  userId: String,
  breakfast: { type: Boolean, default: false },
  breakfastCount: { type: Number, default: 1, min: 0 },
  lunch: { type: Boolean, default: false },
  lunchCount: { type: Number, default: 1, min: 0 },
  dinner: { type: Boolean, default: false },
  dinnerCount: { type: Number, default: 1, min: 0 }
});

const mealSheetSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  days: {
    type: Map,
    of: [mealEntrySchema],
    default: () => {
      const daysMap = new Map();
      for (let i = 1; i <= 31; i++) {
        daysMap.set(i.toString(), []);
      }
      return daysMap;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

mealSheetSchema.index({ groupId: 1, month: 1 }, { unique: true });

export default mongoose.model('MealSheet', mealSheetSchema);
