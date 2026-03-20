import express from 'express';
import Finance from '../models/Finance.js';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-history', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user || !user.groupId) return res.status(404).json({ error: 'No group found' });

    const group = await Group.findById(user.groupId);

    // Find this user's member record
    const member = group.members.find(m => m.userId === req.user.uid);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Build active intervals: [{start, end}]
    // joinedAt → leftAt (or now if still active)
    // rejoinedAt → leftAt (or now if still active)
    const intervals = [];
    const joinStart = new Date(member.joinedAt);

    if (member.leftAt) {
      // First interval: joinedAt → leftAt
      intervals.push({ start: joinStart, end: new Date(member.leftAt) });
      // If rejoined, second interval: rejoinedAt → now (still active)
      if (member.rejoinedAt) {
        intervals.push({ start: new Date(member.rejoinedAt), end: now });
      }
    } else {
      // Never left — single interval: joinedAt → now
      intervals.push({ start: joinStart, end: now });
    }

    // Collect all months from first join to now, mark which are "in range"
    const firstJoinMonth = new Date(joinStart.getFullYear(), joinStart.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const toMonthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Check if a month falls within any active interval
    const isInInterval = (monthDate) => {
      return intervals.some(({ start, end }) => {
        const intervalStart = new Date(start.getFullYear(), start.getMonth(), 1);
        const intervalEnd = new Date(end.getFullYear(), end.getMonth(), 1);
        return monthDate >= intervalStart && monthDate <= intervalEnd;
      });
    };

    const months = [];
    let cur = new Date(firstJoinMonth);
    while (cur <= endMonth) {
      months.push(toMonthStr(cur));
      cur.setMonth(cur.getMonth() + 1);
    }

    if (months.length === 0) return res.json({ history: [] });

    const [finances, mealSheets] = await Promise.all([
      Finance.find({ groupId: user.groupId, month: { $in: months } }),
      MealSheet.find({ groupId: user.groupId, month: { $in: months } }),
    ]);

    const financeMap = Object.fromEntries(finances.map(f => [f.month, f]));
    const mealMap = Object.fromEntries(mealSheets.map(m => [m.month, m]));

    const history = months.map(month => {
      const finance = financeMap[month];
      const mealSheet = mealMap[month];
      const monthDate = new Date(month + '-01');
      const inRange = isInInterval(monthDate);
      const isCurrentMonth = month === currentMonthStr;

      const totalBazar = finance?.bazarCosts.reduce((s, b) => s + b.amount, 0) || 0;

      let breakfast = 0, lunch = 0, dinner = 0, totalMeals = 0, groupTotalMeals = 0;

      if (mealSheet) {
        for (const [, meals] of mealSheet.days) {
          meals.forEach(meal => {
            const tb = meal.breakfast ? (meal.breakfastCount || 1) : 0;
            const tl = meal.lunch ? (meal.lunchCount || 1) : 0;
            const td = meal.dinner ? (meal.dinnerCount || 1) : 0;
            groupTotalMeals += tb + tl + td;
            if (meal.userId === req.user.uid) {
              breakfast += tb; lunch += tl; dinner += td;
              totalMeals += tb + tl + td;
            }
          });
        }
      }

      const mealRate = groupTotalMeals > 0 ? totalBazar / groupTotalMeals : 0;
      const cost = totalMeals * mealRate;
      const deposit = finance?.deposits
        .filter(d => d.userId === req.user.uid)
        .reduce((s, d) => s + d.amount, 0) || 0;
      const balance = deposit - cost;

      return {
        month,
        breakfast, lunch, dinner, totalMeals,
        totalBazar, mealRate, deposit, cost, balance,
        isCurrentMonth,
        inRange,
        // gap month = was not in group during this month
        isGap: !inRange,
        hasData: totalMeals > 0 || deposit > 0 || totalBazar > 0,
      };
    });

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

    let finance = await Finance.findOne({ groupId: user.groupId, month });

    if (!finance) {
      finance = new Finance({ groupId: user.groupId, month, deposits: [], bazarCosts: [] });
      await finance.save();
    }

    res.json({ finance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposit', verifyToken, async (req, res) => {
  try {
    const { month, userId, amount } = req.body;
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can add deposits' });
    }

    let finance = await Finance.findOne({ groupId: currentUser.groupId, month });

    if (!finance) {
      finance = new Finance({ groupId: currentUser.groupId, month, deposits: [], bazarCosts: [] });
    }

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
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can add bazar costs' });
    }

    let finance = await Finance.findOne({ groupId: currentUser.groupId, month });

    if (!finance) {
      finance = new Finance({ groupId: currentUser.groupId, month, deposits: [], bazarCosts: [] });
    }

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

    Object.keys(memberStats).forEach(userId => {
      memberStats[userId].cost = memberStats[userId].totalMeals * mealRate;
      memberStats[userId].balance = memberStats[userId].deposit - memberStats[userId].cost;
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
