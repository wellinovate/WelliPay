import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WelliPayProvider, useWelliPay } from './context/WelliPayContext';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ReconciliationQueue } from './features/reconciliation/ReconciliationQueue';
import { ProviderDashboard } from './features/provider/ProviderDashboard';
import { HMODashboard } from './features/hmo/HMODashboard';
import { PatientsDirectory } from './features/patients/PatientsDirectory';
import InvoicesHub from './features/invoices/InvoicesHub';
import { SettingsView } from './features/settings/SettingsView';
import { CatalogueAndEstimatorView } from './features/catalogue/CatalogueAndEstimatorView';
import { PreAuthTracker } from './features/preauth/PreAuthTracker';
import { ComplianceDashboard } from './features/compliance/ComplianceDashboard';
import { PlaceholderView } from './features/common/PlaceholderView';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Homepage } from './pages/Homepage';
import { About } from './pages/About';
import { Privacy } from './pages/Privacy';
import PublicInvoicePay from './pages/PublicInvoicePay';

const AppContent: React.FC = () => {
  const { activeTab } = useWelliPay();

  return (
    <AppLayout>
      {activeTab === 'reconciliation' && <ReconciliationQueue />}
      {activeTab === 'dashboard' && <ProviderDashboard />}
      {activeTab === 'claims' && <HMODashboard />}
      {activeTab === 'patients' && <PatientsDirectory />}
      {activeTab === 'invoices' && <InvoicesHub />}
      {(activeTab === 'catalogue' || activeTab === 'estimation') && <CatalogueAndEstimatorView />}
      {activeTab === 'preauth' && <PreAuthTracker />}
      {activeTab === 'compliance' && <ComplianceDashboard />}
      {activeTab === 'settings' && <SettingsView />}
    </AppLayout>
  );
};

const LoadingScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
    <div className="flex flex-col items-center gap-3">
      <img
        src="/wellipay-mark.png"
        alt="WelliPay"
        className="w-12 h-auto object-contain animate-pulse"
      />
      <div className="flex items-center gap-2 mt-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-ping" />
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/70 font-mono">
          Loading WelliPay...
        </span>
      </div>
    </div>
  </div>
);

// Public marketing homepage — redirects a signed-in user straight into the
// app instead of showing the pitch again.
const HomeRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Homepage />;
};

// Login/signup routes — signed-in users are bounced into the app rather
// than shown the auth form again.
const LoginRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
};

const SignupRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Signup />;
};

// Everything behind auth — an unauthenticated visitor is sent to /login
// rather than shown the login form inline, so the URL always matches what's
// on screen.
const AuthenticatedApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <WelliPayProvider>
      <AppContent />
    </WelliPayProvider>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/pay/:invoiceNumber" element={<PublicInvoicePay />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;