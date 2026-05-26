import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error('MONGO_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const userExists = await User.findOne({ name: new RegExp('^diwakar$', 'i') });
    if (userExists) {
      console.log('User "diwakar" already exists. Updating password to password123...');
      userExists.password = 'password123';
      await userExists.save();
      console.log('Password updated successfully!');
    } else {
      console.log('Creating new user "diwakar"...');
      await User.create({
        name: 'diwakar',
        password: 'password123'
      });
      console.log('Admin user created successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
