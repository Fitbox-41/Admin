import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import sendEmail from '../utils/sendEmail.js';
import { trackDelhiveryShipment, requestDelhiveryPickup, getDelhiveryLabel, createDelhiveryShipment, cancelDelhiveryShipment } from '../utils/delhivery.js';

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
        } else if (newStatus === 'Cancelled') {
          order.orderStatus = 'Cancelled';
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
            } else if (newStatus === 'Cancelled') {
              order.orderStatus = 'Cancelled';
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

// POST /api/orders/:id/cancel — Cancel order + cancel on Delhivery if AWB exists
router.post('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    // Only allow cancellation if order is not Out for Delivery or Delivered
    if (order.shipmentStatus === 'Out for Delivery' || order.shipmentStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that is out for delivery or already delivered' });
    }

    let delhiveryResult = null;

    // Attempt Delhivery cancellation if AWB exists and shipment is not already delivered/RTO
    if (order.awb && !['Delivered', 'RTO'].includes(order.shipmentStatus)) {
      delhiveryResult = await cancelDelhiveryShipment(order.awb);
      if (delhiveryResult && !delhiveryResult.error) {
        order.delhiveryCancelConfirmed = true;
        console.log(`Delhivery shipment confirmed cancelled for order ${order._id}, AWB: ${order.awb}`);
      } else {
        order.delhiveryCancelConfirmed = false;
        console.error(`Delhivery cancellation FAILED for order ${order._id}, AWB: ${order.awb}`, delhiveryResult);
      }
    } else {
      order.delhiveryCancelConfirmed = null;
    }

    // Refund redeemed points back to the wallet (idempotent per order)
    if (order.appliedPoints > 0 && !order.pointsRefunded) {
      let wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = new Wallet({ userId: order.userId, balance: 0 });
      }
      wallet.balance += order.appliedPoints;
      await wallet.save();

      const tx = new WalletTransaction({
        userId: order.userId,
        type: 'credit',
        amount: order.appliedPoints,
        balanceAfter: wallet.balance,
        source: 'checkout_refund',
        sourceId: order._id.toString(),
        idempotencyKey: 'refund_cancel_' + order._id.toString(),
        description: 'Points refunded for cancelled order'
      });
      await tx.save();
      order.pointsRefunded = true;
    }

    order.orderStatus = 'Cancelled';
    order.shipmentStatus = 'Cancelled';
    await order.save();

    // Send Cancellation Email
    try {
      const customer = await Customer.findById(order.userId);
      const emailToSend = customer?.email || order.customerEmail;
      if (emailToSend) {
        await sendEmail({
          from: process.env.EMAIL_CART_FROM || process.env.EMAIL_FROM || 'FitBox Sports <cart@fitboxsports.in>',
          email: emailToSend,
          subject: `Order Cancelled - FitBox Sports (${order._id})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #ef4444;">Order Cancelled</h2>
              <p>Hi ${order.customerName || customer?.name || 'Customer'},</p>
              <p>Your order (ID: ${order._id}) has been successfully cancelled.</p>
              
              <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
                <thead>
                  <tr style="background:#1a1a1a; color:#fff;">
                    <th style="padding:10px 14px; text-align:left;">Product</th>
                    <th style="padding:10px 14px; text-align:center;">Qty</th>
                    <th style="padding:10px 14px; text-align:right;">Price</th>
                    <th style="padding:10px 14px; text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(order.items || []).map((item, i) => {
                    const price = Number(String(item.price).replace(/[^0-9.-]+/g, ''));
                    const qty = item.quantity || 1;
                    const variant = item.selectedVariant ? ` (${item.selectedVariant})` : '';
                    const size = item.selectedSize ? ` - ${item.selectedSize}` : '';
                    const bg = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    return `<tr style="background:${bg};">
                      <td style="padding:10px 14px;">${item.name}${variant}${size}</td>
                      <td style="padding:10px 14px; text-align:center;">${qty}</td>
                      <td style="padding:10px 14px; text-align:right;">Rs. ${price}</td>
                      <td style="padding:10px 14px; text-align:right;">Rs. ${price * qty}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:#fff3ee;">
                    <td colspan="3" style="padding:10px 14px; text-align:right;">Subtotal:</td>
                    <td style="padding:10px 14px; text-align:right;">Rs. ${(order.totalAmount - (order.deliveryCharge || 0))}</td>
                  </tr>
                  <tr style="background:#fff3ee;">
                    <td colspan="3" style="padding:10px 14px; text-align:right;">Delivery Fee:</td>
                    <td style="padding:10px 14px; text-align:right;">Rs. ${order.deliveryCharge || 0}</td>
                  </tr>
                  <tr style="background:#fff3ee; font-weight:bold;">
                    <td colspan="3" style="padding:10px 14px; text-align:right;">Order Total:</td>
                    <td style="padding:10px 14px; text-align:right; color:#ff6b35;">Rs. ${order.totalAmount}</td>
                  </tr>
                </tfoot>
              </table>

              ${order.paymentStatus === 'Paid' ? '<p>Your refund will be initiated shortly and should reflect in your original payment method within 5-7 business days.</p>' : ''}
              <br/>
              <p>If you have any questions, feel free to reply to this email.</p>
              <br/>
              <p>Best Regards,</p>
              <p><strong>FitBox Sports Team</strong></p>
            </div>
          `
        });
        console.log(`Cancellation email sent to ${emailToSend}`);
      }
    } catch (emailErr) {
      console.error("Failed to send cancellation email:", emailErr);
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      delhivery: delhiveryResult,
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/:id/cancel-status — Verify Delhivery cancellation status for a cancelled order
router.get('/:id/cancel-status', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!order.awb) {
      return res.json({
        success: true,
        awb: null,
        dbStatus: order.shipmentStatus,
        delhiveryStatus: null,
        message: 'No AWB — shipment was never created on Delhivery.'
      });
    }

    // Fetch live status from Delhivery
    let delhiveryStatus = null;
    let delhiveryRaw = null;
    let trackError = null;
    let isCancelledOnDelhivery = false;
    try {
      const tracking = await trackDelhiveryShipment(order.awb);
      delhiveryStatus = tracking.delhiveryStatus;
      delhiveryRaw = tracking.status; // mapped status
      
      const instructions = tracking.instructions || '';
      const code = tracking.statusCode || '';
      
      isCancelledOnDelhivery = 
        delhiveryRaw === 'Cancelled' ||
        (delhiveryStatus && delhiveryStatus.toLowerCase().includes('cancel')) ||
        (instructions && instructions.toLowerCase().includes('cancel')) ||
        code === 'DTUP-210';
    } catch (err) {
      trackError = err.message;
    }

    res.json({
      success: true,
      awb: order.awb,
      dbStatus: order.shipmentStatus,
      delhiveryStatus,
      delhiveryStatusRaw: delhiveryRaw,
      isCancelledOnDelhivery,
      trackError: trackError || null,
      message: isCancelledOnDelhivery
        ? ' Shipment is confirmed cancelled on Delhivery.'
        : trackError
          ? ' Could not reach Delhivery API to verify.'
          : ' Shipment is NOT yet cancelled on Delhivery — you may need to cancel it manually.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/orders/sync-cancellations — Re-cancel any orders where Delhivery cancel previously failed
router.post('/sync-cancellations', async (req, res) => {
  try {
    // Find orders that are cancelled in our DB but Delhivery cancellation wasn't confirmed
    const pendingCancels = await Order.find({
      orderStatus: 'Cancelled',
      awb: { $exists: true, $ne: null, $ne: '' },
      delhiveryCancelConfirmed: false // explicitly failed or unconfirmed
    });

    const results = { total: pendingCancels.length, fixed: 0, stillFailing: 0, details: [] };

    await Promise.all(pendingCancels.map(async (order) => {
      try {
        const result = await cancelDelhiveryShipment(order.awb);
        if (result && !result.error) {
          order.delhiveryCancelConfirmed = true;
          await order.save();
          results.fixed++;
          results.details.push({ orderId: order._id, awb: order.awb, status: 'fixed' });
        } else {
          results.stillFailing++;
          results.details.push({ orderId: order._id, awb: order.awb, status: 'still_failing', error: result?.message });
        }
      } catch (err) {
        results.stillFailing++;
        results.details.push({ orderId: order._id, awb: order.awb, status: 'error', error: err.message });
      }
    }));

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/orders/:id/refund — Mark an order as manually refunded
router.put('/:id/refund', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.refunded = 'yes';
    await order.save();

    res.json({ success: true, message: 'Order marked as refunded successfully', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
