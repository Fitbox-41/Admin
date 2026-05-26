import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const DeveloperUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingId 
      ? `http://localhost:5001/api/users/${editingId}`
      : 'http://localhost:5001/api/users';
      
    const method = editingId ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, password })
      });
      
      if (response.ok) {
        setName('');
        setPassword('');
        setEditingId(null);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to save user');
      }
    } catch (err) {
      alert('Server error');
    }
  };

  const handleEdit = (u) => {
    setEditingId(u._id);
    setName(u.name);
    setPassword(''); // don't show old password
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      alert('Server error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">User Management</h1>
      </div>

      {error && <div className="text-red-500 bg-red-500/10 border border-red-500 p-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="glass p-6 rounded-xl h-fit">
          <h2 className="text-xl font-bold font-heading text-text-dark mb-4 border-b border-border pb-2">
            {editingId ? 'Edit User' : 'Add New User'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-text-dark focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Password {editingId && <span className="text-text-mid text-xs font-normal">(Leave blank to keep current)</span>}
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required={!editingId} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-text-dark focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-mid hover:text-text-dark transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-xl font-medium hover:bg-primary-dark transition-all shadow-lg hover:shadow-primary/20">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { setEditingId(null); setName(''); setPassword(''); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 glass p-6 rounded-xl">
          <h2 className="text-xl font-bold font-heading text-text-dark mb-4 border-b border-border pb-2">Admin Users</h2>
          {loading ? (
            <p className="text-text-mid text-sm">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-sm font-medium text-text-mid">Name</th>
                    <th className="pb-3 text-sm font-medium text-text-mid text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-border hover:bg-border/30 transition-colors">
                      <td className="py-3 text-sm text-text-dark font-medium">
                        {u.name} {currentUser?._id === u._id && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">You</span>}
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="text-primary hover:text-primary-dark text-sm mr-4 transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(u._id)}
                          className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50 transition-colors"
                          disabled={currentUser?._id === u._id} // don't delete yourself
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="2" className="py-4 text-center text-sm text-text-mid">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeveloperUsers;
