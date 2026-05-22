import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import MealConfig from '../models/MealConfig.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/meal-config/:month
// Returns meal config for the month (all members)
// ─────────────────────────────────────────────────────────────
router.get('/:month', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const config = await MealConfig.findOne({
      groupId: user.groupId,
      month: req.params.month,
    });

    res.json({ config: config || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/meal-config
// Manager sets/updates meal config for a month
// Body: { month, configs: [{ userId, breakfast, lunch, dinner }] }
// ─────────────────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { month, configs } = req.body;

    if (!month || !configs?.length) {
      return res.status(400).json({ error: 'month and configs are required' });
    }

    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can set meal config' });
    }

    const existingConfig = await MealConfig.findOne({ groupId: user.groupId, month });

    // Only validate on update — first-time setup for a month is always allowed
    if (existingConfig) {
      const mealSheet = await MealSheet.findOne({ groupId: user.groupId, month }).lean();

      if (mealSheet?.days) {
        const dayEntries = mealSheet.days instanceof Map
          ? [...mealSheet.days.entries()]
          : Object.entries(mealSheet.days);

        const hasMealEntry = (userId, type) =>
          dayEntries.some(([, dayMeals]) =>
            Array.isArray(dayMeals) &&
            dayMeals.some(m => String(m.userId) === String(userId) && m[type] === true)
          );

        for (const cfg of configs) {
          const prev = existingConfig.configs.find(c => String(c.userId) === String(cfg.userId));
          for (const type of ['breakfast', 'lunch', 'dinner']) {
            const wasEnabled = prev?.[type] ?? false;
            const nowEnabled = !!cfg[type];
            if (wasEnabled && !nowEnabled && hasMealEntry(cfg.userId, type)) {
              const member = group.members.find(m => String(m.userId) === String(cfg.userId));
              return res.status(400).json({
                error: `Cannot disable ${type} for ${member?.name || cfg.userId} — meal entries exist. Uncheck those meals in the Meal Sheet first.`,
                userId: cfg.userId,
                mealType: type,
              });
            }
          }
        }
      }
    }

    // Build config entries
    const configEntries = configs.map(cfg => {
      const member = group.members.find(m => m.userId === cfg.userId);
      if (!member) throw new Error(`Member not found: ${cfg.userId}`);
      return {
        userId: cfg.userId,
        name: member.name,
        breakfast: !!cfg.breakfast,
        lunch: !!cfg.lunch,
        dinner: !!cfg.dinner,
      };
    });

    const config = await MealConfig.findOneAndUpdate(
      { groupId: user.groupId, month },
      { groupId: user.groupId, month, configs: configEntries, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
