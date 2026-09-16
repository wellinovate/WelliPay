import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './ui/Logo';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Loader2, Sparkles, Building, Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials or use 1-Click Demo Access below.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again in a few moments.');
      } else {
        setError(err.message || 'Failed to sign in. Please verify your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
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
                  placeholder="billing@lagoonhospital.com"
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

          {/* Quick 1-Click Demo Explorer */}
          <div className="mt-6 pt-5 border-t border-[#e2e8f0]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#12244D] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0B6B69]" />
                1-Click Instant Demo
              </span>
              <span className="text-[10px] text-[#64748b]">Pre-configured</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => loginDemo('admin@lagoonhospital.com', 'Lagoon Specialist Hospital')}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#F0FAF9] hover:bg-[#E0F5F3] text-[#074C4A] border border-[#0B6B69]/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-[#0B6B69]" />
                  <span>Explore as <strong>Lagoon Hospital</strong></span>
                </span>
                <span className="text-[10px] font-medium text-[#0B6B69] group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </button>

              <button
                type="button"
                onClick={() => loginDemo('claims@reliancehmo.com', 'Reliance HMO')}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#F0F4FA] hover:bg-[#E2EAF7] text-[#12244D] border border-[#12244D]/20 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#12244D]" />
                  <span>Explore as <strong>Reliance HMO</strong></span>
                </span>
                <span className="text-[10px] font-medium text-[#12244D] group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </button>
            </div>
          </div>

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
