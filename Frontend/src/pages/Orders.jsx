import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Eye, ChevronDown, ChevronUp, X, Printer, FileDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// How many minutes old an order is considered "new"
const NEW_ORDER_THRESHOLD_MINUTES = 30;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const prevOrderIds = useRef(new Set());
  const [newOrderIds, setNewOrderIds] = useState(new Set());

  const fetchOrders = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const res = await fetch(`${API_URL}/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);

        // Detect brand-new order IDs since last fetch
        if (isPolling) {
          const incoming = new Set(data.map(o => o._id));
          const freshIds = new Set([...incoming].filter(id => !prevOrderIds.current.has(id)));
          if (freshIds.size > 0) {
            setNewOrderIds(prev => new Set([...prev, ...freshIds]));
          }
          prevOrderIds.current = incoming;
        } else {
          // On first load mark orders created within threshold as "new"
          const now = Date.now();
          const recentIds = new Set(
            data
              .filter(o => (now - new Date(o.createdAt).getTime()) < NEW_ORDER_THRESHOLD_MINUTES * 60 * 1000)
              .map(o => o._id)
          );
          setNewOrderIds(recentIds);
          prevOrderIds.current = new Set(data.map(o => o._id));
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);
    // Poll every 30 seconds for new orders
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentStatus: newStatus })
      });
      if (res.ok) {
        setOrders(orders.map(o => o._id === orderId ? { ...o, shipmentStatus: newStatus } : o));
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const getOrderStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentModeColor = (mode) => {
    switch(mode) {
      case 'Online': return 'bg-blue-100 text-blue-700';
      case 'COD': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o._id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerEmail && o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const orderStatus = o.orderStatus || (o.paymentStatus === 'Paid' ? 'Completed' : o.paymentStatus === 'Failed' ? 'Cancelled' : 'Pending');
    const matchesStatus = statusFilter ? orderStatus === statusFilter : true;
    const matchesPayment = paymentFilter ? (o.paymentMode || 'Online') === paymentFilter : true;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <>
      {/* CSS for new-order pulse animation */}
      <style>{`
        @keyframes newOrderPulse {
          0%   { background-color: transparent; }
          40%  { background-color: rgba(var(--color-primary-rgb, 99,102,241), 0.10); }
          100% { background-color: transparent; }
        }
        .new-order-row {
          animation: newOrderPulse 2s ease-in-out infinite;
          position: relative;
        }
        .new-order-row td:first-child::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--color-primary, #6366f1);
          border-radius: 0 2px 2px 0;
          animation: newOrderPulse 2s ease-in-out infinite;
        }
        @keyframes newBadgePop {
          0%   { transform: scale(0.85); opacity: 0.7; }
          50%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.7; }
        }
        .new-badge-anim {
          animation: newBadgePop 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Orders</h1>
          {newOrderIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-white new-badge-anim shadow">
              <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
              {newOrderIds.size} New Order{newOrderIds.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center bg-bg/30 gap-4">
            <div className="relative flex-1 min-w-full md:min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" size={18} />
              <input 
                type="text" 
                placeholder="Search by Order ID, Name or Email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg text-sm bg-bg outline-none focus:border-primary transition-colors flex-1"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg text-sm bg-bg outline-none focus:border-primary transition-colors flex-1"
              >
                <option value="">All Payments</option>
                <option value="Online">Online</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20 text-text-mid">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-bg text-text-mid text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Order ID</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Payment</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order) => {
                    const orderStatus = order.orderStatus || (order.paymentStatus === 'Paid' ? 'Completed' : order.paymentStatus === 'Failed' ? 'Cancelled' : 'Pending');
                    const paymentMode = order.paymentMode || 'Online';
                    const isExpanded = expandedOrder === order._id;
                    const isNew = newOrderIds.has(order._id);

                    return (
                      <>
                        <tr
                          key={order._id}
                          className={`transition-colors relative ${isExpanded ? 'bg-bg/30' : ''} ${isNew ? 'new-order-row' : 'hover:bg-bg/50'}`}
                        >
                          <td className="px-6 py-4 font-medium text-primary text-xs">
                            <div className="flex items-center gap-2">
                              #{order._id.substring(order._id.length - 8).toUpperCase()}
                              {isNew && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-white leading-none">NEW</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{order.customerName || 'Guest'}</div>
                            <div className="text-xs text-text-mid">{order.customerEmail}</div>
                          </td>
                          <td className="px-6 py-4 text-text-mid text-sm">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-medium">₹{order.totalAmount}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block ${getPaymentModeColor(paymentMode)}`}>
                              {paymentMode}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block ${getOrderStatusColor(orderStatus)}`}>
                              {orderStatus}
                            </span>
                          </td>
                          {/* Actions column — always visible */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* View/Hide toggle */}
                              <button 
                                onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                className="text-text-mid hover:text-primary transition-colors inline-flex items-center gap-1"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                                <span className="text-sm font-medium">{isExpanded ? 'Hide' : 'View'}</span>
                              </button>

                              {/* Print Label */}
                              <a
                                href={order.labelUrl || '#'}
                                target={order.labelUrl ? '_blank' : undefined}
                                rel="noreferrer"
                                onClick={!order.labelUrl ? (e) => e.preventDefault() : undefined}
                                className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${order.labelUrl ? 'text-indigo-600 hover:text-indigo-800 hover:underline' : 'text-text-mid cursor-not-allowed opacity-50'}`}
                                title={order.labelUrl ? 'Print shipping label' : 'Label not available'}
                              >
                                <Printer size={14} />
                                Print Label
                              </a>

                              {/* Download Invoice */}
                              {order.invoiceUrl && (
                                <a
                                  href={order.invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:underline transition-colors"
                                  title="Download invoice"
                                >
                                  <FileDown size={14} />
                                  Invoice
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${order._id}-details`}>
                            <td colSpan="7" className="px-6 py-4 bg-bg/20">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Order Items */}
                                <div className="bg-white rounded-lg p-4 border border-border">
                                  <h4 className="text-sm font-bold text-text-dark mb-3 uppercase tracking-wide">Order Items</h4>
                                  <div className="space-y-2">
                                    {order.items && order.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                                        <div className="w-10 h-10 rounded bg-bg overflow-hidden flex-shrink-0">
                                          {item.imgSrc ? (
                                            <img src={item.imgSrc} alt={item.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-text-mid text-xs">N/A</div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-text-dark truncate">{item.name}</div>
                                          <div className="text-xs text-text-mid">
                                            {item.selectedVariant && `${item.selectedVariant}`}
                                            {item.selectedSize && ` • ${item.selectedSize}`}
                                            {` • Qty: ${item.quantity}`}
                                          </div>
                                        </div>
                                        <div className="text-sm font-semibold text-text-dark">₹{item.price * item.quantity}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Shipping & Tracking */}
                                <div className="bg-white rounded-lg p-4 border border-border">
                                  <h4 className="text-sm font-bold text-text-dark mb-3 uppercase tracking-wide">Shipping & Status</h4>
                                  <div className="space-y-2 text-sm">
                                    {order.shippingAddress && (
                                      <div>
                                        <span className="text-text-mid">Ship to:</span>{' '}
                                        <span className="text-text-dark font-medium">
                                          {order.shippingAddress.name}, {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-2">
                                      <span className="text-text-mid">Shipment:</span>
                                      <select 
                                        value={order.shipmentStatus}
                                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                        className="px-2 py-1 rounded-lg text-xs font-medium border border-border bg-bg outline-none cursor-pointer"
                                      >
                                        <option value="Pending">Pending</option>
                                        <option value="Created">Created</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                      </select>
                                    </div>
                                    {order.awb && (
                                      <div>
                                        <span className="text-text-mid">AWB:</span>{' '}
                                        <span className="text-text-dark font-mono">{order.awb}</span>
                                      </div>
                                    )}
                                    {order.paymentId && (
                                      <div>
                                        <span className="text-text-mid">Payment ID:</span>{' '}
                                        <span className="text-text-dark font-mono text-xs">{order.paymentId}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-text-mid">
                        No orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Orders;
