import { db } from './localDb';
import { supabase } from './supabase';

export class SyncEngine {
  private isSyncing = false;

  constructor() {
    window.addEventListener('online', () => this.sync());
    
    // Initial sync attempt
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 2000);
    }
  }

  async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    console.log('[SyncEngine] Sync started...');

    try {
      await this.syncTable('stockItems', 'stock_items');
      await this.syncTable('clientProfiles', 'client_profiles');
      await this.syncTable('supplierProfiles', 'supplier_profiles');
      await this.syncTable('clientOrders', 'client_orders');
      await this.syncTable('transactionLogs', 'transaction_logs');
      
      console.log('[SyncEngine] Sync completed successfully.');
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncTable(localTableName: keyof typeof db, supabaseTableName: string) {
    const table = db[localTableName] as any; // Cast for generic access
    if (!table) return;

    const pendingRecords = await table.where('syncStatus').equals('pending').toArray();
    
    if (pendingRecords.length === 0) return;
    
    console.log(`[SyncEngine] Found ${pendingRecords.length} pending records in ${localTableName}`);

    for (const record of pendingRecords) {
      try {
        const { id, syncStatus, ...dataToSync } = record;
        
        // If it doesn't have a supabaseId, it's an insert, otherwise update.
        // For simplicity, we just use upsert if supabaseId exists, else insert
        let response;
        if (record.supabaseId) {
           response = await supabase
            .from(supabaseTableName)
            .update(dataToSync)
            .eq('id', record.supabaseId)
            .select()
            .single();
        } else {
           response = await supabase
            .from(supabaseTableName)
            .insert([dataToSync])
            .select()
            .single();
        }

        if (response.error) throw response.error;

        // Update local record with supabaseId and synced status
        await table.update(record.id, {
          supabaseId: response.data.id,
          syncStatus: 'synced'
        });
      } catch (err) {
        console.error(`[SyncEngine] Failed to sync record from ${localTableName}:`, err);
        await table.update(record.id, { syncStatus: 'error' });
      }
    }
  }
}

export const syncEngine = new SyncEngine();
