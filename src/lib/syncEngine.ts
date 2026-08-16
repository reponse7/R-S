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

    try {
      // 1. PULL from Supabase
      const { data: remoteData, error: pullError } = await supabase.from(supabaseTableName).select('*');
      if (pullError) {
        console.error(`[SyncEngine] Pull error for ${supabaseTableName}:`, pullError);
      } else if (remoteData && remoteData.length > 0) {
        for (const remoteRecord of remoteData) {
          // Check if it exists locally by supabaseId
          const localMatch = await table.where('supabaseId').equals(remoteRecord.id).first();
          if (localMatch) {
            // Update local with remote data
            await table.update(localMatch.id, { ...remoteRecord, supabaseId: remoteRecord.id, syncStatus: 'synced' });
          } else {
            // Insert into local
            const { id: _, ...rest } = remoteRecord;
            await table.add({ ...rest, supabaseId: remoteRecord.id, syncStatus: 'synced' });
          }
        }
      }

      // 2. PUSH pending local records
      const pendingRecords = await table.where('syncStatus').equals('pending').toArray();
      if (pendingRecords.length === 0) return;
      
      console.log(`[SyncEngine] Found ${pendingRecords.length} pending records in ${localTableName}`);

      for (const record of pendingRecords) {
        try {
          const { id, syncStatus, supabaseId, ...dataToSync } = record;
          
          let response;
          if (supabaseId) {
             response = await supabase
              .from(supabaseTableName)
              .update(dataToSync)
              .eq('id', supabaseId)
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
    } catch (err) {
      console.error(`[SyncEngine] Error processing table ${localTableName}:`, err);
    }
  }
}

export const syncEngine = new SyncEngine();
