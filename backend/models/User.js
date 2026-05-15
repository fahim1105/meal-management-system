import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  photoURL: {
    type: String,
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to convert user to JSON with groupId as string
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj.groupId) {
    obj.groupId = obj.groupId.toString();
  }
  return obj;
};

export default mongoose.model('User', userSchema);
