import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { trackDelhiveryShipment, requestDelhiveryPickup, getDelhiveryLabel, createDelhiveryShipment } from '../utils/delhivery.js';

const router = express.Router();

// Base filter: only show orders where the customer actually crossed the gateway
// COD orders always count (user made a deliberate choice). Online orders only
// count once payment reached a terminal state (Paid or Failed).
const GATEWAY_CROSSED_FILTER = {
  $or: [
    { paymentMode: 'COD' },
    { paymentStatus: { $in: ['Paid', 'Failed'] } },
    { orderStatus: 'Cancelled', paymentId: { $exists: true, $ne: null } }
  ]
};

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const qRaw = String(req.query.q || '').trim();
    const q = qRaw.length ? qRaw : null;
    const orderStatus = String(req.query.status || '').trim(); // Pending|Completed|Cancelled
    const paymentMode = String(req.query.paymentMode || '').trim(); // Online|COD

    const query = { ...GATEWAY_CROSSED_FILTER };
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
      // Merge $or: GATEWAY_CROSSED_FILTER uses $or, so combine via $and
      query.$and = [{ $or: GATEWAY_CROSSED_FILTER.$or }, { $or: or }];
      delete query.$or;
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

// GET /api/orders/export
router.get('/export', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'last-month';
    
    // Calculate date filter based on timeRange
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last-week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last-month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'last-3-months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'last-6-months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'last-year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'last-5-years':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const orders = await Order.find({ createdAt: { $gte: startDate }, ...GATEWAY_CROSSED_FILTER }).sort({ createdAt: -1 });
    
    // Dynamically import exceljs to avoid issues if not used everywhere
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Analytics');

    worksheet.columns = [
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'New Customer', key: 'newCustomer', width: 15 },
      { header: 'Orders Placed', key: 'items', width: 50 },
      { header: 'Order Total (Rs)', key: 'totalAmount', width: 15 },
      { header: 'Order Status', key: 'orderStatus', width: 20 },
      { header: 'Date', key: 'date', width: 15 }
    ];

    let grandTotal = 0;

    for (const order of orders) {
      // Check if new customer (first order in db for this user)
      let isNewCustomer = false;
      if (order.userId) {
        const firstOrder = await Order.findOne({ userId: order.userId }).sort({ createdAt: 1 });
        isNewCustomer = firstOrder && firstOrder._id.toString() === order._id.toString();
      }

      const itemNames = order.items ? order.items.map(i => `• ${i.name} (x${i.quantity})`).join('\n') : '';
      const orderStatus = order.orderStatus || (order.paymentStatus === 'Paid' ? 'Completed' : order.paymentStatus === 'Failed' ? 'Cancelled' : 'Pending');

      const row = worksheet.addRow({
        customerName: order.customerName || 'Guest',
        newCustomer: isNewCustomer ? 'Yes' : 'No',
        items: itemNames,
        totalAmount: order.totalAmount,
        orderStatus: orderStatus,
        date: order.createdAt.toLocaleDateString()
      });

      // Enable text wrapping for the items column to show bullet points nicely
      row.getCell('items').alignment = { wrapText: true, vertical: 'top' };

      // Highlight new customers (light blue background)
      if (isNewCustomer) {
        row.getCell('customerName').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFADD8E6' } 
        };
      }

      // Color code order status
      const statusCell = row.getCell('orderStatus');
      if (orderStatus === 'Completed') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // Light Green
      } else if (orderStatus === 'Cancelled') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } }; // Light Red
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFE0' } }; // Light Yellow
      }

      grandTotal += (order.totalAmount || 0);
    }

    // Add Total Row
    worksheet.addRow([]);
    const totalRow = worksheet.addRow({
      items: 'GRAND TOTAL',
      totalAmount: grandTotal
    });
    totalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=analytics_${timeRange}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/orders/:id/refund
router.put('/:id/refund', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.isRefunded = true;
    order.refunded = 'yes';
    order.refundedAt = new Date();
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/orders/:id/track — Live tracking from Delhivery
router.get('/:id/track', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.awb) {
      return res.json({
        success: true,
        tracking: {
          status: order.shipmentStatus || 'Pending',
          delhiveryStatus: null,
          scans: [],
          estimatedDate: null,
          awb: null
        }
      });
    }

    const tracking = await trackDelhiveryShipment(order.awb);

    // Update order status in DB if changed
    const newStatus = tracking.status;
    if (newStatus && newStatus !== order.shipmentStatus) {
      const statusOrder = ['Pending', 'Created', 'Ready to Ship', 'In Transit', 'Out for Delivery', 'Delivered', 'RTO', 'Cancelled'];
      const currentIdx = statusOrder.indexOf(order.shipmentStatus);
      const newIdx = statusOrder.indexOf(newStatus);

      if (newIdx > currentIdx || newStatus === 'RTO' || newStatus === 'Cancelled') {
        order.shipmentStatus = newStatus;
        if (newStatus === 'Delivered') {
          order.orderStatus = 'Completed';
          if (order.paymentMode === 'COD') {
            order.paymentStatus = 'Paid';
          }
        }
        await order.save();
      }
    }

    res.json({
      success: true,
      tracking: {
        status: tracking.status,
        delhiveryStatus: tracking.delhiveryStatus,
        scans: tracking.scans,
        estimatedDate: tracking.estimatedDate,
        awb: order.awb
      }
    });
  } catch (error) {
    console.error('Track order error:', error.message);
    try {
      const order = await Order.findById(req.params.id);
      return res.json({
        success: true,
        tracking: {
          status: order?.shipmentStatus || 'Pending',
          delhiveryStatus: null,
          scans: [],
          estimatedDate: null,
          awb: order?.awb || null,
          error: 'Live tracking temporarily unavailable'
        }
      });
    } catch (e) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// POST /api/orders/sync-tracking — Bulk sync shipment statuses from Delhivery
router.post('/sync-tracking', async (req, res) => {
  try {
    const orders = await Order.find({
      awb: { $exists: true, $ne: null, $ne: '' },
      shipmentStatus: { $nin: ['Delivered', 'RTO', 'Cancelled'] }
    });

    const results = { updated: 0, failed: 0, total: orders.length, details: [] };
    const statusOrder = ['Pending', 'Created', 'Ready to Ship', 'In Transit', 'Out for Delivery', 'Delivered', 'RTO', 'Cancelled'];

    for (const order of orders) {
      try {
        const tracking = await trackDelhiveryShipment(order.awb);
        const newStatus = tracking.status;

        if (newStatus && newStatus !== order.shipmentStatus) {
          const currentIdx = statusOrder.indexOf(order.shipmentStatus);
          const newIdx = statusOrder.indexOf(newStatus);

          if (newIdx > currentIdx || newStatus === 'RTO' || newStatus === 'Cancelled') {
            const oldStatus = order.shipmentStatus;
            order.shipmentStatus = newStatus;
            if (newStatus === 'Delivered') {
              order.orderStatus = 'Completed';
              if (order.paymentMode === 'COD') {
                order.paymentStatus = 'Paid';
              }
            }
            await order.save();
            results.updated++;
            results.details.push({ orderId: order._id, awb: order.awb, from: oldStatus, to: newStatus });
          }
        }
      } catch (err) {
        results.failed++;
        results.details.push({ orderId: order._id, awb: order.awb, error: err.message });
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/orders/:id/pickup — Schedule Delhivery Pickup
router.post('/:id/pickup', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.awb) return res.status(400).json({ message: 'Order does not have an AWB yet' });

    // Schedule for today if before 2pm, otherwise tomorrow
    const now = new Date();
    const isAfter2PM = now.getHours() >= 14;
    const pickupDateObj = new Date(now);
    if (isAfter2PM) {
      pickupDateObj.setDate(pickupDateObj.getDate() + 1);
    }
    
    // Format YYYY-MM-DD
    const yyyy = pickupDateObj.getFullYear();
    const mm = String(pickupDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(pickupDateObj.getDate()).padStart(2, '0');
    const pickupDate = `${yyyy}-${mm}-${dd}`;
    
    // Pickup time (default 15:00:00)
    const pickupTime = '15:00:00';

    const pickupResponse = await requestDelhiveryPickup(pickupDate, pickupTime, 1);
    
    res.json({
      success: true,
      message: 'Pickup scheduled successfully',
      details: pickupResponse
    });
  } catch (error) {
    console.error('Pickup schedule error:', error.message);
    res.status(500).json({ message: 'Failed to schedule pickup', error: error.message });
  }
});

// GET /api/orders/:id/label — Get PDF Label URL
router.get('/:id/label', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.awb) return res.status(400).json({ message: 'Order does not have an AWB yet' });

    const pdfUrl = await getDelhiveryLabel(order.awb);
    
    res.json({
      success: true,
      pdfUrl: pdfUrl
    });
  } catch (error) {
    console.error('Label fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch label', error: error.message });
  }
});

// POST /api/orders/:id/shipment — Create Delhivery Shipment manually (AWB generation retry)
router.post('/:id/shipment', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.awb) {
      return res.status(400).json({ message: 'Order already has an AWB: ' + order.awb });
    }

    console.log(`Manually triggering Delhivery shipment creation for order: ${order._id}`);
    const shipment = await createDelhiveryShipment(order);

    if (shipment.packages && shipment.packages.length > 0) {
      order.awb = shipment.packages[0].waybill;
      order.trackingUrl = `https://track.delhivery.com/p/${order.awb}`;
      order.shipmentStatus = 'Created';
      await order.save();

      res.json({
        success: true,
        message: 'Delhivery shipment created successfully',
        awb: order.awb,
        order
      });
    } else {
      res.status(400).json({
        message: 'Delhivery API did not return any packages or waybills',
        details: shipment
      });
    }
  } catch (error) {
    console.error('Manual shipment creation error:', error.message);
    res.status(500).json({ message: 'Failed to create shipment', error: error.message });
  }
});

export default router;
