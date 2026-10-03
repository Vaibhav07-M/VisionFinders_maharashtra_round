import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Panel B Pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
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

export const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-background text-slate-100 selection:bg-brand-yellow selection:text-black">
          <Navbar />
          
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

              {/* Panel B: Organizer / Admin (8 pages) */}
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/drops/create" element={<CreateDropPage />} />
              <Route path="/admin/drops/:id/edit" element={<CreateDropPage />} />
              <Route path="/admin/inventory" element={<InventoryManagerPage />} />
              <Route path="/admin/entries" element={<EntriesUsersPage />} />
              <Route path="/admin/security" element={<SecurityRulesPage />} />
              <Route path="/admin/live" element={<LiveOperationsPage />} />
              <Route path="/admin/audit" element={<AuditLogPage />} />
              <Route path="/admin/appeals" element={<AppealsQueuePage />} />

              {/* Panel C: Adversarial Lab (4 pages) */}
              <Route path="/lab" element={<Navigate to="/lab/attack-designer" replace />} />
              <Route path="/lab/attack-designer" element={<AttackDesignerPage />} />
              <Route path="/lab/simulation-live" element={<SimulationLivePage />} />
              <Route path="/lab/matrix" element={<ExperimentMatrixPage />} />
              <Route path="/lab/report" element={<FairnessReportPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
          <ToastContainer />
        </div>
      </Router>
    </AppProvider>
  );
};

export default App;
