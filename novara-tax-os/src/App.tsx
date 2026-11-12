import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { RoleGate } from './components/RoleGate'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Fees } from './pages/Fees'
import { TaxpayerHome } from './pages/taxpayer/TaxpayerHome'
import { Prepare } from './pages/taxpayer/Prepare'
import { Vault } from './pages/taxpayer/Vault'
import { DocumentsNeeded } from './pages/taxpayer/DocumentsNeeded'
import { TaxpayerAi } from './pages/taxpayer/TaxpayerAi'
import { BenefitDashboard } from './pages/benefits/BenefitDashboard'
import { BenefitInterview } from './pages/benefits/BenefitInterview'
import { BenefitReview } from './pages/benefits/BenefitReview'
import { PreparerHome } from './pages/preparer/PreparerHome'
import { Clients } from './pages/preparer/Clients'
import { Workspace } from './pages/preparer/Workspace'
import { EntryPlan } from './pages/preparer/EntryPlan'
import { ReturnEditor } from './pages/preparer/ReturnEditor'
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
        <Route path="taxpayer" element={<RoleGate roles={['taxpayer']}><TaxpayerHome /></RoleGate>} />
        <Route path="taxpayer/prepare" element={<RoleGate roles={['taxpayer']}><Prepare /></RoleGate>} />
        <Route path="taxpayer/vault" element={<RoleGate roles={['taxpayer']}><Vault /></RoleGate>} />
        <Route path="taxpayer/documents" element={<RoleGate roles={['taxpayer']}><DocumentsNeeded /></RoleGate>} />
        <Route path="preparer/documents" element={<RoleGate roles={['preparer']}><DocumentsNeeded /></RoleGate>} />
        <Route path="taxpayer/ai" element={<RoleGate roles={['taxpayer']}><TaxpayerAi /></RoleGate>} />
        <Route path="taxpayer/benefits" element={<RoleGate roles={['taxpayer']}><BenefitDashboard /></RoleGate>} />
        <Route path="taxpayer/benefits/interview" element={<RoleGate roles={['taxpayer']}><BenefitInterview /></RoleGate>} />
        <Route path="taxpayer/benefits/review" element={<RoleGate roles={['taxpayer']}><BenefitReview /></RoleGate>} />

        <Route path="preparer" element={<RoleGate roles={['preparer']}><PreparerHome /></RoleGate>} />
        <Route path="preparer/clients" element={<RoleGate roles={['preparer']}><Clients /></RoleGate>} />
        <Route path="preparer/workspace" element={<RoleGate roles={['preparer']}><Workspace /></RoleGate>} />
        <Route path="preparer/entry-plan" element={<RoleGate roles={['preparer']}><EntryPlan /></RoleGate>} />
        <Route path="preparer/return" element={<RoleGate roles={['preparer']}><ReturnEditor /></RoleGate>} />
        <Route path="preparer/benefits" element={<RoleGate roles={['preparer']}><BenefitDashboard /></RoleGate>} />
        <Route path="preparer/benefits/interview" element={<RoleGate roles={['preparer']}><BenefitInterview /></RoleGate>} />
        <Route path="preparer/benefits/review" element={<RoleGate roles={['preparer']}><BenefitReview /></RoleGate>} />

        <Route path="office" element={<RoleGate roles={['efin_owner']}><OfficeHome /></RoleGate>} />
        <Route path="office/staff" element={<RoleGate roles={['efin_owner']}><Staff /></RoleGate>} />
        <Route path="office/pipeline" element={<RoleGate roles={['efin_owner']}><Pipeline /></RoleGate>} />

        <Route path="admin" element={<RoleGate roles={['admin']}><AdminHome /></RoleGate>} />
        <Route path="admin/tenants" element={<RoleGate roles={['admin']}><Tenants /></RoleGate>} />

        <Route
          path="fees"
          element={
            <RoleGate roles={['taxpayer', 'preparer', 'efin_owner', 'admin']}>
              <Fees />
            </RoleGate>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
