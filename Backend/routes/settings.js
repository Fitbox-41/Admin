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
    const { deliveryFee, freeDeliveryThreshold, saleRibbonText, saleRibbonColor, saleRibbonTextColor } = req.body;
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({ deliveryFee, freeDeliveryThreshold, saleRibbonText, saleRibbonColor, saleRibbonTextColor });
    } else {
      if (deliveryFee !== undefined) settings.deliveryFee = deliveryFee;
      if (freeDeliveryThreshold !== undefined) settings.freeDeliveryThreshold = freeDeliveryThreshold;
      if (saleRibbonText !== undefined) settings.saleRibbonText = saleRibbonText;
      if (saleRibbonColor !== undefined) settings.saleRibbonColor = saleRibbonColor;
      if (saleRibbonTextColor !== undefined) settings.saleRibbonTextColor = saleRibbonTextColor;
      await settings.save();
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
