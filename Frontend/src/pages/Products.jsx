import { Plus, Filter } from 'lucide-react';

const Products = () => {
  const products = [
    { id: 1, name: 'Premium Yoga Mat', category: 'Accessories', price: '₹45.00', stock: 120, status: 'In Stock' },
    { id: 2, name: 'Adjustable Dumbbells', category: 'Weights', price: '₹199.99', stock: 15, status: 'Low Stock' },
    { id: 3, name: 'Resistance Bands Set', category: 'Accessories', price: '₹29.99', stock: 0, status: 'Out of Stock' },
    { id: 4, name: 'Kettlebell 16kg', category: 'Weights', price: '₹55.00', stock: 45, status: 'In Stock' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-text-dark">Products</h1>
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
                <th className="px-6 py-4 font-medium">Product Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4 text-text-mid">{product.category}</td>
                  <td className="px-6 py-4 font-medium">{product.price}</td>
                  <td className="px-6 py-4 text-text-mid">{product.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.status === 'In Stock' ? 'bg-green-100 text-green-700' : 
                      product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary hover:text-primary-dark font-medium mr-3">Edit</button>
                    <button className="text-red-500 hover:text-red-700 font-medium">Delete</button>
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

export default Products;
