

// Service to handle data persistence
import { Transaction, InventoryItem, SalesLead, Project, AppSettings, User, UserRole, Customer, Asset, SaleOrder, InvestmentSale, Liability } from '../types';

const KEYS = {
  FINANCE: 'nexus_finance',
  INVENTORY: 'nexus_inventory',
  SALES: 'nexus_sales',
  CUSTOMERS: 'nexus_customers',
  PROJECTS: 'nexus_projects',
  SETTINGS: 'nexus_settings',
  USERS: 'nexus_users',
  SESSION: 'nexus_session',
  ASSETS: 'nexus_assets',
  SALES_ORDERS: 'nexus_sales_orders',
  INVESTMENT_SALES: 'nexus_investment_sales',
  LIABILITIES: 'nexus_liabilities'
};

const DEFAULT_ADMIN: User = {
    id: 'admin-1',
    name: 'System Admin',
    email: 'admin@company.com',
    password: 'admin',
    role: UserRole.ADMIN
};

export const storageService = {
  saveFinance: (data: Transaction[]) => localStorage.setItem(KEYS.FINANCE, JSON.stringify(data)),
  loadFinance: (fallback: Transaction[]) => {
    const data = localStorage.getItem(KEYS.FINANCE);
    return data ? JSON.parse(data) : fallback;
  },

  saveInventory: (data: InventoryItem[]) => localStorage.setItem(KEYS.INVENTORY, JSON.stringify(data)),
  loadInventory: (fallback: InventoryItem[]) => {
    const data = localStorage.getItem(KEYS.INVENTORY);
    return data ? JSON.parse(data) : fallback;
  },

  saveProjects: (data: Project[]) => localStorage.setItem(KEYS.PROJECTS, JSON.stringify(data)),
  loadProjects: (fallback: Project[]) => {
    const data = localStorage.getItem(KEYS.PROJECTS);
    return data ? JSON.parse(data) : fallback;
  },

  saveSales: (data: SalesLead[]) => localStorage.setItem(KEYS.SALES, JSON.stringify(data)),
  loadSales: (fallback: SalesLead[]) => {
    const data = localStorage.getItem(KEYS.SALES);
    return data ? JSON.parse(data) : fallback;
  },

  saveCustomers: (data: Customer[]) => localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data)),
  loadCustomers: (fallback: Customer[]) => {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : fallback;
  },

  saveAssets: (data: Asset[]) => localStorage.setItem(KEYS.ASSETS, JSON.stringify(data)),
  loadAssets: (fallback: Asset[]) => {
    const data = localStorage.getItem(KEYS.ASSETS);
    return data ? JSON.parse(data) : fallback;
  },

  // New: Sales Orders and Investment Sales
  saveSalesOrders: (data: SaleOrder[]) => localStorage.setItem(KEYS.SALES_ORDERS, JSON.stringify(data)),
  loadSalesOrders: (fallback: SaleOrder[]) => {
      const data = localStorage.getItem(KEYS.SALES_ORDERS);
      return data ? JSON.parse(data) : fallback;
  },

  saveInvestmentSales: (data: InvestmentSale[]) => localStorage.setItem(KEYS.INVESTMENT_SALES, JSON.stringify(data)),
  loadInvestmentSales: (fallback: InvestmentSale[]) => {
      const data = localStorage.getItem(KEYS.INVESTMENT_SALES);
      return data ? JSON.parse(data) : fallback;
  },

  // New: Liabilities
  saveLiabilities: (data: Liability[]) => localStorage.setItem(KEYS.LIABILITIES, JSON.stringify(data)),
  loadLiabilities: (fallback: Liability[]) => {
      const data = localStorage.getItem(KEYS.LIABILITIES);
      return data ? JSON.parse(data) : fallback;
  },

  saveSettings: (data: AppSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data)),
  loadSettings: (fallback: AppSettings) => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : fallback;
  },

  // User Management
  saveUsers: (data: User[]) => localStorage.setItem(KEYS.USERS, JSON.stringify(data)),
  loadUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [DEFAULT_ADMIN];
  },

  // Session
  saveUserSession: (user: any) => {
    if (user) localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(KEYS.SESSION);
  },
  loadUserSession: () => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },

  clearAll: () => {
    localStorage.removeItem(KEYS.FINANCE);
    localStorage.removeItem(KEYS.INVENTORY);
    localStorage.removeItem(KEYS.PROJECTS);
    localStorage.removeItem(KEYS.SALES);
    localStorage.removeItem(KEYS.CUSTOMERS);
    localStorage.removeItem(KEYS.ASSETS);
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.SALES_ORDERS);
    localStorage.removeItem(KEYS.INVESTMENT_SALES);
    localStorage.removeItem(KEYS.LIABILITIES);
  },
  
  factoryReset: () => {
      localStorage.clear();
      window.location.reload();
  },

  // --- Full System Backup & Restore ---

  createBackup: () => {
    const backupData = {
      finance: localStorage.getItem(KEYS.FINANCE) ? JSON.parse(localStorage.getItem(KEYS.FINANCE)!) : [],
      inventory: localStorage.getItem(KEYS.INVENTORY) ? JSON.parse(localStorage.getItem(KEYS.INVENTORY)!) : [],
      projects: localStorage.getItem(KEYS.PROJECTS) ? JSON.parse(localStorage.getItem(KEYS.PROJECTS)!) : [],
      sales: localStorage.getItem(KEYS.SALES) ? JSON.parse(localStorage.getItem(KEYS.SALES)!) : [],
      customers: localStorage.getItem(KEYS.CUSTOMERS) ? JSON.parse(localStorage.getItem(KEYS.CUSTOMERS)!) : [],
      assets: localStorage.getItem(KEYS.ASSETS) ? JSON.parse(localStorage.getItem(KEYS.ASSETS)!) : [],
      salesOrders: localStorage.getItem(KEYS.SALES_ORDERS) ? JSON.parse(localStorage.getItem(KEYS.SALES_ORDERS)!) : [],
      investmentSales: localStorage.getItem(KEYS.INVESTMENT_SALES) ? JSON.parse(localStorage.getItem(KEYS.INVESTMENT_SALES)!) : [],
      liabilities: localStorage.getItem(KEYS.LIABILITIES) ? JSON.parse(localStorage.getItem(KEYS.LIABILITIES)!) : [],
      users: localStorage.getItem(KEYS.USERS) ? JSON.parse(localStorage.getItem(KEYS.USERS)!) : [DEFAULT_ADMIN],
      settings: localStorage.getItem(KEYS.SETTINGS) ? JSON.parse(localStorage.getItem(KEYS.SETTINGS)!) : null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(backupData, null, 2);
  },

  restoreBackup: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      
      // Validation check
      if (!data.timestamp || !Array.isArray(data.finance)) {
        throw new Error("Invalid backup file format");
      }

      // Restore all keys
      if (data.finance) localStorage.setItem(KEYS.FINANCE, JSON.stringify(data.finance));
      if (data.inventory) localStorage.setItem(KEYS.INVENTORY, JSON.stringify(data.inventory));
      if (data.projects) localStorage.setItem(KEYS.PROJECTS, JSON.stringify(data.projects));
      if (data.sales) localStorage.setItem(KEYS.SALES, JSON.stringify(data.sales));
      if (data.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data.customers));
      if (data.assets) localStorage.setItem(KEYS.ASSETS, JSON.stringify(data.assets));
      if (data.salesOrders) localStorage.setItem(KEYS.SALES_ORDERS, JSON.stringify(data.salesOrders));
      if (data.investmentSales) localStorage.setItem(KEYS.INVESTMENT_SALES, JSON.stringify(data.investmentSales));
      if (data.liabilities) localStorage.setItem(KEYS.LIABILITIES, JSON.stringify(data.liabilities));
      if (data.users) localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));
      if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));

      return true;
    } catch (error) {
      console.error("Restore failed:", error);
      return false;
    }
  }
};
