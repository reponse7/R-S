import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PurchaseOrder } from "../lib/localDb";
import { Modal } from "../components/ui/Modal";
import { Plus, Check, Clock, Ship, Warehouse, Factory, ArrowRight, Edit2, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

const STAGES = ['In Production', 'In Transit', 'Port Arrival', 'Warehouse Intake'];

export function Procurement() {
  const purchaseOrders = useLiveQuery(() => db.purchaseOrders.toArray());
  const suppliers = useLiveQuery(() => db.supplierProfiles.toArray());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockInPromptOpen, setIsStockInPromptOpen] = useState(false);
  const [orderToStockIn, setOrderToStockIn] = useState<PurchaseOrder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("MT");
  
  // Independent Specs
  const [dimL, setDimL] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimH, setDimH] = useState("");
  const [gsm, setGsm] = useState("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert("Select a supplier");
    
    const supplier = suppliers?.find(s => s.id === parseInt(supplierId));
    const specifications = {
      dimensions: `${dimL}x${dimW}x${dimH}`,
      gsm,
      grade,
      notes
    };

    if (editingId) {
      await db.purchaseOrders.update(editingId, {
        supplierId: parseInt(supplierId),
        materialName,
        quantity: parseFloat(quantity),
        unit,
        specifications,
        syncStatus: 'pending'
      });
    } else {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (supplier?.leadTimeDays || 30));

      await db.purchaseOrders.add({
        supplierId: parseInt(supplierId),
        materialName,
        quantity: parseFloat(quantity),
        unit,
        specifications,
        status: 'In Production',
        orderDate: new Date().toISOString(),
        targetDate: targetDate.toISOString(),
        syncStatus: 'pending'
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    // reset
    setSupplierId(""); setMaterialName(""); setQuantity(""); setUnit("MT");
    setDimL(""); setDimW(""); setDimH(""); setGsm(""); setGrade(""); setNotes("");
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingId(order.id!);
    setSupplierId(order.supplierId.toString());
    setMaterialName(order.materialName);
    setQuantity(order.quantity.toString());
    setUnit(order.unit);
    
    const dims = order.specifications.dimensions?.split('x') || ['', '', ''];
    setDimL(dims[0] || '');
    setDimW(dims[1] || '');
    setDimH(dims[2] || '');
    
    setGsm(order.specifications.gsm || '');
    setGrade(order.specifications.grade || '');
    setNotes(order.specifications.notes || '');
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this purchase order?")) {
      await db.purchaseOrders.delete(id);
    }
  };

  const advanceStage = async (order: PurchaseOrder, newStatus: PurchaseOrder['status']) => {
    if (newStatus === 'Warehouse Intake' && order.status === 'Warehouse Intake') {
      // Trigger stock in
      setOrderToStockIn(order);
      setIsStockInPromptOpen(true);
      return;
    }
    
    await db.purchaseOrders.update(order.id!, {
      status: newStatus,
      syncStatus: 'pending'
    });
  };

  const handleFinalStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToStockIn) return;

    // We generate a batch ref and create the stock item
    const batchRef = `PO-${orderToStockIn.id}-${Date.now().toString().slice(-4)}`;
    
    // Check if item exists (simple match by name)
    const existing = await db.stockItems.where('name').equalsIgnoreCase(orderToStockIn.materialName).first();
    
    if (existing && existing.id) {
       await db.stockItems.update(existing.id, {
         quantity: existing.quantity + orderToStockIn.quantity,
         syncStatus: 'pending'
       });
       await db.transactionLogs.add({
        type: 'stock_in',
        itemId: existing.id,
        quantity: orderToStockIn.quantity,
        purpose: 'PO Fulfillment',
        date: new Date().toISOString(),
        syncStatus: 'pending'
      });
    } else {
       const newItemId = await db.stockItems.add({
          name: orderToStockIn.materialName,
          category: 'Raw Material',
          quantity: orderToStockIn.quantity,
          unit: orderToStockIn.unit,
          reorderPoint: 0,
          safetyStock: 0,
          unitCost: 0,
          unitCostCurrency: 'USD',
          location: 'Main Warehouse',
          batchRef,
          attributes: orderToStockIn.specifications,
          lastUpdated: new Date().toISOString(),
          syncStatus: 'pending'
       });
       await db.transactionLogs.add({
        type: 'stock_in',
        itemId: newItemId,
        quantity: orderToStockIn.quantity,
        purpose: 'PO Fulfillment',
        date: new Date().toISOString(),
        syncStatus: 'pending'
      });
    }

    // Mark PO as Completed (we can remove it from view or add a 'Completed' status, let's just delete for now or keep in DB with completed status if we expand it later. We'll delete it to clear pipeline.)
    await db.purchaseOrders.delete(orderToStockIn.id!);
    
    setIsStockInPromptOpen(false);
    setOrderToStockIn(null);
  };

  const updatePort = async (orderId: number, port: 'Mombasa Port' | 'Dar es Salaam Port') => {
    await db.purchaseOrders.update(orderId, {
      portLocation: port,
      syncStatus: 'pending'
    });
  };

  const renderCard = (order: PurchaseOrder) => {
    const supplier = suppliers?.find(s => s.id === order.supplierId);
    
    const getDaysDiff = (target: string) => {
      const diff = new Date(target).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const daysLeft = getDaysDiff(order.targetDate);
    const timeText = daysLeft < 0 ? `Delayed by ${Math.abs(daysLeft)} days` : `Ready in ${daysLeft} days`;
    const isDelayed = daysLeft < 0;

    return (
      <div key={order.id} className="relative glass-card p-4 mb-4 text-sm flex flex-col group cursor-default shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-indigo-500">
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-white/80 dark:bg-slate-800/80 rounded-md p-1 backdrop-blur shadow-sm">
          <button onClick={() => handleEdit(order)} className="p-1 text-gray-400 hover:text-indigo-500 rounded hover:bg-indigo-50 dark:hover:bg-slate-700">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(order.id!)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-slate-700">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex justify-between items-start mb-2 pr-12">
          <span className="font-bold text-gray-900 dark:text-white truncate">{order.materialName}</span>
          <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-medium text-gray-600 dark:text-slate-300 whitespace-nowrap">
            {order.quantity} {order.unit}
          </span>
        </div>
        
        <p className="text-gray-500 dark:text-slate-400 text-xs mb-3 flex items-center">
          <Factory className="w-3 h-3 mr-1" /> {supplier?.name || 'Unknown Supplier'}
        </p>
        
        <div className="bg-gray-50 dark:bg-slate-800/80 rounded p-2 mb-3 border border-gray-100 dark:border-slate-700">
           {order.status === 'In Production' && (
             <div className={cn("text-xs font-medium flex items-center", isDelayed ? "text-crimson-600 dark:text-crimson-400" : "text-emerald-600 dark:text-emerald-500")}>
               <Clock className="w-3 h-3 mr-1" /> {timeText}
             </div>
           )}
           {order.status === 'In Transit' && (
             <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center">
               <Ship className="w-3 h-3 mr-1" /> Estimated 14 days transit
             </div>
           )}
           {order.status === 'Port Arrival' && (
             <div className="mt-1">
               <select 
                 className="w-full text-xs p-1 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-indigo-500"
                 value={order.portLocation || ''}
                 onChange={(e) => updatePort(order.id!, e.target.value as any)}
               >
                 <option value="" disabled>Select Port...</option>
                 <option value="Mombasa Port">Mombasa Port</option>
                 <option value="Dar es Salaam Port">Dar es Salaam Port</option>
               </select>
             </div>
           )}
           {order.status === 'Warehouse Intake' && (
             <div className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center">
               <Warehouse className="w-3 h-3 mr-1" /> Awaiting final intake
             </div>
           )}
        </div>

        <div className="mt-auto flex justify-end">
          {order.status === 'In Production' && (
            <button onClick={() => advanceStage(order, 'In Transit')} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-300 px-3 py-1.5 rounded-lg flex items-center font-medium transition-colors">
              Dispatch <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          )}
          {order.status === 'In Transit' && (
            <button onClick={() => advanceStage(order, 'Port Arrival')} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-300 px-3 py-1.5 rounded-lg flex items-center font-medium transition-colors">
              Arrive at Port <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          )}
          {order.status === 'Port Arrival' && (
            <button onClick={() => advanceStage(order, 'Warehouse Intake')} disabled={!order.portLocation} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-300 px-3 py-1.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50">
              Clear Customs <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          )}
          {order.status === 'Warehouse Intake' && (
            <button onClick={() => advanceStage(order, 'Warehouse Intake')} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center font-medium shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
              <Check className="w-3 h-3 mr-1" /> Finalize Stock In
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Ongoing Orders Pipeline</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track incoming raw materials across a 4-stage logistics pipeline.</p>
        </div>
        <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="btn-primary shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-transform">
          <Plus className="w-4 h-4 mr-2" /> New Order
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex space-x-6 min-w-max h-full">
          {STAGES.map(stage => (
            <div key={stage} className="w-80 flex flex-col bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-gray-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-gray-700 dark:text-slate-200">{stage}</h3>
                <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {purchaseOrders?.filter(po => po.status === stage).length || 0}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {purchaseOrders?.filter(po => po.status === stage).map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Purchase Order" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Supplier</label>
              <select required className="input-field" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">-- Select Supplier --</option>
                {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name} (Lead: {s.leadTimeDays}d)</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Material Name</label>
              <input required type="text" className="input-field" value={materialName} onChange={e => setMaterialName(e.target.value)} placeholder="e.g. Kraft Liner 150GSM" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Order Quantity</label>
              <input required type="number" min="0" step="0.01" className="input-field" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Unit of Measurement</label>
              <input required type="text" className="input-field" value={unit} onChange={e => setUnit(e.target.value)} placeholder="MT, Rolls, etc." />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Independent Specifications</h4>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label-text text-[10px]">Length</label>
                <input type="text" className="input-field py-1.5 text-sm" value={dimL} onChange={e => setDimL(e.target.value)} placeholder="L" />
              </div>
              <div>
                <label className="label-text text-[10px]">Width</label>
                <input type="text" className="input-field py-1.5 text-sm" value={dimW} onChange={e => setDimW(e.target.value)} placeholder="W" />
              </div>
              <div>
                <label className="label-text text-[10px]">Height / Dia</label>
                <input type="text" className="input-field py-1.5 text-sm" value={dimH} onChange={e => setDimH(e.target.value)} placeholder="H" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="label-text">GSM / Grammage</label>
                <input type="text" className="input-field" value={gsm} onChange={e => setGsm(e.target.value)} placeholder="e.g. 150" />
              </div>
              <div>
                <label className="label-text">Material Grade</label>
                <input type="text" className="input-field" value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Premium Virgin" />
              </div>
            </div>

            <div>
              <label className="label-text">Custom Production Notes</label>
              <textarea className="input-field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific requirements..."></textarea>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary bg-indigo-500 hover:bg-indigo-600 px-8">Submit Order</button>
          </div>
        </form>
      </Modal>

      {/* Final Stock In Prompt Modal */}
      <Modal isOpen={isStockInPromptOpen} onClose={() => setIsStockInPromptOpen(false)} title="Finalize Warehouse Intake">
        {orderToStockIn && (
          <form onSubmit={handleFinalStockIn} className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-400">{orderToStockIn.materialName}</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-500/80 mb-2">Arriving from {orderToStockIn.portLocation}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-emerald-900 dark:text-emerald-400">Intake Quantity: <span className="font-bold">{orderToStockIn.quantity} {orderToStockIn.unit}</span></span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Confirming this intake will immediately add {orderToStockIn.quantity} {orderToStockIn.unit} of {orderToStockIn.materialName} to the active inventory registry.
            </p>
            <div className="pt-4 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsStockInPromptOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Confirm & Commit Stock</button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
