import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Asset, AssetType } from '../types';
import { Plus, Trash2, Edit2, X, Upload, Download, Landmark, TrendingUp, Building, Wallet, Truck, Monitor, PieChart as PieChartIcon, FileDown, Search, Coins } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportAssetsToPDF } from '../services/pdfService';
import { translations } from '../utils/translations';

interface AssetsModuleProps {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onUpdateAsset: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
  onImportAssets: (data: Asset[]) => void;
  language: 'en' | 'ar';
  currency: string;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#eab308'];

const AssetsModule: React.FC<AssetsModuleProps> = ({ assets, onAddAsset, onUpdateAsset, onDeleteAsset, onImportAssets, language, currency }) => {
  const t = translations[language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: AssetType.OTHER,
    value: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    description: '',
    stockSymbol: '',
    numberOfShares: '',
    costPerShare: '',
    goldWeight: '',
    goldPricePerGram: '',
    goldKarat: ''
  });

  // Auto-calculate total value for stocks
  useEffect(() => {
    if (formData.type === AssetType.STOCKS) {
        const shares = parseFloat(formData.numberOfShares) || 0;
        const cost = parseFloat(formData.costPerShare) || 0;
        if (shares > 0 && cost > 0) {
            setFormData(prev => ({ ...prev, value: (shares * cost).toFixed(2) }));
        }
    }
  }, [formData.numberOfShares, formData.costPerShare, formData.type]);

  // Auto-calculate total value for gold
  useEffect(() => {
    if (formData.type === AssetType.GOLD) {
        const weight = parseFloat(formData.goldWeight) || 0;
        const price = parseFloat(formData.goldPricePerGram) || 0;
        if (weight > 0 && price > 0) {
            setFormData(prev => ({ ...prev, value: (weight * price).toFixed(2) }));
        }
    }
  }, [formData.goldWeight, formData.goldPricePerGram, formData.type]);

  const resetForm = () => {
    setFormData({ 
        name: '', 
        type: AssetType.OTHER, 
        value: '', 
        acquisitionDate: new Date().toISOString().split('T')[0],
        description: '',
        stockSymbol: '',
        numberOfShares: '',
        costPerShare: '',
        goldWeight: '',
        goldPricePerGram: '',
        goldKarat: ''
    });
    setEditingId(null);
  };

  const handleEditClick = (asset: Asset) => {
    setFormData({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
      acquisitionDate: asset.acquisitionDate,
      description: asset.description || '',
      stockSymbol: asset.stockSymbol || '',
      numberOfShares: asset.numberOfShares?.toString() || '',
      costPerShare: asset.costPerShare?.toString() || '',
      goldWeight: asset.goldWeight?.toString() || '',
      goldPricePerGram: asset.goldPricePerGram?.toString() || '',
      goldKarat: asset.goldKarat || ''
    });
    setEditingId(asset.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const assetData: Asset = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      type: formData.type,
      value: parseFloat(formData.value) || 0,
      acquisitionDate: formData.acquisitionDate,
      description: formData.description,
      stockSymbol: formData.stockSymbol,
      numberOfShares: parseFloat(formData.numberOfShares) || 0,
      costPerShare: parseFloat(formData.costPerShare) || 0,
      goldWeight: parseFloat(formData.goldWeight) || 0,
      goldPricePerGram: parseFloat(formData.goldPricePerGram) || 0,
      goldKarat: formData.goldKarat
    };

    if (editingId) {
      onUpdateAsset(assetData);
    } else {
      onAddAsset(assetData);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleExport = () => {
    exportToExcel(assets, 'Company_Assets');
  };

  const handleExportPDF = () => {
      exportAssetsToPDF(assets, currency);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await importFromExcel(file);
        onImportAssets(data as Asset[]);
      } catch (error) {
        alert('Error importing assets.');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getAssetIcon = (type: AssetType) => {
      switch(type) {
          case AssetType.BANK_BALANCE: return <Landmark className="w-5 h-5 text-emerald-600" />;
          case AssetType.REAL_ESTATE: return <Building className="w-5 h-5 text-indigo-600" />;
          case AssetType.STOCKS: return <TrendingUp className="w-5 h-5 text-blue-600" />;
          case AssetType.GOLD: return <Coins className="w-5 h-5 text-yellow-600" />;
          case AssetType.INVESTMENT_FUND: return <PieChartIcon className="w-5 h-5 text-violet-600" />;
          case AssetType.VEHICLE: return <Truck className="w-5 h-5 text-amber-600" />;
          case AssetType.EQUIPMENT: return <Monitor className="w-5 h-5 text-slate-600" />;
          default: return <Wallet className="w-5 h-5 text-slate-400" />;
      }
  };

  const getTypeTranslation = (type: AssetType) => {
      switch(type) {
          case AssetType.BANK_BALANCE: return t.assets.bankBalance;
          case AssetType.REAL_ESTATE: return t.assets.realEstate;
          case AssetType.STOCKS: return t.assets.stocks;
          case AssetType.GOLD: return t.assets.gold;
          case AssetType.INVESTMENT_FUND: return t.assets.investmentFund;
          case AssetType.VEHICLE: return t.assets.vehicle;
          case AssetType.EQUIPMENT: return t.assets.equipment;
          default: return t.assets.other;
      }
  };

  const totalValue = assets.reduce((acc, curr) => acc + curr.value, 0);

  // Chart Data Calculation
  const assetDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    assets.forEach(a => {
        const typeName = getTypeTranslation(a.type);
        map[typeName] = (map[typeName] || 0) + a.value;
    });
    return Object.keys(map).map(key => ({
        name: key,
        value: map[key]
    })).sort((a, b) => b.value - a.value);
  }, [assets, language, t]);

  // Filtering Logic
  const filteredAssets = useMemo(() => {
      return assets.filter(a => {
          const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesType = filterType === 'All' || a.type === filterType;
          return matchesSearch && matchesType;
      });
  }, [assets, searchTerm, filterType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">{t.assets.title}</h2>
           <p className="text-sm text-slate-500">{t.assets.subtitle}</p>
        </div>
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
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
            <Plus className="w-4 h-4" /> {t.assets.addAsset}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Cards Column */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
             <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200 md:col-span-2">
                <p className="text-indigo-100 text-sm font-medium mb-1">{t.assets.totalAssets}</p>
                <h3 className="text-3xl font-bold" dir="ltr">{currency}{totalValue.toLocaleString()}</h3>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                    <Landmark className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{t.assets.bankBalance}</p>
                    <p className="text-xl font-bold text-slate-800" dir="ltr">
                        {currency}{assets.filter(a => a.type === AssetType.BANK_BALANCE).reduce((acc, c) => acc + c.value, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{t.assets.stocks}</p>
                    <p className="text-xl font-bold text-slate-800" dir="ltr">
                        {currency}{assets.filter(a => a.type === AssetType.STOCKS).reduce((acc, c) => acc + c.value, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
                    <Coins className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{t.assets.gold}</p>
                    <p className="text-xl font-bold text-slate-800" dir="ltr">
                        {currency}{assets.filter(a => a.type === AssetType.GOLD).reduce((acc, c) => acc + c.value, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                    <Building className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{t.assets.realEstate}</p>
                    <p className="text-xl font-bold text-slate-800" dir="ltr">
                        {currency}{assets.filter(a => a.type === AssetType.REAL_ESTATE).reduce((acc, c) => acc + c.value, 0).toLocaleString()}
                    </p>
                </div>
            </div>

             <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-lg text-violet-600">
                    <PieChartIcon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{t.assets.investmentFund}</p>
                    <p className="text-xl font-bold text-slate-800" dir="ltr">
                        {currency}{assets.filter(a => a.type === AssetType.INVESTMENT_FUND).reduce((acc, c) => acc + c.value, 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
        
        {/* Assets Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t.assets.assetsDistribution}</h3>
            <div className="h-64" dir="ltr">
                {assetDistribution.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={assetDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {assetDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, '']} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '11px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        {t.assets.noAssets}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
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
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
            >
                <option value="All">All Types</option>
                {Object.values(AssetType).map(type => (
                    <option key={type} value={type}>{getTypeTranslation(type)}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredAssets.length === 0 ? (
           <div className="text-center py-12 text-slate-400">
             <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>{t.assets.noAssets}</p>
           </div>
        ) : (
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4 text-start">{t.assets.assetName}</th>
                <th className="px-6 py-4 text-start">{t.assets.type}</th>
                <th className="px-6 py-4 text-start">{t.assets.acquisitionDate}</th>
                <th className="px-6 py-4 text-start">{t.common.description}</th>
                <th className="px-6 py-4 text-end">{t.assets.value}</th>
                <th className="px-6 py-4 text-end">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        {getAssetIcon(asset.type)}
                        <div>
                            <p>{asset.name}</p>
                            {asset.type === AssetType.STOCKS && asset.stockSymbol && (
                                <p className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1 rounded">{asset.stockSymbol}</p>
                            )}
                            {asset.type === AssetType.GOLD && asset.goldKarat && (
                                <p className="text-xs text-yellow-600 font-medium bg-yellow-50 inline-block px-1 rounded border border-yellow-100">{asset.goldKarat}</p>
                            )}
                        </div>
                      </div>
                  </td>
                  <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">
                          {getTypeTranslation(asset.type)}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{asset.acquisitionDate}</td>
                  <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{asset.description}</td>
                  <td className="px-6 py-4 text-end font-bold text-slate-800" dir="ltr">
                      {currency}{asset.value.toLocaleString()}
                      {asset.type === AssetType.STOCKS && asset.numberOfShares && (
                          <div className="text-xs text-slate-500 font-normal">
                              {asset.numberOfShares} shares
                          </div>
                      )}
                      {asset.type === AssetType.GOLD && asset.goldWeight && (
                          <div className="text-xs text-slate-500 font-normal">
                              {asset.goldWeight}g @ {asset.goldPricePerGram}
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4 text-end">
                     <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(asset)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteAsset(asset.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{editingId ? t.common.edit : t.assets.addAsset}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.type}</label>
                        <select className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AssetType})}
                        >
                            <option value={AssetType.BANK_BALANCE}>{t.assets.bankBalance}</option>
                            <option value={AssetType.REAL_ESTATE}>{t.assets.realEstate}</option>
                            <option value={AssetType.STOCKS}>{t.assets.stocks}</option>
                            <option value={AssetType.GOLD}>{t.assets.gold}</option>
                            <option value={AssetType.INVESTMENT_FUND}>{t.assets.investmentFund}</option>
                            <option value={AssetType.VEHICLE}>{t.assets.vehicle}</option>
                            <option value={AssetType.EQUIPMENT}>{t.assets.equipment}</option>
                            <option value={AssetType.OTHER}>{t.assets.other}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {formData.type === AssetType.STOCKS ? t.assets.companyName : t.assets.assetName}
                        </label>
                        <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>

                    {/* Stock Specific Fields */}
                    {formData.type === AssetType.STOCKS && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.stockSymbol}</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase" 
                                    placeholder="e.g. AAPL, TSLA"
                                    value={formData.stockSymbol} onChange={e => setFormData({...formData, stockSymbol: e.target.value.toUpperCase()})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.numberOfShares}</label>
                                    <input type="number" min="0" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={formData.numberOfShares} onChange={e => setFormData({...formData, numberOfShares: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.costPerShare}</label>
                                    <input type="number" step="0.01" min="0" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={formData.costPerShare} onChange={e => setFormData({...formData, costPerShare: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Gold Specific Fields */}
                    {formData.type === AssetType.GOLD && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.karat}</label>
                                <input type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    placeholder="e.g. 24K, 21K"
                                    value={formData.goldKarat} onChange={e => setFormData({...formData, goldKarat: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.weightInGrams}</label>
                                    <input type="number" min="0" step="0.01" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={formData.goldWeight} onChange={e => setFormData({...formData, goldWeight: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.pricePerGram}</label>
                                    <input type="number" step="0.01" min="0" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={formData.goldPricePerGram} onChange={e => setFormData({...formData, goldPricePerGram: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.value} ({currency})</label>
                            <input 
                                required 
                                type="number" 
                                step="0.01" 
                                className={`w-full rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-indigo-500 outline-none ${(formData.type === AssetType.STOCKS || formData.type === AssetType.GOLD) ? 'bg-slate-100 text-slate-600' : ''}`} 
                                value={formData.value} 
                                readOnly={formData.type === AssetType.STOCKS || formData.type === AssetType.GOLD}
                                onChange={e => setFormData({...formData, value: e.target.value})} 
                            />
                            {(formData.type === AssetType.STOCKS || formData.type === AssetType.GOLD) && <p className="text-xs text-slate-500 mt-1">Auto-calculated</p>}
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">{t.assets.acquisitionDate}</label>
                             <input required type="date" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.acquisitionDate} onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} />
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.description}</label>
                         <textarea className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                                rows={2}
                                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg mt-4 shadow-sm">
                        {t.common.save}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AssetsModule;