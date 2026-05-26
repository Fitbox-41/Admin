import { useState, useEffect } from 'react';
import { Moon, Sun, User, Mail, Lock, LogOut, Trash2 } from 'lucide-react';

const Settings = () => {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Settings</h1>

      <div className="glass p-6 rounded-xl max-w-2xl">
        <h3 className="font-bold mb-4 text-text-dark text-lg border-b border-border pb-2">Appearance</h3>
        
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-text-dark">Theme Preference</p>
            <p className="text-sm text-text-mid">Toggle between light and dark mode</p>
          </div>
          
          <button 
            onClick={toggleTheme}
            className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${isDark ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white flex items-center justify-center transition-transform duration-300 ease-in-out shadow-sm ${isDark ? 'translate-x-8' : 'translate-x-0'}`}>
              {isDark ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-gray-500" />}
            </div>
          </button>
        </div>
      </div>

      <div className="glass p-6 rounded-xl max-w-2xl">
        <h3 className="font-bold mb-4 text-text-dark text-lg border-b border-border pb-2">Account Settings</h3>
        
        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
                <User size={18} />
              </div>
              <div>
                <p className="font-medium text-text-dark">Name</p>
                <p className="text-sm text-text-mid">Admin User</p>
              </div>
            </div>
            <button className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">Edit</button>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
                <Mail size={18} />
              </div>
              <div>
                <p className="font-medium text-text-dark">Email Address</p>
                <p className="text-sm text-text-mid">admin@fitbox.com</p>
              </div>
            </div>
            <button className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">Edit</button>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-light/20 flex items-center justify-center text-primary">
                <Lock size={18} />
              </div>
              <div>
                <p className="font-medium text-text-dark">Password</p>
                <p className="text-sm text-text-mid">••••••••</p>
              </div>
            </div>
            <button className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">Change</button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 pt-4 border-t border-border space-y-4">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-500 font-medium hover:bg-red-500/10 transition-colors border border-red-500/20">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-sm hover:shadow-red-500/20">
            <Trash2 size={18} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
