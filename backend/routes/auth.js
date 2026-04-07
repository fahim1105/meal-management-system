import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const uid = req.user.uid;

    let user = await User.findOne({ uid });
    
    if (user) {
      return res.json({ user });
    }

    user = new User({ uid, email, name });
    await user.save();

    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }).populate('groupId');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
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
