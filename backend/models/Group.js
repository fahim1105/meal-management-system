import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  groupCode: {
    type: String,
    required: true,
    unique: true
  },
  managerId: {
    type: String,
    required: true
  },
  members: [{
    userId: {
      type: String,
      required: true
    },
    name: String,
    email: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    rejoinedAt: {
      type: Date,
      default: null
    }
  }],
  currentMonth: {
    type: String,
    default: () => new Date().toISOString().slice(0, 7)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Group', groupSchema);
