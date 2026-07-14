import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { IndianRupee, ShoppingBag, Users, Package, Download } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('last-3-months');
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const response = await fetch(`${API_URL}/analytics?timeRange=${timeRange}&timeZone=${timeZone}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentData(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  const icons = [
    <IndianRupee key="rupee" className="text-primary" />,
    <ShoppingBag key="bag" className="text-primary" />,
    <Users key="users" className="text-primary" />,
    <Package key="package" className="text-primary" />
  ];

  const formatXAxisDate = (dateString) => {
    if (!dateString || dateString === 'No data') return dateString;
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-US', { day: 'numeric' });
      } else if (parts.length === 2) {
        const [y, m] = parts;
        const date = new Date(y, m - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }
    return dateString;
  };

  const formatTooltipDate = (dateString) => {
    if (!dateString || dateString === 'No data') return dateString;
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } else if (parts.length === 2) {
        const [y, m] = parts;
        const date = new Date(y, m - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    return dateString;
  };

  const formatYAxis = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value}`;
  };

  const handleDownloadExcel = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    window.open(`${API_URL}/orders/export?timeRange=${timeRange}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Dashboard Overview</h1>
        
        <div className="flex gap-4 items-center">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="last-6-months">Last 6 Months</option>
            <option value="last-year">Last 1 Year</option>
            <option value="last-5-years">Last 5 Years</option>
          </select>

          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 bg-primary text-white py-2 px-4 rounded-lg shadow-sm hover:bg-primary-dark transition-all"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export Analytics</span>
          </button>
        </div>
      </div>
      
      {/* Stat Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-text-mid">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentData?.statCards.map((card, index) => (
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
                  <BarChart data={currentData?.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={formatXAxisDate} 
                      padding={{ left: 15, right: 15 }}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#888' }}
                      tickMargin={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                    <Tooltip 
                      cursor={{ fill: '#f9f9fc' }} 
                      labelFormatter={formatTooltipDate}
                      formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass p-6 rounded-xl transition-all duration-300">
              <h3 className="font-bold mb-4">Sales Trend</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData?.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={formatXAxisDate} 
                      padding={{ left: 15, right: 15 }}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#888' }}
                      tickMargin={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                    <Tooltip 
                      labelFormatter={formatTooltipDate}
                      formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-primary-dark)" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
