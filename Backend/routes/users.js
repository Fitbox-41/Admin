import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Apply protect middleware to all routes below
router.use(protect);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Developer)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Developer)
router.post('/', async (req, res) => {
  try {
    const { name, password } = req.body;

    const userExists = await User.findOne({ name });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Developer)
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.password) {
        user.password = req.body.password; // Pre-save hook will hash it
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Developer)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await User.deleteOne({ _id: user._id });
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
