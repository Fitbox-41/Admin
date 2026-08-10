import express from 'express';
import Settings from '../models/Settings.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings - Get current settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/settings - Update settings
router.put('/', protect, async (req, res) => {
  try {
    const { deliveryFee, freeDeliveryThreshold, saleRibbonText, saleRibbonColor, saleRibbonTextColor, pointValueInr, redeemCapPercent, seasonTopRewardInr } = req.body;
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({ deliveryFee, freeDeliveryThreshold, saleRibbonText, saleRibbonColor, saleRibbonTextColor });
    } else {
      if (deliveryFee !== undefined) settings.deliveryFee = deliveryFee;
      if (freeDeliveryThreshold !== undefined) settings.freeDeliveryThreshold = freeDeliveryThreshold;
      if (saleRibbonText !== undefined) settings.saleRibbonText = saleRibbonText;
      if (saleRibbonColor !== undefined) settings.saleRibbonColor = saleRibbonColor;
      if (saleRibbonTextColor !== undefined) settings.saleRibbonTextColor = saleRibbonTextColor;
      // Points economy — rejected rather than coerced: a bad value here
      // re-prices every wallet balance in the system.
      if (pointValueInr !== undefined) {
        const v = Number(pointValueInr);
        if (!Number.isFinite(v) || v <= 0) {
          return res.status(400).json({ message: 'Point value must be a number greater than 0.' });
        }
        settings.pointValueInr = v;
      }
      if (redeemCapPercent !== undefined) {
        const c = Number(redeemCapPercent);
        if (!Number.isFinite(c) || c < 0 || c > 100) {
          return res.status(400).json({ message: 'Redeem cap must be between 0 and 100 percent.' });
        }
        settings.redeemCapPercent = c;
      }
      if (seasonTopRewardInr !== undefined) {
        const r = Number(seasonTopRewardInr);
        if (!Number.isFinite(r) || r < 0) {
          return res.status(400).json({ message: 'Top season reward must be 0 or more.' });
        }
        settings.seasonTopRewardInr = r;
      }
      await settings.save();
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
