import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './ui/Logo';

const PRODUCT_LINKS = [
  { label: 'Sign in',        to: '/login'   },
  { label: 'Create account', to: '/signup'  },
  { label: 'Privacy policy', to: '/privacy' },
];

const COMPANY_LINKS = [
  { label: 'About us', to: '/about'   },
  { label: 'Contact',  to: '#contact' },
];

export const SiteFooter: React.FC = () => {
  const navigate = useNavigate();

  function go(to: string) {
    if (to.startsWith('#')) {
      const el = document.querySelector(to);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(to);
    }
  }

  return (
    <footer id="contact" className="border-t border-[#e2e8f0] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-10">

          {/* Brand column */}
          <div className="max-w-xs">
            <Logo size="sm" variant="full" onClick={() => navigate('/')} />
            <p className="text-xs text-[#64748b] mt-3 leading-relaxed">
              WelliPay helps Nigerian hospitals match payments to invoices and HMO claims in one place,
              so revenue teams spend less time on reconciliation and more time collecting.
            </p>
            <p className="text-xs text-[#94a3b8] mt-4">
              <span className="font-semibold text-[#64748b]">Wellinovate Limited</span>
              <br />
              Lagos, Nigeria
              <br />
              <a
                href="mailto:hello@wellipay.com"
                className="hover:text-[#0B6B69] transition-colors"
              >
                hello@wellipay.com
              </a>
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-x-16 gap-y-6">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-3">
                Product
              </h4>
              <ul className="space-y-2">
                {PRODUCT_LINKS.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => go(l.to)}
                      className="text-xs text-[#475569] hover:text-[#0B6B69] transition-colors cursor-pointer"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-3">
                Company
              </h4>
              <ul className="space-y-2">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => go(l.to)}
                      className="text-xs text-[#475569] hover:text-[#0B6B69] transition-colors cursor-pointer"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#e2e8f0] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[#94a3b8]">
            © {new Date().getFullYear()} Wellinovate Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-[#94a3b8]">
            <span>Data hosted in Nigeria (AWS af-south-1)</span>
            <span>·</span>
            <button
              onClick={() => navigate('/privacy')}
              className="hover:text-[#0B6B69] transition-colors cursor-pointer"
            >
              Privacy policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
