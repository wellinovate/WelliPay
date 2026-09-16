import React from 'react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'stacked' | 'mark-only' | 'full';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showTagline = false,
  className = '',
  onClick,
}) => {
  // Height definitions for the monogram mark
  const markHeight = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-11',
    xl: 'h-16',
  }[size];

  const fullHeight = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
  }[size];

  const textSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  }[size];

  const taglineSize = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  if (variant === 'full') {
    return (
      <div 
        className={`inline-flex flex-col items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        <img 
          src="/wellipay-logo.png" 
          alt="WelliPay - One bill, every payer." 
          className={`${fullHeight} w-auto object-contain drop-shadow-xs`}
        />
        {showTagline && (
          <span className={`font-sans tracking-tight font-medium text-[#12244D] mt-1 ${taglineSize}`}>
            One bill, every payer.
          </span>
        )}
      </div>
    );
  }

  if (variant === 'mark-only') {
    return (
      <img
        src="/wellipay-mark.png"
        alt="WelliPay Logo Mark"
        className={`${markHeight} w-auto object-contain select-none drop-shadow-xs ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      />
    );
  }

  if (variant === 'stacked') {
    return (
      <div 
        className={`inline-flex flex-col items-center text-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        <img 
          src="/wellipay-mark.png" 
          alt="WelliPay" 
          className={`${markHeight} w-auto object-contain mb-1.5`}
        />
        <span className={`font-sans font-bold tracking-tight text-[#12244D] ${textSize}`}>
          Welli<span className="text-[#0B6B69]">Pay</span>
        </span>
        {showTagline && (
          <span className={`font-sans tracking-tight text-[#475569] font-medium mt-0.5 ${taglineSize}`}>
            One bill, every payer.
          </span>
        )}
      </div>
    );
  }

  // Default: horizontal
  return (
    <div 
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <img 
        src="/wellipay-mark.png" 
        alt="WelliPay" 
        className={`${markHeight} w-auto object-contain flex-shrink-0`}
      />
      <div className="flex flex-col">
        <span className={`font-sans font-bold tracking-tight text-[#12244D] leading-none ${textSize}`}>
          Welli<span className="text-[#0B6B69]">Pay</span>
        </span>
        {showTagline && (
          <span className={`font-sans tracking-tight text-[#64748B] font-medium mt-1 leading-none ${taglineSize}`}>
            One bill, every payer.
          </span>
        )}
      </div>
    </div>
  );
};
