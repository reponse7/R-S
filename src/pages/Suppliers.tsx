import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Edit2, Trash2, MapPin, Truck, Phone, X } from "lucide-react";
import { db, type SupplierProfile } from "../lib/localDb";
import { Modal } from "../components/ui/Modal";

export function Suppliers() {
  const suppliers = useLiveQuery(() => db.supplierProfiles.toArray());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [address, setAddress] = useState("");
  const [categories, setCategories] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState<'RWF' | 'USD'>("USD");

  // Custom Fields Engine
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

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

    const supplierData = {
      name,
      contactInfo,
      address,
      categories: categories.split(',').map(c => c.trim()).filter(Boolean),
      paymentTerms,
      leadTimeDays: parseInt(leadTimeDays) || 0,
      preferredCurrency,
      raw_metadata,
      syncStatus: 'pending' as const
    };

    if (editingId) {
      await db.supplierProfiles.update(editingId, supplierData);
    } else {
      await db.supplierProfiles.add(supplierData);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setName(""); setContactInfo(""); setAddress(""); setCategories(""); setPaymentTerms(""); setLeadTimeDays(""); setPreferredCurrency("USD");
    setCustomFields([]);
  };

  const handleEdit = (supplier: SupplierProfile) => {
    setEditingId(supplier.id!);
    setName(supplier.name);
    setContactInfo(supplier.contactInfo);
    setAddress(supplier.address || "");
    setCategories(supplier.categories.join(', '));
    setPaymentTerms(supplier.paymentTerms);
    setLeadTimeDays(supplier.leadTimeDays?.toString() || "");
    setPreferredCurrency(supplier.preferredCurrency || "USD");
    
    const cFields = [];
    if (supplier.raw_metadata) {
      for (const [key, value] of Object.entries(supplier.raw_metadata)) {
        cFields.push({ key, value: String(value) });
      }
    }
    setCustomFields(cFields);

    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      await db.supplierProfiles.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Supplier Directory</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage material sources and vendor details.</p>
        </div>
        <button onClick={() => { setEditingId(null); setCustomFields([]); setIsModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> New Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers?.map((supplier) => (
          <div key={supplier.id} className="glass-card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button onClick={() => handleEdit(supplier)} className="text-gray-400 hover:text-purple-500">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(supplier.id!)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold uppercase">
                {supplier.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{supplier.name}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center">
                  <Truck className="w-3 h-3 mr-1" /> Lead Time: {supplier.leadTimeDays || 'Unknown'} days
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 flex-1">
              <div className="flex items-center text-sm text-gray-600 dark:text-slate-300">
                <Phone className="w-4 h-4 mr-2 text-gray-400" /> {supplier.contactInfo}
              </div>
              {supplier.address && (
                <div className="flex items-center text-sm text-gray-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {supplier.address}
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 dark:bg-slate-800/80 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Categories</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px] text-right" title={supplier.categories.join(', ')}>
                    {supplier.categories.join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Terms</span>
                  <span className="font-medium text-gray-900 dark:text-white">{supplier.paymentTerms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Preferred Cur.</span>
                  <span className="font-medium text-gray-900 dark:text-white">{supplier.preferredCurrency}</span>
                </div>
                {supplier.raw_metadata && Object.keys(supplier.raw_metadata).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                    {Object.entries(supplier.raw_metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-400">{k}</span>
                        <span className="font-medium text-gray-700 dark:text-slate-300">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {suppliers?.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-400">
            No suppliers found. Add your first supplier to get started.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Supplier Profile" : "Register New Supplier"} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Supplier / Mill Name</label>
              <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Preferred Currency</label>
              <select className="input-field" value={preferredCurrency} onChange={e => setPreferredCurrency(e.target.value as 'RWF'|'USD')}>
                <option value="USD">USD ($)</option>
                <option value="RWF">RWF (Frw)</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Contact Information</label>
              <input required type="text" className="input-field" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="Phone, Email, etc." />
            </div>
            <div>
              <label className="label-text">Physical Address</label>
              <input type="text" className="input-field" value={address} onChange={e => setAddress(e.target.value)} placeholder="HQ / Plant location" />
            </div>
          </div>

          <div>
            <label className="label-text">Supply Categories (comma separated)</label>
            <input required type="text" className="input-field" value={categories} onChange={e => setCategories(e.target.value)} placeholder="e.g. Kraft Paper, Fluting, Chemicals" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Lead Time (Days)</label>
              <input type="number" min="0" className="input-field" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} placeholder="e.g. 45" />
            </div>
            <div>
              <label className="label-text">Payment Terms</label>
              <input required type="text" className="input-field" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. 50% Adv, 50% LC" />
            </div>
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
                <input type="text" placeholder="Key (e.g. Preferred Port)" className="input-field w-1/3 py-1.5 text-sm" value={field.key} onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)} />
                <input type="text" placeholder="Value" className="input-field flex-1 py-1.5 text-sm" value={field.value} onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)} />
                <button type="button" onClick={() => handleRemoveCustomField(idx)} className="text-gray-400 hover:text-crimson-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Register Supplier'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
