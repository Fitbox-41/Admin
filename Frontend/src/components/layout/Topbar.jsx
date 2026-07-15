import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Menu, LogOut, Package, ShoppingCart, RotateCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const NEW_ORDER_THRESHOLD_MINUTES = 30;

const Topbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    // Dispatch a global event so the current active page/component knows to refresh its data
    window.dispatchEvent(new CustomEvent('refreshData'));
    
    // Auto reset spin state after 1.2 seconds (duration of animation)
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };
  
  // Dropdown states
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  // Notifications State
  const [orders, setOrders] = useState([]);
  const [newOrders, setNewOrders] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState({ orders: [], products: [] });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileDropdown(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifDropdown(false);
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Data for Notifications & Search
  const fetchData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/orders`),
        fetch(`${API_URL}/products`)
      ]);
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
        
        // Determine new orders
        const now = Date.now();
        const recentOrders = ordersData.filter(o => 
          (now - new Date(o.createdAt).getTime()) < NEW_ORDER_THRESHOLD_MINUTES * 60 * 1000
        );
        
        setNewOrders(recentOrders);
        
        // Check unread status
        const lastViewed = localStorage.getItem('lastNotifView');
        if (!lastViewed) {
          setHasUnread(recentOrders.length > 0);
        } else {
          const hasNewer = recentOrders.some(o => new Date(o.createdAt).getTime() > parseInt(lastViewed));
          setHasUnread(hasNewer);
        }
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Failed to fetch data for Topbar:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults({ orders: [], products: [] });
      setShowSearchDropdown(false);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    const matchedOrders = orders.filter(o => 
      o._id.toLowerCase().includes(term) || 
      (o.customerName && o.customerName.toLowerCase().includes(term))
    ).slice(0, 3); // Max 3 order results

    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.category && p.category.toLowerCase().includes(term))
    ).slice(0, 3); // Max 3 product results

    setSearchResults({ orders: matchedOrders, products: matchedProducts });
    setShowSearchDropdown(true);
  }, [searchTerm, orders, products]);

  const handleNotifClick = () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown) {
      // Opening dropdown marks them as read
      localStorage.setItem('lastNotifView', Date.now().toString());
      setHasUnread(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-20 bg-card-bg border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button onClick={onMenuClick} className="md:hidden text-text-dark hover:text-primary transition-colors">
          <Menu size={24} />
        </button>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-xl hidden sm:block relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={20} />
            <input
              type="text"
              placeholder="Search products, orders, or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => { if(searchTerm) setShowSearchDropdown(true); }}
              className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (searchResults.orders.length > 0 || searchResults.products.length > 0) && (
            <div className="absolute left-0 right-0 mt-2 bg-card-bg border border-border rounded-xl shadow-lg overflow-hidden z-50">
              <div className="max-h-[400px] overflow-y-auto py-2">
                
                {searchResults.orders.length > 0 && (
                  <div className="px-4 py-2">
                    <h4 className="text-xs font-bold text-text-mid uppercase tracking-wider mb-2">Orders</h4>
                    <div className="space-y-1">
                      {searchResults.orders.map(order => (
                        <div 
                          key={order._id}
                          onClick={() => { navigate('/orders'); setShowSearchDropdown(false); }}
                          className="flex items-center justify-between p-2 hover:bg-bg rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                              <ShoppingCart size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-dark">Order {order.invoiceNumber ? order.invoiceNumber : `FBX-${order._id.slice(-8).toUpperCase()}`}</p>
                              <p className="text-xs text-text-light">{order.customerName || 'Guest'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-text-mid">₹{order.totalAmount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.orders.length > 0 && searchResults.products.length > 0 && (
                  <div className="h-px bg-border my-1" />
                )}

                {searchResults.products.length > 0 && (
                  <div className="px-4 py-2">
                    <h4 className="text-xs font-bold text-text-mid uppercase tracking-wider mb-2">Products</h4>
                    <div className="space-y-1">
                      {searchResults.products.map(product => (
                        <div 
                          key={product.id || product._id}
                          onClick={() => { navigate('/products'); setShowSearchDropdown(false); }}
                          className="flex items-center gap-3 p-2 hover:bg-bg rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded bg-bg overflow-hidden flex-shrink-0">
                            {(product.imgSrc || (product.variants && product.variants[0]?.images[0])) ? (
                              <img src={product.imgSrc || product.variants[0].images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <Package size={14} className="text-text-light" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-dark">{product.name}</p>
                            <p className="text-xs text-text-light">{product.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6 ml-4">
        
        {/* Global Refresh Button */}
        <button
          onClick={handleGlobalRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm focus:outline-none disabled:opacity-50 active:scale-95 flex-shrink-0"
          title="Refresh database data"
          disabled={isRefreshing}
        >
          <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleNotifClick}
            className="relative text-text-mid hover:text-primary transition-colors p-1"
          >
            <Bell size={24} />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-card-bg animate-pulse"></span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-card-bg border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-border bg-bg/50 flex justify-between items-center">
                <h3 className="font-semibold text-text-dark">Notifications</h3>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {newOrders.length} New
                </span>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto">
                {newOrders.length > 0 ? (
                  newOrders.map(order => (
                    <div 
                      key={order._id}
                      onClick={() => { navigate('/orders'); setShowNotifDropdown(false); }}
                      className="p-4 border-b border-border last:border-0 hover:bg-bg cursor-pointer transition-colors flex gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <ShoppingCart size={18} />
                      </div>
                      <div>
                        <p className="text-sm text-text-dark">
                          New order <span className="font-semibold">{order.invoiceNumber ? order.invoiceNumber : `FBX-${order._id.slice(-8).toUpperCase()}`}</span> from <span className="font-semibold">{order.customerName || 'Guest'}</span>
                        </p>
                        <p className="text-xs text-text-light mt-1">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-text-mid flex flex-col items-center">
                    <Bell size={32} className="text-border mb-2" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
              {newOrders.length > 0 && (
                <div 
                  className="px-4 py-3 border-t border-border bg-bg/50 text-center text-sm text-primary font-medium cursor-pointer hover:bg-bg transition-colors"
                  onClick={() => { navigate('/orders'); setShowNotifDropdown(false); }}
                >
                  View All Orders
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <div 
            className="flex items-center gap-3 border-l border-border pl-6 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={20} />}
            </div>
            <div className="hidden md:block text-sm">
              <p className="font-semibold text-text-dark capitalize">{user?.name || 'Admin User'}</p>
              <p className="text-text-light text-xs">Admin</p>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileDropdown && (
            <div className="absolute right-0 mt-3 w-48 bg-card-bg border border-border rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2">
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
