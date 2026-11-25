const mongoose = require('mongoose');

/** Connect to MongoDB (no-op if already connected, e.g. dev-memory / tests). */
const connectDB = async (uri = process.env.MONGO_URI) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
