import { Filter, Eye } from 'lucide-react';

const Orders = () => {
  const orders = [
    { id: '#ORD-7352', customer: 'John Doe', date: '2026-05-25', total: '₹149.99', status: 'Delivered' },
    { id: '#ORD-7353', customer: 'Sarah Smith', date: '2026-05-25', total: '₹89.00', status: 'Pending' },
    { id: '#ORD-7354', customer: 'Michael Brown', date: '2026-05-24', total: '₹299.50', status: 'Processing' },
    { id: '#ORD-7355', customer: 'Emma Wilson', date: '2026-05-24', total: '₹45.00', status: 'Cancelled' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Processing': return 'bg-blue-100 text-blue-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Orders</h1>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-bg flex items-center gap-2">
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg text-text-mid text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Order ID</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-primary">{order.id}</td>
                  <td className="px-6 py-4">{order.customer}</td>
                  <td className="px-6 py-4 text-text-mid">{order.date}</td>
                  <td className="px-6 py-4 font-medium">{order.total}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-text-mid hover:text-primary transition-colors flex items-center justify-end gap-1 w-full">
                      <Eye size={18} /> <span className="text-sm font-medium">View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;
