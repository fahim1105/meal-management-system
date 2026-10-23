import express from 'express';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { computeMemberHistory } from '../services/historyService.js';

const router = express.Router();

/**
 * Ensure the Finance doc for a given month has a manager stamp.
 * Creates the doc if it doesn't exist, or fills in managerName if it was cleared/missing.
 */
const ensureFinanceWithManager = async (groupId, month, group) => {
  const managerMember = group.members.find(
    (m) => String(m.userId) === String(group.managerId)
  );
  const managerName = managerMember?.name || '';

  let finance = await Finance.findOne({ groupId, month });

  if (!finance) {
    finance = new Finance({
      groupId,
      month,
      managerId: group.managerId,
      managerName,
      deposits: [],
      bazarCosts: [],
    });
  } else if (!finance.managerName) {
    // Doc exists but manager was never stamped (e.g. created before this feature)
    finance.managerId = group.managerId;
    finance.managerName = managerName;
  }

  return finance;
};

router.get('/my-history', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user || !user.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);
    const member = group.members.find((m) => m.userId === req.user.uid);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const { history } = await computeMemberHistory(group, member, req.user.uid);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:month', verifyToken, async (req, res) => {
  try {
    const { month } = req.params;
    const user = await User.findOne({ uid: req.user.uid });

    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    const finance = await ensureFinanceWithManager(user.groupId, month, group);
    await finance.save();

    res.json({ finance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposit', verifyToken, async (req, res) => {
  try {
    const { month, userId, amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can add deposits' });
    }

    const finance = await ensureFinanceWithManager(currentUser.groupId, month, group);

    // Always push a new deposit entry (cumulative history)
    finance.deposits.push({ userId, amount });

    await finance.save();
    res.json({ finance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bazar', verifyToken, async (req, res) => {
  try {
    const { month, amount, description } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can add bazar costs' });
    }

    const finance = await ensureFinanceWithManager(currentUser.groupId, month, group);

    finance.bazarCosts.push({
      amount,
      description,
      addedBy: req.user.uid
    });

    await finance.save();
    res.json({ finance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/deposit/:month/:depositId', verifyToken, async (req, res) => {
  try {
    const { month, depositId } = req.params;
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can delete deposits' });
    }

    const finance = await Finance.findOne({ groupId: currentUser.groupId, month });
    if (!finance) {
      return res.status(404).json({ error: 'Finance record not found' });
    }

    finance.deposits = finance.deposits.filter(d => d._id.toString() !== depositId);
    await finance.save();

    res.json({ finance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/bazar/:month/:bazarId', verifyToken, async (req, res) => {
  try {
    const { month, bazarId } = req.params;
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can delete bazar entries' });
    }

    const finance = await Finance.findOne({ groupId: currentUser.groupId, month });
    if (!finance) {
      return res.status(404).json({ error: 'Finance record not found' });
    }

    finance.bazarCosts = finance.bazarCosts.filter(b => b._id.toString() !== bazarId);
    await finance.save();

    res.json({ finance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/:month', verifyToken, async (req, res) => {
  try {
    const { month } = req.params;
    const user = await User.findOne({ uid: req.user.uid });

    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(user.groupId);
    const finance = await Finance.findOne({ groupId: user.groupId, month });
    const mealSheet = await MealSheet.findOne({ groupId: user.groupId, month });

    const totalBazar = finance?.bazarCosts.reduce((sum, b) => sum + b.amount, 0) || 0;
    
    const memberStats = {};
    
    group.members.forEach(member => {
      memberStats[member.userId] = {
        name: member.name,
        ownMeals: 0,
        guestMeals: 0,
        totalMeals: 0,
        ownMealsByType: { breakfast: 0, lunch: 0, dinner: 0 },
        guestMealsByType: { breakfast: 0, lunch: 0, dinner: 0 },
        deposit: 0,
        cost: 0,
        balance: 0
      };
    });

    if (mealSheet) {
      for (const [day, meals] of mealSheet.days) {
        meals.forEach(meal => {
          if (memberStats[meal.userId]) {
            // Calculate own meals (1 per meal type if checked)
            const ownBreakfast = meal.breakfast ? 1 : 0;
            const ownLunch = meal.lunch ? 1 : 0;
            const ownDinner = meal.dinner ? 1 : 0;
            
            // Calculate guest meals (count - 1 if meal is checked)
            const guestBreakfast = meal.breakfast ? Math.max(0, (meal.breakfastCount || 1) - 1) : 0;
            const guestLunch = meal.lunch ? Math.max(0, (meal.lunchCount || 1) - 1) : 0;
            const guestDinner = meal.dinner ? Math.max(0, (meal.dinnerCount || 1) - 1) : 0;
            
            // Calculate total meals (actual count if checked)
            const totalBreakfast = meal.breakfast ? (meal.breakfastCount || 1) : 0;
            const totalLunch = meal.lunch ? (meal.lunchCount || 1) : 0;
            const totalDinner = meal.dinner ? (meal.dinnerCount || 1) : 0;
            
            // Update own meals
            memberStats[meal.userId].ownMeals += ownBreakfast + ownLunch + ownDinner;
            memberStats[meal.userId].ownMealsByType.breakfast += ownBreakfast;
            memberStats[meal.userId].ownMealsByType.lunch += ownLunch;
            memberStats[meal.userId].ownMealsByType.dinner += ownDinner;
            
            // Update guest meals
            memberStats[meal.userId].guestMeals += guestBreakfast + guestLunch + guestDinner;
            memberStats[meal.userId].guestMealsByType.breakfast += guestBreakfast;
            memberStats[meal.userId].guestMealsByType.lunch += guestLunch;
            memberStats[meal.userId].guestMealsByType.dinner += guestDinner;
            
            // Update total meals
            memberStats[meal.userId].totalMeals += totalBreakfast + totalLunch + totalDinner;
          }
        });
      }
    }

    if (finance) {
      finance.deposits.forEach(deposit => {
        if (memberStats[deposit.userId]) {
          memberStats[deposit.userId].deposit += deposit.amount;
        }
      });
    }

    const totalMeals = Object.values(memberStats).reduce((sum, m) => sum + m.totalMeals, 0);
    const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

    // Use precise rounding: assign cost to all members, then adjust last member to absorb rounding diff
    const memberIds = Object.keys(memberStats);
    let assignedCost = 0;
    memberIds.forEach((userId, i) => {
      if (i < memberIds.length - 1) {
        const cost = Math.round(memberStats[userId].totalMeals * mealRate * 100) / 100;
        memberStats[userId].cost = cost;
        assignedCost += cost;
      } else {
        // Last member absorbs rounding difference
        memberStats[userId].cost = Math.round((totalBazar - assignedCost) * 100) / 100;
      }
      memberStats[userId].balance = Math.round((memberStats[userId].deposit - memberStats[userId].cost) * 100) / 100;
    });

    res.json({
      totalBazar,
      totalMeals,
      mealRate,
      memberStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
