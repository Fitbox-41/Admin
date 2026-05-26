import { Search, Bell, User, Menu } from 'lucide-react';

const Topbar = ({ onMenuClick }) => {
  return (
    <header className="h-20 bg-card-bg border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button onClick={onMenuClick} className="md:hidden text-text-dark hover:text-primary transition-colors">
          <Menu size={24} />
        </button>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-xl hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={20} />
            <input
              type="text"
              placeholder="Search products, orders, or customers..."
              className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6 ml-4">
        <button className="relative text-text-mid hover:text-primary transition-colors">
          <Bell size={24} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card-bg"></span>
        </button>
        
        <div className="flex items-center gap-3 border-l border-border pl-6 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary font-bold">
            <User size={20} />
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-semibold text-text-dark">Admin User</p>
            <p className="text-text-light text-xs">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
