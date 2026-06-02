import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';

const router = express.Router();

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const qRaw = String(req.query.q || '').trim();
    const q = qRaw.length ? qRaw : null;
    const orderStatus = String(req.query.status || '').trim(); // Pending|Completed|Cancelled
    const paymentMode = String(req.query.paymentMode || '').trim(); // Online|COD

    const query = {};
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentMode) query.paymentMode = paymentMode;
    if (q) {
      const or = [
        { customerName: { $regex: q, $options: 'i' } },
        { customerEmail: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
      ];
      if (mongoose.isValidObjectId(q)) {
        or.push({ _id: new mongoose.Types.ObjectId(q) });
      }
      query.$or = or;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { shipmentStatus } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (order) {
      if (shipmentStatus) order.shipmentStatus = shipmentStatus;
      await order.save();
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
