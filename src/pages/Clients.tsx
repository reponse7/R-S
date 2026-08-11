import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, MapPin, Briefcase, X, Save } from "lucide-react";
import { db, type ClientProfile } from "../lib/localDb";
import { Modal } from "../components/ui/Modal";
import clientsData from "../data/clientsData.json";

function EditableClientCard({ client, onDelete }: { client: ClientProfile; onDelete: (id: string | number) => void }) {
  const [formData, setFormData] = useState({
    companyName: client.companyName || '',
    tin: client.tin || '',
    phone: client.phone || '',
    email: client.email || '',
    paymentTerms: client.paymentTerms,
    creditLimit: client.creditLimit || 0,
    creditCurrency: client.creditCurrency || 'USD',
    boxModels: client.boxModels || '',
    totalOrders: client.totalOrders || 0,
    totalQuantityProduced: client.totalQuantityProduced || 0,
    lastOrderDate: client.lastOrderDate || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const updatedClient = {
      ...client,
      companyName: formData.companyName,
      tin: formData.tin,
      phone: formData.phone,
      email: formData.email,
      paymentTerms: formData.paymentTerms,
      creditLimit: Number(formData.creditLimit),
      creditCurrency: formData.creditCurrency as 'RWF' | 'USD',
      boxModels: formData.boxModels,
      totalOrders: Number(formData.totalOrders),
      totalQuantityProduced: Number(formData.totalQuantityProduced),
      lastOrderDate: formData.lastOrderDate
    };
    
    // Save to Dexie
    await db.clientProfiles.put(updatedClient);
    
    // Sync to API
    const allClients = await db.clientProfiles.toArray();
    fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allClients)
    }).catch(console.error);
  };

  return (
    <div className="glass-card p-6 flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button onClick={() => onDelete(client.id!)} className="text-gray-400 hover:text-red-500" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center space-x-3 mb-4 mt-2">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold uppercase">
          {(formData.companyName || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <input 
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full font-bold text-lg text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors" 
            placeholder="Client Name"
          />
          <div className="flex items-center text-xs text-gray-500 dark:text-slate-400">
            TIN: 
            <input 
              name="tin" 
              value={formData.tin} 
              onChange={handleChange}
              className="ml-1 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors w-24" 
              placeholder="N/A"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 flex-1">
        <div className="flex items-start text-sm text-gray-600 dark:text-slate-300">
          <Briefcase className="w-4 h-4 mr-2 mt-0.5 text-gray-400 shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-xs mr-1 text-gray-400 block">Models:</span>
            <input 
              name="boxModels" 
              value={formData.boxModels as string} 
              onChange={handleChange}
              className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors" 
              placeholder="e.g. Custom Box"
            />
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-slate-300">
          <span className="w-4 h-4 mr-2 flex items-center justify-center text-gray-400 font-bold">#</span>
          <span className="font-medium text-xs mr-1 text-gray-400">Total Orders:</span>
          <input 
            name="totalOrders" 
            type="number"
            value={formData.totalOrders as number} 
            onChange={handleChange}
            className="w-16 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors text-right" 
          />
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-slate-300">
          <span className="w-4 h-4 mr-2 flex items-center justify-center text-gray-400 font-bold">Q</span>
          <span className="font-medium text-xs mr-1 text-gray-400">Quantity:</span>
          <input 
            name="totalQuantityProduced" 
            type="number"
            value={formData.totalQuantityProduced as number} 
            onChange={handleChange}
            className="w-20 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors text-right" 
          />
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-medium text-xs mr-1 text-gray-400">Last Order:</span>
          <input 
            name="lastOrderDate" 
            type="date"
            value={formData.lastOrderDate as string} 
            onChange={handleChange}
            className="flex-1 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors text-xs" 
          />
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-slate-800/80 rounded-lg p-3 border border-gray-100 dark:border-slate-700 mb-4">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-gray-500">Terms</span>
          <select 
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            className="font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 text-right w-24"
          >
            <option value="Cash">Cash</option>
            <option value="Standard">Standard</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 60">Net 60</option>
            <option value="Advance">Advance</option>
          </select>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Credit Limit</span>
          <div className="flex items-center space-x-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">$</span>
            <input 
              name="creditLimit" 
              type="number"
              value={formData.creditLimit} 
              onChange={handleChange}
              className="w-20 font-medium text-emerald-600 dark:text-emerald-400 bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none transition-colors text-right" 
            />
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleSave}
        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <Save className="w-4 h-4 mr-2" /> Save Changes
      </button>
    </div>
  );
}

export function Clients() {
  const clients = useLiveQuery(() => db.clientProfiles.toArray());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [tin, setTin] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Cash");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditCurrency, setCreditCurrency] = useState<'RWF' | 'USD'>("USD");
  const [notes, setNotes] = useState("");
  
  // Custom Fields Engine
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

  useEffect(() => {
    const initDb = async () => {
      try {
        await db.clientProfiles.clear();
        // Remove 'id' string from json so Dexie auto-increments correctly
        const sanitizedData = clientsData.map(({ id, ...rest }: any) => rest);
        await db.clientProfiles.bulkAdd(sanitizedData);
      } catch (err) {
        console.error("Failed to seed client profiles:", err);
      }
    };
    initDb();
  }, []);

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    const newFields = [...customFields];
    newFields[index][field] = val;
    setCustomFields(newFields);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct raw_metadata from custom fields
    const raw_metadata: Record<string, string> = {};
    customFields.forEach(f => {
      if (f.key.trim()) raw_metadata[f.key.trim()] = f.value.trim();
    });

    const clientData = {
      companyName,
      tin,
      contactPerson,
      phone,
      email,
      region,
      paymentTerms,
      creditLimit: parseFloat(creditLimit) || 0,
      creditCurrency,
      notes,
      raw_metadata,
      syncStatus: 'pending' as const
    };

    if (editingId) {
      await db.clientProfiles.update(editingId, clientData);
    } else {
      await db.clientProfiles.add(clientData);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setCompanyName(""); setTin(""); setContactPerson(""); setPhone("");
    setEmail(""); setRegion(""); setPaymentTerms("Cash"); setCreditLimit(""); setNotes("");
    setCustomFields([]);
  };


  const handleDelete = async (id: string | number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      await db.clientProfiles.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Client Directory</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage B2B relationships and credit limits.</p>
        </div>
        <button onClick={() => { setEditingId(null); setCustomFields([]); setIsModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> New Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients?.map((client) => (
          <EditableClientCard key={client.id} client={client} onDelete={handleDelete} />
        ))}
        {clients?.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-400">
            No clients found. Add your first client to get started.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Client Profile" : "Register New Client"} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Company Name</label>
              <input required type="text" className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="label-text">TIN / VAT Number</label>
              <input type="text" className="input-field" value={tin} onChange={e => setTin(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Contact Person</label>
              <input required type="text" className="input-field" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Phone Number</label>
              <input required type="tel" className="input-field" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Email Address</label>
              <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Delivery Region / City</label>
              <input required type="text" className="input-field" value={region} onChange={e => setRegion(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Payment Terms</label>
              <select className="input-field" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                <option>Cash / Proforma</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 60</option>
              </select>
            </div>
            <div>
              <label className="label-text">Credit Limit</label>
              <div className="flex">
                <select className="input-field rounded-r-none w-24 border-r-0 focus:ring-0" value={creditCurrency} onChange={e => setCreditCurrency(e.target.value as 'RWF'|'USD')}>
                  <option value="RWF">RWF</option>
                  <option value="USD">USD</option>
                </select>
                <input type="number" min="0" step="0.01" className="input-field rounded-l-none" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div>
            <label className="label-text">Notes</label>
            <textarea className="input-field" rows={2} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Dynamic Custom Fields</h4>
              <button type="button" onClick={handleAddCustomField} className="text-xs flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                <Plus className="w-3 h-3 mr-1" /> Add Custom Field
              </button>
            </div>
            {customFields.map((field, idx) => (
              <div key={idx} className="flex space-x-2 mb-2 items-center">
                <input type="text" placeholder="Key (e.g. Tax Status)" className="input-field w-1/3 py-1.5 text-sm" value={field.key} onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)} />
                <input type="text" placeholder="Value" className="input-field flex-1 py-1.5 text-sm" value={field.value} onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)} />
                <button type="button" onClick={() => handleRemoveCustomField(idx)} className="text-gray-400 hover:text-crimson-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Register Client'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
