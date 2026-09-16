import React from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../../types';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  Sparkles,
  Layers,
  ArrowRightLeft,
  LogOut
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { 
    activeTab, 
    setActiveTab, 
    persona, 
    setPersona, 
    notifications, 
    removeNotification,
    unmatchedCount
  } = useWelliPay();

  const { user, logout } = useAuth();

  const navItems: { id: NavTab; label: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reconciliation', label: 'Reconciliation', badge: unmatchedCount },
    { id: 'claims', label: 'Claims' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'patients', label: 'Patients' },
    { id: 'settings', label: 'Settings' },
  ];

  const togglePersona = () => {
    if (persona === 'provider') {
      setPersona('hmo');
      setActiveTab('claims');
    } else {
      setPersona('provider');
      setActiveTab('reconciliation');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2f2] flex flex-col text-[#201e1d]">
      {/* Top Notification / Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded shadow-lg border text-sm font-sans transition-all duration-300 animate-in slide-in-from-top-2 ${
              n.type === 'success'
                ? 'bg-white border-[#2a9d5c] text-[#1e7e47]'
                : n.type === 'error'
                ? 'bg-white border-[#d6006c] text-[#a5372c]'
                : 'bg-white border-[#0088b0] text-[#006786]'
            }`}
          >
            {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#2a9d5c] flex-shrink-0 mt-0.5" />}
            {n.type === 'error' && <AlertCircle className="w-5 h-5 text-[#d6006c] flex-shrink-0 mt-0.5" />}
            {n.type === 'info' && <Info className="w-5 h-5 text-[#0088b0] flex-shrink-0 mt-0.5" />}
            <span className="flex-1 text-[#201e1d] leading-snug">{n.message}</span>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-[#605d5d] hover:text-[#201e1d] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Primary Navigation Shell */}
      <header className="border-b border-[#201e1d]/15 bg-[#f3f2f2] sticky top-0 z-30">
        <div className="max-w-[1240px] mx-auto px-6 h-14 flex items-center justify-between">
          
          {/* Brand & Main Tabs */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('reconciliation')}>
              <div className="w-8 h-8 rounded bg-[#0088b0] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
                W
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-[#201e1d]">
                WelliPay
              </span>
            </div>

            <nav className="flex items-center gap-1 font-sans text-sm">
              {navItems.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded transition-all duration-150 flex items-center gap-1.5 ${
                      isActive
                        ? 'text-[#201e1d] font-semibold underline underline-offset-8 decoration-2 decoration-[#0088b0]'
                        : 'text-[#605d5d] hover:text-[#201e1d]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#0088b0]/10 text-[#0088b0] font-medium font-sans">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Persona & Facility Switcher (Right) */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePersona}
              title="Click to toggle between Lagoon Hospital (Provider) and Reliance HMO (Payer)"
              className="group flex items-center gap-2.5 px-3 py-1.5 rounded border border-[#d7d3d3] hover:border-[#0088b0] bg-white/80 transition-all text-xs font-sans"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                persona === 'provider' ? 'bg-[#0088b0]/15 text-[#006786]' : 'bg-[#d6006c]/15 text-[#d6006c]'
              }`}>
                {persona === 'provider' ? 'LS' : 'RH'}
              </div>

              <div className="text-left">
                <div className="font-medium text-[#201e1d] flex items-center gap-1">
                  {persona === 'provider' ? 'Lagoon Specialist Hospital' : 'Reliance HMO'}
                  <ArrowRightLeft className="w-3 h-3 text-[#7d7979] group-hover:text-[#0088b0] transition-colors" />
                </div>
                <div className="text-[10px] text-[#7d7979]">
                  {persona === 'provider' ? 'Healthcare Provider View' : 'Payer & Claims View'}
                </div>
              </div>
            </button>

            {user && (
              <button
                onClick={() => logout()}
                title={`Sign out (${user.email || 'User'})`}
                className="p-2 rounded border border-[#d7d3d3] hover:border-[#d6006c] hover:bg-[#fff1f4] text-[#605d5d] hover:text-[#d6006c] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-6 py-7">
        {children}
      </main>

      {/* Subtle Footer Bar */}
      <footer className="border-t border-[#201e1d]/10 py-4 px-6 text-xs text-[#7d7979] font-sans">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>WelliPay Core · Real-time AI Matching Active (PostgreSQL Transaction Engine)</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveTab('reconciliation'); setPersona('provider'); }}
              className="hover:text-[#201e1d] underline decoration-dotted"
            >
              Reconciliation Queue (Wireframe 1d)
            </button>
            <button 
              onClick={() => { setActiveTab('dashboard'); setPersona('provider'); }}
              className="hover:text-[#201e1d] underline decoration-dotted"
            >
              Provider Dashboard (Wireframe 1a)
            </button>
            <button 
              onClick={() => { setActiveTab('claims'); setPersona('hmo'); }}
              className="hover:text-[#201e1d] underline decoration-dotted"
            >
              HMO Claims (Wireframe 3a)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
