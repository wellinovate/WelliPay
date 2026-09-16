import React from 'react';
import { WelliPayProvider, useWelliPay } from './context/WelliPayContext';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ReconciliationQueue } from './features/reconciliation/ReconciliationQueue';
import { ProviderDashboard } from './features/provider/ProviderDashboard';
import { HMODashboard } from './features/hmo/HMODashboard';
import { PlaceholderView } from './features/common/PlaceholderView';
import { Login } from './components/Login';

const AppContent: React.FC = () => {
  const { activeTab } = useWelliPay();

  return (
    <AppLayout>
      {activeTab === 'reconciliation' && <ReconciliationQueue />}
      {activeTab === 'dashboard' && <ProviderDashboard />}
      {activeTab === 'claims' && <HMODashboard />}
      {(activeTab === 'invoices' || activeTab === 'patients' || activeTab === 'settings') && (
        <PlaceholderView tab={activeTab} />
      )}
    </AppLayout>
  );
};

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
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
}

export default App;