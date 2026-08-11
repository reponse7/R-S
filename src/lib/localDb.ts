import Dexie, { type Table } from 'dexie';

export interface StockItem {
  id?: number;
  supabaseId?: string;
  name: string;
  category: string;
  attributes: Record<string, string | number>;
  quantity: number;
  unit: string;
  reorderPoint: number;
  safetyStock: number;
  supplierId?: number;
  unitCost: number;
  unitCostCurrency: 'RWF' | 'USD';
  location: string;
  batchRef: string;
  lastUpdated: string;
  raw_metadata?: Record<string, any>;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface ClientProfile {
  id?: string | number;
  supabaseId?: string;
  companyName: string;
  tin: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  region?: string;
  paymentTerms: string;
  creditLimit: number;
  creditCurrency?: 'RWF' | 'USD';
  notes?: string;
  boxModels?: string;
  totalOrders?: number;
  totalQuantityProduced?: number;
  lastOrderDate?: string;
  raw_metadata?: Record<string, any>;
  syncStatus?: 'pending' | 'synced' | 'error';
}

export interface SupplierProfile {
  id?: number;
  supabaseId?: string;
  name: string;
  categories: string[];
  paymentTerms: string;
  contactInfo: string;
  address: string;
  leadTimeDays: number;
  preferredCurrency: 'RWF' | 'USD';
  raw_metadata?: Record<string, any>;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface ClientOrder {
  id?: number;
  supabaseId?: string;
  clientId: number;
  orderReference: string;
  details: Record<string, any>;
  quantity: number;
  deliveryDate: string;
  status: 'Pending' | 'In Production' | 'Completed' | 'Cancelled';
  totalValue: number;
  totalValueCurrency: 'RWF' | 'USD';
  raw_metadata?: Record<string, any>;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface PurchaseOrder {
  id?: number;
  supabaseId?: string;
  supplierId: number;
  materialName: string;
  quantity: number;
  unit: string;
  specifications: Record<string, any>;
  status: 'In Production' | 'In Transit' | 'Port Arrival' | 'Warehouse Intake';
  orderDate: string;
  targetDate: string; // Target Ready Date or ETA
  portLocation?: 'Mombasa Port' | 'Dar es Salaam Port' | '';
  raw_metadata?: Record<string, any>;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface TransactionLog {
  id?: number;
  type: 'stock_in' | 'stock_out';
  itemId: number;
  quantity: number;
  date: string;
  purpose: string;
  clientId?: number;
  clientNameOverride?: string;
  raw_metadata?: Record<string, any>;
  syncStatus: 'pending' | 'synced' | 'error';
}

export class RSLocalDB extends Dexie {
  stockItems!: Table<StockItem, number>;
  clientProfiles!: Table<ClientProfile, string | number>;
  supplierProfiles!: Table<SupplierProfile, number>;
  clientOrders!: Table<ClientOrder, number>;
  purchaseOrders!: Table<PurchaseOrder, number>;
  transactionLogs!: Table<TransactionLog, number>;

  constructor() {
    super('RSLocalDB');
    this.version(3).stores({
      stockItems: '++id, supabaseId, name, category, syncStatus',
      clientProfiles: '++id, supabaseId, companyName, syncStatus',
      supplierProfiles: '++id, supabaseId, name, syncStatus',
      clientOrders: '++id, supabaseId, clientId, status, syncStatus',
      purchaseOrders: '++id, supabaseId, supplierId, status, syncStatus',
      transactionLogs: '++id, type, itemId, syncStatus'
    });
  }
}

export const db = new RSLocalDB();
