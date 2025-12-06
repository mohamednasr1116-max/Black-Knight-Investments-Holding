

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Package, 
  Users, 
  Briefcase, 
  ShoppingCart, 
  Landmark, 
  Settings, 
  LogOut, 
  Menu,
  BrainCircuit,
  X
} from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FinanceModule from './components/FinanceModule';
import InventoryModule from './components/InventoryModule';
import ProjectModule from './components/ProjectModule';
import SalesModule from './components/SalesModule';
import AssetsModule from './components/AssetsModule';
import SettingsModule from './components/SettingsModule';
import { storageService } from './services/storageService';
import { askAiQuery, generateExecutiveReport } from './services/geminiService';
import { User, Transaction, InventoryItem, Project, SalesLead, Customer, Asset, AppSettings, UserRole, SaleOrder, InvestmentSale, Liability, TimeLog, ProjectRisk, TransactionType, TransactionStatus } from './types';
import { translations } from './utils/translations';
import { MOCK_TRANSACTIONS, MOCK_INVENTORY, MOCK_PROJECTS, MOCK_SALES, MOCK_CUSTOMERS, MOCK_ASSETS, MOCK_LIABILITIES } from './constants';

const App: React.FC = () => {
  // --- AUTH & USER STATE ---
  const [user, setUser] = useState<User | null>(null);

  // --- DATA STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [salesOrders, setSalesOrders] = useState<SaleOrder[]>([]);
  const [investmentSales, setInvestmentSales] = useState<InvestmentSale[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  
  // --- SYSTEM STATES ---
  const [settings, setSettings] = useState<AppSettings>({
    companyName: 'Nexus ERP',
    currency: '$',
    theme: 'light',
    fiscalYearStart: 'January',
    language: 'en',
    enableNotifications: false
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // --- UI STATES ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Modal
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = () => {
        // Load data from storage or fall back to mocks/defaults
        setTransactions(storageService.loadFinance(MOCK_TRANSACTIONS));
        setInventory(storageService.loadInventory(MOCK_INVENTORY));
        setProjects(storageService.loadProjects(MOCK_PROJECTS));
        setSalesLeads(storageService.loadSales(MOCK_SALES));
        setCustomers(storageService.loadCustomers(MOCK_CUSTOMERS));
        setAssets(storageService.loadAssets(MOCK_ASSETS));
        setSettings(storageService.loadSettings({
            companyName: 'Nexus ERP',
            currency: '$',
            theme: 'light',
            fiscalYearStart: 'January',
            language: 'en',
            enableNotifications: false
        }));
        setAllUsers(storageService.loadUsers());
        
        // Load new modules data
        setSalesOrders(storageService.loadSalesOrders([]));
        setInvestmentSales(storageService.loadInvestmentSales([]));
        setLiabilities(storageService.loadLiabilities(MOCK_LIABILITIES));

        // Restore Session
        const sessionUser = storageService.loadUserSession();
        if (sessionUser) setUser(sessionUser);

        setIsLoading(false);
    };
    init();
  }, []);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => storageService.saveFinance(transactions), [transactions]);
  useEffect(() => storageService.saveInventory(inventory), [inventory]);
  useEffect(() => storageService.saveProjects(projects), [projects]);
  useEffect(() => storageService.saveSales(salesLeads), [salesLeads]);
  useEffect(() => storageService.saveCustomers(customers), [customers]);
  useEffect(() => storageService.saveAssets(assets), [assets]);
  useEffect(() => storageService.saveSalesOrders(salesOrders), [salesOrders]);
  useEffect(() => storageService.saveInvestmentSales(investmentSales), [investmentSales]);
  useEffect(() => storageService.saveLiabilities(liabilities), [liabilities]);
  useEffect(() => storageService.saveSettings(settings), [settings]);
  useEffect(() => storageService.saveUsers(allUsers), [allUsers]);

  // --- HANDLERS ---
  const handleLogin = (u: User) => {
      setUser(u);
      storageService.saveUserSession(u);
  };

  const handleSignup = (u: User) => {
      const updatedUsers = [...allUsers, u];
      setAllUsers(updatedUsers);
  };

  const handleLogout = () => {
      setUser(null);
      storageService.saveUserSession(null);
      setCurrentView('dashboard');
  };

  // Finance Handlers
  const handleAddTransaction = (tx: Transaction) => setTransactions([tx, ...transactions]);
  const handleUpdateTransaction = (updatedTx: Transaction) => setTransactions(transactions.map(t => t.id === updatedTx.id ? updatedTx : t));
  const handleDeleteTransaction = (id: string) => setTransactions(transactions.filter(t => t.id !== id));
  const handleToggleTxStatus = (id: string) => {
      setTransactions(transactions.map(t => t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
  };
  const handleImportTransactions = (data: Transaction[]) => setTransactions([...data, ...transactions]);

  // Liability Handlers
  const handleAddLiability = (l: Liability) => setLiabilities([...liabilities, l]);
  const handleRepayLiability = (id: string, source: 'Profit' | 'External', isOnTime: boolean) => {
      const liability = liabilities.find(l => l.id === id);
      if (!liability) return;

      const updatedLiabilities = liabilities.map(l => 
          l.id === id ? { ...l, status: 'Paid' as const, paymentSource: source, paidOnTime: isOnTime, paidDate: new Date().toISOString().split('T')[0] } : l
      );
      setLiabilities(updatedLiabilities);

      // If paid from profits, record an expense
      if (source === 'Profit') {
          const expenseTx: Transaction = {
              id: Date.now().toString(),
              date: new Date().toLocaleDateString(),
              description: `Repayment of Debt: ${liability.creditorName}`,
              amount: liability.amount,
              type: TransactionType.EXPENSE,
              category: 'Debt Repayment',
              status: TransactionStatus.COMPLETED
          };
          handleAddTransaction(expenseTx);
      }
  };
  const handleDeleteLiability = (id: string) => setLiabilities(liabilities.filter(l => l.id !== id));
  const handleImportLiabilities = (data: Liability[]) => setLiabilities([...data, ...liabilities]);

  // Inventory Handlers
  const handleAddProduct = (item: InventoryItem) => setInventory([...inventory, item]);
  const handleDeleteProduct = (id: string) => setInventory(inventory.filter(i => i.id !== id));
  const handleUpdateStock = (id: string, amount: number) => {
      setInventory(inventory.map(i => {
          if (i.id === id) {
              const newLevel = Math.max(0, i.stockLevel + amount);
              let status: any = 'In Stock';
              if (newLevel === 0) status = 'Out of Stock';
              else if (newLevel <= i.reorderPoint) status = 'Low Stock';
              return { ...i, stockLevel: newLevel, status };
          }
          return i;
      }));
  };
  const handleImportInventory = (data: InventoryItem[]) => setInventory([...data, ...inventory]);

  // Project Handlers
  const handleAddProject = (p: Project) => setProjects([...projects, p]);
  const handleUpdateProject = (p: Project) => setProjects(projects.map(proj => proj.id === p.id ? p : proj));
  const handleDeleteProject = (id: string) => setProjects(projects.filter(p => p.id !== id));
  const handleUpdateProjectStatus = (id: string, status: Project['status']) => {
      setProjects(projects.map(p => p.id === id ? { ...p, status } : p));
  };
  const handleImportProjects = (data: Project[]) => setProjects([...data, ...projects]);
  
  // Time & Risk Handlers for Projects
  const handleAddTimeLog = (projectId: string, log: TimeLog) => {
      setProjects(projects.map(p => p.id === projectId ? { ...p, timeLogs: [...(p.timeLogs || []), log] } : p));
  };
  const handleDeleteTimeLog = (projectId: string, logId: string) => {
      setProjects(projects.map(p => p.id === projectId ? { ...p, timeLogs: (p.timeLogs || []).filter(l => l.id !== logId) } : p));
  };
  const handleAddRisk = (projectId: string, risk: ProjectRisk) => {
      setProjects(projects.map(p => p.id === projectId ? { ...p, risks: [...(p.risks || []), risk] } : p));
  };
  const handleDeleteRisk = (projectId: string, riskId: string) => {
      setProjects(projects.map(p => p.id === projectId ? { ...p, risks: (p.risks || []).filter(r => r.id !== riskId) } : p));
  };

  // Sales Handlers
  const handleAddCustomer = (c: Customer) => setCustomers([...customers, c]);
  const handleUpdateCustomer = (c: Customer) => setCustomers(customers.map(cust => cust.id === c.id ? c : cust));
  const handleDeleteCustomer = (id: string) => setCustomers(customers.filter(c => c.id !== id));
  const handleImportCustomers = (data: Customer[]) => setCustomers([...data, ...customers]);
  
  const handleAddSaleOrder = (order: SaleOrder) => {
      setSalesOrders([...salesOrders, order]);
      // Update inventory automatically
      order.items.forEach(item => {
          handleUpdateStock(item.itemId, -item.quantity);
      });
      // Record Revenue
      const revenueTx: Transaction = {
          id: Date.now().toString(),
          date: order.date,
          description: `Sale Order #${order.id} - ${order.customerName}`,
          amount: order.totalAmount,
          type: TransactionType.INCOME,
          category: 'Sales',
          status: TransactionStatus.COMPLETED,
          projectId: order.projectId,
          projectName: order.projectName
      };
      handleAddTransaction(revenueTx);
  };

  const handleAddInvestmentSale = (sale: InvestmentSale) => {
      setInvestmentSales([...investmentSales, sale]);
      // Record Revenue
      const revenueTx: Transaction = {
          id: Date.now().toString(),
          date: sale.date,
          description: `Asset Sale: ${sale.assetName}`,
          amount: sale.saleAmount,
          type: TransactionType.INCOME,
          category: 'Investment Income',
          status: TransactionStatus.COMPLETED
      };
      handleAddTransaction(revenueTx);
      // Remove asset if needed or just track sale? Assuming we keep asset but maybe update value? 
      // For simplicity, we assume asset is sold off, but user might want to manually delete or update asset value to 0.
      // We will leave asset manual update to user to avoid accidental data loss.
  };

  // Asset Handlers
  const handleAddAsset = (a: Asset) => setAssets([...assets, a]);
  const handleUpdateAsset = (a: Asset) => setAssets(assets.map(asset => asset.id === a.id ? a : asset));
  const handleDeleteAsset = (id: string) => setAssets(assets.filter(a => a.id !== id));
  const handleImportAssets = (data: Asset[]) => setAssets([...data, ...assets]);

  // Settings & User Mgmt Handlers
  const handleSaveSettings = (s: AppSettings) => setSettings(s);
  const handleAddUser = (u: User) => setAllUsers([...allUsers, u]);
  const handleUpdateUser = (u: User) => setAllUsers(allUsers.map(usr => usr.id === u.id ? u : usr));
  const handleDeleteUser = (id: string) => setAllUsers(allUsers.filter(u => u.id !== id));

  // AI Handler
  const handleAiQuery = async () => {
      if (!aiQuery.trim()) return;
      setIsAiThinking(true);
      setAiResponse('');
      
      const response = await askAiQuery(
          aiQuery, 
          transactions, 
          inventory, 
          projects, 
          salesLeads, 
          assets,
          settings.language
      );
      
      setAiResponse(response);
      setIsAiThinking(false);
  };
  
  const handleGenerateReport = async () => {
       setIsAiThinking(true);
       setIsAiOpen(true);
       setAiQuery("Generating Executive Report...");
       const report = await generateExecutiveReport(transactions, inventory, salesLeads, assets, settings.language);
       setAiResponse(report);
       setIsAiThinking(false);
       setAiQuery(""); // Clear query as it was an auto-action
  };

  const t = translations[settings.language];

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-500">{t.common.loading}</div>;

  if (!user) {
      return <Login onLogin={handleLogin} onSignup={handleSignup} users={allUsers} language={settings.language} />;
  }

  // Navigation Items
  const navItems = [
      { id: 'dashboard', label: t.common.dashboard, icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'finance', label: t.common.finance, icon: <Wallet className="w-5 h-5" /> },
      { id: 'sales', label: t.common.sales, icon: <ShoppingCart className="w-5 h-5" /> },
      { id: 'inventory', label: t.common.stock, icon: <Package className="w-5 h-5" /> },
      { id: 'projects', label: t.common.projects, icon: <Briefcase className="w-5 h-5" /> },
      { id: 'assets', label: t.common.assets, icon: <Landmark className="w-5 h-5" /> },
      { id: 'settings', label: t.common.settings, icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className={`flex min-h-screen bg-slate-50 ${settings.language === 'ar' ? 'rtl' : 'ltr'}`} dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 start-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : (settings.language === 'ar' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 lg:static`}>
         <div className="h-16 flex items-center px-6 border-b border-slate-800">
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center me-3">
                 <span className="font-bold text-white text-lg">N</span>
             </div>
             <span className="font-bold text-lg tracking-wide">{settings.companyName}</span>
             <button className="lg:hidden ms-auto" onClick={() => setIsSidebarOpen(false)}><X className="w-5 h-5" /></button>
         </div>
         
         <div className="p-4">
             <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 mb-6">
                 <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
                     {user.name.charAt(0)}
                 </div>
                 <div className="overflow-hidden">
                     <p className="text-sm font-medium truncate">{user.name}</p>
                     <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                 </div>
             </div>

             <nav className="space-y-1">
                 {navItems.map(item => (
                     <button
                        key={item.id}
                        onClick={() => { setCurrentView(item.id); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                     >
                         {item.icon}
                         {item.label}
                     </button>
                 ))}
             </nav>
         </div>

         <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
                 <LogOut className="w-5 h-5" />
                 {t.common.logout}
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
              <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4 ms-auto">
                   <button 
                        onClick={() => { setIsAiOpen(true); }}
                        className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                       <BrainCircuit className="w-4 h-4" />
                       <span className="hidden sm:inline">{t.common.aiInsights}</span>
                   </button>
              </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {currentView === 'dashboard' && (
                <Dashboard 
                    financials={transactions}
                    inventory={inventory}
                    sales={salesLeads} // Using sales leads (pipeline) for dashboard overview
                    language={settings.language}
                    currency={settings.currency}
                />
            )}
            
            {currentView === 'finance' && (
                <FinanceModule 
                    transactions={transactions}
                    projects={projects}
                    assets={assets}
                    liabilities={liabilities}
                    onAdd={handleAddTransaction}
                    onUpdate={handleUpdateTransaction}
                    onDelete={handleDeleteTransaction}
                    onToggleStatus={handleToggleTxStatus}
                    onImport={handleImportTransactions}
                    onAddLiability={handleAddLiability}
                    onRepayLiability={handleRepayLiability}
                    onDeleteLiability={handleDeleteLiability}
                    onImportLiabilities={handleImportLiabilities}
                    language={settings.language}
                    currency={settings.currency}
                />
            )}

            {currentView === 'inventory' && (
                <InventoryModule 
                    items={inventory}
                    onAdd={handleAddProduct}
                    onDelete={handleDeleteProduct}
                    onUpdateStock={handleUpdateStock}
                    onImport={handleImportInventory}
                    language={settings.language}
                    currency={settings.currency}
                />
            )}

            {currentView === 'projects' && (
                <ProjectModule 
                    projects={projects}
                    financials={transactions}
                    onAdd={handleAddProject}
                    onUpdateProject={handleUpdateProject}
                    onDelete={handleDeleteProject}
                    onUpdateStatus={handleUpdateProjectStatus}
                    onImport={handleImportProjects}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    currentUser={user}
                    onAddTimeLog={handleAddTimeLog}
                    onDeleteTimeLog={handleDeleteTimeLog}
                    onAddRisk={handleAddRisk}
                    onDeleteRisk={handleDeleteRisk}
                    language={settings.language}
                    currency={settings.currency}
                />
            )}

             {currentView === 'sales' && (
                <SalesModule 
                    customers={customers}
                    inventory={inventory}
                    assets={assets}
                    salesOrders={salesOrders}
                    investmentSales={investmentSales}
                    financials={transactions}
                    projects={projects}
                    onAddCustomer={handleAddCustomer}
                    onUpdateCustomer={handleUpdateCustomer}
                    onDeleteCustomer={handleDeleteCustomer}
                    onImportCustomers={handleImportCustomers}
                    onAddSaleOrder={handleAddSaleOrder}
                    onAddInvestmentSale={handleAddInvestmentSale}
                    language={settings.language}
                    currency={settings.currency}
                />
            )}

            {currentView === 'assets' && (
               <AssetsModule 
                  assets={assets}
                  onAddAsset={handleAddAsset}
                  onUpdateAsset={handleUpdateAsset}
                  onDeleteAsset={handleDeleteAsset}
                  onImportAssets={handleImportAssets}
                  language={settings.language}
                  currency={settings.currency}
               />
            )}

            {currentView === 'settings' && (
                <SettingsModule 
                    settings={settings}
                    currentUser={user}
                    allUsers={allUsers}
                    onSave={handleSaveSettings}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    language={settings.language}
                />
            )}
          </main>
      </div>

      {/* AI Assistant Modal */}
      {isAiOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end">
              <div className="w-full sm:w-[500px] h-full bg-white shadow-2xl flex flex-col animate-slideInRight">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-600 text-white">
                      <h3 className="font-bold flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5" /> {t.ai.chatAssistant}
                      </h3>
                      <button onClick={() => setIsAiOpen(false)} className="hover:bg-indigo-700 p-1 rounded transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                      <div className="bg-white p-4 rounded-lg rounded-tl-none shadow-sm border border-slate-200 self-start max-w-[90%]">
                          <p className="text-sm text-slate-700">{t.ai.chatWelcome}</p>
                          <button 
                             onClick={handleGenerateReport}
                             className="mt-3 text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2 w-fit border border-indigo-200"
                           >
                             <BrainCircuit className="w-3 h-3" /> {t.ai.insightsReport}
                          </button>
                      </div>

                      {(aiQuery || aiResponse) && (
                          <>
                            {aiQuery && (
                                <div className="bg-indigo-600 text-white p-4 rounded-lg rounded-tr-none shadow-md self-end max-w-[90%] ms-auto">
                                    <p className="text-sm">{aiQuery}</p>
                                </div>
                            )}
                            
                            {(isAiThinking || aiResponse) && (
                                <div className="bg-white p-4 rounded-lg rounded-tl-none shadow-sm border border-slate-200 self-start max-w-[90%] w-full">
                                    {isAiThinking ? (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
                                            <span className="text-xs ms-2">{t.ai.thinking}</span>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm prose-indigo max-w-none text-slate-700 leading-relaxed whitespace-pre-line" dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
                                            <div dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                        </div>
                                    )}
                                </div>
                            )}
                          </>
                      )}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-200">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder={t.ai.askQuestion}
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
                          />
                          <button 
                            onClick={handleAiQuery}
                            disabled={isAiThinking || !aiQuery.trim()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                              {t.ai.send}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
