import React from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../../types';
import { Logo } from '../ui/Logo';
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
    { id: 'reconciliation', label: 'Reconciliation', badge: unmatchedCount > 0 ? unmatchedCount : 12 },
    { id: 'claims', label: 'Claims' },
    { id: 'preauth', label: 'Pre-authorisations' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'patients', label: 'Patients' },
    { id: 'catalogue', label: 'Catalogue & estimator' },
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-[#0f172a] font-sans">
      {/* Top Notification / Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-sm font-sans transition-all duration-300 animate-in slide-in-from-top-2 ${
              n.type === 'success'
                ? 'bg-white border-emerald-500/30 text-emerald-800'
                : n.type === 'error'
                ? 'bg-white border-rose-500/30 text-rose-800'
                : 'bg-white border-[#0B6B69]/30 text-[#074C4A]'
            }`}
          >
            {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {n.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
            {n.type === 'info' && <Info className="w-5 h-5 text-[#0B6B69] flex-shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug">{n.message}</span>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-[#64748b] hover:text-[#0f172a] p-0.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Primary Navigation Shell */}
      <header className="border-b border-[#e2e8f0] bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-subtle">
        <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-2">
          
          {/* Brand & Main Tabs */}
          <div className="flex items-center gap-3 lg:gap-5 flex-shrink-0 min-w-0">
            <div 
              className="flex items-center gap-2 cursor-pointer group py-1 flex-shrink-0" 
              onClick={() => setActiveTab('reconciliation')}
            >
              <div className="flex-shrink-0">
                <Logo size="md" variant="horizontal" />
              </div>
              <span className="hidden 2xl:inline-block text-[11px] font-sans font-medium text-[#64748b] pl-2.5 border-l border-[#e2e8f0] whitespace-nowrap flex-shrink-0">
                One bill, every payer.
              </span>
            </div>

            <nav className="flex items-center gap-0.5 font-sans text-xs h-16 overflow-x-auto no-scrollbar">
              {navItems.map((tab) => {
                const isActive = activeTab === tab.id || (tab.id === 'catalogue' && activeTab === 'estimation');
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-full px-2.5 font-semibold text-xs transition-colors duration-150 flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12244D] focus-visible:ring-inset ${
                      isActive
                        ? 'text-[#12244D] border-[#12244D]'
                        : 'text-[#64748b] border-transparent hover:text-[#12244D] hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Persona & Facility Switcher (Right) */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={togglePersona}
              title="Click to toggle between Lagoon Hospital (Provider) and Reliance HMO (Payer)"
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] hover:border-[#0B6B69] bg-white hover:bg-[#F8FAFC] transition-all text-xs font-sans shadow-xs cursor-pointer whitespace-nowrap"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform group-hover:scale-105 flex-shrink-0 ${
                persona === 'provider' 
                  ? 'bg-[#12244D] text-white' 
                  : 'bg-[#0B6B69] text-white'
              }`}>
                {persona === 'provider' ? 'LS' : 'RH'}
              </div>

              <div className="text-left whitespace-nowrap">
                <div className="font-semibold text-[#12244D] flex items-center gap-1 whitespace-nowrap text-xs">
                  <span>{persona === 'provider' ? 'Lagoon Specialist Hospital' : 'Reliance HMO'}</span>
                  <ArrowRightLeft className="w-3 h-3 text-[#64748b] group-hover:text-[#0B6B69] transition-colors flex-shrink-0" />
                </div>
                <div className="text-[10px] text-[#64748b] whitespace-nowrap leading-tight">
                  {persona === 'provider' ? 'Healthcare provider view' : 'Payer & claims view'}
                </div>
              </div>
            </button>

            {user && (
              <button
                onClick={() => logout()}
                title={`Sign out (${user.email || 'User'})`}
                className="p-2 rounded-lg border border-[#e2e8f0] hover:border-rose-300 hover:bg-rose-50 text-[#64748b] hover:text-rose-600 transition-colors shadow-xs cursor-pointer flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-6 py-4">
        {children}
      </main>
    </div>
  );
};
