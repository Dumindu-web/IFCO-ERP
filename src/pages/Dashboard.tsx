import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Package, Truck, ShoppingCart, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFirestoreCollection } from '../hooks/useFirestore.js';

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: products, loading: productsLoading } = useFirestoreCollection<any>('products');
  const { data: suppliers } = useFirestoreCollection<any>('suppliers');
  const { data: salesOrders } = useFirestoreCollection<any>('sales_orders');
  const { data: transactions } = useFirestoreCollection<any>('audit_logs');

  if (productsLoading) return <div>Loading dashboard...</div>;

  const lowStockItems = products.filter(p => (p.quantity || 0) < (p.minStockLevel || 0)).length;

  const stats = {
    totalProducts: products.length,
    lowStockItems: lowStockItems,
    totalSuppliers: suppliers.length,
    totalSales: salesOrders.length,
    chartData: [], // Would need more complex aggregation for real chart data
    recentTransactions: transactions.slice(0, 5).map(t => ({
      ...t,
      product_name: t.details?.split(' ')[0] || 'Item' // Simplified
    })),
    salesVsPurchases: []
  };

  const statCards = [
    { name: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Low Stock Items', value: stats.lowStockItems, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { name: 'Total Suppliers', value: stats.totalSuppliers, icon: Truck, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Total Sales', value: stats.totalSales, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`rounded-md p-3 ${item.bg}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Sales vs Purchases (Last 30 Days)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={stats.chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="sales" name="Sales" fill="#9333ea" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases Table */}
        <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Sales vs Purchases</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.salesVsPurchases?.length > 0 ? (
                  stats.salesVsPurchases.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.type === 'Sale' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No sales or purchases found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Transactions</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {stats.recentTransactions.map((transaction: any, transactionIdx: number) => (
                <li key={transaction.id}>
                  <div className="relative pb-8">
                    {transactionIdx !== stats.recentTransactions.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          transaction.type === 'in' ? 'bg-green-500' :
                          transaction.type === 'out' ? 'bg-red-500' :
                          transaction.type === 'transfer' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}>
                          <Package className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            {transaction.type.toUpperCase()} <span className="font-medium text-gray-900">{transaction.quantity}</span> {transaction.product_name}
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time dateTime={transaction.timestamp}>{new Date(transaction.timestamp).toLocaleDateString()}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
