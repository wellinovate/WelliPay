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
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Brand & Main Tabs */}
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-3 cursor-pointer group py-1" 
              onClick={() => setActiveTab('reconciliation')}
            >
              <Logo size="md" variant="horizontal" />
              <span className="hidden xl:inline-block text-[11px] font-sans font-medium text-[#64748b] pl-3 border-l border-[#e2e8f0]">
                One bill, every payer.
              </span>
            </div>

            <nav className="flex items-center gap-1 font-sans text-sm h-16">
              {navItems.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-full px-3.5 font-semibold text-xs transition-colors duration-150 flex items-center gap-1.5 border-b-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12244D] focus-visible:ring-offset-2 ${
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
          <div className="flex items-center gap-3">
            <button
              onClick={togglePersona}
              title="Click to toggle between Lagoon Hospital (Provider) and Reliance HMO (Payer)"
              className="group flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] hover:border-[#0B6B69] bg-white hover:bg-[#F8FAFC] transition-all text-xs font-sans shadow-xs"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform group-hover:scale-105 ${
                persona === 'provider' 
                  ? 'bg-[#12244D] text-white' 
                  : 'bg-[#0B6B69] text-white'
              }`}>
                {persona === 'provider' ? 'LS' : 'RH'}
              </div>

              <div className="text-left">
                <div className="font-semibold text-[#12244D] flex items-center gap-1">
                  {persona === 'provider' ? 'Lagoon Specialist Hospital' : 'Reliance HMO'}
                  <ArrowRightLeft className="w-3 h-3 text-[#64748b] group-hover:text-[#0B6B69] transition-colors" />
                </div>
                <div className="text-[10px] text-[#64748b]">
                  {persona === 'provider' ? 'Healthcare Provider View' : 'Payer & Claims View'}
                </div>
              </div>
            </button>

            {user && (
              <button
                onClick={() => logout()}
                title={`Sign out (${user.email || 'User'})`}
                className="p-2 rounded-lg border border-[#e2e8f0] hover:border-rose-300 hover:bg-rose-50 text-[#64748b] hover:text-rose-600 transition-colors shadow-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-4">
        {children}
      </main>
    </div>
  );
};
