import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Fees } from './pages/Fees'
import { TaxpayerHome } from './pages/taxpayer/TaxpayerHome'
import { Prepare } from './pages/taxpayer/Prepare'
import { Vault } from './pages/taxpayer/Vault'
import { TaxpayerAi } from './pages/taxpayer/TaxpayerAi'
import { PreparerHome } from './pages/preparer/PreparerHome'
import { Clients } from './pages/preparer/Clients'
import { Workspace } from './pages/preparer/Workspace'
import { OfficeHome } from './pages/office/OfficeHome'
import { Staff } from './pages/office/Staff'
import { Pipeline } from './pages/office/Pipeline'
import { AdminHome } from './pages/admin/AdminHome'
import { Tenants } from './pages/admin/Tenants'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<RequireAuth />}>
        <Route path="taxpayer" element={<TaxpayerHome />} />
        <Route path="taxpayer/prepare" element={<Prepare />} />
        <Route path="taxpayer/vault" element={<Vault />} />
        <Route path="taxpayer/ai" element={<TaxpayerAi />} />
        <Route path="preparer" element={<PreparerHome />} />
        <Route path="preparer/clients" element={<Clients />} />
        <Route path="preparer/workspace" element={<Workspace />} />
        <Route path="office" element={<OfficeHome />} />
        <Route path="office/staff" element={<Staff />} />
        <Route path="office/pipeline" element={<Pipeline />} />
        <Route path="admin" element={<AdminHome />} />
        <Route path="admin/tenants" element={<Tenants />} />
        <Route path="fees" element={<Fees />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
