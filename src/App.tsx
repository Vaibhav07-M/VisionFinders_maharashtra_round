import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToastContainer } from '@/components/ui/ToastContainer';

// Panel A Pages
import { LandingPage } from '@/pages/attendee/LandingPage';
import { DropDetailPage } from '@/pages/attendee/DropDetailPage';
import { AuthPage } from '@/pages/attendee/AuthPage';
import { VerificationPage } from '@/pages/attendee/VerificationPage';
import { WaitingRoomPage } from '@/pages/attendee/WaitingRoomPage';
import { EntryPage } from '@/pages/attendee/EntryPage';
import { LiveStatusPage } from '@/pages/attendee/LiveStatusPage';
import { ResultPage } from '@/pages/attendee/ResultPage';
import { CheckoutPage } from '@/pages/attendee/CheckoutPage';
import { MyTicketsPage } from '@/pages/attendee/MyTicketsPage';
import { ProofPage } from '@/pages/attendee/ProofPage';

// Panel B Pages & Admin Layout
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { DropsPage } from '@/pages/admin/DropsPage';
import { CreateDropPage } from '@/pages/admin/CreateDropPage';
import { InventoryManagerPage } from '@/pages/admin/InventoryManagerPage';
import { EntriesUsersPage } from '@/pages/admin/EntriesUsersPage';
import { SecurityRulesPage } from '@/pages/admin/SecurityRulesPage';
import { LiveOperationsPage } from '@/pages/admin/LiveOperationsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { AppealsQueuePage } from '@/pages/admin/AppealsQueuePage';

// Panel C Pages
import { AttackDesignerPage } from '@/pages/lab/AttackDesignerPage';
import { SimulationLivePage } from '@/pages/lab/SimulationLivePage';
import { ExperimentMatrixPage } from '@/pages/lab/ExperimentMatrixPage';
import { FairnessReportPage } from '@/pages/lab/FairnessReportPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 selection:bg-brand-yellow selection:text-black">
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      
      <main className="flex-1 w-full">
        <Routes>
          {/* Panel A: Attendee (11 pages) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/drops/:id" element={<DropDetailPage />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/signup" element={<AuthPage initialMode="signup" />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/drops/:id/wait" element={<WaitingRoomPage />} />
          <Route path="/drops/:id/enter" element={<EntryPage />} />
          <Route path="/drops/:id/live" element={<LiveStatusPage />} />
          <Route path="/drops/:id/result" element={<ResultPage />} />
          <Route path="/drops/:id/checkout" element={<CheckoutPage />} />
          <Route path="/me" element={<MyTicketsPage />} />
          <Route path="/proof/:dropId" element={<ProofPage />} />

          {/* Panel B: Organizer / Admin with Left Sidebar Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="drops" element={<DropsPage />} />
            <Route path="drops/create" element={<CreateDropPage />} />
            <Route path="drops/:id/edit" element={<CreateDropPage />} />
            <Route path="inventory" element={<InventoryManagerPage />} />
            <Route path="entries" element={<EntriesUsersPage />} />
            <Route path="security" element={<SecurityRulesPage />} />
            <Route path="live" element={<LiveOperationsPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="appeals" element={<AppealsQueuePage />} />
          </Route>

          {/* Panel C: Adversarial Lab (4 pages) */}
          <Route path="/lab" element={<AttackDesignerPage />} />
          <Route path="/lab/attack-designer" element={<Navigate to="/lab" replace />} />
          <Route path="/lab/runs/:runId/live" element={<SimulationLivePage />} />
          <Route path="/lab/simulation-live" element={<SimulationLivePage />} />
          <Route path="/lab/runs/:runId/report" element={<FairnessReportPage />} />
          <Route path="/lab/report" element={<FairnessReportPage />} />
          <Route path="/lab/compare" element={<ExperimentMatrixPage />} />
          <Route path="/lab/matrix" element={<Navigate to="/lab/compare" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAdmin && <Footer />}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;
