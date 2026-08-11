import { Outlet, Link, useLocation } from "react-router-dom"
import { useTheme } from "./ThemeProvider"
import { useAppContext, type Currency } from "../context/AppContext"
import { useAuth } from "../context/AuthContext"
import { Sun, Moon, Package, Users, Truck, LayoutDashboard, Settings, Wifi, WifiOff, Bell, X, AlertTriangle, AlertCircle, Info, CheckCircle2, Menu, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "../lib/utils"
import { generateAlerts, type Alert } from "../lib/alerts"
import { RoyFloatingCopilot } from "./RoyFloatingCopilot"

function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const location = useLocation()
  const { logout } = useAuth()
  
  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Procurement", path: "/procurement", icon: Truck },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Suppliers", path: "/suppliers", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:bg-white/50 md:dark:bg-slate-800/50 md:backdrop-blur-xl",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center">
            <img src="/favicon.svg" alt="RS Logo" className="w-8 h-8 mr-2" />
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-500">RS Inventory</span>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => onClose()}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500" 
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                  )}
                >
                  <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-emerald-600 dark:text-emerald-500" : "text-gray-400 dark:text-slate-400")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 shrink-0">
          <button onClick={logout} className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
            <LogOut className="w-5 h-5 mr-3 text-gray-400" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

function Header({ onToggleAlerts, unreadCount, onMenuClick }: { onToggleAlerts: () => void, unreadCount: number, onMenuClick: () => void }) {
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useAppContext()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header className="h-16 border-b border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 transition-colors duration-200 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        {/* Can add breadcrumbs or title here later */}
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden sm:flex items-center text-sm font-medium">
          {isOnline ? (
            <span className="flex items-center text-emerald-600 dark:text-emerald-500">
              <Wifi className="w-4 h-4 mr-2" /> Online
            </span>
          ) : (
            <span className="flex items-center text-crimson-600 dark:text-crimson-500">
              <WifiOff className="w-4 h-4 mr-2" /> Offline
            </span>
          )}
        </div>
        
        <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
          {(["RWF", "USD"] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn(
                "px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors",
                currency === c 
                  ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          onClick={onToggleAlerts}
          className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-crimson-500 rounded-full border-2 border-white dark:border-slate-800">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

export function Layout() {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const newAlerts = await generateAlerts();
      setAlerts(newAlerts);
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = alerts.filter(a => a.type === 'critical').length;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header onMenuClick={() => setIsSidebarOpen(true)} onToggleAlerts={() => setIsAlertsOpen(!isAlertsOpen)} unreadCount={criticalCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10 pointer-events-none" />
          <div className="relative z-10 h-full">
            <Outlet />
          </div>
        </main>
        
        {/* Slide-out Notification Hub */}
        <div className={cn(
          "absolute top-0 right-0 h-full w-full sm:w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isAlertsOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" /> Action Center
            </h2>
            <button onClick={() => setIsAlertsOpen(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-3" />
                <p>You're all caught up!</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={cn(
                  "p-4 rounded-xl border relative shadow-sm hover:shadow-md transition-shadow cursor-default",
                  alert.type === 'critical' ? 'bg-crimson-50 dark:bg-crimson-500/10 border-crimson-200 dark:border-crimson-500/20' :
                  alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' :
                  'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                )}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {alert.type === 'critical' && <AlertCircle className="w-5 h-5 text-crimson-500" />}
                      {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      {alert.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div>
                      <h4 className={cn("text-sm font-semibold mb-1", 
                        alert.type === 'critical' ? 'text-crimson-900 dark:text-crimson-200' :
                        alert.type === 'warning' ? 'text-amber-900 dark:text-amber-200' :
                        'text-blue-900 dark:text-blue-200'
                      )}>{alert.title}</h4>
                      <p className={cn("text-xs leading-relaxed",
                        alert.type === 'critical' ? 'text-crimson-700 dark:text-crimson-300' :
                        alert.type === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                        'text-blue-700 dark:text-blue-300'
                      )}>{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Floating Copilot */}
        <RoyFloatingCopilot />
      </div>
    </div>
  )
}
