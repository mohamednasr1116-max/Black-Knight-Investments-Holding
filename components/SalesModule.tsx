import React, { useState, useRef, useMemo } from 'react';
import { Customer, InventoryItem, Asset, SaleOrder, InvestmentSale, AssetType, Transaction, TransactionType, Project } from '../types';
import { Users, Search, Plus, Trash2, Edit2, X, Upload, Download, Phone, Mail, MapPin, ShoppingBag, TrendingUp, Package, ChevronRight, AlertCircle, Briefcase, FileDown } from 'lucide-react';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportCustomersToPDF, exportSalesOrdersToPDF } from '../services/pdfService';
import { translations } from '../utils/translations';

interface SalesModuleProps {
  customers: Customer[];
  inventory: InventoryItem[];
  assets: Asset[];
  salesOrders: SaleOrder[];
  investmentSales: InvestmentSale[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onImportCustomers: (data: Customer[]) => void;
  onAddSaleOrder: (order: SaleOrder) => void;
  onAddInvestmentSale: (sale: InvestmentSale) => void;
  language: 'en' | 'ar';
  currency: string;
  financials: Transaction[];
  projects: Project[];
}

const SalesModule: React.FC<SalesModuleProps> = ({ customers, inventory, assets, salesOrders, investmentSales, onAddCustomer, onUpdateCustomer, onDeleteCustomer, onImportCustomers, onAddSaleOrder, onAddInvestmentSale, language, currency, financials, projects }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'customers' | 'orders' | 'investments' | 'projects'>('customers');
  
  // Modal States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  
  // Filters State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderProjectFilter, setOrderProjectFilter] = useState('All');
  const [investSearch, setInvestSearch] = useState('');
  const [projSaleSearch, setProjSaleSearch] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customer Form State
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active'
  });

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    itemId: '',
    quantity: '',
    projectId: ''
  });

  // Investment Sale Form State
  const [investForm, setInvestForm] = useState({
    assetId: '',
    saleAmount: ''
  });

  // --- Helpers ---
  const resetCustomerForm = () => {
    setCustomerForm({ name: '', email: '', phone: '', address: '', status: 'Active' });
    setEditingId(null);
  };

  const handleEditCustomerClick = (customer: Customer) => {
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status
    });
    setEditingId(customer.id);
    setIsCustomerModalOpen(true);
  };

  // --- Submits ---
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customerData: Customer = {
      id: editingId || Date.now().toString(),
      name: customerForm.name,
      email: customerForm.email,
      phone: customerForm.phone,
      address: customerForm.address,
      status: customerForm.status as 'Active' | 'Inactive',
      lastContactDate: new Date().toISOString().split('T')[0]
    };

    if (editingId) onUpdateCustomer(customerData);
    else onAddCustomer(customerData);
    
    setIsCustomerModalOpen(false);
    resetCustomerForm();
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const customer = customers.find(c => c.id === orderForm.customerId);
      const item = inventory.find(i => i.id === orderForm.itemId);
      const qty = parseInt(orderForm.quantity);
      
      const project = projects.find(p => p.id === orderForm.projectId);

      if (!customer || !item || isNaN(qty) || qty <= 0) return;
      if (qty > item.stockLevel) {
          alert(t.sales.insufficientStock);
          return;
      }

      const newOrder: SaleOrder = {
          id: Date.now().toString().slice(-6),
          customerId: customer.id,
          customerName: customer.name,
          date: new Date().toISOString().split('T')[0],
          items: [{
              itemId: item.id,
              itemName: item.name,
              quantity: qty,
              unitPrice: item.unitPrice,
              total: qty * item.unitPrice
          }],
          totalAmount: qty * item.unitPrice,
          status: 'Completed',
          projectId: project ? project.id : undefined,
          projectName: project ? project.name : undefined
      };

      onAddSaleOrder(newOrder);
      setIsOrderModalOpen(false);
      setOrderForm({ customerId: '', itemId: '', quantity: '', projectId: '' });
  };

  const handleInvestSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const asset = assets.find(a => a.id === investForm.assetId);
      const amount = parseFloat(investForm.saleAmount);

      if (!asset || isNaN(amount) || amount <= 0) return;

      const newSale: InvestmentSale = {
          id: Date.now().toString(),
          assetId: asset.id,
          assetName: asset.name,
          date: new Date().toISOString().split('T')[0],
          saleAmount: amount
      };

      onAddInvestmentSale(newSale);
      setIsInvestModalOpen(false);
      setInvestForm({ assetId: '', saleAmount: '' });
  };


  // --- Exports / Imports ---
  const handleExport = () => {
    if (activeTab === 'customers') exportToExcel(customers, 'Customer_Database');
    else if (activeTab === 'orders') exportToExcel(salesOrders, 'Sales_Orders');
    else if (activeTab === 'investments') exportToExcel(investmentSales, 'Investment_Sales');
  };

  const handleExportPDF = () => {
      if (activeTab === 'customers') exportCustomersToPDF(customers);
      else if (activeTab === 'orders') exportSalesOrdersToPDF(salesOrders, currency);
  };

  const handleImportClick = () => {
    if (activeTab === 'customers') fileInputRef.current?.click();
    else alert('Import only available for customers currently.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeTab === 'customers') {
      try {
        const data = await importFromExcel(file);
        onImportCustomers(data as Customer[]);
      } catch (error) {
        alert('Error importing file.');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Filtering ---
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = customerSearch.toLowerCase().trim();
      const matchesSearch = !term || `${c.name} ${c.email} ${c.phone} ${c.address}`.toLowerCase().includes(term);
      const matchesStatus = customerStatusFilter === 'All' || c.status === customerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, customerSearch, customerStatusFilter]);

  const filteredOrders = useMemo(() => {
      return salesOrders.filter(o => {
          const term = orderSearch.toLowerCase().trim();
          const matchesSearch = !term || o.id.includes(term) || o.customerName.toLowerCase().includes(term);
          const matchesProject = orderProjectFilter === 'All' || (orderProjectFilter === 'None' ? !o.projectId : o.projectId === orderProjectFilter);
          return matchesSearch && matchesProject;
      });
  }, [salesOrders, orderSearch, orderProjectFilter]);

  const filteredInvestments = useMemo(() => {
      return investmentSales.filter(inv => {
          const term = investSearch.toLowerCase().trim();
          return !term || inv.assetName.toLowerCase().includes(term);
      });
  }, [investmentSales, investSearch]);

  const projectSales = useMemo(() => {
      return financials.filter(t => {
          if (t.type !== TransactionType.INCOME || !t.projectId) return false;
          const term = projSaleSearch.toLowerCase().trim();
          return !term || (t.projectName && t.projectName.toLowerCase().includes(term)) || t.description.toLowerCase().includes(term);
      });
  }, [financials, projSaleSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">{t.sales.title}</h2>
           <p className="text-sm text-slate-500">{t.sales.subtitle}</p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx, .xls, .csv"
            />
            {activeTab === 'customers' && (
                <button onClick={handleImportClick} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" /> {t.common.import}
                </button>
            )}
            <button onClick={handleExport} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> {t.common.export}
            </button>
            {(activeTab === 'customers' || activeTab === 'orders') && (
                 <button onClick={handleExportPDF} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <FileDown className="w-4 h-4" /> PDF
                </button>
            )}
            
            {activeTab === 'customers' && (
                <button onClick={() => { resetCustomerForm(); setIsCustomerModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {t.sales.addCustomer}
                </button>
            )}
            {activeTab === 'orders' && (
                 <button onClick={() => setIsOrderModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {t.sales.newOrder}
                </button>
            )}
             {activeTab === 'investments' && (
                 <button onClick={() => setIsInvestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {t.sales.sellAsset}
                </button>
            )}
        </div>
      </div>

       {/* Tabs */}
       <div className="flex border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('customers')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'customers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Users className="w-4 h-4" /> {t.sales.customers}
        </button>
        <button 
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <ShoppingBag className="w-4 h-4" /> {t.sales.productSales}
        </button>
        <button 
            onClick={() => setActiveTab('investments')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'investments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <TrendingUp className="w-4 h-4" /> {t.sales.investmentSales}
        </button>
        <button 
            onClick={() => setActiveTab('projects')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'projects' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Briefcase className="w-4 h-4" /> {t.sales.projectSales}
        </button>
      </div>

      {/* --- CUSTOMERS TAB --- */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t.common.search}
                        className="w-full ps-10 pe-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                </div>
                 <div className="flex gap-2">
                    <select 
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={customerStatusFilter}
                        onChange={(e) => setCustomerStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>{t.sales.noCustomers}</p>
                </div>
                ) : (
                filteredCustomers.map((customer) => (
                    <div key={customer.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{customer.name}</h3>
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {customer.address}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-2">
                                    <span className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                        <Phone className="w-3 h-3 text-slate-400" /> {customer.phone}
                                    </span>
                                    <span className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                        <Mail className="w-3 h-3 text-slate-400" /> {customer.email}
                                    </span>
                                </div>
                            </div>
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${customer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {customer.status === 'Active' ? t.hr.active : 'Inactive'}
                            </span>
                            <button onClick={() => handleEditCustomerClick(customer)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteCustomer(customer.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    </div>
                ))
                )}
            </div>
        </div>
      )}

      {/* --- PRODUCT SALES TAB --- */}
      {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search Order ID or Customer..." 
                        className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                    />
                </div>
                 <div className="flex gap-2">
                    <select 
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={orderProjectFilter}
                        onChange={(e) => setOrderProjectFilter(e.target.value)}
                    >
                        <option value="All">All Projects</option>
                        <option value="None">No Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{t.sales.noOrders}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 text-start">{t.sales.orderId}</th>
                                <th className="px-6 py-4 text-start">{t.sales.customerName}</th>
                                <th className="px-6 py-4 text-start">{t.finance.project}</th>
                                <th className="px-6 py-4 text-start">{t.common.date}</th>
                                <th className="px-6 py-4 text-start">{t.sales.items}</th>
                                <th className="px-6 py-4 text-end">{t.sales.total}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-slate-500">#{order.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {order.projectName ? (
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs border border-indigo-100">
                                                {order.projectName}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{order.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {order.items.map((item, idx) => (
                                                <span key={idx} className="text-slate-600 flex items-center gap-1">
                                                    <span className="font-medium">{item.quantity}x</span> {item.itemName}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-end font-bold text-slate-800" dir="ltr">
                                        {currency}{order.totalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
          </div>
      )}

      {/* --- INVESTMENT SALES TAB --- */}
      {activeTab === 'investments' && (
          <div className="space-y-4">
              <div className="relative">
                <Search className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search Investment/Asset Name..." 
                    className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={investSearch}
                    onChange={(e) => setInvestSearch(e.target.value)}
                />
             </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredInvestments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{t.sales.noInvestments}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 text-start">{t.assets.assetName}</th>
                                <th className="px-6 py-4 text-start">{t.common.date}</th>
                                <th className="px-6 py-4 text-end">{t.sales.saleValue}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvestments.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{sale.assetName}</td>
                                    <td className="px-6 py-4 text-slate-500">{sale.date}</td>
                                    <td className="px-6 py-4 text-end font-bold text-emerald-600" dir="ltr">
                                        {currency}{sale.saleAmount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
          </div>
      )}

      {/* --- PROJECT SALES TAB --- */}
      {activeTab === 'projects' && (
          <div className="space-y-4">
              <div className="relative">
                <Search className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search Project Sales..." 
                    className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={projSaleSearch}
                    onChange={(e) => setProjSaleSearch(e.target.value)}
                />
             </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {projectSales.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{t.sales.noProjectSales}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 text-start">{t.finance.project}</th>
                                <th className="px-6 py-4 text-start">{t.common.description}</th>
                                <th className="px-6 py-4 text-start">{t.common.date}</th>
                                <th className="px-6 py-4 text-end">{t.sales.saleValue}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projectSales.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{tx.projectName}</td>
                                    <td className="px-6 py-4 text-slate-600">{tx.description}</td>
                                    <td className="px-6 py-4 text-slate-500">{tx.date}</td>
                                    <td className="px-6 py-4 text-end font-bold text-purple-600" dir="ltr">
                                        {currency}{tx.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
          </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{editingId ? t.common.edit : t.sales.addCustomer}</h3>
                    <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.customerName}</label>
                        <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.mobileNumber}</label>
                            <input required type="tel" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="+1 234 567 8900"
                                value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.email}</label>
                            <input required type="email" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="name@company.com"
                                value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.fullAddress}</label>
                        <textarea required className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                            rows={3}
                            placeholder="Street, City, State, Zip Code"
                            value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.status}</label>
                        <select className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={customerForm.status} onChange={e => setCustomerForm({...customerForm, status: e.target.value})}
                        >
                            <option value="Active">{t.hr.active}</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg mt-4 shadow-sm">
                        {t.common.save}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{t.sales.newOrder}</h3>
                    <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleOrderSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.customerName}</label>
                        <select required className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={orderForm.customerId} onChange={e => setOrderForm({...orderForm, customerId: e.target.value})}
                        >
                            <option value="">-- Select Customer --</option>
                            {customers.filter(c => c.status === 'Active').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.selectProduct}</label>
                        <select required className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={orderForm.itemId} onChange={e => setOrderForm({...orderForm, itemId: e.target.value})}
                        >
                            <option value="">-- Select Product --</option>
                            {inventory.filter(i => i.stockLevel > 0).map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.stockLevel} in stock)</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.quantity}</label>
                        <input required type="number" min="1" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={orderForm.quantity} onChange={e => setOrderForm({...orderForm, quantity: e.target.value})} />
                    </div>

                    {/* New Project Selection Field */}
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">{t.finance.project} (Optional)</label>
                         <select 
                            className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={orderForm.projectId} onChange={e => setOrderForm({...orderForm, projectId: e.target.value})}
                         >
                             <option value="">-- No Project --</option>
                             {projects.filter(p => p.status !== 'Completed').map(p => (
                                 <option key={p.id} value={p.id}>{p.name}</option>
                             ))}
                         </select>
                    </div>
                    
                    {/* Price Preview */}
                    {orderForm.itemId && orderForm.quantity && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                            <span className="text-sm text-slate-600">{t.sales.total}:</span>
                            <span className="font-bold text-lg text-slate-800" dir="ltr">
                                {currency}
                                {(parseInt(orderForm.quantity) * (inventory.find(i => i.id === orderForm.itemId)?.unitPrice || 0)).toLocaleString()}
                            </span>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg mt-4 shadow-sm">
                        {t.common.save}
                    </button>
                </form>
            </div>
        </div>
      )}

       {/* Investment Sale Modal */}
       {isInvestModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{t.sales.sellAsset}</h3>
                    <button onClick={() => setIsInvestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleInvestSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.selectAsset}</label>
                        <select required className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={investForm.assetId} onChange={e => setInvestForm({...investForm, assetId: e.target.value})}
                        >
                            <option value="">-- Select Asset --</option>
                            {/* Filter mainly stocks and real estate, or allow all except bank balances */}
                            {assets.filter(a => a.type !== AssetType.BANK_BALANCE && a.value > 0).map(a => (
                                <option key={a.id} value={a.id}>{a.name} (Current Value: {currency}{a.value})</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.sales.saleValue} ({currency})</label>
                        <input required type="number" min="1" step="0.01" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={investForm.saleAmount} onChange={e => setInvestForm({...investForm, saleAmount: e.target.value})} />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg mt-4 shadow-sm">
                        {t.common.save}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SalesModule;