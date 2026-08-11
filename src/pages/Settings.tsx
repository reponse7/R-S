import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { db } from "../lib/localDb";
import { Download, FileText, Settings as SettingsIcon, TableProperties } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export function Settings() {
  const { exchangeRate, setExchangeRate } = useAppContext();
  const [activeTab, setActiveTab] = useState<'config' | 'reports'>('config');
  
  // FX State
  const [tempRate, setTempRate] = useState(exchangeRate.toString());

  const handleSaveFX = () => {
    const parsed = parseFloat(tempRate);
    if (!isNaN(parsed) && parsed > 0) {
      setExchangeRate(parsed);
      alert("Exchange rate updated successfully!");
    }
  };

  // Report State
  const [reportType, setReportType] = useState<'inventory' | 'transactions'>('inventory');
  
  const generateCSV = async () => {
    let data: any[] = [];
    if (reportType === 'inventory') {
      data = await db.stockItems.toArray();
    } else {
      data = await db.transactionLogs.toArray();
    }
    
    if (data.length === 0) {
      alert("No data available for export.");
      return;
    }

    const headers = Object.keys(data[0]).filter(k => k !== 'attributes' && k !== 'details');
    
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rs_${reportType}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    
    let data: any[] = [];
    let headers: string[] = [];
    let body: any[][] = [];

    if (reportType === 'inventory') {
      const items = await db.stockItems.toArray();
      data = items;
      headers = ['ID', 'Name', 'Category', 'Quantity', 'UoM', 'Unit Cost', 'Currency'];
      body = items.map(i => [i.id, i.name, i.category, i.quantity, i.unit, i.unitCost, i.unitCostCurrency]);
    } else {
      const logs = await db.transactionLogs.toArray();
      data = logs;
      headers = ['ID', 'Type', 'Item ID', 'Quantity', 'Date', 'Purpose'];
      body = logs.map(l => [l.id, l.type, l.itemId, l.quantity, new Date(l.date).toLocaleDateString(), l.purpose || '-']);
    }

    if (data.length === 0) {
      alert("No data available for export.");
      return;
    }

    doc.text(`RS Inventory - ${reportType === 'inventory' ? 'Inventory Status' : 'Transaction Logs'}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    (doc as any).autoTable({
      head: [headers],
      body: body,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // Emerald 500
    });

    doc.save(`rs_${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">System Settings & Reports</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Configure application parameters and export data.</p>
        </div>
        <div className="flex space-x-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl border border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('config')} 
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'config' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            System Config
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'reports' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            Report Generator
          </button>
        </div>
      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mr-3">
                <SettingsIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Currency & Exchange</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label-text">Default USD to RWF Exchange Rate</label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 sm:text-sm">
                    1 USD = 
                  </span>
                  <input 
                    type="number" 
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" 
                    value={tempRate}
                    onChange={e => setTempRate(e.target.value)}
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 sm:text-sm">
                    RWF
                  </span>
                </div>
              </div>
              
              <button onClick={handleSaveFX} className="btn-primary w-full justify-center bg-indigo-500 hover:bg-indigo-600">
                Update Exchange Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
             <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Export Module</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="label-text block mb-2">Select Data Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setReportType('inventory')}
                    className={`p-3 text-sm font-medium rounded-xl border flex items-center justify-center transition-all ${reportType === 'inventory' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                  >
                    Inventory Registry
                  </button>
                  <button 
                    onClick={() => setReportType('transactions')}
                    className={`p-3 text-sm font-medium rounded-xl border flex items-center justify-center transition-all ${reportType === 'transactions' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                  >
                    Transaction History
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-4">
                <button onClick={generateCSV} className="btn-secondary flex flex-col items-center justify-center py-4 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 group">
                  <TableProperties className="w-6 h-6 mb-2 text-gray-400 group-hover:text-emerald-500" />
                  Export as CSV
                </button>
                <button onClick={generatePDF} className="btn-secondary flex flex-col items-center justify-center py-4 hover:border-crimson-500 hover:text-crimson-600 dark:hover:text-crimson-400 group">
                  <Download className="w-6 h-6 mb-2 text-gray-400 group-hover:text-crimson-500" />
                  Export as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
