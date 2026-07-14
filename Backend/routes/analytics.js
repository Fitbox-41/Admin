import express from 'express';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

const router = express.Router();

// Helper to format date strings based on timeRange
const getDateFormat = (timeRange) => {
  switch (timeRange) {
    case 'today': return '%H:00'; // Hourly
    case 'this-week': 
    case 'this-month': return '%Y-%m-%d'; // Daily
    case 'last-3-months':
    case 'last-6-months':
    case 'last-year':
    case 'last-5-years': return '%Y-%m'; // Monthly
    default: return '%Y-%m-%d';
  }
};
// Generate complete date range array
const generateDateRange = (startDate, endDate, timeRange) => {
  const dates = [];
  let current = new Date(startDate);

  if (timeRange === 'today') {
    while (current <= endDate) {
      const h = current.getHours().toString().padStart(2, '0');
      dates.push(`${h}:00`);
      current.setHours(current.getHours() + 1);
    }
  } else if (timeRange === 'this-week' || timeRange === 'this-month') {
    while (current <= endDate) {
      const y = current.getFullYear();
      const m = (current.getMonth() + 1).toString().padStart(2, '0');
      const d = current.getDate().toString().padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
  } else {
    // months
    current.setDate(1);
    const endM = new Date(endDate);
    endM.setDate(1);
    while (current <= endM) {
      const y = current.getFullYear();
      const m = (current.getMonth() + 1).toString().padStart(2, '0');
      dates.push(`${y}-${m}`);
      current.setMonth(current.getMonth() + 1);
    }
  }
  return dates;
};

router.get('/', async (req, res) => {
  try {
    const { timeRange, timeZone = 'UTC' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();
    
    // Set dates based on timeRange
    if (timeRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(startDate);
    } else if (timeRange === 'this-week') {
      startDate.setHours(0, 0, 0, 0);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff); // Monday
      
      now.setHours(23, 59, 59, 999);
      now.setDate(startDate.getDate() + 6); // Sunday
      
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
    } else if (timeRange === 'this-month') {
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(1); // 1st of current month
      
      now.setHours(23, 59, 59, 999);
      now.setMonth(now.getMonth() + 1);
      now.setDate(0); // last day of current month
      
      prevStartDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
      prevEndDate = new Date(startDate);
    } else if (timeRange === 'last-3-months') {
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(1); // Set to start of month to avoid rollover
      startDate.setMonth(now.getMonth() - 3);
      prevStartDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 3);
      prevEndDate = new Date(startDate);
    } else if (timeRange === 'last-6-months') {
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(1);
      startDate.setMonth(now.getMonth() - 6);
      prevStartDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 6);
      prevEndDate = new Date(startDate);
    } else if (timeRange === 'last-year') {
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(1);
      startDate.setMonth(now.getMonth() - 11); // Last 12 months including current
      prevStartDate = new Date(startDate);
      prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
      prevEndDate = new Date(startDate);
    } else if (timeRange === 'last-5-years') {
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(1);
      startDate.setFullYear(now.getFullYear() - 5);
      prevStartDate = new Date(startDate);
      prevStartDate.setFullYear(prevStartDate.getFullYear() - 5);
      prevEndDate = new Date(startDate);
    }

    const validOrderMatch = { 
      createdAt: { $gte: startDate }, 
      orderStatus: { $ne: 'Cancelled' },
      refunded: { $ne: 'yes' }
    };

    const prevValidOrderMatch = { 
      createdAt: { $gte: prevStartDate, $lt: prevEndDate }, 
      orderStatus: { $ne: 'Cancelled' },
      refunded: { $ne: 'yes' }
    };

    // Calculate Totals for Current Period
    const currentOrders = await Order.aggregate([
      { $match: validOrderMatch },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
    ]);
    const currTotalRevenue = currentOrders[0]?.totalRevenue || 0;
    const currTotalOrders = currentOrders[0]?.totalOrders || 0;

    const currentCustomers = await Customer.countDocuments({ createdAt: { $gte: startDate } });
    
    // Total catalog size
    const currTotalProducts = await Product.countDocuments();

    // Calculate Totals for Previous Period to get Trends
    const prevOrders = await Order.aggregate([
      { $match: prevValidOrderMatch },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
    ]);
    const prevTotalRevenue = prevOrders[0]?.totalRevenue || 0;
    const prevTotalOrders = prevOrders[0]?.totalOrders || 0;
    
    const prevCustomersCount = await Customer.countDocuments({ createdAt: { $gte: prevStartDate, $lt: prevEndDate } });
    
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const diff = current - previous;
      const percentage = (diff / previous) * 100;
      return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    };

    const trendText = timeRange === 'today' ? 'yesterday' : `previous ${timeRange.replace('last-', '').replace('-', ' ')}`;

    // Format chart data based on time grouping
    const dateFormat = getDateFormat(timeRange);
    const chartAgg = await Order.aggregate([
      { $match: validOrderMatch },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: timeZone } },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dateRangeList = generateDateRange(startDate, now, timeRange);
    
    const revenueMap = {};
    chartAgg.forEach(item => {
      revenueMap[item._id] = item.revenue;
    });

    const chartData = dateRangeList.map(dateStr => ({
      name: dateStr,
      revenue: revenueMap[dateStr] || 0
    }));

    if (chartData.length === 0) {
       chartData.push({ name: 'No data', revenue: 0 });
    }

    res.json({
      statCards: [
        { title: 'Total Revenue', value: `₹${currTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: `${calculateTrend(currTotalRevenue, prevTotalRevenue)} from ${trendText}` },
        { title: 'Total Orders', value: currTotalOrders.toLocaleString('en-IN'), trend: `${calculateTrend(currTotalOrders, prevTotalOrders)} from ${trendText}` },
        { title: 'Total Customers', value: currentCustomers.toLocaleString('en-IN'), trend: `${calculateTrend(currentCustomers, prevCustomersCount)} from ${trendText}` },
        { title: 'Total Products', value: currTotalProducts.toLocaleString('en-IN'), trend: `Total Catalog Size` },
      ],
      chartData
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

export default router;
