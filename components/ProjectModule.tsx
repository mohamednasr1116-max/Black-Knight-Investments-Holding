import React, { useState, useRef, useMemo } from 'react';
import { Project, Transaction, TransactionType, TransactionStatus, TimeLog, User, ProjectRisk } from '../types';
import { Briefcase, Calendar, CheckCircle, Plus, Trash2, X, Download, Upload, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Clock, Edit2, Save, Percent, BarChart3, PieChart as PieIcon, FileDown, ShieldAlert, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area } from 'recharts';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportProjectsToPDF } from '../services/pdfService';
import { translations } from '../utils/translations';

interface ProjectProps {
  projects: Project[];
  financials: Transaction[]; // Global financials
  onAdd: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: Project['status']) => void;
  onImport: (data: Project[]) => void;
  onAddTransaction: (tx: Transaction) => void; // Global handler
  onDeleteTransaction: (txId: string) => void; // Global handler
  currentUser: User | null;
  onAddTimeLog: (projectId: string, log: TimeLog) => void;
  onDeleteTimeLog: (projectId: string, logId: string) => void;
  onAddRisk: (projectId: string, risk: ProjectRisk) => void;
  onDeleteRisk: (projectId: string, riskId: string) => void;
  language: 'en' | 'ar';
  currency: string;
}

const ProjectModule: React.FC<ProjectProps> = ({ projects, financials, onAdd, onUpdateProject, onDelete, onUpdateStatus, onImport, onAddTransaction, onDeleteTransaction, currentUser, onAddTimeLog, onDeleteTimeLog, onAddRisk, onDeleteRisk, language, currency }) => {
  const t = translations[language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'time' | 'risks'>('overview');
  const [financeSubTab, setFinanceSubTab] = useState<'summary' | 'income' | 'expense'>('summary');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Edit Mode State for Overview Tab
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Project Form
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    budget: '',
    deadline: '',
    status: 'Planning'
  });

  // New Transaction Form
  const [txFormData, setTxFormData] = useState({
      description: '',
      amount: '',
      type: TransactionType.INCOME
  });

  // New Time Log Form
  const [timeFormData, setTimeFormData] = useState({
    description: '',
    hours: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Risk Form State
  const [riskFormData, setRiskFormData] = useState({
      description: '',
      probability: 'Low',
      impact: 'Low',
      mitigationStrategy: '',
      status: 'Open'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: Date.now().toString(),
      name: formData.name,
      client: formData.client,
      status: formData.status as any,
      startDate: new Date().toISOString().split('T')[0], // Use YYYY-MM-DD for consistency
      deadline: formData.deadline,
      budget: parseFloat(formData.budget) || 0,
      progress: formData.status === 'Completed' ? 100 : formData.status === 'Planning' ? 0 : 35,
      timeLogs: [],
      risks: []
    };
    onAdd(newProject);
    setIsModalOpen(false);
    setFormData({ name: '', client: '', budget: '', deadline: '', status: 'Planning' });
  };

  const handleTxSubmit = (e: React.FormEvent, typeOverride?: TransactionType) => {
      e.preventDefault();
      if (!activeProject) return;

      const type = typeOverride || txFormData.type;

      const newTx: Transaction = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          description: txFormData.description,
          amount: parseFloat(txFormData.amount) || 0,
          type: type,
          category: 'Project',
          status: TransactionStatus.COMPLETED,
          projectId: activeProject.id, // Link to project
          projectName: activeProject.name
      };
      
      onAddTransaction(newTx);
      setTxFormData({ description: '', amount: '', type: TransactionType.INCOME });
  };

  const handleTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !currentUser) return;

    const newLog: TimeLog = {
      id: Date.now().toString(),
      projectId: activeProject.id,
      date: timeFormData.date,
      hours: parseFloat(timeFormData.hours) || 0,
      description: timeFormData.description,
      loggedBy: currentUser.name
    };

    onAddTimeLog(activeProject.id, newLog);
    // Optimistically update the active project state to reflect changes immediately in the modal
    setActiveProject(prev => prev ? ({
      ...prev,
      timeLogs: [...(prev.timeLogs || []), newLog]
    }) : null);
    
    setTimeFormData({ description: '', hours: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleRiskSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeProject) return;

      const newRisk: ProjectRisk = {
          id: Date.now().toString(),
          description: riskFormData.description,
          probability: riskFormData.probability as any,
          impact: riskFormData.impact as any,
          mitigationStrategy: riskFormData.mitigationStrategy,
          status: riskFormData.status as any
      };

      onAddRisk(activeProject.id, newRisk);
      // Optimistically update local state
      setActiveProject(prev => prev ? ({
          ...prev,
          risks: [...(prev.risks || []), newRisk]
      }) : null);

      setRiskFormData({ description: '', probability: 'Low', impact: 'Low', mitigationStrategy: '', status: 'Open' });
  };

  const handleDeleteRiskLocal = (riskId: string) => {
      if (!activeProject) return;
      onDeleteRisk(activeProject.id, riskId);
       // Optimistically update local state
       setActiveProject(prev => prev ? ({
        ...prev,
        risks: (prev.risks || []).filter(r => r.id !== riskId)
      }) : null);
  };

  const handleDeleteTimeLogLocal = (logId: string) => {
     if (!activeProject) return;
     onDeleteTimeLog(activeProject.id, logId);
     // Optimistically update local state
     setActiveProject(prev => prev ? ({
       ...prev,
       timeLogs: (prev.timeLogs || []).filter(l => l.id !== logId)
     }) : null);
  };

  const handleDeleteTx = (txId: string) => {
      onDeleteTransaction(txId);
  };

  const handleExport = () => {
      exportToExcel(projects, 'Project_List');
  };

  const handleExportPDF = () => {
      exportProjectsToPDF(projects, currency);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Review': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTranslatedStatus = (status: string) => {
      switch(status) {
          case 'Planning': return t.projects.planning;
          case 'In Progress': return t.projects.inProgress;
          case 'Review': return t.projects.review;
          case 'Completed': return t.projects.completed;
          default: return status;
      }
  };

  const getRiskLevelColor = (level: string) => {
      switch (level) {
          case 'High': return 'text-red-600 bg-red-50 border-red-200';
          case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
          case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
          default: return 'text-slate-600 bg-slate-50';
      }
  };

  const openProjectDetails = (project: Project) => {
      setActiveProject(project);
      setActiveTab('overview');
      setFinanceSubTab('summary');
      setIsEditingDetails(false);
  };

  const closeProjectDetails = () => {
      setActiveProject(null);
      setIsEditingDetails(false);
  };

  const startEditing = () => {
      if (activeProject) {
        const toInputDate = (dateStr: string) => {
            if (!dateStr) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
            return '';
        };

        setEditFormData({
            ...activeProject,
            startDate: toInputDate(activeProject.startDate),
            deadline: toInputDate(activeProject.deadline)
        } as Project);
        setIsEditingDetails(true);
      }
  };

  const saveProjectDetails = () => {
      if (activeProject && editFormData) {
          const updatedProject = { ...activeProject, ...editFormData } as Project;
          onUpdateProject(updatedProject);
          setActiveProject(updatedProject);
          setIsEditingDetails(false);
      }
  };

  const getProjectTransactions = () => {
      if (!activeProject) return [];
      return financials.filter(t => t.projectId === activeProject.id);
  };

  // Calculate metrics for all projects for the main dashboard chart
  const projectMetrics = useMemo(() => {
      return projects.map(p => {
          const pTx = financials.filter(t => t.projectId === p.id);
          const income = pTx.filter(t => t.type === TransactionType.INCOME).reduce((acc, c) => acc + c.amount, 0);
          const expense = pTx.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, c) => acc + c.amount, 0);
          const net = income - expense;
          const margin = income > 0 ? (net / income) * 100 : 0;
          return {
              name: p.name,
              margin: parseFloat(margin.toFixed(1)),
              income,
              expense
          };
      });
  }, [projects, financials]);

  // Filtering Logic
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, filterStatus]);


  const renderTransactionList = (transactions: Transaction[], showDelete: boolean = true) => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h4 className="font-bold text-slate-800">{t.finance.recentTransactions}</h4>
            <span className="text-xs text-slate-500">{transactions.length} Records</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
            {transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">{t.finance.noTransactions}</div>
            ) : (
                <table className="w-full text-sm text-start">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-start">{t.common.date}</th>
                            <th className="px-4 py-2 text-start">{t.common.description}</th>
                            <th className="px-4 py-2 text-end">{t.common.amount}</th>
                            {showDelete && <th className="px-4 py-2"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-500 text-start">{tx.date}</td>
                                <td className="px-4 py-3 text-slate-800 text-start">{tx.description}</td>
                                <td className={`px-4 py-3 text-end font-medium ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                                    {tx.type === TransactionType.INCOME ? '+' : '-'}{currency}{tx.amount.toLocaleString()}
                                </td>
                                {showDelete && (
                                    <td className="px-4 py-3 text-end">
                                        <button onClick={() => handleDeleteTx(tx.id)} className="text-slate-300 hover:text-rose-500">
                                            <Trash2 className="w-3 h-3"/>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{t.projects.title}</h2>
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
            <Plus className="w-4 h-4" /> {t.projects.newProject}
            </button>
        </div>
      </div>
      
      {/* Main Dashboard Chart: Comparative Profit Margins */}
      {projectMetrics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                {t.projects.projectProfitMargins}
            </h3>
            <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{fill: '#64748b'}} />
                        <YAxis stroke="#94a3b8" fontSize={12} tick={{fill: '#64748b'}} unit="%" />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`${value}%`, t.projects.profitMargin]}
                        />
                        <ReferenceLine y={0} stroke="#cbd5e1" />
                        <Bar dataKey="margin" radius={[4, 4, 0, 0]} barSize={40}>
                            {projectMetrics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.margin >= 0 ? '#10b981' : '#f43f5e'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="All">All Status</option>
                <option value="Planning">{t.projects.planning}</option>
                <option value="In Progress">{t.projects.inProgress}</option>
                <option value="Review">{t.projects.review}</option>
                <option value="Completed">{t.projects.completed}</option>
            </select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projTransactions = financials.filter(t => t.projectId === project.id);
            const totalIncome = projTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
            const totalSpent = projTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
            const netProfit = totalIncome - totalSpent;
            const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';
            
            return (
            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg hover:text-indigo-600 cursor-pointer" onClick={() => openProjectDetails(project)}>{project.name}</h3>
                  <p className="text-sm text-slate-500">{project.client}</p>
                </div>
                <div className="flex gap-2">
                   <select 
                      className={`text-xs font-medium px-2 py-1 rounded-full border outline-none cursor-pointer ${getStatusColor(project.status)}`}
                      value={project.status}
                      onChange={(e) => onUpdateStatus(project.id, e.target.value as any)}
                   >
                      <option value="Planning">{t.projects.planning}</option>
                      <option value="In Progress">{t.projects.inProgress}</option>
                      <option value="Review">{t.projects.review}</option>
                      <option value="Completed">{t.projects.completed}</option>
                   </select>
                   <button 
                      onClick={() => onDelete(project.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>{t.projects.deadline}</span>
                  </div>
                  <span className="font-medium text-slate-800">{project.deadline || 'No Date'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.projects.budgetUsage}</span>
                  </div>
                  <span className={`font-medium ${totalSpent > project.budget ? 'text-red-600' : 'text-slate-800'}`} dir="ltr">
                    {currency}{totalSpent.toLocaleString()} / {currency}{project.budget.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Percent className="w-4 h-4" />
                    <span>{t.projects.profitMargin}</span>
                  </div>
                  <span className={`font-medium ${parseFloat(profitMargin) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                    {profitMargin}%
                  </span>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{t.projects.progress}</span>
                    <span className="font-medium text-slate-700">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        project.status === 'Completed' ? 'bg-emerald-500' : 
                        project.status === 'Review' ? 'bg-purple-500' :
                        project.status === 'Planning' ? 'bg-slate-300' : 'bg-blue-500'
                      }`} 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <button 
                    onClick={() => openProjectDetails(project)}
                    className="w-full mt-2 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                >
                    {t.projects.viewDetails}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{t.projects.newProject}</h3>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.projects.client}</label>
                <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.projects.budget} ({currency})</label>
                  <input required type="number" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.projects.deadline}</label>
                  <input required type="date" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.status}</label>
                <select className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Planning">{t.projects.planning}</option>
                  <option value="In Progress">{t.projects.inProgress}</option>
                  <option value="Review">{t.projects.review}</option>
                  <option value="Completed">{t.projects.completed}</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg mt-4">{t.common.save}</button>
            </form>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {activeProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div className="w-full me-4">
                 {isEditingDetails ? (
                     <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.stock.productName}</label>
                            <input 
                                type="text" 
                                className="text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={editFormData.name || ''}
                                onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.projects.client}</label>
                                <input 
                                    type="text" 
                                    className="text-sm bg-white border border-slate-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editFormData.client || ''}
                                    onChange={e => setEditFormData({...editFormData, client: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.status}</label>
                                <select 
                                    className="text-sm bg-white border border-slate-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editFormData.status || 'Planning'}
                                    onChange={e => setEditFormData({...editFormData, status: e.target.value as any})}
                                >
                                    <option value="Planning">{t.projects.planning}</option>
                                    <option value="In Progress">{t.projects.inProgress}</option>
                                    <option value="Review">{t.projects.review}</option>
                                    <option value="Completed">{t.projects.completed}</option>
                                </select>
                            </div>
                        </div>
                     </div>
                 ) : (
                    <>
                        <h2 className="text-2xl font-bold text-slate-800">{activeProject.name}</h2>
                        <p className="text-slate-500 flex items-center gap-2 mt-1">
                            <Briefcase className="w-4 h-4" /> 
                            {activeProject.client}
                            <span className="mx-2">•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(activeProject.status)}`}>
                                {getTranslatedStatus(activeProject.status)}
                            </span>
                        </p>
                    </>
                 )}
              </div>
              <button onClick={closeProjectDetails} className="text-slate-400 hover:text-slate-600 p-2 shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-2 font-medium text-sm me-6 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t.projects.overview}
                </button>
                <button 
                    onClick={() => setActiveTab('finance')}
                    className={`py-4 px-2 font-medium text-sm me-6 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t.projects.finances}
                    <span className="bg-slate-100 text-slate-600 px-1.5 rounded-full text-xs">{getProjectTransactions().length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('time')}
                    className={`py-4 px-2 font-medium text-sm me-6 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'time' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t.projects.timeTracking}
                    <span className="bg-slate-100 text-slate-600 px-1.5 rounded-full text-xs">{activeProject.timeLogs?.length || 0}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('risks')}
                    className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'risks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t.projects.risks}
                    <span className="bg-red-100 text-red-600 px-1.5 rounded-full text-xs">{activeProject.risks?.length || 0}</span>
                </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                
                {activeTab === 'overview' && (
                    <div className="space-y-6 relative">
                        <div className="flex justify-end mb-2">
                            {isEditingDetails ? (
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => setIsEditingDetails(false)}
                                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200"
                                    >
                                        {t.common.cancel}
                                    </button>
                                    <button 
                                        onClick={saveProjectDetails}
                                        className="text-xs flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 rounded shadow-sm"
                                    >
                                        <Save className="w-3 h-3" /> {t.common.save}
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={startEditing}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded"
                                >
                                    <Edit2 className="w-3 h-3" /> {t.common.edit}
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.projects.budget}</p>
                                {isEditingDetails ? (
                                    <input 
                                        type="number" 
                                        className="text-2xl font-bold text-slate-800 mt-1 w-full border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={editFormData.budget ?? ''}
                                        onChange={e => setEditFormData({...editFormData, budget: parseFloat(e.target.value) || 0})}
                                    />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-800 mt-1" dir="ltr">{currency}{activeProject.budget.toLocaleString()}</p>
                                )}
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.projects.startDate}</p>
                                {isEditingDetails ? (
                                    // Fix: Use editFormData instead of formData to ensure correct type compatibility
                                    <input 
                                        type="date" 
                                        className="text-lg font-medium text-slate-800 mt-1 w-full border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={editFormData.startDate || ''}
                                        onChange={e => setEditFormData({...editFormData, startDate: e.target.value})}
                                    />
                                ) : (
                                    <p className="text-lg font-medium text-slate-800 mt-1">{activeProject.startDate}</p>
                                )}
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.projects.deadline}</p>
                                {isEditingDetails ? (
                                    <input 
                                        type="date" 
                                        className="text-lg font-medium text-slate-800 mt-1 w-full border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={editFormData.deadline || ''}
                                        onChange={e => setEditFormData({...editFormData, deadline: e.target.value})}
                                    />
                                ) : (
                                    <p className="text-lg font-medium text-slate-800 mt-1">{activeProject.deadline}</p>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-4">{t.projects.progress}</h4>
                            <div className="w-full bg-slate-100 rounded-full h-4 mb-2">
                                <div 
                                className={`h-4 rounded-full transition-all duration-500 ${
                                    activeProject.status === 'Completed' ? 'bg-emerald-500' : 
                                    activeProject.status === 'Review' ? 'bg-purple-500' : 'bg-indigo-500'
                                }`} 
                                style={{ width: `${activeProject.progress}%` }}
                                ></div>
                            </div>
                            <p className="text-end text-sm text-slate-600 font-medium">{activeProject.progress}%</p>
                        </div>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="space-y-6">
                         <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 mb-6 max-w-md rtl:space-x-reverse">
                            <button
                                onClick={() => setFinanceSubTab('summary')}
                                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2 ${
                                financeSubTab === 'summary'
                                    ? 'bg-white shadow text-indigo-700'
                                    : 'text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600'
                                }`}
                            >
                                {t.projects.overview}
                            </button>
                            <button
                                onClick={() => setFinanceSubTab('income')}
                                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2 ${
                                financeSubTab === 'income'
                                    ? 'bg-white shadow text-emerald-700'
                                    : 'text-slate-600 hover:bg-white/[0.12] hover:text-emerald-700'
                                }`}
                            >
                                {t.finance.income}
                            </button>
                            <button
                                onClick={() => setFinanceSubTab('expense')}
                                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2 ${
                                financeSubTab === 'expense'
                                    ? 'bg-white shadow text-rose-700'
                                    : 'text-slate-600 hover:bg-white/[0.12] hover:text-rose-700'
                                }`}
                            >
                                {t.finance.expense}
                            </button>
                        </div>

                        {financeSubTab === 'summary' && (() => {
                            const projTransactions = getProjectTransactions();
                            const income = projTransactions
                                .filter(t => t.type === TransactionType.INCOME)
                                .reduce((acc, t) => acc + t.amount, 0);
                            const expense = projTransactions
                                .filter(t => t.type === TransactionType.EXPENSE)
                                .reduce((acc, t) => acc + t.amount, 0);
                            const profit = income - expense;
                            const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : '0.0';

                            // Calculate Trend Data (Cumulative)
                            const sortedTx = [...projTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            let cumulativeIncome = 0;
                            let cumulativeExpense = 0;
                            const trendData = sortedTx.map(tx => {
                                if (tx.type === TransactionType.INCOME) cumulativeIncome += tx.amount;
                                if (tx.type === TransactionType.EXPENSE) cumulativeExpense += tx.amount;
                                return {
                                    date: tx.date,
                                    income: cumulativeIncome,
                                    expense: cumulativeExpense
                                };
                            });

                            // Calculate Expense Breakdown Data
                            const expenseTx = projTransactions.filter(t => t.type === TransactionType.EXPENSE);
                            const expenseCategories: Record<string, number> = {};
                            expenseTx.forEach(t => {
                                const cat = t.category || 'Other';
                                expenseCategories[cat] = (expenseCategories[cat] || 0) + t.amount;
                            });
                            const expenseChartData = Object.keys(expenseCategories).map(cat => ({
                                name: cat,
                                value: expenseCategories[cat]
                            })).sort((a, b) => b.value - a.value);

                            return (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 bg-emerald-200 rounded text-emerald-700"><TrendingUp className="w-4 h-4"/></div>
                                                <span className="text-sm font-medium text-emerald-800">{t.dashboard.totalRevenue}</span>
                                            </div>
                                            <p className="text-2xl font-bold text-emerald-900" dir="ltr">{currency}{income.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 bg-rose-200 rounded text-rose-700"><TrendingDown className="w-4 h-4"/></div>
                                                <span className="text-sm font-medium text-rose-800">{t.dashboard.financialPerformance}</span>
                                            </div>
                                            <p className="text-2xl font-bold text-rose-900" dir="ltr">{currency}{expense.toLocaleString()}</p>
                                        </div>
                                        <div className={`border p-4 rounded-lg ${profit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-1.5 rounded ${profit >= 0 ? 'bg-indigo-200 text-indigo-700' : 'bg-orange-200 text-orange-700'}`}><Wallet className="w-4 h-4"/></div>
                                                <span className={`text-sm font-medium ${profit >= 0 ? 'text-indigo-800' : 'text-orange-800'}`}>{t.projects.netProfit}</span>
                                            </div>
                                            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-indigo-900' : 'text-orange-900'}`} dir="ltr">
                                                {profit < 0 ? '-' : ''}{currency}{Math.abs(profit).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className={`border p-4 rounded-lg ${parseFloat(profitMargin) >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-1.5 rounded ${parseFloat(profitMargin) >= 0 ? 'bg-blue-200 text-blue-700' : 'bg-red-200 text-red-700'}`}><Percent className="w-4 h-4"/></div>
                                                <span className={`text-sm font-medium ${parseFloat(profitMargin) >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{t.projects.profitMargin}</span>
                                            </div>
                                            <p className={`text-2xl font-bold ${parseFloat(profitMargin) >= 0 ? 'text-blue-900' : 'text-red-900'}`} dir="ltr">
                                                {profitMargin}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Charts Section */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Profitability Trend Chart */}
                                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-4">{t.projects.profitabilityTrend}</h4>
                                            {trendData.length > 1 ? (
                                                <div className="h-64 w-full" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={trendData}>
                                                            <defs>
                                                                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                                </linearGradient>
                                                                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
                                                            <YAxis fontSize={12} stroke="#94a3b8" />
                                                            <Tooltip 
                                                                formatter={(value: any) => [`${currency} ${value.toLocaleString()}`, '']}
                                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                            />
                                                            <Area type="monotone" dataKey="income" name={t.finance.income} stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" />
                                                            <Area type="monotone" dataKey="expense" name={t.finance.expense} stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="h-64 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded">
                                                    Not enough data for trend
                                                </div>
                                            )}
                                        </div>

                                        {/* Expense Breakdown Chart */}
                                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-4">{t.projects.expenseBreakdown}</h4>
                                            {expenseChartData.length > 0 ? (
                                                <div className="h-64 w-full" dir="ltr">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={expenseChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                            <XAxis type="number" fontSize={12} stroke="#94a3b8" />
                                                            <YAxis dataKey="name" type="category" fontSize={12} stroke="#94a3b8" width={80} />
                                                            <Tooltip 
                                                                cursor={{fill: '#f1f5f9'}}
                                                                formatter={(value: any) => [`${currency} ${value.toLocaleString()}`, '']}
                                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                            />
                                                            <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="h-64 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded">
                                                    No expenses recorded
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6">
                                        <h4 className="font-bold text-slate-800 mb-3 text-sm">{t.finance.recentTransactions}</h4>
                                        {renderTransactionList(projTransactions)}
                                    </div>
                                </div>
                            );
                        })()}

                        {financeSubTab === 'income' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    {renderTransactionList(getProjectTransactions().filter(t => t.type === TransactionType.INCOME))}
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                    <h4 className="font-bold text-emerald-700 mb-3 text-sm flex items-center gap-2">
                                        <ArrowUpRight className="w-4 h-4" /> {t.projects.recordIncome}
                                    </h4>
                                    <form onSubmit={(e) => handleTxSubmit(e, TransactionType.INCOME)} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.description}</label>
                                            <input required type="text" 
                                                className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                                                placeholder="e.g. Milestone Payment 1"
                                                value={txFormData.description}
                                                onChange={e => setTxFormData({...txFormData, description: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.amount} ({currency})</label>
                                            <input required type="number" 
                                                className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                                                placeholder="0.00"
                                                value={txFormData.amount}
                                                onChange={e => setTxFormData({...txFormData, amount: e.target.value})}
                                            />
                                        </div>
                                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded text-sm mt-2 shadow-sm">
                                            {t.common.save}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                         {financeSubTab === 'expense' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    {renderTransactionList(getProjectTransactions().filter(t => t.type === TransactionType.EXPENSE))}
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                    <h4 className="font-bold text-rose-700 mb-3 text-sm flex items-center gap-2">
                                        <ArrowDownLeft className="w-4 h-4" /> {t.projects.recordExpense}
                                    </h4>
                                    <form onSubmit={(e) => handleTxSubmit(e, TransactionType.EXPENSE)} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.description}</label>
                                            <input required type="text" 
                                                className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none"
                                                placeholder="e.g. Contractor Fees"
                                                value={txFormData.description}
                                                onChange={e => setTxFormData({...txFormData, description: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.amount} ({currency})</label>
                                            <input required type="number" 
                                                className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none"
                                                placeholder="0.00"
                                                value={txFormData.amount}
                                                onChange={e => setTxFormData({...txFormData, amount: e.target.value})}
                                            />
                                        </div>
                                        <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 rounded text-sm mt-2 shadow-sm">
                                            {t.common.save}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'time' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Summary Card */}
                            <div className="lg:col-span-3 bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-200 rounded-lg text-blue-700">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-blue-900">{t.projects.totalHours}</h4>
                                        <p className="text-xs text-blue-700">{t.projects.hoursWorked}</p>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-blue-900" dir="ltr">
                                    {activeProject.timeLogs?.reduce((acc, log) => acc + log.hours, 0).toFixed(1) || '0.0'} <span className="text-sm font-medium">{t.projects.hours}</span>
                                </div>
                            </div>

                            {/* Time Log List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h4 className="font-bold text-slate-800">{t.projects.timeTracking}</h4>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {(!activeProject.timeLogs || activeProject.timeLogs.length === 0) ? (
                                            <div className="p-8 text-center text-slate-400 text-sm">{t.finance.noTransactions}</div>
                                        ) : (
                                            <table className="w-full text-sm text-start">
                                                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-start">{t.common.date}</th>
                                                        <th className="px-4 py-2 text-start">{t.common.fullName}</th>
                                                        <th className="px-4 py-2 text-start">{t.common.description}</th>
                                                        <th className="px-4 py-2 text-end">{t.projects.hours}</th>
                                                        <th className="px-4 py-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {activeProject.timeLogs.map(log => (
                                                        <tr key={log.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-start">{log.date}</td>
                                                            <td className="px-4 py-3 text-slate-700 flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                                    {log.loggedBy.charAt(0)}
                                                                </div>
                                                                <span className="truncate max-w-[80px]">{log.loggedBy}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-800 text-start">{log.description}</td>
                                                            <td className="px-4 py-3 text-end font-medium text-slate-800" dir="ltr">
                                                                {log.hours.toFixed(1)} {t.projects.hours}
                                                            </td>
                                                            <td className="px-4 py-3 text-end">
                                                                <button onClick={() => handleDeleteTimeLogLocal(log.id)} className="text-slate-300 hover:text-rose-500">
                                                                    <Trash2 className="w-3 h-3"/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add Time Form */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-indigo-600" /> {t.projects.logTime}
                                </h4>
                                <form onSubmit={handleTimeSubmit} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.date}</label>
                                        <input required type="date" 
                                            className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={timeFormData.date}
                                            onChange={e => setTimeFormData({...timeFormData, date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.projects.hoursWorked}</label>
                                        <input required type="number" step="0.5" min="0.1"
                                            className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. 4.5"
                                            value={timeFormData.hours}
                                            onChange={e => setTimeFormData({...timeFormData, hours: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.description}</label>
                                        <textarea required 
                                            className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                            placeholder="..."
                                            rows={3}
                                            value={timeFormData.description}
                                            onChange={e => setTimeFormData({...timeFormData, description: e.target.value})}
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded text-sm mt-2 shadow-sm flex items-center justify-center gap-2">
                                        <Clock className="w-3 h-3" /> {t.common.save}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'risks' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Risk Matrix Visualization */}
                            <div className="lg:col-span-3 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                <h4 className="font-bold text-slate-800 mb-4">{t.projects.riskMatrix}</h4>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-white max-w-md mx-auto">
                                    {/* Matrix Cells */}
                                    <div className="bg-amber-400 py-3 rounded-tl-lg flex items-center justify-center">Low/High</div>
                                    <div className="bg-orange-500 py-3 flex items-center justify-center">Med/High</div>
                                    <div className="bg-red-600 py-3 rounded-tr-lg flex items-center justify-center">High/High</div>
                                    
                                    <div className="bg-emerald-400 py-3 flex items-center justify-center">Low/Med</div>
                                    <div className="bg-amber-400 py-3 flex items-center justify-center">Med/Med</div>
                                    <div className="bg-orange-500 py-3 flex items-center justify-center">High/Med</div>

                                    <div className="bg-emerald-500 py-3 rounded-bl-lg flex items-center justify-center">Low/Low</div>
                                    <div className="bg-emerald-400 py-3 flex items-center justify-center">Med/Low</div>
                                    <div className="bg-amber-400 py-3 rounded-br-lg flex items-center justify-center">High/Low</div>
                                </div>
                                <div className="text-center text-xs text-slate-400 mt-2">
                                    Impact (X) vs Probability (Y)
                                </div>
                            </div>

                            {/* Risk List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h4 className="font-bold text-slate-800">{t.projects.risks}</h4>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {(!activeProject.risks || activeProject.risks.length === 0) ? (
                                            <div className="p-8 text-center text-slate-400 text-sm">{t.projects.noRisks}</div>
                                        ) : (
                                            <table className="w-full text-sm text-start">
                                                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-start">{t.projects.riskDescription}</th>
                                                        <th className="px-4 py-2 text-start">{t.projects.probability}</th>
                                                        <th className="px-4 py-2 text-start">{t.projects.impact}</th>
                                                        <th className="px-4 py-2 text-start">{t.common.status}</th>
                                                        <th className="px-4 py-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {activeProject.risks.map(risk => (
                                                        <tr key={risk.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 text-slate-800 font-medium">
                                                                {risk.description}
                                                                <div className="text-xs text-slate-500 font-normal mt-1">{risk.mitigationStrategy}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(risk.probability)}`}>
                                                                    {risk.probability}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(risk.impact)}`}>
                                                                    {risk.impact}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    risk.status === 'Open' ? 'bg-red-100 text-red-700' :
                                                                    risk.status === 'Mitigated' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                    {risk.status === 'Open' ? t.projects.open : risk.status === 'Mitigated' ? t.projects.mitigated : t.projects.closed}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-end">
                                                                <button onClick={() => handleDeleteRiskLocal(risk.id)} className="text-slate-300 hover:text-rose-500">
                                                                    <Trash2 className="w-3 h-3"/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add Risk Form */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 h-fit">
                                <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-indigo-600" /> {t.projects.addRisk}
                                </h4>
                                <form onSubmit={handleRiskSubmit} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.projects.riskDescription}</label>
                                        <input required type="text" 
                                            className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={riskFormData.description}
                                            onChange={e => setRiskFormData({...riskFormData, description: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.projects.probability}</label>
                                            <select 
                                                className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                value={riskFormData.probability}
                                                onChange={e => setRiskFormData({...riskFormData, probability: e.target.value})}
                                            >
                                                <option value="Low">{t.projects.low}</option>
                                                <option value="Medium">{t.projects.medium}</option>
                                                <option value="High">{t.projects.high}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{t.projects.impact}</label>
                                            <select 
                                                className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                value={riskFormData.impact}
                                                onChange={e => setRiskFormData({...riskFormData, impact: e.target.value})}
                                            >
                                                <option value="Low">{t.projects.low}</option>
                                                <option value="Medium">{t.projects.medium}</option>
                                                <option value="High">{t.projects.high}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.projects.mitigation}</label>
                                        <textarea required 
                                            className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                            rows={2}
                                            value={riskFormData.mitigationStrategy}
                                            onChange={e => setRiskFormData({...riskFormData, mitigationStrategy: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.status}</label>
                                        <select 
                                            className="w-full rounded border-slate-300 border p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                            value={riskFormData.status}
                                            onChange={e => setRiskFormData({...riskFormData, status: e.target.value})}
                                        >
                                            <option value="Open">{t.projects.open}</option>
                                            <option value="Mitigated">{t.projects.mitigated}</option>
                                            <option value="Closed">{t.projects.closed}</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded text-sm mt-2 shadow-sm flex items-center justify-center gap-2">
                                        <ShieldAlert className="w-3 h-3" /> {t.common.save}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectModule;