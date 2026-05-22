import mongoose from 'mongoose';

const memberMealConfigSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  breakfast: { type: Boolean, default: false },
  lunch: { type: Boolean, default: false },
  dinner: { type: Boolean, default: false },
});

const mealConfigSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  month: { type: String, required: true }, // "YYYY-MM"
  configs: [memberMealConfigSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

mealConfigSchema.index({ groupId: 1, month: 1 }, { unique: true });

export default mongoose.model('MealConfig', mealConfigSchema);
