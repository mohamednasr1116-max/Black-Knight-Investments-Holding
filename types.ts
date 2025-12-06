export enum AssetType {
  BANK_BALANCE = 'Bank Balance',
  REAL_ESTATE = 'Real Estate',
  STOCKS = 'Stocks',
  GOLD = 'Gold',
  INVESTMENT_FUND = 'Investment Fund',
  VEHICLE = 'Vehicle',
  EQUIPMENT = 'Equipment',
  OTHER = 'Other'
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  acquisitionDate: string;
  description?: string;
  // Stock specific fields
  stockSymbol?: string;
  numberOfShares?: number;
  costPerShare?: number;
  // Gold specific fields
  goldWeight?: number; // in grams
  goldPricePerGram?: number;
  goldKarat?: string; // e.g., "24K", "21K"
}

export interface Liability {
  id: string;
  creditorName: string; // Who we owe (Bank, Supplier, etc.)
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Paid';
  description?: string;
  incurredDate: string;
  
  // Payment Details
  paymentSource?: 'Profit' | 'External';
  paidOnTime?: boolean;
  paidDate?: string;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  trend: number; // percentage
  trendDirection: 'up' | 'down' | 'neutral';
}

// Transaction Types
export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum TransactionStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType | string;
  category: string;
  status: TransactionStatus | string;
  projectId?: string;
  projectName?: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockLevel: number;
  reorderPoint: number;
  unitPrice: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

// Sales Types
export interface SalesLead {
  id: string;
  name: string;
  value: number;
  stage: string; // 'New', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'Active' | 'Inactive';
  lastContactDate: string;
}

export interface SaleOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleOrder {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SaleOrderItem[];
  totalAmount: number;
  status: 'Completed' | 'Pending';
  projectId?: string;
  projectName?: string;
}

export interface InvestmentSale {
  id: string;
  assetId: string;
  assetName: string;
  date: string;
  saleAmount: number;
}

// Project Types
export interface TimeLog {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
  loggedBy: string;
}

export interface ProjectRisk {
  id: string;
  description: string;
  probability: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  mitigationStrategy: string;
  status: 'Open' | 'Mitigated' | 'Closed';
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: 'Planning' | 'In Progress' | 'Review' | 'Completed';
  startDate: string;
  deadline: string;
  budget: number;
  progress: number;
  timeLogs?: TimeLog[];
  risks?: ProjectRisk[];
  transactions?: Transaction[];
}

// User & Settings Types
export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  SALES_REP = 'Sales Representative',
  ACCOUNTANT = 'Accountant'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
}

export interface AppSettings {
  companyName: string;
  currency: string;
  theme: 'light' | 'dark';
  fiscalYearStart: string;
  language: 'en' | 'ar';
  enableNotifications: boolean;
}

// HR Types
export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
  joinDate: string;
}