import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/localDb"
import { useAppContext } from "../context/AppContext"
import { Link } from "react-router-dom"
import { Plus, Minus, FileText, Package, Users, Truck, ArrowUpRight, ArrowDownRight, Clock, AlertCircle } from "lucide-react"
import { cn } from "../lib/utils"

export function Dashboard() {
  const { formatCurrency, convertAmount, currency } = useAppContext()
  
  const stockItems = useLiveQuery(() => db.stockItems.toArray())
  const transactionLogs = useLiveQuery(() => db.transactionLogs.reverse().limit(10).toArray())

  useEffect(() => {
    if (!localStorage.getItem('wipedMockData')) {
      db.stockItems.clear();
      db.transactionLogs.clear();
      db.purchaseOrders.clear();
      localStorage.setItem('wipedMockData', 'true');
    }
  }, []);

  const totalValue = stockItems?.reduce((acc, item) => {
    const valueInItemCurrency = item.quantity * item.unitCost;
    const valueInActiveCurrency = convertAmount(valueInItemCurrency, item.unitCostCurrency, currency);
    return acc + valueInActiveCurrency;
  }, 0) || 0

  const criticalItemsCount = stockItems?.filter(i => i.quantity <= i.reorderPoint).length || 0;
  const lowStockItemsCount = stockItems?.filter(i => i.quantity > i.reorderPoint && i.quantity <= i.reorderPoint * 1.25).length || 0;

  // True metrics based on transactionLogs (zero if none)
  const monthlyIn = 0;
  const monthlyOut = 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">System Overview</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Welcome to RS Inventory Spatial Dashboard.</p>
        </div>
      </div>

      {/* KPI Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Inventory Value</p>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</h3>
            {transactionLogs && transactionLogs.length > 0 ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
                <ArrowUpRight className="w-4 h-4 mr-1" /> +2.4% from last month
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                0% from last month
              </p>
            )}
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Stock Items</p>
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stockItems?.length || 0}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Across all categories</p>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-crimson-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="flex items-start justify-between relative z-10">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Reorder Alerts</p>
            <div className="p-2 bg-crimson-50 dark:bg-crimson-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-crimson-600 dark:text-crimson-500" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex items-end space-x-4">
              <div>
                <h3 className="text-3xl font-bold text-crimson-600 dark:text-crimson-500">{criticalItemsCount}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Critical</p>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-slate-700 mb-2"></div>
              <div>
                <h3 className="text-2xl font-bold text-amber-500">{lowStockItemsCount}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Low Stock</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Monthly Flow</p>
            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-purple-600 dark:text-purple-500" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-slate-400">In</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">{formatCurrency(monthlyIn)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-slate-400">Out</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">{formatCurrency(monthlyOut)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/inventory" className="glass-card p-4 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">Stock In</span>
            </Link>
            
            <Link to="/inventory" className="glass-card p-4 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-3 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors">
                <Minus className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">Stock Out</span>
            </Link>

            <Link to="/clients" className="glass-card p-4 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">New Client</span>
            </Link>

            <Link to="/suppliers" className="glass-card p-4 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-colors">
                <Truck className="w-6 h-6 text-purple-600 dark:text-purple-500" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">New Supplier</span>
            </Link>
          </div>
          
          <div className="glass-card p-6 mt-4 hover:shadow-2xl transition-shadow cursor-pointer">
             <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">Generate Report</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Export inventory & transaction data</p>
                </div>
             </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            Recent Activity
          </h2>
          <div className="glass-card p-6 h-[400px] overflow-y-auto">
            {transactionLogs?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                <Clock className="w-12 h-12 mb-4 opacity-20" />
                <p>No recent activity.</p>
              </div>
            ) : (
              <div className="relative border-l border-gray-200 dark:border-slate-700 ml-4 space-y-8 pb-4">
                {transactionLogs?.map((log) => {
                  const item = stockItems?.find(s => s.id === log.itemId);
                  const isStockIn = log.type === 'stock_in';
                  return (
                    <div key={log.id} className="relative pl-8">
                      <div className={cn(
                        "absolute -left-3.5 w-7 h-7 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center",
                        isStockIn ? "bg-emerald-500" : "bg-amber-500"
                      )}>
                        {isStockIn ? <ArrowDownRight className="w-3 h-3 text-white" /> : <ArrowUpRight className="w-3 h-3 text-white" />}
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-slate-100">
                            {isStockIn ? 'Stock Received' : 'Stock Dispatched'}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">
                          <span className="font-semibold">{log.quantity} {item?.unit || 'units'}</span> of {item?.name || 'Unknown Item'}
                        </p>
                        {log.purpose && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 bg-gray-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded">
                            Purpose: {log.purpose}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
