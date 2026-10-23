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
  fineEnabled: {
    type: Boolean,
    default: true,
  },
  managerHistory: [{
    managerId: {
      type: String,
      required: true
    },
    managerName: {
      type: String,
      default: ''
    },
    fromMonth: {
      type: String,  // "YYYY-MM" — month they became manager
      required: true
    },
    toMonth: {
      type: String,  // "YYYY-MM" — last month they were manager (null = still current)
      default: null
    },
    transferredAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Group', groupSchema);
