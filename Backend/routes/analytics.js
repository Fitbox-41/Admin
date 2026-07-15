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

const getTzParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(p => map[p.type] = p.value);
  return {
    year: parseInt(map.year),
    month: parseInt(map.month),
    day: parseInt(map.day),
    hour: parseInt(map.hour),
    minute: parseInt(map.minute),
    second: parseInt(map.second)
  };
};

const getStartOfDayInTz = (date, timeZone) => {
  const parts = getTzParts(date, timeZone);
  const tzDateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T00:00:00`;
  
  const localAsUtc = new Date(tzDateStr + 'Z');
  const formattedParts = getTzParts(localAsUtc, timeZone);
  const formattedAsUtc = new Date(`${formattedParts.year}-${String(formattedParts.month).padStart(2, '0')}-${String(formattedParts.day).padStart(2, '0')}T${String(formattedParts.hour).padStart(2, '0')}:${String(formattedParts.minute).padStart(2, '0')}:${String(formattedParts.second).padStart(2, '0')}Z`);
  const offsetMs = localAsUtc.getTime() - formattedAsUtc.getTime();
  
  return new Date(localAsUtc.getTime() + offsetMs);
};

const getTzWeekday = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
  const weekday = formatter.format(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.indexOf(weekday);
};

const adjustDays = (date, daysDiff, timeZone) => {
  const shifted = new Date(date.getTime() + daysDiff * 24 * 60 * 60 * 1000);
  return getStartOfDayInTz(shifted, timeZone);
};

const getStartOfMonthsAgoInTz = (date, monthsAgo, timeZone) => {
  const parts = getTzParts(date, timeZone);
  let year = parts.year;
  let month = parts.month - monthsAgo;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  const tzDateStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
  
  const localAsUtc = new Date(tzDateStr + 'Z');
  const formattedParts = getTzParts(localAsUtc, timeZone);
  const formattedAsUtc = new Date(`${formattedParts.year}-${String(formattedParts.month).padStart(2, '0')}-${String(formattedParts.day).padStart(2, '0')}T${String(formattedParts.hour).padStart(2, '0')}:${String(formattedParts.minute).padStart(2, '0')}:${String(formattedParts.second).padStart(2, '0')}Z`);
  const offsetMs = localAsUtc.getTime() - formattedAsUtc.getTime();
  
  return new Date(localAsUtc.getTime() + offsetMs);
};

const getTzDateBoundaries = (timeRange, timeZone) => {
  const now = new Date();
  const todayMidnight = getStartOfDayInTz(now, timeZone);
  
  let startDate;
  let endDate = new Date(now);
  let prevStartDate;
  let prevEndDate;
  
  if (timeRange === 'today') {
    startDate = todayMidnight;
    prevStartDate = adjustDays(todayMidnight, -1, timeZone);
    prevEndDate = todayMidnight;
  } else if (timeRange === 'this-week') {
    const weekday = getTzWeekday(todayMidnight, timeZone);
    const daysToMonday = weekday === 0 ? -6 : 1 - weekday;
    startDate = adjustDays(todayMidnight, daysToMonday, timeZone);
    const sundayMidnight = adjustDays(startDate, 6, timeZone);
    endDate = new Date(sundayMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
    prevStartDate = adjustDays(startDate, -7, timeZone);
    prevEndDate = startDate;
  } else if (timeRange === 'this-month') {
    startDate = getStartOfMonthsAgoInTz(todayMidnight, 0, timeZone);
    const startOfNextMonth = getStartOfMonthsAgoInTz(todayMidnight, -1, timeZone);
    endDate = new Date(startOfNextMonth.getTime() - 1);
    prevStartDate = getStartOfMonthsAgoInTz(todayMidnight, 1, timeZone);
    prevEndDate = startDate;
  } else if (timeRange === 'last-3-months') {
    startDate = getStartOfMonthsAgoInTz(todayMidnight, 3, timeZone);
    prevStartDate = getStartOfMonthsAgoInTz(todayMidnight, 6, timeZone);
    prevEndDate = startDate;
  } else if (timeRange === 'last-6-months') {
    startDate = getStartOfMonthsAgoInTz(todayMidnight, 6, timeZone);
    prevStartDate = getStartOfMonthsAgoInTz(todayMidnight, 12, timeZone);
    prevEndDate = startDate;
  } else if (timeRange === 'last-year') {
    startDate = getStartOfMonthsAgoInTz(todayMidnight, 11, timeZone);
    prevStartDate = getStartOfMonthsAgoInTz(todayMidnight, 23, timeZone);
    prevEndDate = startDate;
  } else if (timeRange === 'last-5-years') {
    startDate = getStartOfMonthsAgoInTz(todayMidnight, 60, timeZone);
    prevStartDate = getStartOfMonthsAgoInTz(todayMidnight, 120, timeZone);
    prevEndDate = startDate;
  } else {
    startDate = todayMidnight;
    prevStartDate = adjustDays(todayMidnight, -1, timeZone);
    prevEndDate = todayMidnight;
  }
  
  return { startDate, endDate, prevStartDate, prevEndDate };
};

// Generate complete date range array
const generateDateRange = (startDate, endDate, timeRange, timeZone) => {
  const dates = [];
  let current = new Date(startDate);

  if (timeRange === 'today') {
    while (current <= endDate) {
      const parts = getTzParts(current, timeZone);
      const h = parts.hour.toString().padStart(2, '0');
      dates.push(`${h}:00`);
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
  } else if (timeRange === 'this-week' || timeRange === 'this-month') {
    while (current <= endDate) {
      const parts = getTzParts(current, timeZone);
      const y = parts.year;
      const m = parts.month.toString().padStart(2, '0');
      const d = parts.day.toString().padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      current = getStartOfDayInTz(current, timeZone);
    }
  } else {
    const startParts = getTzParts(startDate, timeZone);
    const endParts = getTzParts(endDate, timeZone);
    
    let y = startParts.year;
    let m = startParts.month;
    const targetY = endParts.year;
    const targetM = endParts.month;
    
    while (y < targetY || (y === targetY && m <= targetM)) {
      dates.push(`${y}-${m.toString().padStart(2, '0')}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }
  return dates;
};

router.get('/', async (req, res) => {
  try {
    const { timeRange, timeZone = 'UTC' } = req.query;
    
    const { startDate, endDate, prevStartDate, prevEndDate } = getTzDateBoundaries(timeRange, timeZone);

    const validOrderMatch = { 
      createdAt: { $gte: startDate, $lte: endDate }, 
      orderStatus: { $ne: 'Cancelled' },
      refunded: { $ne: 'yes' },
      // Only count orders where the customer actually crossed the payment gateway
      $or: [
        { paymentMode: 'COD' },
        { paymentStatus: 'Paid' }
      ]
    };

    const prevValidOrderMatch = { 
      createdAt: { $gte: prevStartDate, $lt: prevEndDate }, 
      orderStatus: { $ne: 'Cancelled' },
      refunded: { $ne: 'yes' },
      $or: [
        { paymentMode: 'COD' },
        { paymentStatus: 'Paid' }
      ]
    };

    // Calculate Totals for Current Period
    const currentOrders = await Order.aggregate([
      { $match: validOrderMatch },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
    ]);
    const currTotalRevenue = currentOrders[0]?.totalRevenue || 0;
    const currTotalOrders = currentOrders[0]?.totalOrders || 0;

    const currentCustomers = await Customer.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
    
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

    const dateRangeList = generateDateRange(startDate, endDate, timeRange, timeZone);
    
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
