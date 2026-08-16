import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Package, AlertTriangle, CheckCircle2, AlertCircle, ArrowRight, Edit2, Trash2 } from "lucide-react";
import { db, type StockItem } from "../lib/localDb";
import { Modal } from "../components/ui/Modal";
import { useAppContext } from "../context/AppContext";
import { cn } from "../lib/utils";

const CATEGORIES = ['Packaging Paper (Kraft / Fluting / Testliner)', 'Sanitary Pulp & Fluff', 'Chemicals & Adhesives', 'Raw Components', 'Spare Parts & Hardware', 'Printing Ink & Solvents', 'Consumables'];
const UOMS = ['kg', 'MT', 'm²', 'L', 'Units', 'Rolls', 'Bales', 'Boxes'];
const SPEC_CHIPS = ['Grammage (GSM)', 'Roll Width (mm)', 'Core Dia (mm)', 'Moisture (%)', 'Burst (kPa)', 'Viscosity (cP)'];
const PURPOSES = ['Production / Manufacturing', 'Client Sales Dispatch', 'Sample / Testing', 'Internal Usage / Maintenance', 'Damaged / Waste'];

export function Inventory() {
  const { currency, formatCurrency, convertAmount } = useAppContext();
  const stockItems = useLiveQuery(() => db.stockItems.toArray());
  const clients = useLiveQuery(() => db.clientProfiles.toArray());
  
  const locationHook = useLocation();
  const searchParams = new URLSearchParams(locationHook.search);
  
  const [activeTab, setActiveTab] = useState<'intake' | 'dispatch'>(searchParams.get('tab') === 'dispatch' ? 'dispatch' : 'intake');

  useEffect(() => {
    if (searchParams.get('tab') === 'dispatch') {
      setActiveTab('dispatch');
    }
  }, [locationHook.search]);

  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Stock In Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(UOMS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [unitCostCurrency, setUnitCostCurrency] = useState<'RWF' | 'USD'>("USD");
  const [location, setLocation] = useState("");
  const [batchRef, setBatchRef] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  
  // Dynamic Specs
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [customSpecName, setCustomSpecName] = useState("");

  const addSpec = (specName: string) => {
    if (!specName) return;
    setSpecs(prev => ({ ...prev, [specName]: "" }));
    setCustomSpecName("");
  };

  const removeSpec = (specName: string) => {
    const newSpecs = { ...specs };
    delete newSpecs[specName];
    setSpecs(newSpecs);
  };

  // Stock Out Form State
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [outQuantity, setOutQuantity] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientOverride, setClientOverride] = useState("");

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseFloat(quantity);
    const finalCategory = category === "+ Add Custom Category" ? customCategory : category;
    const finalUnit = unit === "+ Custom UoM" ? customUnit : unit;
    const finalBatch = batchRef || `PO-${Date.now().toString().slice(-6)}`;
    
    const existing = stockItems?.find(s => s.name.toLowerCase() === name.toLowerCase() && s.category === finalCategory);
    
    if (editingId) {
      const itemToEdit = stockItems?.find(s => s.id === editingId);
      const currentBatches = itemToEdit?.batches || [];
      if (batchRef && !currentBatches.find(b => b.ref === batchRef)) {
         currentBatches.push({ ref: batchRef, quantity: parsedQty, date: new Date().toISOString() });
      }

      await db.stockItems.update(editingId, {
        name,
        category: finalCategory,
        quantity: parsedQty,
        unit: finalUnit,
        reorderPoint: parseFloat(reorderPoint) || 0,
        unitCost: parseFloat(unitCost) || 0,
        unitCostCurrency,
        location,
        supplierName,
        leadTime: parseFloat(leadTime) || 0,
        batches: currentBatches.length > 0 ? currentBatches : (batchRef ? [{ ref: batchRef, quantity: parsedQty, date: new Date().toISOString() }] : []),
        attributes: specs,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      });
    } else if (existing && existing.id) {
      // Smart Batch Aggregation
      const currentBatches = existing.batches || [];
      const batchExists = currentBatches.find(b => b.ref === finalBatch);
      if (batchExists) {
         batchExists.quantity += parsedQty;
      } else {
         currentBatches.push({ ref: finalBatch, quantity: parsedQty, date: new Date().toISOString() });
      }

      await db.stockItems.update(existing.id, {
        quantity: existing.quantity + parsedQty,
        unitCost: parseFloat(unitCost) || existing.unitCost,
        unitCostCurrency,
        supplierName: supplierName || existing.supplierName,
        leadTime: parseFloat(leadTime) || existing.leadTime,
        batches: currentBatches,
        syncStatus: 'pending'
      });
      
      await db.transactionLogs.add({
        type: 'stock_in',
        itemId: existing.id,
        quantity: parsedQty,
        purpose: 'Restock',
        date: new Date().toISOString(),
        syncStatus: 'pending'
      });
    } else {
      const newItemId = await db.stockItems.add({
        name,
        category: finalCategory,
        quantity: parsedQty,
        unit: finalUnit,
        reorderPoint: parseFloat(reorderPoint) || 0,
        safetyStock: 0,
        unitCost: parseFloat(unitCost) || 0,
        unitCostCurrency,
        location,
        supplierName,
        leadTime: parseFloat(leadTime) || 0,
        batches: [{ ref: finalBatch, quantity: parsedQty, date: new Date().toISOString() }],
        attributes: specs,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      });
      
      await db.transactionLogs.add({
        type: 'stock_in',
        itemId: newItemId,
        quantity: parsedQty,
        purpose: 'Initial Intake',
        date: new Date().toISOString(),
        syncStatus: 'pending'
      });
    }
    
    setIsStockInModalOpen(false);
    setEditingId(null);
    // Reset form
    setName(""); setQuantity(""); setUnitCost(""); setLocation(""); setBatchRef(""); setSupplierName(""); setLeadTime(""); setSpecs({}); setReorderPoint("");
  };

  const handleEdit = (item: StockItem) => {
    setEditingId(item.id!);
    setName(item.name);
    setCategory(CATEGORIES.includes(item.category) ? item.category : "+ Add Custom Category");
    if (!CATEGORIES.includes(item.category)) setCustomCategory(item.category);
    setQuantity(item.quantity.toString());
    setUnit(UOMS.includes(item.unit) ? item.unit : "+ Custom UoM");
    if (!UOMS.includes(item.unit)) setCustomUnit(item.unit);
    setUnitCost(item.unitCost.toString());
    setUnitCostCurrency(item.unitCostCurrency || 'USD');
    setLocation(item.location || "");
    setBatchRef(""); // Intentionally empty to allow appending new batches in edit mode
    setSupplierName(item.supplierName || "");
    setLeadTime(item.leadTime?.toString() || "");
    setReorderPoint(item.reorderPoint.toString());
    
    const attrs = item.attributes || {};
    const stringSpecs: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      stringSpecs[k] = String(v);
    }
    setSpecs(stringSpecs);
    
    setIsStockInModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this stock item?")) {
      await db.stockItems.delete(id);
    }
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedItem.id) return;
    
    const parsedQty = parseFloat(outQuantity);
    if (parsedQty > selectedItem.quantity) {
      alert("Cannot dispatch more than available stock!");
      return;
    }

    const finalPurpose = purpose === "+ Custom Purpose" ? customPurpose : purpose;

    await db.stockItems.update(selectedItem.id, {
      quantity: selectedItem.quantity - parsedQty,
      syncStatus: 'pending'
    });
    
    await db.transactionLogs.add({
      type: 'stock_out',
      itemId: selectedItem.id,
      quantity: parsedQty,
      purpose: finalPurpose,
      clientId: selectedClientId ? parseInt(selectedClientId) : undefined,
      clientNameOverride: clientOverride,
      date: new Date().toISOString(),
      syncStatus: 'pending'
    });

    // Update client analytics if a client was selected
    if (selectedClientId) {
      const client = clients?.find(c => c.id === selectedClientId || c.id === parseInt(selectedClientId));
      if (client) {
         await db.clientProfiles.update(client.id!, {
           totalOrders: (client.totalOrders || 0) + 1,
           totalQuantityProduced: (client.totalQuantityProduced || 0) + parsedQty,
           lastOrderDate: new Date().toISOString().split('T')[0],
           syncStatus: 'pending'
         });
      }
    }
    
    setIsStockOutModalOpen(false);
    setSelectedItem(null); setOutQuantity(""); setSelectedClientId(""); setClientOverride("");
  };

  const getStatusBadge = (item: StockItem) => {
    const rop = item.reorderPoint;
    if (item.quantity <= rop) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-crimson-100 text-crimson-800 dark:bg-crimson-500/20 dark:text-crimson-300 shadow-sm border border-crimson-200 dark:border-crimson-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Critical</span>;
    } else if (item.quantity <= rop * 1.25) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 shadow-sm border border-amber-200 dark:border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Low Stock</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Healthy</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Inventory Registry</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage active materials and dispatch operations.</p>
        </div>
        <div className="flex space-x-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('intake')} 
            className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'intake' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}
          >
            Intake & Registry
          </button>
          <button 
            onClick={() => setActiveTab('dispatch')} 
            className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'dispatch' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}
          >
            Spatial Dispatch Hub
          </button>
        </div>
      </div>

      {activeTab === 'intake' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditingId(null); setIsStockInModalOpen(true); }} className="btn-primary shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-transform">
              <Plus className="w-4 h-4 mr-2" /> Universal Intake Registry
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50 dark:divide-slate-700/50">
                <thead className="bg-gray-50/50 dark:bg-slate-800/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Material Info</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Available Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Unit Cost</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Location / PO</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                  {stockItems?.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">No materials registered.</td></tr>
                  ) : stockItems?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.category}</div>
                        {Object.keys(item.attributes || {}).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(item.attributes).map(([k, v]) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">{k}: {v}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.quantity} {item.unit}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">ROP: {item.reorderPoint}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {formatCurrency(convertAmount(item.unitCost, item.unitCostCurrency, currency))}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          (Original: {item.unitCostCurrency} {item.unitCost})
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-slate-100">{item.location || 'Unassigned'}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">{item.batches?.map(b => b.ref).join(', ') || 'No Batch'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => handleEdit(item)} className="text-gray-400 hover:text-blue-500 mr-3">
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button onClick={() => handleDelete(item.id!)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stockItems?.map(item => (
            <div key={item.id} className="glass-card p-5 group flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-transparent via-amber-500 to-transparent h-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-3">
                {getStatusBadge(item)}
                <span className="text-xs font-mono text-gray-400">{item.batches?.length ? item.batches[0].ref : 'No Batch'}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1">{item.name}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{item.category}</p>
              
              <div className="bg-gray-50 dark:bg-slate-800/80 rounded-lg p-3 mb-4 border border-gray-100 dark:border-slate-700 flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-slate-400">Available:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{item.quantity} {item.unit}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-slate-400">Location:</span>
                  <span className="text-gray-900 dark:text-white">{item.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Value:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatCurrency(convertAmount(item.unitCost, item.unitCostCurrency, currency))}/{item.unit}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => { setSelectedItem(item); setIsStockOutModalOpen(true); }}
                disabled={item.quantity <= 0}
                className="w-full btn-primary bg-amber-500 hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center py-2.5 rounded-xl shadow-lg shadow-amber-500/20"
              >
                Dispatch Material <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          ))}
          {stockItems?.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No inventory available for dispatch.
            </div>
          )}
        </div>
      )}

      {/* Stock In Modal (Universal Registry) */}
      <Modal isOpen={isStockInModalOpen} onClose={() => setIsStockInModalOpen(false)} title="Universal Material Intake Registry" className="max-w-3xl">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs px-3 py-1 rounded-md mb-4 font-medium inline-flex items-center border border-emerald-200 dark:border-emerald-500/30">
          <Package className="w-3 h-3 mr-1" /> 100% Customizable Schema
        </div>
        <form onSubmit={handleStockIn} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Material / Item Name</label>
              <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Kraft Liner Virgin Pine" />
            </div>
            <div>
              <label className="label-text">Category</label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                <option>+ Add Custom Category</option>
              </select>
              {category === "+ Add Custom Category" && (
                <input required type="text" className="input-field mt-2" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Custom category name..." />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Quantity Received</label>
              <input required type="number" min="0" step="0.01" className="input-field" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="label-text">UoM (Unit)</label>
              <select className="input-field" value={unit} onChange={e => setUnit(e.target.value)}>
                {UOMS.map(u => <option key={u}>{u}</option>)}
                <option>+ Custom UoM</option>
              </select>
              {unit === "+ Custom UoM" && (
                <input required type="text" className="input-field mt-2" value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="e.g., Pallets" />
              )}
            </div>
            <div>
              <label className="label-text">Reorder Point (Alert)</label>
              <input type="number" min="0" step="0.01" className="input-field" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} placeholder="Alert threshold" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="label-text">Unit Landed Price</label>
              <div className="flex">
                <select className="input-field rounded-r-none w-24 border-r-0 focus:ring-0" value={unitCostCurrency} onChange={e => setUnitCostCurrency(e.target.value as 'RWF'|'USD')}>
                  <option value="USD">USD ($)</option>
                  <option value="RWF">RWF (Frw)</option>
                </select>
                <input type="number" min="0" step="0.01" className="input-field rounded-l-none" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" />
              </div>
              <p className="text-xs text-gray-500 mt-1 pl-1">
                ≈ {formatCurrency(convertAmount(parseFloat(unitCost)||0, unitCostCurrency, currency === 'USD' ? 'RWF' : 'USD'), currency === 'USD' ? 'RWF' : 'USD')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Warehouse Location / Bay</label>
              <input type="text" className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="Warehouse Bay A-01" />
            </div>
            <div>
              <label className="label-text">Batch / PO Reference</label>
              <input type="text" className="input-field" value={batchRef} onChange={e => setBatchRef(e.target.value)} placeholder="Auto-generates if blank" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Supplier Name (Optional)</label>
              <input type="text" className="input-field" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier Ltd" />
            </div>
            <div>
              <label className="label-text">Lead Time (Days)</label>
              <input required type="number" min="0" className="input-field" value={leadTime} onChange={e => setLeadTime(e.target.value)} placeholder="e.g. 14" />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <label className="label-text mb-2">Dynamic Specification Parameters</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {SPEC_CHIPS.map(chip => (
                <button key={chip} type="button" onClick={() => addSpec(chip)} disabled={specs[chip] !== undefined} className="text-xs px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">
                  + {chip}
                </button>
              ))}
              <div className="flex items-center">
                <input type="text" className="input-field py-1 text-xs w-32 rounded-r-none border-r-0" placeholder="Custom..." value={customSpecName} onChange={e => setCustomSpecName(e.target.value)} />
                <button type="button" onClick={() => addSpec(customSpecName)} className="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 px-2 py-1 text-xs rounded-r-lg border border-gray-300 dark:border-slate-500 hover:bg-gray-300 dark:hover:bg-slate-500">Add</button>
              </div>
            </div>
            
            {Object.keys(specs).length > 0 && (
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(specs).map(([key, val]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300 w-1/3 truncate">{key}</label>
                    <input type="text" className="input-field py-1 text-sm flex-1" value={val} onChange={e => setSpecs({...specs, [key]: e.target.value})} />
                    <button type="button" onClick={() => removeSpec(key)} className="text-red-500 hover:text-red-700 p-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700">
            <button type="button" onClick={() => setIsStockInModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary px-8">Register Intake</button>
          </div>
        </form>
      </Modal>

      {/* Spatial Dispatch Modal */}
      <Modal isOpen={isStockOutModalOpen} onClose={() => {setIsStockOutModalOpen(false); setSelectedItem(null)}} title="Dispatch Hub Workflow">
        {selectedItem && (
          <form onSubmit={handleStockOut} className="space-y-5">
            <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30">
              <h4 className="font-bold text-amber-900 dark:text-amber-400">{selectedItem.name}</h4>
              <p className="text-sm text-amber-700 dark:text-amber-500/80 mb-2">{selectedItem.batches?.[0]?.ref || 'No Batch'} • {selectedItem.location || 'No Location'}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-amber-900 dark:text-amber-400">Available: <span className="font-bold">{selectedItem.quantity} {selectedItem.unit}</span></span>
                <span className="text-amber-700 dark:text-amber-500/80">Value: {formatCurrency(convertAmount(selectedItem.unitCost, selectedItem.unitCostCurrency, currency))}/{selectedItem.unit}</span>
              </div>
            </div>

            <div>
              <label className="label-text">Quantity to Dispatch / Consume</label>
              <div className="relative">
                <input required type="number" min="0.01" max={selectedItem.quantity} step="0.01" className="input-field pr-16 text-lg font-bold" value={outQuantity} onChange={e => setOutQuantity(e.target.value)} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{selectedItem.unit}</span>
              </div>
            </div>

            <div>
              <label className="label-text">Purpose / Reason</label>
              <select className="input-field" value={purpose} onChange={e => setPurpose(e.target.value)}>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
                <option>+ Custom Purpose</option>
              </select>
              {purpose === "+ Custom Purpose" && (
                <input required type="text" className="input-field mt-2" value={customPurpose} onChange={e => setCustomPurpose(e.target.value)} placeholder="Custom reason..." />
              )}
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
              <label className="label-text text-xs uppercase tracking-wider text-gray-500 mb-3">Client Allocation (Optional)</label>
              <select className="input-field mb-2" value={selectedClientId} onChange={e => {setSelectedClientId(e.target.value); setClientOverride("");}}>
                <option value="">-- No Client Associated --</option>
                {clients?.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
                <span className="px-3 text-xs text-gray-400">OR manual override</span>
                <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
              </div>
              <input type="text" className="input-field" value={clientOverride} onChange={e => {setClientOverride(e.target.value); setSelectedClientId("");}} placeholder="One-off client name..." />
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsStockOutModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary bg-amber-500 hover:bg-amber-600 px-8">Confirm Dispatch</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
