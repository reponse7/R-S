import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/localDb";
import { TrendingUp, Users, Package, AlertCircle, ChevronRight } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Modal } from "../components/ui/Modal";
import { useNavigate } from "react-router-dom";
import { generateAlerts } from "../lib/alerts";
import { cn } from "../lib/utils";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function TrendAnalysis() {
  const navigate = useNavigate();
  const stockItems = useLiveQuery(() => db.stockItems.toArray()) || [];
  const clientProfiles = useLiveQuery(() => db.clientProfiles.toArray()) || [];
  const transactionLogs = useLiveQuery(() => db.transactionLogs.toArray()) || [];
  const alerts = useLiveQuery(() => generateAlerts()) || [];

  const [drilldownModal, setDrilldownModal] = useState<{ title: string; type: 'velocity' | 'clients' | 'alerts' } | null>(null);

  const stockOuts = transactionLogs.filter(t => t.type === 'stock_out');
  
  // Prepare data for Line Chart (Velocity over last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  
  const velocityData = last7Days.map(date => {
    const qty = stockOuts
      .filter(t => t.date.startsWith(date))
      .reduce((sum, t) => sum + t.quantity, 0);
    return { name: date.slice(5), value: qty };
  });

  // Prepare data for Pie Chart (Box Demand)
  const boxDemandMap: Record<string, number> = {};
  clientProfiles.forEach(c => {
    if (c.boxModels) {
      c.boxModels.split(',').forEach(m => {
        const model = m.trim();
        if (model) {
          boxDemandMap[model] = (boxDemandMap[model] || 0) + (c.totalOrders || 0);
        }
      });
    }
  });
  const pieData = Object.entries(boxDemandMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a,b)=>b.value-a.value).slice(0,6);

  // Prepare data for Bar Chart (Top Clients)
  const topClients = [...clientProfiles].sort((a, b) => ((b as any).totalOrders || 0) - ((a as any).totalOrders || 0)).slice(0, 5);
  const barData = topClients.map(c => ({
    name: c.companyName.length > 10 ? c.companyName.slice(0,10) + '...' : c.companyName,
    orders: c.totalOrders || 0,
    qty: c.totalQuantityProduced || 0
  }));

  const reorderAlerts = stockItems.filter(s => s.quantity <= s.reorderPoint);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Trend Analysis Hub</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Deep operational insights and velocity metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 cursor-pointer hover:ring-2 ring-emerald-500 transition-all" onClick={() => setDrilldownModal({ title: 'Recent Stock-Outs', type: 'velocity' })}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg dark:bg-emerald-500/10 dark:text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Inventory Velocity</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stockOuts.length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Total Stock Out Transactions</p>
        </div>

        <div className="glass-card p-6 cursor-pointer hover:ring-2 ring-blue-500 transition-all" onClick={() => setDrilldownModal({ title: 'Active Clients', type: 'clients' })}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-500/10 dark:text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Active Clients</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{clientProfiles.length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Registered Profiles</p>
        </div>
        
        <div className="glass-card p-6 cursor-pointer hover:ring-2 ring-amber-500 transition-all" onClick={() => setDrilldownModal({ title: 'Reorder Alerts', type: 'alerts' })}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg dark:bg-amber-500/10 dark:text-amber-500">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Reorder Alerts</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{reorderAlerts.length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Items at or below reorder point</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Stock-Out Velocity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Clients (Order Vol vs Qty)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="qty" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Box Model Demand Distribution</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-500">No box model data available.</p>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pl-4">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs mb-2">
                    <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                    <span className="text-gray-700 dark:text-slate-300">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alerts Feed */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-500" /> Action & Alerts Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 max-h-64">
            {alerts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">No active alerts.</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={cn(
                  "p-3 rounded-lg border text-sm",
                  alert.type === 'critical' ? 'bg-crimson-50 border-crimson-200 text-crimson-900 dark:bg-crimson-500/10 dark:border-crimson-500/20 dark:text-crimson-200' :
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200' :
                  'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200'
                )}>
                  <p className="font-semibold">{alert.title}</p>
                  <p className="text-xs opacity-80">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Clients Quick Access</h3>
        {topClients.length === 0 ? (
          <p className="text-sm text-gray-500">No client data available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topClients.map(client => (
              <div 
                key={client.id} 
                onClick={() => navigate(`/clients?clientId=${client.id}`)}
                className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:ring-2 ring-indigo-500/50 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold mb-2">
                  {client.companyName.charAt(0).toUpperCase()}
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate w-full">{client.companyName}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  View Profile <ChevronRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!drilldownModal} onClose={() => setDrilldownModal(null)} title={drilldownModal?.title || ''} className="max-w-2xl">
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {drilldownModal?.type === 'velocity' && (
            <div className="space-y-2">
              {stockOuts.slice(0, 50).map(tx => (
                <div key={tx.id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg flex justify-between text-sm border border-gray-100 dark:border-slate-700">
                  <span className="dark:text-slate-300">{tx.purpose}</span>
                  <span className="font-bold text-crimson-600 dark:text-crimson-400">-{tx.quantity}</span>
                </div>
              ))}
            </div>
          )}
          {drilldownModal?.type === 'clients' && (
            <div className="space-y-2">
              {clientProfiles.map(c => (
                <div key={c.id} onClick={() => navigate(`/clients?clientId=${c.id}`)} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg flex justify-between text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700">
                  <span className="dark:text-slate-300">{c.companyName}</span>
                  <span className="text-gray-500 dark:text-slate-400">Orders: {c.totalOrders || 0}</span>
                </div>
              ))}
            </div>
          )}
          {drilldownModal?.type === 'alerts' && (
            <div className="space-y-2">
              {reorderAlerts.map(s => (
                <div key={s.id} onClick={() => navigate(`/inventory`)} className="p-3 bg-crimson-50 dark:bg-crimson-900/20 text-crimson-900 dark:text-crimson-200 rounded-lg flex justify-between text-sm cursor-pointer hover:bg-crimson-100 dark:hover:bg-crimson-900/40 border border-crimson-200 dark:border-crimson-500/30">
                  <span>{s.name}</span>
                  <span className="font-bold">{s.quantity} {s.unit} remaining (Min: {s.reorderPoint})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
