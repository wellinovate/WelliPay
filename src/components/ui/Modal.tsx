import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-[#fdfcf9] border border-[#201e1d]/30 rounded-lg shadow-2xl p-6 z-10 transition-all transform duration-200 animate-in fade-in zoom-in-95`}
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#201e1d]/15">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#201e1d]">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#605d5d] font-sans mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#7d7979] hover:text-[#201e1d] p-1 rounded hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 font-sans text-sm text-[#2d2b2b]">
          {children}
        </div>
      </div>
    </div>
  );
};
