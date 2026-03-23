import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Search } from 'lucide-react';
import { fuzzySearch } from '../utils/search.js';
import { useFirestoreCollection } from '../hooks/useFirestore.js';

export default function Products() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: products, loading: productsLoading } = useFirestoreCollection<any>('products');
  const { data: categories } = useFirestoreCollection<any>('categories');
  const { data: suppliers } = useFirestoreCollection<any>('suppliers');

  if (productsLoading) return <div>Loading products...</div>;

  const enrichedProducts = products.map(product => ({
    ...product,
    category_name: categories.find(c => c.id === product.categoryId)?.name || 'N/A',
    supplier_name: suppliers.find(s => s.id === product.supplierId)?.name || 'N/A'
  }));

  const filteredProducts = fuzzySearch<any>(
    enrichedProducts.filter(p => p.category_name === 'F.G'),
    searchTerm,
    ['name', 'sku']
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative rounded-md shadow-sm max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
            placeholder="Search products by name or Item Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.supplier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.min_stock_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
