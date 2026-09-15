import React from 'react';
import { WelliPayProvider, useWelliPay } from './context/WelliPayContext';
import { AppLayout } from './components/layout/AppLayout';
import { ReconciliationQueue } from './features/reconciliation/ReconciliationQueue';
import { ProviderDashboard } from './features/provider/ProviderDashboard';
import { HMODashboard } from './features/hmo/HMODashboard';
import { PlaceholderView } from './features/common/PlaceholderView';

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
  return (
    <WelliPayProvider>
      <AppContent />
    </WelliPayProvider>
  );
}

export default App;
