import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { RoleGate } from './components/RoleGate'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { RegisterFlow, RegisterHub } from './pages/Register'
import { Fees } from './pages/Fees'
import { HelpPage, PrivacyPage, TermsPage } from './pages/Legal'
import { TaxpayerHome } from './pages/taxpayer/TaxpayerHome'
import { Prepare } from './pages/taxpayer/Prepare'
import { YearSelect } from './pages/taxpayer/YearSelect'
import { MultiYearDashboard } from './pages/taxpayer/MultiYearDashboard'
import { Vault } from './pages/taxpayer/Vault'
import { DocumentsNeeded } from './pages/taxpayer/DocumentsNeeded'
import { Dependents } from './pages/taxpayer/Dependents'
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
import { OfficeOnboarding } from './pages/office/OfficeOnboarding'
import { BusinessContinuityPage } from './pages/office/BusinessContinuity'
import { EngagementConsentPage } from './pages/taxpayer/EngagementConsent'
import { AmendmentCenterPage } from './pages/taxpayer/AmendmentCenter'
import { TaxLawUpdatesPage } from './pages/admin/TaxLawUpdates'
import { Staff } from './pages/office/Staff'
import { Pipeline } from './pages/office/Pipeline'
import { AdminHome } from './pages/admin/AdminHome'
import { Tenants } from './pages/admin/Tenants'
import { AiAssistant } from './pages/taxpayer/AiAssistant'
import { PriorReturnImport } from './pages/taxpayer/PriorReturnImport'
import { RequestDocuments } from './pages/preparer/RequestDocuments'
import { SecureUpload } from './pages/public/SecureUpload'
import { FinalReview } from './pages/taxpayer/FinalReview'
import { RefundTrackingPage } from './pages/taxpayer/RefundTracking'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterHub />} />
      <Route path="/register/:tier" element={<RegisterFlow />} />
      <Route path="/fees" element={<Fees />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/upload/:token" element={<SecureUpload />} />
      <Route path="/app" element={<RequireAuth />}>
        <Route path="taxpayer" element={<RoleGate roles={['taxpayer']}><TaxpayerHome /></RoleGate>} />
        <Route path="taxpayer/years" element={<RoleGate roles={['taxpayer']}><MultiYearDashboard /></RoleGate>} />
        <Route path="taxpayer/years/select" element={<RoleGate roles={['taxpayer']}><YearSelect /></RoleGate>} />
        <Route path="taxpayer/prepare" element={<RoleGate roles={['taxpayer']}><Prepare /></RoleGate>} />
        <Route path="taxpayer/assistant" element={<RoleGate roles={['taxpayer']}><AiAssistant /></RoleGate>} />
        <Route path="taxpayer/import" element={<RoleGate roles={['taxpayer']}><PriorReturnImport /></RoleGate>} />
        <Route path="taxpayer/vault" element={<RoleGate roles={['taxpayer']}><Vault /></RoleGate>} />
        <Route path="taxpayer/documents" element={<RoleGate roles={['taxpayer']}><DocumentsNeeded /></RoleGate>} />
        <Route path="taxpayer/dependents" element={<RoleGate roles={['taxpayer']}><Dependents /></RoleGate>} />
        <Route path="taxpayer/final-review" element={<RoleGate roles={['taxpayer']}><FinalReview /></RoleGate>} />
        <Route path="taxpayer/refund-tracking" element={<RoleGate roles={['taxpayer']}><RefundTrackingPage /></RoleGate>} />
        <Route path="taxpayer/engagement" element={<RoleGate roles={['taxpayer']}><EngagementConsentPage /></RoleGate>} />
        <Route path="taxpayer/amendments" element={<RoleGate roles={['taxpayer']}><AmendmentCenterPage /></RoleGate>} />
        <Route path="preparer/documents" element={<RoleGate roles={['preparer']}><DocumentsNeeded /></RoleGate>} />
        <Route path="preparer/dependents" element={<RoleGate roles={['preparer']}><Dependents /></RoleGate>} />
        <Route path="preparer/final-review" element={<RoleGate roles={['preparer']}><FinalReview /></RoleGate>} />
        <Route path="preparer/refund-tracking" element={<RoleGate roles={['preparer']}><RefundTrackingPage /></RoleGate>} />
        <Route path="preparer/amendments" element={<RoleGate roles={['preparer']}><AmendmentCenterPage /></RoleGate>} />
        <Route path="taxpayer/ai" element={<RoleGate roles={['taxpayer']}><TaxpayerAi /></RoleGate>} />
        <Route path="taxpayer/benefits" element={<RoleGate roles={['taxpayer']}><BenefitDashboard /></RoleGate>} />
        <Route path="taxpayer/benefits/interview" element={<RoleGate roles={['taxpayer']}><BenefitInterview /></RoleGate>} />
        <Route path="taxpayer/benefits/review" element={<RoleGate roles={['taxpayer']}><BenefitReview /></RoleGate>} />

        <Route path="preparer" element={<RoleGate roles={['preparer']}><PreparerHome /></RoleGate>} />
        <Route path="preparer/clients" element={<RoleGate roles={['preparer']}><Clients /></RoleGate>} />
        <Route path="preparer/workspace" element={<RoleGate roles={['preparer']}><Workspace /></RoleGate>} />
        <Route path="preparer/entry-plan" element={<RoleGate roles={['preparer']}><EntryPlan /></RoleGate>} />
        <Route path="preparer/return" element={<RoleGate roles={['preparer']}><ReturnEditor /></RoleGate>} />
        <Route path="preparer/request-docs" element={<RoleGate roles={['preparer']}><RequestDocuments /></RoleGate>} />
        <Route path="preparer/import" element={<RoleGate roles={['preparer']}><PriorReturnImport /></RoleGate>} />
        <Route path="preparer/benefits" element={<RoleGate roles={['preparer']}><BenefitDashboard /></RoleGate>} />
        <Route path="preparer/benefits/interview" element={<RoleGate roles={['preparer']}><BenefitInterview /></RoleGate>} />
        <Route path="preparer/benefits/review" element={<RoleGate roles={['preparer']}><BenefitReview /></RoleGate>} />

        <Route path="office" element={<RoleGate roles={['efin_owner']}><OfficeHome /></RoleGate>} />
        <Route path="office/onboarding" element={<RoleGate roles={['efin_owner']}><OfficeOnboarding /></RoleGate>} />
        <Route path="office/continuity" element={<RoleGate roles={['efin_owner']}><BusinessContinuityPage /></RoleGate>} />
        <Route path="office/staff" element={<RoleGate roles={['efin_owner']}><Staff /></RoleGate>} />
        <Route path="office/pipeline" element={<RoleGate roles={['efin_owner']}><Pipeline /></RoleGate>} />
        <Route path="office/request-docs" element={<RoleGate roles={['efin_owner']}><RequestDocuments /></RoleGate>} />

        <Route path="admin" element={<RoleGate roles={['admin']}><AdminHome /></RoleGate>} />
        <Route path="admin/tenants" element={<RoleGate roles={['admin']}><Tenants /></RoleGate>} />
        <Route path="admin/tax-law" element={<RoleGate roles={['admin']}><TaxLawUpdatesPage /></RoleGate>} />

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
