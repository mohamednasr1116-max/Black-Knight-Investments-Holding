import React, { useState, useRef, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Package, AlertCircle, Plus, Trash2, X, Download, Upload, DollarSign, FileDown, Search } from 'lucide-react';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportInventoryToPDF } from '../services/pdfService';
import { translations } from '../utils/translations';

interface InventoryProps {
  items: InventoryItem[];
  onAdd: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, amount: number) => void;
  onImport: (data: InventoryItem[]) => void;
  language: 'en' | 'ar';
  currency: string;
}

const InventoryModule: React.FC<InventoryProps> = ({ items, onAdd, onDelete, onUpdateStock, onImport, language, currency }) => {
  const t = translations[language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [formData, setFormData] = useState({
      name: '',
      sku: '',
      category: '',
      stockLevel: '',
      unitPrice: '',
      reorderPoint: '10'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stock = parseInt(formData.stockLevel) || 0;
    const reorder = parseInt(formData.reorderPoint) || 0;
    
    const newItem: InventoryItem = {
        id: Date.now().toString(),
        sku: formData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        name: formData.name,
        category: formData.category || 'General',
        stockLevel: stock,
        reorderPoint: reorder,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        status: stock === 0 ? 'Out of Stock' : stock <= reorder ? 'Low Stock' : 'In Stock'
    };
    onAdd(newItem);
    setIsModalOpen(false);
    setFormData({ name: '', sku: '', category: '', stockLevel: '', unitPrice: '', reorderPoint: '10' });
  };

  const handleExport = () => {
      exportToExcel(items, 'Inventory_Stock');
  };

  const handleExportPDF = () => {
      exportInventoryToPDF(items, currency);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const data = await importFromExcel(file);
              onImport(data);
          } catch (error) {
              alert('Error importing file.');
          }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filtering Logic
  const uniqueCategories = useMemo(() => Array.from(new Set(items.map(i => i.category))), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, filterCategory, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{t.stock.title}</h2>
        <div className="flex gap-2">
           <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx, .xls, .csv"
            />
          <button onClick={handleImportClick} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" /> {t.common.import}
          </button>
           <button onClick={handleExport} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
             <Download className="w-4 h-4" /> {t.common.export}
           </button>
           <button onClick={handleExportPDF} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
             <FileDown className="w-4 h-4" /> PDF
           </button>
          <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t.stock.addProduct}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Package /></div>
            <div>
              <p className="text-sm text-blue-600 font-medium">{t.stock.totalSkus}</p>
              <p className="text-2xl font-bold text-blue-900">{items.length}</p>
            </div>
         </div>
         <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600"><AlertCircle /></div>
            <div>
              <p className="text-sm text-amber-600 font-medium">{t.stock.lowStockAlerts}</p>
              <p className="text-2xl font-bold text-amber-900">{items.filter(i => i.status !== 'In Stock').length}</p>
            </div>
         </div>
         <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><DollarSign className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-emerald-600 font-medium">{t.stock.totalValue}</p>
              <p className="text-2xl font-bold text-emerald-900" dir="ltr">{currency}{items.reduce((acc, i) => acc + (i.unitPrice * i.stockLevel), 0).toLocaleString()}</p>
            </div>
         </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder={t.common.search} 
                className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-2">
            <select 
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
            >
                <option value="All">All Categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="All">All Status</option>
                <option value="In Stock">{t.stock.inStock}</option>
                <option value="Low Stock">{t.stock.lowStock}</option>
                <option value="Out of Stock">{t.stock.outOfStock}</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
                <p>{t.stock.noItems}</p>
            </div>
        ) : (
        <table className="w-full text-sm text-start">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4 text-start">{t.stock.sku}</th>
              <th className="px-6 py-4 text-start">{t.stock.productName}</th>
              <th className="px-6 py-4 text-start">{t.stock.category}</th>
              <th className="px-6 py-4 text-center">{t.stock.inStock}</th>
              <th className="px-6 py-4 text-start">{t.stock.unitPrice}</th>
              <th className="px-6 py-4 text-start">{t.common.status}</th>
              <th className="px-6 py-4 text-start">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-slate-500 text-start">{item.sku}</td>
                <td className="px-6 py-4 font-medium text-slate-800 text-start">{item.name}</td>
                <td className="px-6 py-4 text-slate-600 text-start">{item.category}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                        onClick={() => onUpdateStock(item.id, -1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                    >-</button>
                    <span className={`font-bold w-8 text-center ${item.stockLevel <= item.reorderPoint ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.stockLevel}
                    </span>
                    <button 
                         onClick={() => onUpdateStock(item.id, 1)}
                         className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                    >+</button>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700 text-start" dir="ltr">{currency}{item.unitPrice}</td>
                <td className="px-6 py-4 text-start">
                    {item.status === 'In Stock' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">{t.stock.inStock}</span>}
                    {item.status === 'Low Stock' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{t.stock.lowStock}</span>}
                    {item.status === 'Out of Stock' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">{t.stock.outOfStock}</span>}
                </td>
                <td className="px-6 py-4 flex items-center gap-3">
                  <button 
                    onClick={() => onUpdateStock(item.id, 10)}
                    className="text-indigo-600 hover:text-indigo-900 font-medium text-xs uppercase"
                  >
                    {t.stock.restock} (+10)
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-rose-500">
                     <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

       {/* Add Product Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{t.stock.addProduct}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.stock.productName}</label>
                        <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.stock.sku}</label>
                            <input type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="Auto-gen if empty" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.stock.category}</label>
                            <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.stock.unitPrice} ({currency})</label>
                            <input required type="number" step="0.01" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                            <input required type="number" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.stockLevel} onChange={e => setFormData({...formData, stockLevel: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Alert @</label>
                            <input required type="number" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.reorderPoint} onChange={e => setFormData({...formData, reorderPoint: e.target.value})} />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg mt-4">{t.common.save}</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;