import React, { useState, useEffect } from 'react';
import { useWelliPay } from '../../context/WelliPayContext';
import { ServiceCatalogueView } from './ServiceCatalogueView';
import { CostEstimationView } from '../estimation/CostEstimationView';
import { Layers, Calculator } from 'lucide-react';

export const CatalogueAndEstimatorView: React.FC = () => {
  const { activeTab, setActiveTab } = useWelliPay();
  const [subTab, setSubTab] = useState<'catalogue' | 'estimation'>(() => {
    return activeTab === 'estimation' ? 'estimation' : 'catalogue';
  });

  useEffect(() => {
    if (activeTab === 'estimation') {
      setSubTab('estimation');
    } else if (activeTab === 'catalogue') {
      setSubTab('catalogue');
    }
  }, [activeTab]);

  const handleSelectSubTab = (tab: 'catalogue' | 'estimation') => {
    setSubTab(tab);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      {/* Sub-Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
        <div className="inline-flex rounded-lg border border-[#e2e8f0] p-1 bg-[#f8fafc] text-xs font-sans">
          <button
            type="button"
            onClick={() => handleSelectSubTab('catalogue')}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'catalogue'
                ? 'bg-[#12244D] text-white shadow-xs'
                : 'text-[#64748b] hover:text-[#12244D]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Service catalogue</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSubTab('estimation')}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'estimation'
                ? 'bg-[#12244D] text-white shadow-xs'
                : 'text-[#64748b] hover:text-[#12244D]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Cost estimator</span>
          </button>
        </div>
      </div>

      {/* Active Sub-View */}
      {subTab === 'catalogue' ? <ServiceCatalogueView /> : <CostEstimationView />}
    </div>
  );
};
