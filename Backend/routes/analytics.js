import express from 'express';
import Run from '../Models/Run.js';
import Territory from '../Models/Territory.js';
import Wallet from '../Models/Wallet.js';

const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const totalRuns = await Run.countDocuments();
    
    const runs = await Run.find({});
    const totalDistance = runs.reduce((acc, run) => acc + (run.distance || 0), 0);
    const totalCalories = runs.reduce((acc, run) => acc + (run.calories || 0), 0);
    const totalDuration = runs.reduce((acc, run) => acc + (run.duration || 0), 0);

    const activeAppUsers = await Run.distinct('userId');
    const totalActiveAppUsers = activeAppUsers.length;

    const territoriesConquered = await Run.countDocuments({ territoryConquered: true });
    
    // Aggregations for charts
    // 7 days runs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRuns = await Run.find({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      success: true,
      stats: {
        totalRuns,
        totalDistance,
        totalCalories,
        totalDuration,
        totalActiveAppUsers,
        territoriesConquered
      },
      recentRuns
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
