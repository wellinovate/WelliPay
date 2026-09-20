import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './ui/Logo';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Loader2, Zap } from 'lucide-react';

// Quick demo login slots — off by default. Each slot is only shown once all
// three of its env vars are set, so an unconfigured deployment renders no
// demo buttons at all. These credentials end up in the public JS bundle
// (that's what VITE_-prefixed vars do), so this must point at dedicated,
// low-privilege demo accounts — never a real staff member's credentials.
interface DemoLoginSlot {
  label: string;
  email: string;
  password: string;
}

function loadDemoLoginSlots(): DemoLoginSlot[] {
  const slots: DemoLoginSlot[] = [];
  for (let i = 1; i <= 4; i++) {
    const label = import.meta.env[`VITE_DEMO_LOGIN_${i}_LABEL`];
    const email = import.meta.env[`VITE_DEMO_LOGIN_${i}_EMAIL`];
    const password = import.meta.env[`VITE_DEMO_LOGIN_${i}_PASSWORD`];
    if (label && email && password) {
      slots.push({ label, email, password });
    }
  }
  return slots;
}

const DEMO_LOGIN_SLOTS = loadDemoLoginSlots();

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickLoginLabel, setQuickLoginLabel] = useState<string | null>(null);

  const attemptLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again in a few moments.');
      } else {
        setError(err.message || 'Failed to sign in. Please verify your connection.');
      }
    } finally {
      setIsSubmitting(false);
      setQuickLoginLabel(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptLogin(email, password);
  };

  const handleQuickLogin = (slot: DemoLoginSlot) => {
    setEmail(slot.email);
    setPassword(slot.password);
    setQuickLoginLabel(slot.label);
    attemptLogin(slot.email, slot.password);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 sm:px-6 font-sans text-[#0f172a] relative overflow-hidden">
      {/* Background Brand Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-gradient-to-b from-[#ebf7f6]/80 via-[#f0f4fa]/40 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Brand Header with Authentic Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="lg" variant="full" showTagline={true} className="mb-2" />
          <p className="text-xs text-[#64748b] mt-1.5 max-w-xs font-sans">
            Healthcare Financial Operating System & AI Payment Reconciliation
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-broadsheet p-6 sm:p-8 backdrop-blur-sm">
          <div className="border-b border-[#e2e8f0] pb-4 mb-6">
            <h2 className="font-heading text-lg font-bold text-[#12244D]">
              Sign in to your portal
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              Authorized access for hospital revenue teams and HMO claims adjudicators.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@hospital.com"
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#334155]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-lg text-xs font-bold bg-[#12244D] hover:bg-[#0B1733] text-white transition-all shadow-card flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login — only rendered when demo accounts are configured
              via VITE_DEMO_LOGIN_*_LABEL/EMAIL/PASSWORD env vars. */}
          {DEMO_LOGIN_SLOTS.length > 0 && (
            <div className="mt-5 pt-4 border-t border-dashed border-[#e2e8f0]">
              <p className="text-[11px] font-semibold text-[#64748b] mb-2 text-center">
                Quick demo access
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {DEMO_LOGIN_SLOTS.map((slot) => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => handleQuickLogin(slot)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white border border-[#cbd5e1] text-[#12244D] hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting && quickLoginLabel === slot.label ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3 text-[#0B6B69]" />
                    )}
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-[#e2e8f0] flex items-center justify-center gap-2 text-[11px] text-[#64748b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B69]" />
            <span>NDPR & HIPAA-compliant encryption standards</span>
          </div>
        </div>
      </div>
    </div>
  );
};
