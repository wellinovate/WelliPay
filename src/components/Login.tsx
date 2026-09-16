import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
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
      // Friendly error handling
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials.');
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
    <div className="min-h-screen bg-[#f3f2f2] flex flex-col justify-center items-center px-4 sm:px-6 font-sans text-[#201e1d]">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#0088b0] text-white font-serif font-bold text-2xl shadow-sm mb-3">
            W
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#201e1d]">
            WelliPay
          </h1>
          <p className="text-xs text-[#605d5d] mt-1 font-serif">
            Healthcare Payment & AI Financial Operating System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#201e1d]/20 rounded-lg shadow-subtle p-6 sm:p-8">
          <div className="border-b border-[#201e1d]/10 pb-4 mb-6">
            <h2 className="font-heading text-xl font-semibold text-[#201e1d]">
              Sign in to your account
            </h2>
            <p className="text-xs text-[#605d5d] mt-0.5">
              Authorized access for hospital billing teams and HMO claims adjudicators.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded bg-[#fff1f4] border border-[#ff90b1] text-xs text-[#a5372c] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#d6006c] flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#444141] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7d7979] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@lagoonhospital.com"
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white border border-[#bab6b6] rounded text-[#201e1d] placeholder-[#9b9797] focus:outline-none focus:border-[#0088b0] focus:ring-1 focus:ring-[#0088b0]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#444141]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7d7979] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white border border-[#bab6b6] rounded text-[#201e1d] placeholder-[#9b9797] focus:outline-none focus:border-[#0088b0] focus:ring-1 focus:ring-[#0088b0]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2 px-4 rounded text-xs font-semibold bg-[#0088b0] hover:bg-[#006786] text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-[#201e1d]/10 flex items-center justify-center gap-2 text-[11px] text-[#7d7979]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted HIPAA/NDPR-compliant authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
