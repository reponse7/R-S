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
  supplierName?: string;
  leadTime?: string | number;
  unitCost: number;
  unitCostCurrency: 'RWF' | 'USD';
  location: string;
  batches: Array<{ ref: string; quantity: number; date: string }>;
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
  quotationRef?: string;
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
    this.version(4).stores({
      stockItems: '++id, supabaseId, name, category, syncStatus',
      clientProfiles: '++id, supabaseId, companyName, syncStatus',
      supplierProfiles: '++id, supabaseId, name, syncStatus',
      clientOrders: '++id, supabaseId, clientId, status, syncStatus',
      purchaseOrders: '++id, supabaseId, supplierId, status, syncStatus',
      transactionLogs: '++id, type, itemId, syncStatus'
    }).upgrade(tx => {
      return tx.table('stockItems').toCollection().modify(item => {
        if (item.batchRef && !item.batches) {
          item.batches = [{ ref: item.batchRef, quantity: item.quantity, date: item.lastUpdated }];
          delete item.batchRef;
        }
      });
    });
  }
}

export const db = new RSLocalDB();

export const deduplicateClients = async () => {
  const clients = await db.clientProfiles.toArray();
  const normalizedMap = new Map<string, ClientProfile[]>();

  const normalizeName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\b(ltd|co|inc|ets|ste|sarl|group|distillers|company)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  clients.forEach(c => {
    const key = normalizeName(c.companyName);
    if (!key) return; // skip empty names
    if (!normalizedMap.has(key)) normalizedMap.set(key, []);
    normalizedMap.get(key)!.push(c);
  });

  for (const [, duplicates] of normalizedMap.entries()) {
    if (duplicates.length > 1) {
      duplicates.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
      const master = duplicates[0];
      const toDelete = duplicates.slice(1);

      for (const dup of toDelete) {
        master.totalOrders = (master.totalOrders || 0) + (dup.totalOrders || 0);
        master.totalQuantityProduced = (master.totalQuantityProduced || 0) + (dup.totalQuantityProduced || 0);
        
        if (dup.lastOrderDate) {
          if (!master.lastOrderDate || new Date(dup.lastOrderDate) > new Date(master.lastOrderDate)) {
            master.lastOrderDate = dup.lastOrderDate;
          }
        }

        // Combine boxModels
        if (dup.boxModels) {
          const masterModels = master.boxModels ? master.boxModels.split(',').map(s => s.trim()) : [];
          const dupModels = dup.boxModels.split(',').map(s => s.trim());
          const merged = Array.from(new Set([...masterModels, ...dupModels]));
          master.boxModels = merged.join(', ');
        }

        const txs = await db.transactionLogs.where('clientId').equals(dup.id as any).toArray();
        for (const tx of txs) {
          await db.transactionLogs.update(tx.id!, { clientId: master.id as number });
        }
        
        await db.clientProfiles.delete(dup.id!);
      }
      
      await db.clientProfiles.update(master.id!, {
        totalOrders: master.totalOrders,
        totalQuantityProduced: master.totalQuantityProduced,
        lastOrderDate: master.lastOrderDate,
        boxModels: master.boxModels
      } as any);
    }
  }
};
