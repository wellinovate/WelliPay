import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './ui/Logo';

const LINK_COLUMNS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Privacy policy', to: '/privacy' },
    ],
  },
];

export const SiteFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-[#e2e8f0] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          <div>
            <Logo size="sm" variant="full" onClick={() => navigate('/')} />
            <p className="text-xs text-[#64748b] mt-3 max-w-xs">
              A product of Wellinovate Limited, built for hospitals and clinics managing self-pay
              and HMO billing side by side.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            {LINK_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2.5">
                  {col.heading}
                </h4>
                <ul className="space-y-1.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => navigate(l.to)}
                        className="text-xs text-[#334155] hover:text-[#0B6B69] transition-colors cursor-pointer"
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-[#e2e8f0] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[#94a3b8]">© {new Date().getFullYear()} WelliPay. All rights reserved.</p>
          <p className="text-[11px] text-[#94a3b8]">A Wellinovate Limited product</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
