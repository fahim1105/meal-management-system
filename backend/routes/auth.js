import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import admin from '../config/firebase.js';

const router = express.Router();

// Helper function to set custom claims
const setUserClaims = async (uid, groupId) => {
  try {
    if (admin.apps.length > 0) {
      await admin.auth().setCustomUserClaims(uid, { 
        groupId: groupId ? String(groupId) : null 
      });
    }
  } catch (error) {
    console.error('Error setting custom claims:', error.message);
  }
};

router.post('/register', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const uid = req.user.uid;

    let user = await User.findOne({ uid });
    
    if (user) {
      // Set custom claims for existing user
      await setUserClaims(uid, user.groupId);
      
      // Convert to plain object and ensure groupId is string
      const userObj = user.toObject();
      if (userObj.groupId) {
        userObj.groupId = userObj.groupId.toString();
      }
      
      return res.json({ user: userObj });
    }

    user = new User({ uid, email, name });
    await user.save();

    // Set custom claims for new user (no group yet)
    await setUserClaims(uid, null);

    const userObj = user.toObject();
    res.status(201).json({ user: userObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    // DON'T populate groupId - we only need the ID string, not the full object
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure custom claims are up to date
    await setUserClaims(req.user.uid, user.groupId);

    // Convert user to plain object and ensure groupId is string
    const userObj = user.toObject();
    if (userObj.groupId) {
      userObj.groupId = userObj.groupId.toString();
    }

    res.json({ user: userObj });
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, photoURL } = req.body;
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (photoURL !== undefined) user.photoURL = photoURL;
    await user.save();

    // Also update name in group members array
    if (name && user.groupId) {
      const Group = (await import('../models/Group.js')).default;
      await Group.updateOne(
        { _id: user.groupId, 'members.userId': req.user.uid },
        { $set: { 'members.$.name': name } }
      );

      // Update name in bazar schedule ranges
      const BazarSchedule = (await import('../models/BazarSchedule.js')).default;
      await BazarSchedule.updateMany(
        { groupId: user.groupId, 'ranges.userId': req.user.uid },
        { $set: { 'ranges.$[elem].name': name } },
        { arrayFilters: [{ 'elem.userId': req.user.uid }] }
      );
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
