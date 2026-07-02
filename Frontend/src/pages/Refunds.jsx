import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Refunds = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/orders?status=Cancelled`);
      if (res.ok) {
        const data = await res.json();
        // Only show pending refunds where isRefunded is false
        setOrders(data.filter(o => o.isRefunded === false && o.paymentStatus === 'Paid'));
      }
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleRefundDone = async (orderId) => {
    if (!window.confirm("Are you sure you have processed this refund manually?")) return;
    
    setProcessingId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/refund`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        // Remove from list
        setOrders(orders.filter(o => o._id !== orderId));
      } else {
        alert("Failed to mark as refunded");
      }
    } catch (error) {
      console.error('Failed to update refund status', error);
      alert("Failed to mark as refunded");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o._id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerEmail && o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Refunds Management</h1>
          <p className="text-text-light text-sm mt-1">Manage orders that require a refund</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-card flex items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={20} />
          <input
            type="text"
            placeholder="Search by Order ID, Name, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-light">
            <CheckCircle size={48} className="text-green-400 mb-4" />
            <p className="text-lg font-medium text-text">All caught up!</p>
            <p className="text-sm">No pending refunds found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg text-text-mid font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Cancellation Reason</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text">
                        {order.invoiceNumber ? order.invoiceNumber : order._id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-xs text-text-light mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-text">{order.customerName || 'N/A'}</div>
                      <div className="text-xs text-text-light">{order.customerEmail || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text">₹{order.totalAmount}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[250px] truncate whitespace-normal">
                      {order.cancelReason && order.cancelReason.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {order.cancelReason.map((reason, idx) => (
                            <span key={idx} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs">
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-light italic text-xs">No reason provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <Link 
                        to={`/orders?q=${order._id}`}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-dark text-xs font-medium"
                      >
                        <ExternalLink size={14} /> View Order
                      </Link>
                      
                      <button
                        onClick={() => handleRefundDone(order._id)}
                        disabled={processingId === order._id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {processingId === order._id ? 'Processing...' : 'Mark Refund Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Refunds;
