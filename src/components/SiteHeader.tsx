import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from './ui/Logo';

const NAV_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Privacy', to: '/privacy' },
];

export const SiteHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo size="sm" variant="full" onClick={() => navigate('/')} />
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <button
              key={l.to}
              onClick={() => navigate(l.to)}
              className="text-xs font-semibold text-[#334155] hover:text-[#12244D] px-3 py-2 transition-colors cursor-pointer"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-[#334155] hover:text-[#12244D] px-3 py-2 transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-bold bg-[#12244D] hover:bg-[#0B1733] text-white px-4 py-2 rounded-lg shadow-card transition-all cursor-pointer flex items-center gap-1.5"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
