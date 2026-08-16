import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, MapPin, Briefcase, X, Save, Search, Filter, Clock, TrendingUp } from "lucide-react";
import { db, type ClientProfile } from "../lib/localDb";
import { Modal } from "../components/ui/Modal";
import clientsData from "../data/clientsData.json";
import { useAppContext } from "../context/AppContext";

function ClientCard({ client, onClick, onDelete }: { client: ClientProfile; onClick: () => void; onDelete: (id: string | number) => void }) {
  const { formatCurrency } = useAppContext();
  return (
    <div 
      className="glass-card p-6 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); onDelete(client.id!); }} className="text-gray-400 hover:text-red-500 bg-white/80 p-1 rounded-md shadow-sm" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center space-x-3 mb-4 mt-2">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold uppercase">
          {(client.companyName || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate" title={client.companyName}>{client.companyName}</h3>
          <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
            TIN: {client.tin || 'N/A'}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 flex-1 text-sm text-gray-600 dark:text-slate-300">
        <div className="flex items-center">
          <Briefcase className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span className="truncate flex-1">{client.boxModels || 'No models specified'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="w-4 h-4 mr-2 flex items-center justify-center text-gray-400 font-bold">#</span>
            <span>Total Orders:</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white">{client.totalOrders || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="w-4 h-4 mr-2 flex items-center justify-center text-gray-400 font-bold">Q</span>
            <span>Quantity:</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white">{client.totalQuantityProduced || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
            <span>Last Order:</span>
          </div>
          <span className="text-gray-900 dark:text-white">{client.lastOrderDate || 'Never'}</span>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-slate-800/80 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-gray-500">Terms</span>
          <span className="font-medium text-gray-900 dark:text-white">{client.paymentTerms}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Credit Limit</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatCurrency(client.creditLimit || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function OrderHistoryItem({ log, onUpdate }: { log: any; onUpdate: (id: number, updates: any) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState(log.date.split('T')[0]);
  const [quantity, setQuantity] = useState(log.quantity);
  const [purpose, setPurpose] = useState(log.purpose);

  const handleSave = async () => {
    await onUpdate(log.id, { date: new Date(date).toISOString(), quantity: Number(quantity), purpose });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-700 p-2 rounded border border-indigo-200 dark:border-indigo-600 shadow-sm space-y-2">
        <input type="date" className="input-field py-1 text-xs" value={date} onChange={e => setDate(e.target.value)} />
        <input type="number" className="input-field py-1 text-xs" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
        <input type="text" className="input-field py-1 text-xs" value={purpose} onChange={e => setPurpose(e.target.value)} />
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handleSave} className="text-xs text-indigo-600 font-bold hover:text-indigo-800">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-700 p-2 rounded border border-gray-100 dark:border-slate-600 shadow-sm group">
      <div className="flex justify-between items-start text-xs">
        <div>
          <span className="font-semibold text-gray-900 dark:text-white text-emerald-600 dark:text-emerald-400">+{log.quantity} units</span>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate mt-0.5">{log.purpose}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-gray-400">{new Date(log.date).toLocaleDateString()}</span>
          <button onClick={() => setIsEditing(true)} className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
        </div>
      </div>
    </div>
  );
}

export function Clients() {
  const { formatCurrency } = useAppContext();
  const clients = useLiveQuery(() => db.clientProfiles.toArray());
  const transactions = useLiveQuery(() => db.transactionLogs.toArray());
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<ClientProfile | null>(null);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "volume" | "lastOrder" | "credit">("name");

  // Edit form state
  const [formData, setFormData] = useState<Partial<ClientProfile>>({});
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

  useEffect(() => {
    const initDb = async () => {
      const count = await db.clientProfiles.count();
      if (count === 0 && !localStorage.getItem('seededClients')) {
        try {
          const sanitizedData = clientsData.map(({ id, ...rest }: any) => rest);
          await db.clientProfiles.bulkAdd(sanitizedData);
          localStorage.setItem('seededClients', 'true');
        } catch (err) {
          console.error("Failed to seed client profiles:", err);
        }
      }
    };
    initDb();
  }, []);

  useEffect(() => {
    const clientIdParam = searchParams.get('clientId');
    if (clientIdParam && clients) {
      const client = clients.find(c => c.id === Number(clientIdParam));
      if (client) {
        handleOpenClient(client);
        setSearchParams({});
      }
    }
  }, [searchParams, clients, setSearchParams]);

  const filteredAndSortedClients = useMemo(() => {
    if (!clients) return [];
    
    let result = clients.filter(c => 
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.tin && c.tin.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    result.sort((a, b) => {
      if (sortBy === "name") return a.companyName.localeCompare(b.companyName);
      if (sortBy === "volume") return (b.totalOrders || 0) - (a.totalOrders || 0);
      if (sortBy === "credit") return (b.creditLimit || 0) - (a.creditLimit || 0);
      if (sortBy === "lastOrder") return new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime();
      return 0;
    });

    return result;
  }, [clients, searchQuery, sortBy]);

  const handleOpenClient = (client: ClientProfile) => {
    setActiveClient(client);
    setFormData(client);
    const cfs = client.raw_metadata ? Object.entries(client.raw_metadata).map(([key, value]) => ({ key, value })) : [];
    setCustomFields(cfs);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setActiveClient(null);
    setFormData({ paymentTerms: "Cash", creditCurrency: "USD" });
    setCustomFields([]);
    setIsModalOpen(true);
  };

  const handleAddCustomField = () => setCustomFields([...customFields, { key: "", value: "" }]);
  const handleCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    const newFields = [...customFields];
    newFields[index][field] = val;
    setCustomFields(newFields);
  };
  const handleRemoveCustomField = (index: number) => setCustomFields(customFields.filter((_, i) => i !== index));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw_metadata: Record<string, string> = {};
    customFields.forEach(f => {
      if (f.key.trim()) raw_metadata[f.key.trim()] = f.value.trim();
    });

    const payload = {
      ...formData,
      companyName: formData.companyName || "",
      tin: formData.tin || "",
      paymentTerms: formData.paymentTerms || "Cash",
      creditLimit: Number(formData.creditLimit) || 0,
      creditCurrency: formData.creditCurrency || "USD",
      raw_metadata,
      syncStatus: 'pending' as const
    } as ClientProfile;

    if (activeClient && activeClient.id) {
      await db.clientProfiles.update(activeClient.id, payload as any);
    } else {
      await db.clientProfiles.add(payload);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      await db.clientProfiles.delete(id);
    }
  };

  const clientHistory = useMemo(() => {
    if (!activeClient || !transactions) return [];
    return transactions.filter(t => t.clientId === activeClient.id).reverse();
  }, [activeClient, transactions]);

  const handleUpdateTransaction = async (txId: number, updates: any) => {
    const tx = transactions?.find(t => t.id === txId);
    if (!tx || !activeClient) return;
    const qtyDiff = updates.quantity - tx.quantity;
    
    await db.transactionLogs.update(txId, updates);
    
    const newTotalQty = (activeClient.totalQuantityProduced || 0) + qtyDiff;
    await db.clientProfiles.update(activeClient.id as any, {
      totalQuantityProduced: newTotalQty
    } as any);
    setActiveClient(prev => prev ? {...prev, totalQuantityProduced: newTotalQty} : null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Client Directory</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage B2B relationships and credit limits.</p>
        </div>
        <button onClick={handleCreateNew} className="btn-primary whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" /> New Client
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search clients by name or TIN..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-transparent border-none text-sm text-gray-700 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="volume">Sort by Volume</option>
            <option value="credit">Sort by Credit Limit</option>
            <option value="lastOrder">Sort by Last Order</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedClients?.map((client) => (
          <ClientCard key={client.id} client={client} onClick={() => handleOpenClient(client)} onDelete={handleDelete} />
        ))}
        {filteredAndSortedClients?.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-400 glass-card">
            No clients match your search criteria.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={activeClient ? "Client Profile & Analytics" : "Register New Client"} className="max-w-4xl">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Edit Form */}
          <div className="flex-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">Profile Details</h3>
            <form id="client-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Company Name</label>
                  <input required type="text" className="input-field" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">TIN / VAT Number</label>
                  <input type="text" className="input-field" value={formData.tin || ''} onChange={e => setFormData({...formData, tin: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Contact Person</label>
                  <input type="text" className="input-field" value={formData.contactPerson || ''} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Phone Number</label>
                  <input type="tel" className="input-field" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Email Address</label>
                  <input type="email" className="input-field" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Region / City</label>
                  <input type="text" className="input-field" value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Payment Terms</label>
                  <select className="input-field" value={formData.paymentTerms || 'Cash'} onChange={e => setFormData({...formData, paymentTerms: e.target.value})}>
                    <option>Cash</option>
                    <option>Standard</option>
                    <option>Net 30</option>
                    <option>Net 60</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Credit Limit</label>
                  <div className="flex">
                    <select className="input-field rounded-r-none w-20 border-r-0 focus:ring-0 px-2" value={formData.creditCurrency || 'USD'} onChange={e => setFormData({...formData, creditCurrency: e.target.value as any})}>
                      <option value="RWF">RWF</option>
                      <option value="USD">USD</option>
                    </select>
                    <input type="number" min="0" step="0.01" className="input-field rounded-l-none" value={formData.creditLimit || ''} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="label-text">Box Models (Preferences)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(formData.boxModels ? formData.boxModels.split(',').filter(b => b.trim()) : []).map((model, idx) => (
                    <span key={idx} className="flex items-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium border border-indigo-200 dark:border-indigo-500/30">
                      {model.trim()}
                      <button type="button" onClick={() => {
                        const newModels = formData.boxModels!.split(',').filter((_, i) => i !== idx).join(',');
                        setFormData({...formData, boxModels: newModels});
                      }} className="ml-1 hover:text-indigo-900 dark:hover:text-indigo-200">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" className="input-field" placeholder="Add a box model and press enter" onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        const current = formData.boxModels ? formData.boxModels.split(',').filter(b => b.trim()) : [];
                        if (!current.includes(val)) {
                          setFormData({...formData, boxModels: [...current, val].join(',')});
                        }
                        e.currentTarget.value = '';
                      }
                    }
                  }} />
                </div>
              </div>

              <div>
                <label className="label-text">Notes</label>
                <textarea className="input-field" rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Custom Fields</h4>
                  <button type="button" onClick={handleAddCustomField} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Field
                  </button>
                </div>
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex space-x-2 mb-2 items-center">
                    <input type="text" placeholder="Key" className="input-field w-1/3 py-1 text-sm" value={field.key} onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)} />
                    <input type="text" placeholder="Value" className="input-field flex-1 py-1 text-sm" value={field.value} onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)} />
                    <button type="button" onClick={() => handleRemoveCustomField(idx)} className="text-gray-400 hover:text-crimson-500 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </form>
          </div>

          {/* Deep Analytics Panel */}
          {activeClient && (
            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-slate-800 rounded-xl p-4 flex flex-col space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Analytics
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm text-center">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Orders</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{activeClient.totalOrders || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm text-center">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Qty</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{activeClient.totalQuantityProduced || 0}</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Credit Limit Utilization</p>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(activeClient.creditLimit || 0)}</span>
                  <span className="text-emerald-500">Available</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wider flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> Order History
                </h4>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  {clientHistory.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No order history available.</p>
                  ) : (
                    clientHistory.map(log => (
                      <OrderHistoryItem key={log.id} log={log} onUpdate={handleUpdateTransaction} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
          <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
          <button type="submit" form="client-form" className="btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" /> {activeClient ? 'Save Changes' : 'Register Client'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
