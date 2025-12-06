import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Transaction, InventoryItem, SalesLead } from '../types';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { translations } from '../utils/translations';

interface DashboardProps {
  financials: Transaction[];
  inventory: InventoryItem[];
  sales: SalesLead[];
  language: 'en' | 'ar';
  currency: string;
}

const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string; color: string }> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        {icon}
      </div>
    </div>
    <div className="flex items-end justify-between">
      <div className="text-2xl font-bold text-slate-800" dir="ltr">{value}</div>
      <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ financials, inventory, sales, language, currency }) => {
  const t = translations[language];
  
  const totalRevenue = financials.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = financials.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
  const lowStockCount = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;
  const pipelineValue = sales.filter(s => s.stage !== 'Closed Lost').reduce((acc, s) => acc + s.value, 0);

  // Group transactions by month for the chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = months.map(month => {
    const monthTransactions = financials.filter(t => t.date.includes(month)); // Simple string match for demo
    return {
      name: month,
      revenue: monthTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0),
      expense: monthTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0),
    };
  });

  // Calculate Inventory Value by Category
  const categoryValues: Record<string, number> = {};
  inventory.forEach(item => {
    if (!categoryValues[item.category]) categoryValues[item.category] = 0;
    categoryValues[item.category] += (item.stockLevel * item.unitPrice);
  });
  
  const inventoryChartData = Object.keys(categoryValues).map(cat => ({
    name: cat,
    value: categoryValues[cat]
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard 
          title={t.dashboard.totalRevenue}
          value={`${currency} ${totalRevenue.toLocaleString()}`} 
          icon={<DollarSign className="w-5 h-5 text-indigo-600" />} 
          trend={t.dashboard.optimal}
          color="bg-indigo-600"
        />
        <KPICard 
          title={t.dashboard.salesPipeline}
          value={`${currency} ${pipelineValue.toLocaleString()}`} 
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} 
          trend={t.dashboard.optimal}
          color="bg-emerald-600"
        />
        <KPICard 
          title={t.dashboard.stockAlerts}
          value={lowStockCount.toString()} 
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} 
          trend={lowStockCount > 0 ? t.dashboard.requiresAttention : t.dashboard.optimal}
          color="bg-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">{t.dashboard.financialPerformance}</h3>
          <div className="h-80 w-full" dir="ltr"> 
            {/* Charts usually better left LTR for axes */}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="revenue" name={t.finance.income} stroke="#4f46e5" fillOpacity={1} fill="url(#colorRv)" />
                <Area type="monotone" dataKey="expense" name={t.finance.expense} stroke="#ef4444" fillOpacity={1} fill="url(#colorEx)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-bold text-slate-800 mb-6">{t.dashboard.stockValue}</h3>
           <div className="h-80 w-full" dir="ltr">
            {inventoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <Tooltip formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, 'Value']} />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name={`Value (${currency})`} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                    No stock data
                </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;