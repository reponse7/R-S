import { Routes, Route, Navigate, Outlet } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Dashboard } from "./pages/Dashboard"
import { Inventory } from "./pages/Inventory"
import { Clients } from "./pages/Clients"
import { Suppliers } from "./pages/Suppliers"
import { Procurement } from "./pages/Procurement"
import { Settings } from "./pages/Settings"
import { Auth } from "./pages/Auth"
import { useAuth } from "./context/AuthContext"

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // Or a very minimal loading state, but AuthContext rehydrates instantly from localStorage
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="clients" element={<Clients />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
