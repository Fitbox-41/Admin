import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Eye, ChevronUp, Printer, FileDown, Truck, RotateCw, PackageCheck, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// How many minutes old an order is considered "new"
const NEW_ORDER_THRESHOLD_MINUTES = 30;

const CancelTimer = ({ createdAt, orderStatus }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const orderTime = new Date(createdAt).getTime();
    const diff = (orderTime + 60 * 60 * 1000) - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    if (timeLeft <= 0 || orderStatus === 'Cancelled') return;
    const timer = setInterval(() => {
      const diff = (new Date(createdAt).getTime() + 60 * 60 * 1000) - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(timer);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt, timeLeft, orderStatus]);

  if (orderStatus === 'Cancelled') return null;
  if (timeLeft <= 0) {
    return (
      <div className="text-[10px] font-semibold text-text-mid mt-1">
        Cancel window: <span className="text-gray-500 font-bold">Closed</span>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="text-[10px] font-semibold text-text-mid mt-1">
      Cancel window: <span className="text-red-500 font-bold animate-pulse">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Processing');
  const [subTab, setSubTab] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [isBulkPickupLoading, setIsBulkPickupLoading] = useState(false);
  const [isSyncingCancellations, setIsSyncingCancellations] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [verifyCancelModal, setVerifyCancelModal] = useState(null);
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
    // Clear selection when active tabs change
    setSelectedOrderIds(new Set());
  }, [activeTab, subTab]);

  useEffect(() => {
    fetchOrders(false);
    
    // Listen for global Topbar refresh trigger
    const handleGlobalRefresh = () => fetchOrders(false);
    window.addEventListener('refreshData', handleGlobalRefresh);

    // Poll every 30 seconds for new orders
    const interval = setInterval(() => fetchOrders(true), 30000);
    
    return () => {
      window.removeEventListener('refreshData', handleGlobalRefresh);
      clearInterval(interval);
    };
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

  // Orders where Delhivery cancellation failed — cancelled in DB but not confirmed on Delhivery
  const unconfirmedCancels = orders.filter(o =>
    o.orderStatus === 'Cancelled' &&
    o.awb &&
    o.delhiveryCancelConfirmed === false
  );

  const handleSyncCancellations = async () => {
    if (unconfirmedCancels.length === 0) return;
    if (!window.confirm(`Re-send cancellation to Delhivery for ${unconfirmedCancels.length} order(s) where it failed previously?`)) return;
    setIsSyncingCancellations(true);
    try {
      const res = await fetch(`${API_URL}/orders/sync-cancellations`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(` Fixed: ${data.fixed} order(s) cancelled on Delhivery.${data.stillFailing > 0 ? `\n ${data.stillFailing} still failing — check Delhivery dashboard manually.` : ''}`);
        fetchOrders(false);
      } else {
        alert('Sync failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error during sync.');
    }
    setIsSyncingCancellations(false);
  };

  // Filtered orders that are eligible for pickup
  const filteredEligibleOrders = orders.filter(o =>
    o.awb &&
    (o.shipmentStatus === 'Ordered' || o.shipmentStatus === 'Created')
  );

  // Selected orders that are actually eligible for pickup
  const selectedEligibleOrders = filteredEligibleOrders.filter(o => selectedOrderIds.has(o._id));

  const allEligibleSelected = filteredEligibleOrders.length > 0 &&
    filteredEligibleOrders.every(o => selectedOrderIds.has(o._id));

  const handleToggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        filteredEligibleOrders.forEach(o => next.delete(o._id));
        return next;
      });
    } else {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        filteredEligibleOrders.forEach(o => next.add(o._id));
        return next;
      });
    }
  };

  const toggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleBulkSchedulePickup = async () => {
    if (selectedEligibleOrders.length === 0) {
      alert('No selected orders with AWB to schedule pickup for.');
      return;
    }
    if (!window.confirm(`Schedule pickup for ${selectedEligibleOrders.length} selected order(s) with Delhivery?`)) return;

    setIsBulkPickupLoading(true);
    let successCount = 0;
    let failCount = 0;
    const updatedIds = [];

    await Promise.all(
      selectedEligibleOrders.map(async (order) => {
        try {
          const res = await fetch(`${API_URL}/orders/${order._id}/pickup`, { method: 'POST' });
          const data = await res.json();
          if (res.ok && data.success) {
            successCount++;
            updatedIds.push(order._id);
          } else {
            failCount++;
            console.error(`Pickup failed for ${order._id}:`, data.message);
          }
        } catch (err) {
          failCount++;
          console.error(`Pickup error for ${order._id}:`, err);
        }
      })
    );

    // Update status to 'Ready to Ship' for all successfully scheduled orders
    if (updatedIds.length > 0) {
      await Promise.all(
        updatedIds.map(id =>
          fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentStatus: 'Ready to Ship' })
          })
        )
      );
      setOrders(prev =>
        prev.map(o => updatedIds.includes(o._id) ? { ...o, shipmentStatus: 'Ready to Ship' } : o)
      );
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        updatedIds.forEach(id => next.delete(id));
        return next;
      });
    }

    setIsBulkPickupLoading(false);
    if (failCount === 0) {
      alert(` Pickup scheduled for ${successCount} order(s). Status updated to Ready to Ship.`);
    } else {
      alert(` ${successCount} succeeded, ${failCount} failed. Check console for details.`);
    }
  };

  const handleVerifyDelhiveryCancel = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/cancel-status`);
      const data = await res.json();
      if (!res.ok) {
        alert('Error checking cancel status: ' + (data.message || 'Unknown error'));
        return;
      }
      // Set modal state instead of using native alerts
      setVerifyCancelModal({
        orderId,
        message: data.message,
        awb: data.awb,
        delhiveryStatus: data.delhiveryStatus,
        dbStatus: data.dbStatus,
        isCancelledOnDelhivery: data.isCancelledOnDelhivery,
        trackError: data.trackError
      });
    } catch (err) {
      console.error('Verify cancel error:', err);
      alert('Failed to check cancellation status.');
    }
  };

  const handleAdminCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? This will mark it as Cancelled in the database, attempt to cancel the shipment on Delhivery, refund points (if any), and send the customer a cancellation email.")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Order cancelled successfully.');
        fetchOrders(false);
      } else {
        alert('Could not cancel order: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Admin cancel order error:', err);
      alert('Failed to send cancellation request.');
    }
  };

  const handlePrintLabel = (order) => {
    if (!order.awb) {
      alert('Label not available — no AWB assigned yet.');
      return;
    }

    const addr = order.shippingAddress || {};
    const customerName = (addr.name || order.customerName || 'Customer').toUpperCase();
    const street = addr.street || '';
    const city = addr.city || '';
    const state = addr.state || '';
    const zip = addr.zip || '';
    const phone = addr.phone || order.customerPhone || '';
    const isPrepaid = order.paymentMode !== 'COD';
    const paymentLabel = isPrepaid ? 'Pre-paid - Surface' : 'Cash on Delivery (COD)';
    const amount = `INR ${order.totalAmount || 0}`;
    const dateObj = new Date(order.createdAt || Date.now());
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' | ' + dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Items table rows
    const itemRows = (order.items || []).map(item => {
      const price = Number(String(item.price || 0).replace(/[^0-9.-]+/g, ''));
      const qty = item.quantity || 1;
      const variant = item.selectedVariant ? ` (${item.selectedVariant})` : '';
      const size = item.selectedSize ? ` - ${item.selectedSize}` : '';
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #ccc;font-size:10px">${item.name}${variant}${size}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;text-align:center;font-size:10px">${qty}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:10px">&#8377;${price}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:10px">&#8377;${price * qty}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${order.awb}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#f0f0f0; display:flex; justify-content:center; padding:20px; }
    .label { width:385px; background:#fff; border:2px solid #000; }
    .header { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:2px solid #000; }
    .fitbox-logo { font-size:22px; font-weight:900; font-style:italic; line-height:1; }
    .fitbox-logo .fit { color:#cc2200; }
    .fitbox-logo .box { background:#cc2200; color:#fff; padding:0 3px; border-radius:2px; }
    .fitbox-sub { font-size:8px; color:#666; letter-spacing:2px; font-weight:400; font-style:normal; display:block; margin-top:1px; }
    .delhivery-logo { font-size:26px; font-weight:900; font-style:italic; color:#111; letter-spacing:-1px; }
    .delhivery-logo span { color:#e63; }
    .awb-section { padding:8px 12px 4px; }
    .awb-label { font-size:12px; font-weight:bold; margin-bottom:5px; }
    .barcode-wrap { text-align:center; }
    .barcode-footer { display:flex; justify-content:space-between; align-items:center; padding:3px 12px 6px; border-bottom:2px solid #000; font-size:11px; }
    .hub-code { font-weight:900; font-size:14px; letter-spacing:1px; }
    .ship-row { display:flex; border-bottom:1px solid #000; }
    .ship-left { flex:1.4; padding:8px 12px; border-right:1px solid #000; }
    .ship-right { flex:1; padding:8px 12px; }
    .to-label { font-size:10px; color:#555; margin-bottom:2px; }
    .cust-name { font-size:15px; font-weight:900; margin-bottom:3px; }
    .addr-text { font-size:10px; color:#333; line-height:1.45; }
    .city-text { font-size:11px; font-weight:bold; margin-top:3px; }
    .pin-text { font-size:12px; font-weight:900; margin-top:2px; }
    .phone-text { font-size:10px; color:#555; margin-top:4px; }
    .pay-label { font-size:10px; color:#555; margin-bottom:3px; }
    .pay-value { font-size:15px; font-weight:900; }
    .date-label { font-size:10px; color:#555; margin-top:10px; margin-bottom:2px; }
    .date-value { font-size:10px; }
    .seller-row { display:flex; border-bottom:1px solid #000; }
    .seller-left { flex:1.4; padding:8px 12px; border-right:1px solid #000; font-size:10px; }
    .seller-right { flex:1; padding:8px 12px; text-align:center; }
    .orderid-text { font-size:9px; color:#444; word-break:break-all; margin-bottom:4px; }
    .items-section { padding:8px 12px; border-bottom:1px solid #000; }
    .items-title { font-size:10px; font-weight:bold; margin-bottom:5px; text-transform:uppercase; color:#333; }
    .footer-row { display:flex; justify-content:space-between; align-items:center; padding:5px 12px; font-size:9px; color:#444; }
    @media print {
      body { background:white; padding:0; }
      .label { border:2px solid #000; }
      @page { size:A5; margin:5mm; }
    }
  </style>
</head>
<body>
  <div class="label">

    <!-- Header -->
    <div class="header" style="height:55px; padding:6px 12px;">
      <img src="${window.location.origin}/fitbox-100-x42_logo.webp" alt="FitBox Sports" style="height:36px; object-fit:contain; display:block;" />
      <img src="${window.location.origin}/Images/delhivery-logo.png" alt="Delhivery" style="height:26px; object-fit:contain; display:block;" />
    </div>

    <!-- AWB + Main Barcode -->
    <div class="awb-section">
      <div class="awb-label">AWB# ${order.awb}</div>
      <div class="barcode-wrap"><svg id="bc-awb"></svg></div>
    </div>

    <!-- Barcode footer: PIN | AWB | HUB -->
    <div class="barcode-footer">
      <span>${zip}</span>
      <span style="font-size:10px">AWB# ${order.awb}</span>
      <span class="hub-code">${state.toUpperCase().replace('&','').slice(0,3).trim()}/${city.toUpperCase().slice(0,3)}</span>
    </div>

    <!-- Ship to + Payment -->
    <div class="ship-row">
      <div class="ship-left">
        <div class="to-label">Ship to -</div>
        <div class="cust-name">${customerName}</div>
        <div class="addr-text">${street}</div>
        <div class="city-text">${city}${state ? ' (' + state + ')' : ''}</div>
        <div class="pin-text">PIN - ${zip}</div>
        ${phone ? `<div class="phone-text">Ph: ${phone}</div>` : ''}
      </div>
      <div class="ship-right">
        <div class="pay-label">${paymentLabel}</div>
        <div class="pay-value">${amount}</div>
        <div class="date-label">Date</div>
        <div class="date-value">${dateStr}</div>
      </div>
    </div>

    <!-- Items -->
    <div class="items-section">
      <div class="items-title">Order Items</div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:4px 8px;border:1px solid #ccc;text-align:left;font-size:10px">Product</th>
            <th style="padding:4px 8px;border:1px solid #ccc;text-align:center;font-size:10px">Qty</th>
            <th style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:10px">Price</th>
            <th style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:10px">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="background:#fff3ee">
            <td colspan="3" style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:10px;font-weight:bold">Order Total</td>
            <td style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:10px;font-weight:bold">&#8377;${order.totalAmount}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Seller + Order ID barcode -->
    <div class="seller-row">
      <div class="seller-left">
        <div>Seller: <strong>FITBOX SPORTS</strong></div>
        <div>41, Warirana Industrial Complex</div>
        <div>Jalandhar, Punjab - 144021</div>
      </div>
      <div class="seller-right">
        <div class="orderid-text">${order._id}</div>
        <svg id="bc-orderid"></svg>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-row">
      <span>Return Address: 41, Warirana Industrial Complex, Jalandhar - 144021</span>
      <span style="white-space:nowrap;margin-left:8px">Page 1 of 1</span>
    </div>

  </div>

  <script>
    window.addEventListener('load', function() {
      JsBarcode('#bc-awb', '${order.awb}', {
        format: 'CODE128', width: 1.6, height: 55, displayValue: false, margin: 0
      });
      JsBarcode('#bc-orderid', '${order._id.slice(-12)}', {
        format: 'CODE128', width: 1.2, height: 35, displayValue: false, margin: 0
      });
      // Fix SVG widths after render
      document.querySelectorAll('svg').forEach(function(svg) {
        svg.style.width = '100%';
        svg.style.display = 'block';
      });
      setTimeout(function() { window.print(); }, 600);
    });
  <\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=500,height=750');
    win.document.write(html);
    win.document.close();
  };

  const handleCreateShipment = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/shipment`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Delhivery shipment created successfully!');
        fetchOrders(false); // Refresh orders to show the new AWB
      } else {
        alert('Failed to create shipment: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create shipment', error);
      alert('Failed to create shipment');
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

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      case 'Pending Payment': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getShipmentStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Out for Delivery': return 'bg-teal-100 text-teal-700';
      case 'In Transit': return 'bg-blue-100 text-blue-700';
      case 'Ready to Ship': return 'bg-indigo-100 text-indigo-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'Ordered': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getShipmentStatusLabel = (status) => {
    return status;
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o._id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerEmail && o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const orderStatus = o.orderStatus || 'Pending';
    const paymentMode = o.paymentMode || 'Online';
    const shipmentStatus = o.shipmentStatus || 'Ordered';
    const paymentStatus = o.paymentStatus || 'Pending Payment';
    
    let matchesTab = false;
    
    const isDelivered = shipmentStatus === 'Delivered';
    const isCancelled = orderStatus === 'Cancelled' || shipmentStatus === 'Cancelled' || paymentStatus === 'Failed';
    const isCompleted = isDelivered;

    if (activeTab === 'Completed') {
      matchesTab = isCompleted && !isCancelled;
    } else if (activeTab === 'Cancelled') {
      matchesTab = isCancelled;
    } else if (activeTab === 'Processing') {
      matchesTab = !isCompleted && !isCancelled;
      if (matchesTab) {
        if (subTab === 'All') {
           matchesTab = true;
        } else if (subTab === 'Ordered') {
           matchesTab = shipmentStatus === 'Ordered';
        } else if (subTab === 'Ready to Ship') {
           matchesTab = shipmentStatus === 'Ready to Ship';
        } else if (subTab === 'In Transit') {
           matchesTab = shipmentStatus === 'In Transit';
        } else if (subTab === 'Out for Delivery') {
           matchesTab = shipmentStatus === 'Out for Delivery';
        } else {
           matchesTab = false;
        }
      }
    }

    const matchesPayment = paymentFilter ? paymentMode === paymentFilter : true;
    
    return matchesSearch && matchesTab && matchesPayment;
  });

  return (
    <>
      {/* CSS for new-order pulse animation */}
      <style>{`
        @keyframes newOrderPulse {
          0%   { background-color: transparent; }
          40%  { background-color: rgba(255, 107, 53, 0.08); }
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
          background: #ff6b35;
          border-radius: 0 2px 2px 0;
        }
        @keyframes newBadgePop {
          0%   { transform: scale(0.85); opacity: 0.7; }
          50%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.7; }
        }
        .new-badge-anim {
          animation: newBadgePop 1.5s ease-in-out infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Orders</h1>
          <div className="flex items-center gap-3">
            {newOrderIds.size > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-white new-badge-anim shadow">
                <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
                {newOrderIds.size} New Order{newOrderIds.size > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleBulkSchedulePickup}
              disabled={isBulkPickupLoading || selectedEligibleOrders.length === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm
                ${ selectedEligibleOrders.length > 0
                  ? 'bg-[#f0503c] text-white hover:bg-[#d94836] active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              title={selectedEligibleOrders.length > 0
                ? `Schedule pickup for ${selectedEligibleOrders.length} selected order(s)`
                : 'Select one or more unshipped orders with AWB first'}
            >
              {isBulkPickupLoading
                ? <RotateCw size={15} className="animate-spin" />
                : <PackageCheck size={15} />}
              {isBulkPickupLoading ? 'Scheduling...' : `Schedule Pickup${ selectedEligibleOrders.length > 0 ? ` (${selectedEligibleOrders.length})` : '' }`}
            </button>
          </div>
        </div>

        {/* WARNING: Unconfirmed Delhivery cancellations */}
        {unconfirmedCancels.length > 0 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 text-red-600" />
              <span className="text-sm font-semibold">
                {unconfirmedCancels.length} cancelled order{unconfirmedCancels.length > 1 ? 's' : ''} where Delhivery cancellation failed — the courier may still attempt pickup!
              </span>
            </div>
            <button
              onClick={handleSyncCancellations}
              disabled={isSyncingCancellations}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              {isSyncingCancellations ? <RotateCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              {isSyncingCancellations ? 'Fixing...' : 'Fix Now'}
            </button>
          </div>
        )}

        {/* Top-Level Tabs */}
        <div style={{ borderBottom: '1.5px solid #e5e7eb', marginBottom: '8px' }} className="flex">
          {['Processing', 'Completed', 'Cancelled'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderBottom: activeTab === tab ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                color: activeTab === tab ? 'var(--primary)' : '#6b7280',
                background: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
                outline: 'none',
                marginBottom: '-1.5px',
              }}
              onMouseEnter={undefined}
              onMouseLeave={undefined}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Processing Sub-Tabs */}
        {activeTab === 'Processing' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '8px 0 4px' }}>
            {['All', 'Ordered', 'Ready to Ship', 'In Transit', 'Out for Delivery'].map(tab => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                style={{
                  padding: '7px 20px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: subTab === tab ? '1.5px solid var(--primary)' : '1.5px solid #e5e7eb',
                  background: subTab === tab ? 'var(--primary)' : '#ffffff',
                  color: subTab === tab ? '#ffffff' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

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
                    <th className="px-6 py-4 font-medium w-12">
                      {filteredEligibleOrders.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allEligibleSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      )}
                    </th>
                    <th className="px-6 py-4 font-medium">Order ID</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Payment Method</th>
                    <th className="px-6 py-4 font-medium">Payment Status</th>
                    <th className="px-6 py-4 font-medium">Delivery Status</th>
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
                          <td className="px-6 py-4 w-12">
                            {order.awb && (order.shipmentStatus === 'Ordered' || order.shipmentStatus === 'Created') ? (
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.has(order._id)}
                                onChange={() => toggleSelectOrder(order._id)}
                                className="w-4 h-4 accent-primary rounded cursor-pointer"
                              />
                            ) : (
                              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded cursor-not-allowed" title="Not eligible for pickup (either already shipped, cancelled, or missing AWB)" />
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-primary text-xs">
                            <div className="flex items-center gap-2">
                              {order.invoiceNumber ? order.invoiceNumber : `FBX-${order._id.substring(order._id.length - 8).toUpperCase()}`}
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
                            <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                            <CancelTimer createdAt={order.createdAt} orderStatus={order.orderStatus} />
                          </td>
                          <td className="px-6 py-4 font-medium">₹{order.totalAmount}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block ${getPaymentModeColor(paymentMode)}`}>
                              {paymentMode}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block ${getPaymentStatusColor(order.paymentStatus || 'Pending Payment')}`}>
                              {order.paymentStatus || 'Pending Payment'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-block ${getShipmentStatusColor(order.shipmentStatus || 'Ordered')}`}>
                              {getShipmentStatusLabel(order.shipmentStatus || 'Ordered')}
                            </span>
                            {/* Delhivery cancellation confirmation badge — only for cancelled orders */}
                            {(order.orderStatus === 'Cancelled' || order.shipmentStatus === 'Cancelled') && (
                              <div className="mt-2">
                                {order.awb ? (
                                  order.delhiveryCancelConfirmed === true ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 inline-block whitespace-nowrap">
                                      ✓ Delhivery Cancelled
                                    </span>
                                  ) : order.delhiveryCancelConfirmed === false ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 inline-block whitespace-nowrap">
                                      ✗ Delhivery Pending Cancel
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-block whitespace-nowrap">
                                      ? Delhivery Unverified
                                    </span>
                                  )
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200 inline-block whitespace-nowrap">
                                    — No Shipment Created
                                  </span>
                                )}
                              </div>
                            )}
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
                              <button
                                 onClick={() => handlePrintLabel(order)}
                                disabled={!order.awb}
                                className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${order.awb ? 'text-indigo-600 hover:text-indigo-800 hover:underline' : 'text-text-mid cursor-not-allowed opacity-50'}`}
                                title={order.awb ? 'Print shipping label' : 'Label not available'}
                              >
                                <Printer size={14} />
                                Print Label
                              </button>

                              {/* Manual Generate AWB */}
                              {!order.awb && (order.paymentStatus === 'Paid' || order.paymentMode === 'COD' || order.paymentStatus === 'COD - Pay on Delivery') && (
                                <button
                                  onClick={() => handleCreateShipment(order._id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-800 hover:underline transition-colors"
                                  title="Manually create Delhivery shipment and generate AWB"
                                >
                                  <Truck size={14} />
                                  Generate AWB
                                </button>
                              )}

                              {/* Verify Delhivery Cancellation — only for cancelled orders with AWB */}
                              {order.awb && (order.orderStatus === 'Cancelled' || order.shipmentStatus === 'Cancelled') && (
                                <button
                                  onClick={() => handleVerifyDelhiveryCancel(order._id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                                  title="Check if Delhivery has cancelled this shipment"
                                >
                                  <ShieldCheck size={14} />
                                  Verify Cancel
                                </button>
                              )}

                              {/* Cancel Order */}
                              {order.orderStatus !== 'Cancelled' && order.shipmentStatus !== 'Cancelled' && order.shipmentStatus !== 'Delivered' && (
                                <button
                                  onClick={() => handleAdminCancelOrder(order._id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800 hover:underline transition-colors"
                                  title="Cancel order, cancel Delhivery shipment, refund points, and notify user"
                                >
                                  <XCircle size={14} />
                                  Cancel Order
                                </button>
                              )}

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
                            <td colSpan="8" className="px-6 py-4 bg-bg/20">
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
                                        <option value="Ordered">Ordered</option>
                                        <option value="Ready to Ship">Ready to Ship</option>
                                        <option value="In Transit">In Transit</option>
                                        <option value="Out for Delivery">Out for Delivery</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                      </select>
                                    </div>
                                    {order.awb ? (
                                      <div className="mt-2">
                                        <span className="text-text-mid">AWB:</span>{' '}
                                        <span className="text-text-dark font-mono font-medium">{order.awb}</span>
                                      </div>
                                    ) : (
                                      (order.paymentStatus === 'Paid' || order.paymentMode === 'COD' || order.paymentStatus === 'COD - Pay on Delivery') && (
                                        <div className="flex items-center justify-between mt-2">
                                          <div>
                                            <span className="text-text-mid">AWB:</span>{' '}
                                            <span className="text-orange-600 font-semibold">Not generated</span>
                                          </div>
                                          <button
                                            onClick={() => handleCreateShipment(order._id)}
                                            className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded font-semibold hover:bg-orange-700 transition-colors"
                                          >
                                            Generate AWB
                                          </button>
                                        </div>
                                      )
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
                      <td colSpan="9" className="px-6 py-8 text-center text-text-mid">
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

      {/* Verify Cancel Custom Modal */}
      {verifyCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-purple-700 mb-4">
              <ShieldCheck className="w-8 h-8" />
              <h3 className="text-lg font-bold text-text-dark">Delhivery Verification</h3>
            </div>
            
            <div className="space-y-3 my-4 text-sm text-text-mid">
              <div className={`p-3 rounded-xl border font-medium ${
                verifyCancelModal.isCancelledOnDelhivery 
                  ? 'bg-green-50 text-green-800 border-green-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {verifyCancelModal.message}
              </div>
              
              <div className="flex justify-between py-2 border-b border-border">
                <span>AWB Number:</span>
                <span className="font-semibold text-text-dark font-mono text-xs">{verifyCancelModal.awb || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span>Delhivery Status:</span>
                <span className="font-semibold text-text-dark capitalize">{verifyCancelModal.delhiveryStatus || '—'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Database Status:</span>
                <span className="font-semibold text-text-dark">{verifyCancelModal.dbStatus || '—'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setVerifyCancelModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-bg hover:bg-border text-text-dark transition-colors cursor-pointer"
              >
                Close
              </button>
              
              {verifyCancelModal.awb && !verifyCancelModal.isCancelledOnDelhivery && !verifyCancelModal.trackError && (
                <button
                  onClick={async () => {
                    const orderId = verifyCancelModal.orderId;
                    setVerifyCancelModal(null);
                    try {
                      const cancelRes = await fetch(`${API_URL}/orders/${orderId}/cancel`, { method: 'POST' });
                      const cancelData = await cancelRes.json();
                      if (cancelRes.ok && cancelData.success) {
                        alert(' Cancellation request sent to Delhivery successfully.');
                        fetchOrders(false);
                      } else {
                        alert(' Could not send cancellation to Delhivery: ' + (cancelData.message || 'Unknown error'));
                      }
                    } catch (err) {
                      alert('Failed to send cancellation request.');
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                >
                  Force Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
