import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  // Return existing connection immediately
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  mongoose.set('strictQuery', false);
  mongoose.set('bufferCommands', false);

  const opts = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 10000,
    connectTimeoutMS: 10000,
  };

  cached.promise = mongoose.connect(process.env.MONGODB_URI, opts)
    .then((mongoose) => {
      console.log('✅ MongoDB connected');
      return mongoose;
    })
    .catch((err) => {
      cached.promise = null;
      console.error('❌ MongoDB connection error:', err.message);
      throw err;
    });

  cached.conn = await cached.promise;
  return cached.conn;
};
