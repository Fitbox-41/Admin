import express from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

const router = express.Router();

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const qRaw = String(req.query.q || '').trim();
    const q = qRaw.length ? qRaw : null;

    const query = q
      ? {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();

    // Compute order counts from the live 'orders' collection (source of truth)
    const ids = customers.map((c) => c._id);
    const counts = await Order.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.orderCount]));

    res.json(
      customers.map((c) => ({
        ...c,
        orderCount: countMap.get(String(c._id)) || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
