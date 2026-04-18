import express from 'express';
import MealSheet from '../models/MealSheet.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:month', verifyToken, async (req, res) => {
  try {
    const { month } = req.params;
    const user = await User.findOne({ uid: req.user.uid });

    if (!user || !user.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    let mealSheet = await MealSheet.findOne({ groupId: user.groupId, month });

    if (!mealSheet) {
      mealSheet = new MealSheet({ groupId: user.groupId, month });
      await mealSheet.save();
    }

    // Convert Map to plain object for JSON response
    const responseData = mealSheet.toObject();
    responseData.days = Object.fromEntries(mealSheet.days);

    res.json({ mealSheet: responseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/toggle', verifyToken, async (req, res) => {
  try {
    const { month, day, userId, mealType } = req.body;
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can edit meals' });
    }

    // Check if user is inactive or if date is outside their active period
    const member = group.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found in group' });
    }

    // Check if member is currently inactive
    if (member.status === 'inactive') {
      return res.status(403).json({ error: 'Cannot edit meals for inactive members' });
    }

    // Check if the date is within member's active period
    const mealDate = new Date(`${month}-${day.toString().padStart(2, '0')}`);
    
    // If member left and rejoined, check if date is in inactive period
    if (member.leftAt && member.rejoinedAt) {
      if (mealDate >= new Date(member.leftAt) && mealDate < new Date(member.rejoinedAt)) {
        return res.status(403).json({ 
          error: 'Cannot edit meals for dates when member was not in group' 
        });
      }
    }
    
    // If member left but hasn't rejoined, check if date is after leave date
    if (member.leftAt && !member.rejoinedAt) {
      if (mealDate >= new Date(member.leftAt)) {
        return res.status(403).json({ 
          error: 'Cannot edit meals after member left the group' 
        });
      }
    }

    let mealSheet = await MealSheet.findOne({ groupId: currentUser.groupId, month });

    if (!mealSheet) {
      mealSheet = new MealSheet({ groupId: currentUser.groupId, month });
    }

    const dayKey = day.toString();
    let dayMeals = mealSheet.days.get(dayKey) || [];
    
    let userMeal = dayMeals.find(m => m.userId === userId);
    
    if (!userMeal) {
      userMeal = { 
        userId, 
        breakfast: false, 
        breakfastCount: 1,
        lunch: false, 
        lunchCount: 1,
        dinner: false,
        dinnerCount: 1
      };
      dayMeals.push(userMeal);
    }

    userMeal[mealType] = !userMeal[mealType];
    
    // Ensure count fields exist with default value
    const countField = `${mealType}Count`;
    if (!userMeal[countField]) {
      userMeal[countField] = 1;
    }
    
    mealSheet.days.set(dayKey, dayMeals);
    await mealSheet.save();

    // Convert Map to plain object for JSON response
    const responseData = mealSheet.toObject();
    responseData.days = Object.fromEntries(mealSheet.days);

    res.json({ mealSheet: responseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to update meal count
router.post('/update-count', verifyToken, async (req, res) => {
  try {
    const { month, day, userId, mealType, count } = req.body;
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can edit meals' });
    }

    // Check member status
    const member = group.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found in group' });
    }

    if (member.status === 'inactive') {
      return res.status(403).json({ error: 'Cannot edit meals for inactive members' });
    }

    // Check date range
    const mealDate = new Date(`${month}-${day.toString().padStart(2, '0')}`);
    if (member.leftAt && member.rejoinedAt) {
      if (mealDate >= new Date(member.leftAt) && mealDate < new Date(member.rejoinedAt)) {
        return res.status(403).json({ 
          error: 'Cannot edit meals for dates when member was not in group' 
        });
      }
    }
    if (member.leftAt && !member.rejoinedAt) {
      if (mealDate >= new Date(member.leftAt)) {
        return res.status(403).json({ 
          error: 'Cannot edit meals after member left the group' 
        });
      }
    }

    let mealSheet = await MealSheet.findOne({ groupId: currentUser.groupId, month });

    if (!mealSheet) {
      mealSheet = new MealSheet({ groupId: currentUser.groupId, month });
    }

    const dayKey = day.toString();
    let dayMeals = mealSheet.days.get(dayKey) || [];
    
    let userMeal = dayMeals.find(m => m.userId === userId);
    
    if (!userMeal) {
      userMeal = { 
        userId, 
        breakfast: false, 
        breakfastCount: 1,
        lunch: false, 
        lunchCount: 1,
        dinner: false,
        dinnerCount: 1
      };
      dayMeals.push(userMeal);
    }

    // Update count
    const countField = `${mealType}Count`;
    userMeal[countField] = Math.max(1, parseInt(count) || 1);
    
    mealSheet.days.set(dayKey, dayMeals);
    await mealSheet.save();

    // Convert Map to plain object for JSON response
    const responseData = mealSheet.toObject();
    responseData.days = Object.fromEntries(mealSheet.days);

    res.json({ mealSheet: responseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch update endpoint - updates multiple meals at once
router.post('/batch-update', verifyToken, async (req, res) => {
  try {
    const { month, changes } = req.body;
    
    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'Changes array is required' });
    }

    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser || !currentUser.groupId) {
      return res.status(404).json({ error: 'No group found' });
    }

    const group = await Group.findById(currentUser.groupId);
    if (group.managerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only manager can edit meals' });
    }

    let mealSheet = await MealSheet.findOne({ groupId: currentUser.groupId, month });

    if (!mealSheet) {
      mealSheet = new MealSheet({ groupId: currentUser.groupId, month });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process all changes
    for (const change of changes) {
      try {
        const { day, userId, mealType, type, count, value } = change;

        // Validate member
        const member = group.members.find(m => m.userId === userId);
        if (!member) {
          errors.push({ change, error: 'Member not found' });
          errorCount++;
          continue;
        }

        if (member.status === 'inactive') {
          errors.push({ change, error: 'Member is inactive' });
          errorCount++;
          continue;
        }

        // Check date range
        const mealDate = new Date(`${month}-${day.toString().padStart(2, '0')}`);
        if (member.leftAt && member.rejoinedAt) {
          if (mealDate >= new Date(member.leftAt) && mealDate < new Date(member.rejoinedAt)) {
            errors.push({ change, error: 'Date outside member active period' });
            errorCount++;
            continue;
          }
        }
        if (member.leftAt && !member.rejoinedAt) {
          if (mealDate >= new Date(member.leftAt)) {
            errors.push({ change, error: 'Date after member left' });
            errorCount++;
            continue;
          }
        }

        // Get or create day meals — always work with a fresh array reference
        const dayKey = day.toString();
        const dayMeals = [...(mealSheet.days.get(dayKey) || [])];

        const userMealIndex = dayMeals.findIndex(m => m.userId === userId);
        let userMeal;

        if (userMealIndex === -1) {
          // New entry — all fields explicit so Mongoose tracks them
          userMeal = {
            userId,
            breakfast: false, breakfastCount: 1,
            lunch:     false, lunchCount:     1,
            dinner:    false, dinnerCount:    1,
          };
          dayMeals.push(userMeal);
        } else {
          // Clone the subdocument so Mongoose detects the mutation
          userMeal = { ...dayMeals[userMealIndex] };
          dayMeals[userMealIndex] = userMeal;
        }

        const countField = `${mealType}Count`;

        if (type === 'set') {
          userMeal[mealType] = !!value;
          // uncheck → reset count to 1 so old count never comes back
          userMeal[countField] = value ? (userMeal[countField] || 1) : 1;
        } else if (type === 'count') {
          userMeal[countField] = Math.max(1, parseInt(count) || 1);
        } else if (type === 'toggle') {
          // legacy fallback — frontend no longer sends this
          userMeal[mealType] = !userMeal[mealType];
          if (!userMeal[countField]) userMeal[countField] = 1;
        }

        // Replace the whole array so Mongoose Map detects the change
        mealSheet.days.set(dayKey, dayMeals);
        successCount++;
      } catch (error) {
        errors.push({ change, error: error.message });
        errorCount++;
      }
    }

    // markModified tells Mongoose the Map changed — required for nested Map mutations
    mealSheet.markModified('days');
    // Save once after all changes
    await mealSheet.save();

    // Convert Map to plain object for JSON response
    const responseData = mealSheet.toObject();
    responseData.days = Object.fromEntries(mealSheet.days);

    res.json({ 
      mealSheet: responseData,
      successCount,
      errorCount,
      errors: errorCount > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
