import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { IndianRupee, ShoppingBag, Users, Package } from 'lucide-react';

const Dashboard = () => {
  const statCards = [
    { title: 'Total Revenue', value: '₹45,231.89', icon: <IndianRupee className="text-primary" />, trend: '+20.1% from last month' },
    { title: 'Total Orders', value: '2,350', icon: <ShoppingBag className="text-primary" />, trend: '+15.2% from last month' },
    { title: 'Total Customers', value: '12,234', icon: <Users className="text-primary" />, trend: '+10.5% from last month' },
    { title: 'Total Products', value: '432', icon: <Package className="text-primary" />, trend: '+2.4% from last month' },
  ];

  const data = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
    { name: 'Jul', revenue: 3490 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Dashboard Overview</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="glass p-6 rounded-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-text-mid font-medium">{card.title}</p>
                <h3 className="text-xl md:text-2xl font-bold mt-2">{card.value}</h3>
              </div>
              <div className="p-3 bg-primary-light/10 rounded-lg">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass p-6 rounded-xl">
          <h3 className="font-bold mb-4">Monthly Revenue</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f9f9fc' }} />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-6 rounded-xl">
          <h3 className="font-bold mb-4">Sales Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
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
