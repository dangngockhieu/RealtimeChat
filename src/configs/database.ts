import mongoose from 'mongoose';
import 'dotenv/config';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Thiếu biến môi trường MONGO_URI trong file .env');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected successfully');
};
