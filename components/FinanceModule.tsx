

import React, { useState, useRef, useMemo } from 'react';
import { Transaction, TransactionType, TransactionStatus, Project, Asset, AssetType, Liability } from '../types';
import { ArrowUpRight, ArrowDownLeft, FileText, CheckCircle, Clock, Trash2, X, Download, Upload, Briefcase, Edit2, PieChart as PieIcon, BarChart3, TrendingUp, Building, Landmark, Wallet, Activity, ArrowRight, Percent, Calendar, FileDown, ShieldAlert, CreditCard, Filter, AlertTriangle, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, AreaChart, Area } from 'recharts';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportLiabilitiesToPDF, exportTransactionsToPDF, exportFinancialReportToPDF } from '../services/pdfService';
import { translations } from '../utils/translations';

interface FinanceProps {
  transactions: Transaction[];
  projects: Project[];
  assets: Asset[];
  liabilities?: Liability[];
  onAdd: (tx: Transaction) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onImport: (data: Transaction[]) => void;
  onAddLiability?: (liability: Liability) => void;
  onRepayLiability?: (id: string, source: 'Profit' | 'External', isOnTime: boolean) => void;
  onDeleteLiability?: (id: string) => void;
  onImportLiabilities?: (data: Liability[]) => void;
  language: 'en' | 'ar';
  currency: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const FinanceModule: React.FC<FinanceProps> = ({ transactions, projects, assets, liabilities = [], onAdd, onUpdate, onDelete, onToggleStatus, onImport, onAddLiability, onRepayLiability, onDeleteLiability, onImportLiabilities, language, currency }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'transactions' | 'budget' | 'liabilities'>('transactions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  
  // Repayment State
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);
  const [repaySource, setRepaySource] = useState<'Profit' | 'External'>('Profit');
  const [repayIsOnTime, setRepayIsOnTime] = useState(true);

  // Edit Transaction State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Reporting State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Liability Filter State
  const [liabilityFilter, setLiabilityFilter] = useState<'All' | 'Pending' | 'Paid'>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const liabilityFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: TransactionType.EXPENSE,
    category: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [liabilityForm, setLiabilityForm] = useState({
      creditorName: '',
      amount: '',
      dueDate: '',
      description: ''
  });

  // --- Handlers ---

  const handleEditClick = (tx: Transaction) => {
    // Convert date format if needed (e.g. from "Jan 1, 2024" back to "2024-01-01" for input)
    let inputDate = '';
    const dateObj = new Date(tx.date);
    if (!isNaN(dateObj.getTime())) {
        inputDate = dateObj.toISOString().split('T')[0];
    }

    setFormData({
        description: tx.description,
        amount: tx.amount.toString(),
        type: tx.type,
        category: tx.category,
        projectId: tx.projectId || '',
        date: inputDate
    });
    setEditingId(tx.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format date for display (e.g., "Jan 1, 2024")
    const dateObj = new Date(formData.date);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const selectedProject = projects.find(p => p.id === formData.projectId);

    const txData: Transaction = {
      id: editingId || Date.now().toString(),
      date: displayDate,
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      status: TransactionStatus.COMPLETED, // Default to completed for manual entry
      projectId: formData.projectId || undefined,
      projectName: selectedProject ? selectedProject.name : undefined
    };

    if (editingId) {
        onUpdate(txData);
    } else {
        onAdd(txData);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', type: TransactionType.EXPENSE, category: '', projectId: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleLiabilitySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddLiability) return;

      const newLiability: Liability = {
          id: Date.now().toString(),
          creditorName: liabilityForm.creditorName,
          amount: parseFloat(liabilityForm.amount) || 0,
          dueDate: liabilityForm.dueDate,
          description: liabilityForm.description,
          status: 'Pending',
          incurredDate: new Date().toISOString().split('T')[0]
      };

      onAddLiability(newLiability);
      setIsLiabilityModalOpen(false);
      setLiabilityForm({ creditorName: '', amount: '', dueDate: '', description: '' });
  };

  const openRepayModal = (id: string) => {
      setSelectedLiabilityId(id);
      setIsRepayModalOpen(true);
  };

  const confirmRepayment = () => {
      if (selectedLiabilityId && onRepayLiability) {
          onRepayLiability(selectedLiabilityId, repaySource, repayIsOnTime);
          setIsRepayModalOpen(false);
          setSelectedLiabilityId(null);
      }
  };

  const handleExport = () => {
      exportToExcel(transactions, 'Financial_Transactions');
  };

  const handleExportPDF = () => {
      exportTransactionsToPDF(transactions, currency);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const data = await importFromExcel(file);
              onImport(data as Transaction[]);
          } catch (error) {
              alert('Error importing file.');
          }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Liability Import/Export ---
  const handleExportLiabilities = () => {
      exportToExcel(liabilities, 'Liabilities_List');
  };
  const handleExportLiabilitiesPDF = () => {
      exportLiabilitiesToPDF(liabilities, currency);
  };
  const handleImportLiabilitiesClick = () => {
      liabilityFileInputRef.current?.click();
  };
  const handleLiabilityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImportLiabilities) {
          try {
              const data = await importFromExcel(file);
              onImportLiabilities(data as Liability[]);
          } catch (error) {
              alert('Error importing liabilities.');
          }
      }
      if (liabilityFileInputRef.current) liabilityFileInputRef.current.value = '';
  };


  // --- Calculations for Reports ---

  const availableYears = useMemo(() => {
      const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
      years.add(new Date().getFullYear());
      return Array.from(years).sort((a, b) => b - a); // Descending
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
     return transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
  }, [transactions, selectedYear]);

  // Filtered List for Transaction View
  const filteredTransactionsList = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (tx.projectName && tx.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'All' || tx.type === filterType;
      const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, filterType, filterCategory]);

  const uniqueCategories = useMemo(() => Array.from(new Set(transactions.map(tx => tx.category).filter(Boolean))), [transactions]);

  // Consolidated Financial Position
  const totalAssets = assets.filter(a => a.type !== AssetType.BANK_BALANCE && a.type !== AssetType.STOCKS).reduce((acc: number, a) => acc + a.value, 0);
  const bankCash = assets.filter(a => a.type === AssetType.BANK_BALANCE).reduce((acc: number, a) => acc + a.value, 0);
  const stockInvestments = assets.filter(a => a.type === AssetType.STOCKS || a.type === AssetType.INVESTMENT_FUND).reduce((acc: number, a) => acc + a.value, 0);
  const projectProfits = projects.reduce((acc: number, p) => {
      const pTx = transactions.filter(tx => tx.projectId === p.id);
      const income = pTx.filter(tx => tx.type === TransactionType.INCOME).reduce((sum: number, tx) => sum + tx.amount, 0);
      const expense = pTx.filter(tx => tx.type === TransactionType.EXPENSE).reduce((sum: number, tx) => sum + tx.amount, 0);
      return acc + (income - expense);
  }, 0);
  const netWorth = totalAssets + bankCash + stockInvestments + projectProfits;

  // Quarterly Data Logic
  const quarterlyData = useMemo(() => {
      const quarters = [
          { name: t.finance.q1, income: 0, expense: 0 },
          { name: t.finance.q2, income: 0, expense: 0 },
          { name: t.finance.q3, income: 0, expense: 0 },
          { name: t.finance.q4, income: 0, expense: 0 }
      ];

      filteredTransactions.forEach(tx => {
          const date = new Date(tx.date);
          const month = date.getMonth(); // 0-11
          const qIndex = Math.floor(month / 3);
          
          if (quarters[qIndex]) {
            if (tx.type === TransactionType.INCOME) quarters[qIndex].income += tx.amount;
            else quarters[qIndex].expense += tx.amount;
          }
      });

      return quarters.map(q => ({
          ...q,
          profit: q.income - q.expense,
          margin: q.income > 0 ? ((q.income - q.expense) / q.income * 100).toFixed(1) : '0'
      }));
  }, [filteredTransactions, t]);

  // Monthly Data Logic (Strictly for selected year)
  const monthlyData = useMemo(() => {
      const months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(selectedYear, i, 1);
          return { name: d.toLocaleString('default', { month: 'short' }), index: i, income: 0, expense: 0, profit: 0, cumulativeCash: 0 };
      });

      let runningCash = 0; // Simplified cash flow
      
      // Sort transactions by date first for accurate cumulative calc
      const sortedTx = [...filteredTransactions].sort((a, b) => {
          const tA = new Date(a.date).getTime();
          const tB = new Date(b.date).getTime();
          return tA - tB;
      });

      sortedTx.forEach(tx => {
          const date = new Date(tx.date);
          const monthIndex = date.getMonth();
          
          if (!isNaN(monthIndex) && months[monthIndex]) {
              if (tx.type === TransactionType.INCOME) {
                  months[monthIndex].income += tx.amount;
                  runningCash += tx.amount;
              } else {
                  months[monthIndex].expense += tx.amount;
                  runningCash -= tx.amount;
              }
          }
      });
      
      let cumulative = 0;
      return months.map(m => {
          cumulative += (m.income - m.expense);
          return {
              ...m,
              profit: m.income - m.expense,
              cumulativeCash: cumulative
          };
      });

  }, [filteredTransactions, selectedYear]);

  // Yearly Comparison Data
  const yearlyData = useMemo(() => {
      const yearsMap: Record<number, { name: string, income: number, expense: number }> = {};
      transactions.forEach(tx => {
          const y = new Date(tx.date).getFullYear();
          if (!yearsMap[y]) yearsMap[y] = { name: y.toString(), income: 0, expense: 0 };
          if (tx.type === TransactionType.INCOME) yearsMap[y].income += tx.amount;
          else yearsMap[y].expense += tx.amount;
      });
      return Object.values(yearsMap).sort((a: {name: string}, b: {name: string}) => Number(a.name) - Number(b.name));
  }, [transactions]);

  // Expense Breakdown Logic
  const expenseBreakdown = useMemo(() => {
      const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
      const categories: Record<string, number> = {};
      expenses.forEach(t => {
          const cat = t.category || 'Uncategorized';
          categories[cat] = (categories[cat] || 0) + t.amount;
      });
      return Object.keys(categories).map(cat => ({
          name: cat,
          value: categories[cat]
      })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Financial Health Metrics
  const totalRev = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
  const totalExp = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalRev - totalExp;
  const avgMonthlyBurn = totalExp / 12;
  const avgMonthlyRev = totalRev / 12;
  const profitMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

  // --- Liability Logic ---
  const pendingLiabilities = liabilities.filter(l => l.status === 'Pending');
  const paidLiabilities = liabilities.filter(l => l.status === 'Paid');
  const totalDebt = pendingLiabilities.reduce((acc, l) => acc + l.amount, 0);
  const totalPaidDebt = paidLiabilities.reduce((acc, l) => acc + l.amount, 0);

  // Sorting Liabilities by Due Date
  const filteredLiabilities = liabilities.filter(l => {
      if (liabilityFilter === 'All') return true;
      return l.status === liabilityFilter;
  }).sort((a, b) => {
      const tA = new Date(a.dueDate).getTime();
      const tB = new Date(b.dueDate).getTime();
      return tA - tB;
  });

  // Next Payment Aggregation Logic
  const nextPaymentInfo = useMemo(() => {
      if (pendingLiabilities.length === 0) return { date: '-', amount: 0, count: 0 };
      
      const sortedPending = [...pendingLiabilities].sort((a, b) => {
          const tA = new Date(a.dueDate).getTime();
          const tB = new Date(b.dueDate).getTime();
          return tA - tB;
      });
      const nextDate = sortedPending[0].dueDate;
      
      // Aggregate all liabilities due on this same date
      const dueOnSameDay = sortedPending.filter(l => l.dueDate === nextDate);
      const totalAmount = dueOnSameDay.reduce((acc, l) => acc + l.amount, 0);

      return {
          date: nextDate,
          amount: totalAmount,
          count: dueOnSameDay.length
      };
  }, [pendingLiabilities]);

  const handleExportReport = () => {
      const reportData = quarterlyData.map(q => ({
          Period: q.name,
          Revenue: q.income,
          Expense: q.expense,
          'Net Profit': q.profit,
          'Margin (%)': q.margin
      }));
      // Also add year total
      reportData.push({
          Period: 'Total Year',
          Revenue: totalRev,
          Expense: totalExp,
          'Net Profit': netProfit,
          'Margin (%)': profitMargin.toFixed(1)
      });
      
      exportFinancialReportToPDF(reportData, selectedYear, currency);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{t.finance.title}</h2>
        
        {/* Only show Add/Import buttons in Transaction View */}
        {activeTab === 'transactions' && (
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
                    onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                <CreditCard className="w-4 h-4" /> {t.finance.newTransaction}
                </button>
            </div>
        )}

        {activeTab === 'liabilities' && (
             <div className="flex gap-2">
                 <input 
                    type="file" 
                    ref={liabilityFileInputRef} 
                    onChange={handleLiabilityFileChange} 
                    className="hidden" 
                    accept=".xlsx, .xls, .csv"
                />
                <button onClick={handleImportLiabilitiesClick} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" /> {t.common.import}
                </button>
                <button onClick={handleExportLiabilities} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Download className="w-4 h-4" /> {t.common.export}
                </button>
                <button onClick={handleExportLiabilitiesPDF} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <FileDown className="w-4 h-4" /> PDF
                </button>
                 <button 
                    onClick={() => setIsLiabilityModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                <ShieldAlert className="w-4 h-4" /> {t.finance.addLiability}
                </button>
             </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('transactions')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <FileText className="w-4 h-4" /> {t.finance.transactions}
        </button>
        <button 
            onClick={() => setActiveTab('budget')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'budget' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <PieIcon className="w-4 h-4" /> {t.finance.budgetOverview}
        </button>
        <button 
            onClick={() => setActiveTab('liabilities')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'liabilities' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <ShieldAlert className="w-4 h-4" /> {t.finance.liabilities}
        </button>
      </div>

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                    <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">{t.finance.income}</p>
                    <p className="text-2xl font-bold text-slate-800" dir="ltr">
                        {currency}{transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </p>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                    <ArrowDownLeft className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">{t.finance.expense}</p>
                    <p className="text-2xl font-bold text-slate-800" dir="ltr">
                        {currency}{transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </p>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">{t.common.status}</p>
                    <p className="text-2xl font-bold text-slate-800">{transactions.length} Records</p>
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
                        <option value={TransactionType.INCOME}>{t.finance.income}</option>
                        <option value={TransactionType.EXPENSE}>{t.finance.expense}</option>
                    </select>
                    <select 
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredTransactionsList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <p>{t.finance.noTransactions}</p>
                </div>
                ) : (
                <table className="w-full text-sm text-start">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-4 text-start">{t.common.date}</th>
                        <th className="px-6 py-4 text-start">{t.common.description}</th>
                        <th className="px-6 py-4 text-start">{t.finance.category}</th>
                        <th className="px-6 py-4 text-start">{t.finance.project}</th>
                        <th className="px-6 py-4 text-end">{t.common.amount}</th>
                        <th className="px-6 py-4 text-center">{t.common.status}</th>
                        <th className="px-6 py-4 text-end">{t.common.actions}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {filteredTransactionsList.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-start">{tx.date}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 text-start">{tx.description}</td>
                        <td className="px-6 py-4 text-slate-600 text-start">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs">{tx.category}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-start">
                            {tx.projectName ? (
                                <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs w-fit">
                                    <Briefcase className="w-3 h-3" /> {tx.projectName}
                                </span>
                            ) : '-'}
                        </td>
                        <td className={`px-6 py-4 text-end font-bold ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                            {tx.type === TransactionType.INCOME ? '+' : '-'}{currency}{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button 
                            onClick={() => onToggleStatus(tx.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 mx-auto ${
                                tx.status === TransactionStatus.COMPLETED 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}
                            >
                            {tx.status === TransactionStatus.COMPLETED ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {tx.status === TransactionStatus.COMPLETED ? t.finance.paid : t.finance.pending}
                            </button>
                        </td>
                        <td className="px-6 py-4 text-end">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditClick(tx)} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDelete(tx.id)} className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded">
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
        </>
      )}

      {/* BUDGET TAB */}
      {activeTab === 'budget' && (
          <div className="space-y-6">
              {/* Year Filter */}
              <div className="flex justify-end">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                      >
                          {availableYears.map(y => (
                              <option key={y} value={y}>{y}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Financial Position (Balance Sheet Summary) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    {t.finance.consolidatedPosition}
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                         <p className="text-xs text-slate-500 font-medium uppercase">{t.finance.totalAssets}</p>
                         <p className="text-xl font-bold text-slate-800 mt-1" dir="ltr">{currency}{totalAssets.toLocaleString()}</p>
                         <Building className="w-8 h-8 text-slate-200 absolute top-4 right-4" />
                     </div>
                     <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                         <p className="text-xs text-emerald-600 font-medium uppercase">{t.finance.bankAndCash}</p>
                         <p className="text-xl font-bold text-emerald-800 mt-1" dir="ltr">{currency}{bankCash.toLocaleString()}</p>
                     </div>
                     <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                         <p className="text-xs text-blue-600 font-medium uppercase">{t.finance.stocksAndInvestments}</p>
                         <p className="text-xl font-bold text-blue-800 mt-1" dir="ltr">{currency}{stockInvestments.toLocaleString()}</p>
                     </div>
                     <div className="p-4 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                         <div className="relative z-10">
                            <p className="text-xs text-indigo-200 font-medium uppercase">{t.finance.netWorth}</p>
                            <p className="text-2xl font-bold mt-1" dir="ltr">{currency}{netWorth.toLocaleString()}</p>
                         </div>
                         <Wallet className="w-16 h-16 text-indigo-500 absolute -bottom-4 -right-4 opacity-50" />
                     </div>
                 </div>
              </div>

              {/* Health Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{t.finance.burnRate}</p>
                      <p className="text-lg font-bold text-rose-600" dir="ltr">{currency}{avgMonthlyBurn.toFixed(0)}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{t.finance.avgRevenue}</p>
                      <p className="text-lg font-bold text-emerald-600" dir="ltr">{currency}{avgMonthlyRev.toFixed(0)}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{t.finance.profitMargin}</p>
                      <p className={`text-lg font-bold ${profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`} dir="ltr">{profitMargin.toFixed(1)}%</p>
                  </div>
                   <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{t.finance.netProfit} ({selectedYear})</p>
                      <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`} dir="ltr">{currency}{netProfit.toLocaleString()}</p>
                  </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Trend */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">{t.finance.monthlyPerformance} ({selectedYear})</h3>
                      <div className="h-80 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                <YAxis yAxisId="left" fontSize={12} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#82ca9d" />
                                <Tooltip 
                                    formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, '']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="income" name={t.finance.income} fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar yAxisId="left" dataKey="expense" name={t.finance.expense} fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                                <Line yAxisId="right" type="monotone" dataKey="profit" name={t.finance.netProfit} stroke="#10b981" strokeWidth={2} dot={{r: 4}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                   {/* Yearly Trend */}
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">{t.finance.yearlyPerformance}</h3>
                      <div className="h-80 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" />
                                <Tooltip 
                                    formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, '']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="income" name={t.finance.income} fill="#818cf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name={t.finance.expense} fill="#fb7185" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>

               {/* Charts Row 2 */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Expense Breakdown */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">{t.finance.monthlyExpenseBreakdown}</h3>
                      <div className="h-64 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={expenseBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" fontSize={12} stroke="#94a3b8" />
                                <YAxis dataKey="name" type="category" fontSize={12} stroke="#94a3b8" width={100} />
                                <Tooltip 
                                    cursor={{fill: '#f1f5f9'}}
                                    formatter={(value: any) => [`${currency} ${value.toLocaleString()}`, '']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Cash Flow */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">{t.finance.cashFlowTrend}</h3>
                       <div className="h-64 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                <YAxis fontSize={12} stroke="#94a3b8" />
                                <Tooltip 
                                    formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, '']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="cumulativeCash" stroke="#059669" fillOpacity={1} fill="url(#colorCash)" />
                            </AreaChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* Quarterly Report Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        {t.finance.quarterlyReport} ({selectedYear})
                      </h3>
                      <button onClick={handleExportReport} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                          <FileDown className="w-4 h-4" /> PDF Report
                      </button>
                  </div>
                  <table className="w-full text-sm text-start">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-start">{t.finance.quarter}</th>
                            <th className="px-6 py-4 text-end">{t.finance.revenue}</th>
                            <th className="px-6 py-4 text-end">{t.finance.expense}</th>
                            <th className="px-6 py-4 text-end">{t.finance.netProfit}</th>
                            <th className="px-6 py-4 text-end">{t.finance.profitMargin}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {quarterlyData.map((q, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-700">{q.name}</td>
                                <td className="px-6 py-4 text-end text-emerald-600 font-medium" dir="ltr">{currency}{q.income.toLocaleString()}</td>
                                <td className="px-6 py-4 text-end text-rose-600 font-medium" dir="ltr">{currency}{q.expense.toLocaleString()}</td>
                                <td className={`px-6 py-4 text-end font-bold ${q.profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`} dir="ltr">{currency}{q.profit.toLocaleString()}</td>
                                <td className="px-6 py-4 text-end text-slate-600" dir="ltr">{q.margin}%</td>
                            </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-slate-50 font-bold">
                            <td className="px-6 py-4 text-slate-800">{t.finance.yearTotal}</td>
                            <td className="px-6 py-4 text-end text-emerald-700" dir="ltr">{currency}{totalRev.toLocaleString()}</td>
                            <td className="px-6 py-4 text-end text-rose-700" dir="ltr">{currency}{totalExp.toLocaleString()}</td>
                            <td className={`px-6 py-4 text-end ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`} dir="ltr">{currency}{netProfit.toLocaleString()}</td>
                            <td className="px-6 py-4 text-end text-slate-800" dir="ltr">{profitMargin.toFixed(1)}%</td>
                        </tr>
                    </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* LIABILITIES TAB */}
      {activeTab === 'liabilities' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl">
                      <p className="text-sm font-medium text-rose-700 mb-2">{t.finance.outstandingDebt}</p>
                      <p className="text-3xl font-bold text-rose-900" dir="ltr">{currency}{totalDebt.toLocaleString()}</p>
                  </div>
                   <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                      <p className="text-sm font-medium text-emerald-700 mb-2">{t.finance.totalPaidDebt}</p>
                      <p className="text-3xl font-bold text-emerald-900" dir="ltr">{currency}{totalPaidDebt.toLocaleString()}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                      <p className="text-sm font-medium text-slate-500 mb-2">{t.finance.nextPayment}</p>
                      <div className="flex justify-between items-end">
                          <div>
                            <p className="text-2xl font-bold text-slate-800" dir="ltr">{currency}{nextPaymentInfo.amount.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 mt-1">{nextPaymentInfo.date !== '-' ? new Date(nextPaymentInfo.date).toDateString() : '-'}</p>
                          </div>
                          {nextPaymentInfo.count > 1 && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                  {nextPaymentInfo.count} bills
                              </span>
                          )}
                      </div>
                  </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                  <button onClick={() => setLiabilityFilter('All')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${liabilityFilter === 'All' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {t.finance.allLiabilities}
                  </button>
                  <button onClick={() => setLiabilityFilter('Pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${liabilityFilter === 'Pending' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {t.finance.pending}
                  </button>
                  <button onClick={() => setLiabilityFilter('Paid')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${liabilityFilter === 'Paid' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {t.finance.paid}
                  </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  {filteredLiabilities.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>{t.finance.noLiabilities}</p>
                      </div>
                  ) : (
                      <table className="w-full text-sm text-start">
                          <thead className="bg-slate-50 text-slate-500 font-medium">
                              <tr>
                                  <th className="px-6 py-4 text-start">{t.finance.creditor}</th>
                                  <th className="px-6 py-4 text-start">{t.common.description}</th>
                                  <th className="px-6 py-4 text-start">{t.finance.dueDate}</th>
                                  <th className="px-6 py-4 text-end">{t.common.amount}</th>
                                  <th className="px-6 py-4 text-center">{t.common.status}</th>
                                  <th className="px-6 py-4 text-end">{t.common.actions}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredLiabilities.map(debt => {
                                  const isOverdue = debt.status === 'Pending' && new Date(debt.dueDate).getTime() < new Date().getTime();
                                  const isDueSoon = debt.status === 'Pending' && !isOverdue && new Date(debt.dueDate).getTime() <= (Date.now() + 7 * 24 * 60 * 60 * 1000);

                                  return (
                                    <tr key={debt.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                                        <td className="px-6 py-4 font-medium text-slate-800">{debt.creditorName}</td>
                                        <td className="px-6 py-4 text-slate-600">{debt.description}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {debt.dueDate}
                                            {isOverdue && <span className="ms-2 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{t.finance.overdue}</span>}
                                            {isDueSoon && <span className="ms-2 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{t.finance.dueSoon}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-end font-bold text-slate-800" dir="ltr">{currency}{debt.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${debt.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {debt.status === 'Paid' ? t.finance.paid : t.finance.pending}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-end">
                                            <div className="flex justify-end gap-2">
                                                {debt.status === 'Pending' && (
                                                    <button onClick={() => openRepayModal(debt.id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50">
                                                        {t.finance.repay}
                                                    </button>
                                                )}
                                                {onDeleteLiability && (
                                                    <button onClick={() => onDeleteLiability(debt.id)} className="text-slate-400 hover:text-rose-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{editingId ? t.finance.editTransaction : t.finance.newTransaction}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.description}</label>
                        <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.amount} ({currency})</label>
                            <input required type="number" step="0.01" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.date}</label>
                            <input required type="date" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <select className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}
                            >
                                <option value={TransactionType.INCOME}>{t.finance.income}</option>
                                <option value={TransactionType.EXPENSE}>{t.finance.expense}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.finance.category}</label>
                            <input type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                list="categories"
                                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                            <datalist id="categories">
                                <option value="Sales" />
                                <option value="Salary" />
                                <option value="Inventory" />
                                <option value="Rent" />
                                <option value="Utilities" />
                                <option value="Marketing" />
                            </datalist>
                        </div>
                    </div>
                    
                    {/* Project Link Selection */}
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">{t.finance.project} (Optional)</label>
                         <select 
                            className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.projectId} 
                            onChange={e => setFormData({...formData, projectId: e.target.value})}
                         >
                             <option value="">-- No Project --</option>
                             {projects.filter(p => p.status !== 'Completed').map(p => (
                                 <option key={p.id} value={p.id}>{p.name}</option>
                             ))}
                         </select>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg mt-4">{t.common.save}</button>
                </form>
            </div>
        </div>
      )}

      {/* Liability Add Modal */}
      {isLiabilityModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{t.finance.addLiability}</h3>
                    <button onClick={() => setIsLiabilityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleLiabilitySubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.finance.creditor}</label>
                        <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={liabilityForm.creditorName} onChange={e => setLiabilityForm({...liabilityForm, creditorName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.amount} ({currency})</label>
                            <input required type="number" step="0.01" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={liabilityForm.amount} onChange={e => setLiabilityForm({...liabilityForm, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.finance.dueDate}</label>
                            <input required type="date" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={liabilityForm.dueDate} onChange={e => setLiabilityForm({...liabilityForm, dueDate: e.target.value})} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.description}</label>
                        <textarea className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                            rows={2}
                            value={liabilityForm.description} onChange={e => setLiabilityForm({...liabilityForm, description: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 rounded-lg mt-4">{t.common.save}</button>
                </form>
             </div>
        </div>
      )}

      {/* Repayment Modal */}
      {isRepayModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800">{t.finance.repayModalTitle}</h3>
                  </div>
                  <div className="p-6 space-y-6">
                      <p className="text-sm text-slate-600">{t.finance.repayConfirm}</p>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t.finance.paymentSource}</label>
                          <div className="space-y-2">
                              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                  <input type="radio" name="source" value="Profit" checked={repaySource === 'Profit'} onChange={() => setRepaySource('Profit')} className="text-indigo-600" />
                                  <span className="text-sm">{t.finance.fromProfits}</span>
                              </label>
                              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                  <input type="radio" name="source" value="External" checked={repaySource === 'External'} onChange={() => setRepaySource('External')} className="text-indigo-600" />
                                  <span className="text-sm">{t.finance.externalTransfer}</span>
                              </label>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t.finance.paymentTiming}</label>
                          <label className="flex items-center gap-2">
                                <input type="checkbox" checked={repayIsOnTime} onChange={(e) => setRepayIsOnTime(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm text-slate-700">{t.finance.wasPaidOnTime}</span>
                          </label>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setIsRepayModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium">
                              {t.common.cancel}
                          </button>
                          <button onClick={confirmRepayment} className="flex-1 px-4 py-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-700 text-sm font-medium">
                              {t.common.confirm}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default FinanceModule;