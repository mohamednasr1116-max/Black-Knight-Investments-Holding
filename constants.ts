import { Transaction, TransactionType, TransactionStatus, InventoryItem, SalesLead, Project, Customer, Asset, AssetType, Liability } from './types';

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_INVENTORY: InventoryItem[] = [];

export const MOCK_SALES: SalesLead[] = [];

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_LIABILITIES: Liability[] = [];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'ast-001',
    name: 'Main HQ Building',
    type: AssetType.REAL_ESTATE,
    value: 500000,
    acquisitionDate: '2020-01-15',
    description: 'Primary office location'
  },
  {
    id: 'ast-002',
    name: 'Corporate Bank Account',
    type: AssetType.BANK_BALANCE,
    value: 125000,
    acquisitionDate: '2023-01-01'
  },
  {
    id: 'ast-003',
    name: 'Tech Holdings ETF',
    type: AssetType.STOCKS,
    value: 75000,
    acquisitionDate: '2022-06-10'
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    name: 'Acme Corp',
    email: 'contact@acme.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Rd, Tech City, CA 90210',
    status: 'Active',
    lastContactDate: '2024-03-15'
  },
  {
    id: 'cust-002',
    name: 'Globex Inc',
    email: 'info@globex.com',
    phone: '+1 (555) 987-6543',
    address: '456 Industrial Ave, Springfield, IL 62704',
    status: 'Active',
    lastContactDate: '2024-03-10'
  }
];