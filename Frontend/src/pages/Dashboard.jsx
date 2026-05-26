import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { IndianRupee, ShoppingBag, Users, Package } from 'lucide-react';

const mockData = {
  today: {
    statCards: [
      { title: 'Total Revenue', value: '₹1,231.89', trend: '+5.1% from yesterday' },
      { title: 'Total Orders', value: '45', trend: '+2.2% from yesterday' },
      { title: 'Total Customers', value: '12', trend: '+1.5% from yesterday' },
      { title: 'Total Products', value: '432', trend: '0% from yesterday' },
    ],
    chartData: [
      { name: '10 AM', revenue: 100 },
      { name: '12 PM', revenue: 300 },
      { name: '2 PM', revenue: 200 },
      { name: '4 PM', revenue: 278 },
      { name: '6 PM', revenue: 189 },
      { name: '8 PM', revenue: 239 },
      { name: '10 PM', revenue: 349 },
    ]
  },
  'last-week': {
    statCards: [
      { title: 'Total Revenue', value: '₹12,231.89', trend: '+10.1% from previous week' },
      { title: 'Total Orders', value: '350', trend: '+5.2% from previous week' },
      { title: 'Total Customers', value: '134', trend: '+2.5% from previous week' },
      { title: 'Total Products', value: '432', trend: '0% from previous week' },
    ],
    chartData: [
      { name: 'Mon', revenue: 1000 },
      { name: 'Tue', revenue: 1500 },
      { name: 'Wed', revenue: 2000 },
      { name: 'Thu', revenue: 2780 },
      { name: 'Fri', revenue: 1890 },
      { name: 'Sat', revenue: 2390 },
      { name: 'Sun', revenue: 3490 },
    ]
  },
  'last-month': {
    statCards: [
      { title: 'Total Revenue', value: '₹45,231.89', trend: '+20.1% from last month' },
      { title: 'Total Orders', value: '2,350', trend: '+15.2% from last month' },
      { title: 'Total Customers', value: '1,234', trend: '+10.5% from last month' },
      { title: 'Total Products', value: '432', trend: '+2.4% from last month' },
    ],
    chartData: [
      { name: 'Week 1', revenue: 4000 },
      { name: 'Week 2', revenue: 3000 },
      { name: 'Week 3', revenue: 5000 },
      { name: 'Week 4', revenue: 4780 },
    ]
  },
  'last-3-months': {
    statCards: [
      { title: 'Total Revenue', value: '₹145,231.89', trend: '+18.1% from previous 3 months' },
      { title: 'Total Orders', value: '7,350', trend: '+12.2% from previous 3 months' },
      { title: 'Total Customers', value: '4,234', trend: '+8.5% from previous 3 months' },
      { title: 'Total Products', value: '432', trend: '+1.4% from previous 3 months' },
    ],
    chartData: [
      { name: 'Month 1', revenue: 40000 },
      { name: 'Month 2', revenue: 30000 },
      { name: 'Month 3', revenue: 50000 },
    ]
  },
  'last-6-months': {
    statCards: [
      { title: 'Total Revenue', value: '₹285,231.89', trend: '+22.1% from previous 6 months' },
      { title: 'Total Orders', value: '14,350', trend: '+18.2% from previous 6 months' },
      { title: 'Total Customers', value: '8,234', trend: '+12.5% from previous 6 months' },
      { title: 'Total Products', value: '432', trend: '+4.4% from previous 6 months' },
    ],
    chartData: [
      { name: 'M1', revenue: 40000 },
      { name: 'M2', revenue: 30000 },
      { name: 'M3', revenue: 50000 },
      { name: 'M4', revenue: 45000 },
      { name: 'M5', revenue: 60000 },
      { name: 'M6', revenue: 55000 },
    ]
  },
  'last-year': {
    statCards: [
      { title: 'Total Revenue', value: '₹645,231.89', trend: '+30.1% from previous year' },
      { title: 'Total Orders', value: '32,350', trend: '+25.2% from previous year' },
      { title: 'Total Customers', value: '18,234', trend: '+20.5% from previous year' },
      { title: 'Total Products', value: '432', trend: '+8.4% from previous year' },
    ],
    chartData: [
      { name: 'Jan', revenue: 40000 },
      { name: 'Feb', revenue: 30000 },
      { name: 'Mar', revenue: 50000 },
      { name: 'Apr', revenue: 45000 },
      { name: 'May', revenue: 60000 },
      { name: 'Jun', revenue: 55000 },
      { name: 'Jul', revenue: 65000 },
      { name: 'Aug', revenue: 70000 },
      { name: 'Sep', revenue: 58000 },
      { name: 'Oct', revenue: 80000 },
      { name: 'Nov', revenue: 90000 },
      { name: 'Dec', revenue: 100000 },
    ]
  },
  'last-5-years': {
    statCards: [
      { title: 'Total Revenue', value: '₹3,645,231.89', trend: '+50.1% from previous 5 years' },
      { title: 'Total Orders', value: '182,350', trend: '+45.2% from previous 5 years' },
      { title: 'Total Customers', value: '98,234', trend: '+40.5% from previous 5 years' },
      { title: 'Total Products', value: '432', trend: '+28.4% from previous 5 years' },
    ],
    chartData: [
      { name: 'Year 1', revenue: 400000 },
      { name: 'Year 2', revenue: 500000 },
      { name: 'Year 3', revenue: 650000 },
      { name: 'Year 4', revenue: 800000 },
      { name: 'Year 5', revenue: 1000000 },
    ]
  }
};

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('last-month');

  const icons = [
    <IndianRupee key="rupee" className="text-primary" />,
    <ShoppingBag key="bag" className="text-primary" />,
    <Users key="users" className="text-primary" />,
    <Package key="package" className="text-primary" />
  ];

  const currentData = mockData[timeRange];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Dashboard Overview</h1>
        
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white border border-gray-200 text-gray-700 py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
        >
          <option value="today">Today</option>
          <option value="last-week">Last Week</option>
          <option value="last-month">Last Month</option>
          <option value="last-3-months">Last 3 Months</option>
          <option value="last-6-months">Last 6 Months</option>
          <option value="last-year">Last 1 Year</option>
          <option value="last-5-years">Last 5 Years</option>
        </select>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentData.statCards.map((card, index) => (
          <div key={index} className="glass p-6 rounded-xl transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-text-mid font-medium">{card.title}</p>
                <h3 className="text-xl md:text-2xl font-bold mt-2">{card.value}</h3>
                <p className="text-xs text-text-light mt-1">{card.trend}</p>
              </div>
              <div className="p-3 bg-primary-light/10 rounded-lg">
                {icons[index]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass p-6 rounded-xl transition-all duration-300">
          <h3 className="font-bold mb-4">Revenue</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f9f9fc' }} />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-6 rounded-xl transition-all duration-300">
          <h3 className="font-bold mb-4">Sales Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary-dark)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
