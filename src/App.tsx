import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WelliPayProvider, useWelliPay } from './context/WelliPayContext';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ReconciliationQueue } from './features/reconciliation/ReconciliationQueue';
import { ProviderDashboard } from './features/provider/ProviderDashboard';
import { HMODashboard } from './features/hmo/HMODashboard';
import { PatientsDirectory } from './features/patients/PatientsDirectory';
import InvoicesHub from './features/invoices/InvoicesHub';
import { PlaceholderView } from './features/common/PlaceholderView';
import { Login } from './components/Login';
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
      {activeTab === 'settings' && <PlaceholderView tab={activeTab} />}
    </AppLayout>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
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
  }

  if (!user) {
    return <Login />;
  }

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
        <Route path="/pay/:invoiceNumber" element={<PublicInvoicePay />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;