import { db } from "./localDb";

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  targetPath?: string; // Optional path for navigation (e.g. '/inventory', '/procurement')
}

export async function generateAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  const items = await db.stockItems.toArray();
  const purchaseOrders = await db.purchaseOrders.toArray();
  const suppliers = await db.supplierProfiles.toArray();
  const transactions = await db.transactionLogs.toArray();

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // 1. Reorder Point Alerts & Predictive Burn-Rate Analytics
  items.forEach(item => {
    // Basic ROP Logic
    if (item.quantity <= item.reorderPoint && item.quantity > 0) {
      alerts.push({
        id: `alert-rop-crit-${item.id}`,
        type: 'critical',
        title: 'Critical Stock Level',
        message: `${item.name} has dropped below the reorder point. Current stock: ${item.quantity} ${item.unit}.`,
        timestamp: new Date().toISOString(),
        targetPath: '/inventory'
      });
    } else if (item.quantity === 0) {
       alerts.push({
        id: `alert-rop-out-${item.id}`,
        type: 'critical',
        title: 'Stockout Warning',
        message: `${item.name} is completely out of stock!`,
        timestamp: new Date().toISOString(),
        targetPath: '/inventory'
      });
    }

    // Predictive Burn-Rate Analytics
    // Calculate daily average usage over the last 30 days
    const recentOuts = transactions.filter(t => t.itemId === item.id && t.type === 'stock_out' && new Date(t.date) >= thirtyDaysAgo);
    const totalOut = recentOuts.reduce((sum, t) => sum + t.quantity, 0);
    const dailyBurnRate = totalOut / 30;

    const supplier = suppliers.find(s => s.id === item.supplierId);
    const leadTime = supplier?.leadTimeDays || 30; // Default to 30 if no supplier linked

    if (dailyBurnRate > 0 && item.quantity > 0) {
      const daysUntilDepletion = item.quantity / dailyBurnRate;
      if (daysUntilDepletion <= leadTime + 5) {
        // If we will run out before a fresh shipment could realistically arrive (plus 5 days safety buffer)
        alerts.push({
          id: `alert-pred-burn-${item.id}`,
          type: 'warning',
          title: 'Predictive Stockout Warning',
          message: `At current burn rate (${dailyBurnRate.toFixed(1)} ${item.unit}/day), ${item.name} will run out in ~${Math.floor(daysUntilDepletion)} days. Supplier lead time is ${leadTime} days. Order now!`,
          timestamp: new Date().toISOString(),
          targetPath: '/procurement'
        });
      }
    }

    // Procurement Recommendations (AI/ROP)
    const activePO = purchaseOrders.find(po => po.materialName === item.name && po.status !== 'Warehouse Intake');
    if (item.quantity <= item.reorderPoint * 1.25 && item.quantity > item.reorderPoint && !activePO) {
       alerts.push({
        id: `alert-rec-${item.id}`,
        type: 'info',
        title: 'Procurement Recommendation',
        message: `Consider placing a new order for ${item.name} soon to prevent future stockouts.`,
        timestamp: new Date().toISOString(),
        targetPath: '/procurement'
      });
    }
  });

  // 2. Order Logistics Milestones
  purchaseOrders.forEach(po => {
    if (po.status === 'In Transit') {
      alerts.push({
        id: `alert-po-transit-${po.id}`,
        type: 'info',
        title: 'Shipment In Transit',
        message: `Order for ${po.materialName} is currently in transit to port.`,
        timestamp: new Date().toISOString(),
        targetPath: '/procurement'
      });
    } else if (po.status === 'Port Arrival') {
      alerts.push({
        id: `alert-po-port-${po.id}`,
        type: 'success',
        title: 'Port Arrival',
        message: `Order for ${po.materialName} has arrived at ${po.portLocation || 'port'} and is awaiting clearance.`,
        timestamp: new Date().toISOString(),
        targetPath: '/procurement'
      });
    }
  });

  return alerts;
}
