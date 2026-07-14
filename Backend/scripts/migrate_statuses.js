import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const orderSchema = new mongoose.Schema({ shipmentStatus: String }, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fitbox')
  .then(async () => {
    console.log('Connected to DB');
    
    // Updates
    await Order.updateMany({ shipmentStatus: 'Pending' }, { $set: { shipmentStatus: 'Ordered' } });
    await Order.updateMany({ shipmentStatus: 'Created' }, { $set: { shipmentStatus: 'Ready to Ship' } });
    await Order.updateMany({ shipmentStatus: 'Shipped' }, { $set: { shipmentStatus: 'In Transit' } });
    
    // Check missing ones
    await Order.updateMany({ shipmentStatus: { $exists: false } }, { $set: { shipmentStatus: 'Ordered' } });

    console.log('Migration completed.');
    mongoose.connection.close();
  })
  .catch(console.error);
