import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DELHIVERY_API_KEY = process.env.DELHIVERY_API_KEY;
const DELHIVERY_BASE_URL = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';

if (!MONGO_URI || !DELHIVERY_API_KEY) {
  console.error('Missing MONGO_URI or DELHIVERY_API_KEY in environment variables.');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB\n');

const Order = mongoose.model('Order', new mongoose.Schema({
  customerName: String, customerEmail: String,
  orderStatus: String, shipmentStatus: String,
  awb: String, paymentMode: String, paymentStatus: String,
  totalAmount: Number, delhiveryCancelConfirmed: { type: Boolean, default: null }, createdAt: Date
}, { collection: 'orders' }));

const activeOrders = await Order.find({
  orderStatus: { $nin: ['Cancelled'] },
  shipmentStatus: { $nin: ['Delivered'] }
});

console.log(`Found ${activeOrders.length} active order(s):\n`);
activeOrders.forEach(o => {
  console.log(`  - ${o._id} | ${o.customerName || 'Guest'} | Rs.${o.totalAmount} | AWB: ${o.awb || 'none'} | ${o.orderStatus}/${o.shipmentStatus}`);
});

if (activeOrders.length === 0) {
  console.log('\nNothing to cancel.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log('\nCancelling all...\n');

let delhiveryOk = 0, delhiveryFail = 0, dbUpdated = 0;

for (const order of activeOrders) {
  let delhiveryConfirmed = null;

  if (order.awb && !['Delivered', 'RTO'].includes(order.shipmentStatus)) {
    try {
      const res = await axios.post(
        DELHIVERY_BASE_URL + '/api/p/edit',
        JSON.stringify({ waybill: order.awb, cancellation: 'true' }),
        { headers: { 'Authorization': 'Token ' + DELHIVERY_API_KEY, 'Content-Type': 'application/json' } }
      );
      if (res.data && res.data.status === true) {
        delhiveryConfirmed = true; delhiveryOk++;
        console.log('  [OK] Delhivery cancelled | ' + order._id + ' | AWB: ' + order.awb);
      } else {
        delhiveryConfirmed = false; delhiveryFail++;
        console.log('  [??] Delhivery response  | ' + order._id + ' | ' + JSON.stringify(res.data));
      }
    } catch (err) {
      delhiveryConfirmed = false; delhiveryFail++;
      console.log('  [X] Delhivery FAILED     | ' + order._id + ' | ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  } else if (!order.awb) {
    console.log('  [--] No AWB              | ' + order._id + ' | ' + (order.customerName || 'Guest'));
  }

  await Order.updateOne({ _id: order._id }, {
    $set: { orderStatus: 'Cancelled', shipmentStatus: 'Cancelled', delhiveryCancelConfirmed: delhiveryConfirmed }
  });
  dbUpdated++;
}

console.log('\n--- Summary ---');
console.log('DB updated:          ' + dbUpdated);
console.log('Delhivery cancelled: ' + delhiveryOk);
console.log('Delhivery failed:    ' + delhiveryFail);
console.log('---------------\n');

await mongoose.disconnect();
console.log('Done.');
process.exit(0);
