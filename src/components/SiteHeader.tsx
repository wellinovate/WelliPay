import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from './ui/Logo';

const NAV_LINKS = [
  { label: 'Product',      href: '#product'    },
  { label: 'How it works', href: '#how'        },
  { label: 'Security',     href: '#security'   },
  { label: 'Contact',      href: '#contact'    },
];

export const SiteHeader: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function scrollTo(href: string) {
    setOpen(false);
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  }

  return (
    <header className="border-b border-[#e2e8f0] bg-white/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo size="sm" variant="full" onClick={() => navigate('/')} />

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-0.5">
          {NAV_LINKS.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="text-xs font-semibold text-[#475569] hover:text-[#12244D] px-3 py-2 rounded transition-colors cursor-pointer"
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-[#475569] hover:text-[#12244D] transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-bold bg-[#12244D] hover:bg-[#0B1733] text-white px-4 py-2 rounded-lg shadow-card transition-all cursor-pointer flex items-center gap-1.5"
          >
            Create account
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 text-[#475569] cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden bg-white border-t border-[#e2e8f0] px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="text-sm font-semibold text-[#334155] hover:text-[#0B6B69] text-left py-2 cursor-pointer"
            >
              {l.label}
            </button>
          ))}
          <div className="border-t border-[#e2e8f0] mt-2 pt-3 flex flex-col gap-2">
            <button
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="text-sm font-semibold text-[#334155] text-left py-1 cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/signup'); }}
              className="text-sm font-bold bg-[#12244D] text-white px-4 py-2.5 rounded-lg cursor-pointer"
            >
              Create account
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
