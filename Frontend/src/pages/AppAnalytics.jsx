import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Map, Navigation, Users } from 'lucide-react';
import axios from 'axios';

const AppAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      totalRuns: 0,
      totalDistance: 0,
      totalCalories: 0,
      totalDuration: 0,
      totalActiveAppUsers: 0,
      territoriesConquered: 0
    },
    recentRuns: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await axios.get(`${API_URL}/api/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  const icons = [
    <Users key="users" className="text-primary" />,
    <Activity key="runs" className="text-primary" />,
    <Navigation key="nav" className="text-primary" />,
    <Map key="map" className="text-primary" />
  ];

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  const statCards = [
    { title: 'Total App Users', value: data.stats.totalActiveAppUsers },
    { title: 'Total Runs', value: data.stats.totalRuns },
    { title: 'Total Distance', value: `${(data.stats.totalDistance / 1000).toFixed(2)} km` },
    { title: 'Territories Conquered', value: data.stats.territoriesConquered },
  ];

  // Group recent runs by date for the chart
  const runsByDate = data.recentRuns.reduce((acc, run) => {
    const date = new Date(run.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = 0;
    acc[date] += run.distance / 1000;
    return acc;
  }, {});

  const chartData = Object.keys(runsByDate).map(date => ({
    name: date,
    distance: Number(runsByDate[date].toFixed(2))
  })).sort((a, b) => new Date(a.name) - new Date(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">App Analytics</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="glass p-6 rounded-xl transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-text-mid font-medium">{card.title}</p>
                <h3 className="text-xl md:text-2xl font-bold mt-2">{card.value}</h3>
              </div>
              <div className="p-3 bg-primary-light/10 rounded-lg">
                {icons[index]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        <div className="glass p-6 rounded-xl transition-all duration-300">
          <h3 className="font-bold mb-4">Distance Covered (Last 7 Days)</h3>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f9f9fc' }} />
                  <Bar dataKey="distance" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-light">
                No run data for the last 7 days
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppAnalytics;
