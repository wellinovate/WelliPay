import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './ui/Logo';
import { ShieldCheck, Lock, Mail, Building2, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const PASSWORD_MIN_LENGTH = 8;

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!organizationName.trim()) {
      setError('Enter your hospital or clinic name.');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email, password, organizationName.trim());
      // AuthContext's onAuthStateChanged listener picks up the new session
      // and the router redirects into the app automatically.
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Try signing in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Enter a valid work email address.');
      } else if (err.code === 'auth/weak-password') {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      } else {
        setError(err.message || 'Failed to create your account. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 sm:px-6 py-10 font-sans text-[#0f172a] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-gradient-to-b from-[#ebf7f6]/80 via-[#f0f4fa]/40 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="lg" variant="full" showTagline={true} className="mb-2" onClick={() => navigate('/')} />
          <p className="text-xs text-[#64748b] mt-1.5 max-w-xs font-sans">
            Healthcare Financial Operating System & AI Payment Reconciliation
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-broadsheet p-6 sm:p-8">
          <div className="border-b border-[#e2e8f0] pb-4 mb-6">
            <h2 className="font-heading text-lg font-bold text-[#12244D]">
              Create your provider account
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              For hospital revenue teams and HMO claims adjudicators.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Hospital / Clinic Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Lagoon Specialist Hospital"
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69] transition-all"
                />
              </div>
            </div>

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
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white border border-[#cbd5e1] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0B6B69] focus:ring-1 focus:ring-[#0B6B69] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <ul className="mt-5 pt-4 border-t border-dashed border-[#e2e8f0] space-y-1.5">
            {['Automated bill reconciliation', 'HMO claims and pre-auth tracking', 'Compliance and audit engine'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-[11px] text-[#64748b]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B69] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Security Notice */}
          <div className="mt-5 pt-4 border-t border-[#e2e8f0] flex items-center justify-center gap-2 text-[11px] text-[#64748b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B69]" />
            <span>NDPR & HIPAA-compliant encryption standards</span>
          </div>
        </div>

        <p className="text-center text-xs text-[#64748b] mt-5">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-bold text-[#0B6B69] hover:text-[#074C4A] cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
