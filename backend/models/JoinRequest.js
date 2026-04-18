import mongoose from 'mongoose';

const joinRequestSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userPhotoURL: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: String,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for query optimization
joinRequestSchema.index({ groupId: 1, status: 1 });
joinRequestSchema.index({ userId: 1, groupId: 1 });
joinRequestSchema.index({ groupId: 1, createdAt: -1 });

// Unique compound index to prevent duplicate pending requests
joinRequestSchema.index(
  { userId: 1, groupId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);

export default JoinRequest;
