import React from 'react';
import { StatusType } from '../../types';

export interface StatusChipProps {
  status: StatusType | string;
  label?: string;
  confidence?: number;
  targetText?: string;
  className?: string;
  onClick?: () => void;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  confidence,
  targetText,
  className = '',
  onClick,
}) => {
  const normalizedStatus = status.toLowerCase();

  // Status Chip variants:
  // Paid: Blue / Accent
  // Pending: Neutral
  // Failed / Disputed: Red
  // High confidence: Blue outline with bold %
  // Low confidence: Neutral outline / Warning
  let baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight transition-colors";
  let content: React.ReactNode = label;

  switch (normalizedStatus) {
    case 'paid':
      baseClasses += " bg-[#EBF7F6] text-[#0B6B69] border border-[#0B6B69]/30";
      content = label || 'Paid';
      break;

    case 'approved':
      baseClasses += " bg-[#eafaf0] text-[#166534] border border-[#166534]/30";
      content = label || 'Approved';
      break;

    case 'pending':
    case 'submitted':
      baseClasses += " bg-[#f8fafc] text-[#475569] border border-[#cbd5e1]";
      content = label || (normalizedStatus === 'submitted' ? 'Submitted' : 'Pending');
      break;

    case 'failed':
      baseClasses += " bg-[#fff1f4] text-[#aa0b56] border border-[#ffc0d0]";
      content = label || 'Failed';
      break;

    case 'rejected':
    case 'rejected — disputed':
    case 'disputed':
      baseClasses += " bg-[#fff1f4] text-[#aa0b56] border border-[#ff90b1]";
      content = label || 'Rejected — disputed';
      break;

    case 'missing auth':
    case 'missing-auth':
      baseClasses += " bg-[#fff1f4] text-[#aa0b56] border border-[#ff90b1]";
      content = label || 'Missing auth';
      break;

    case 'high':
      baseClasses += " bg-[#fff1f4] text-[#d6006c] border border-[#ff90b1]";
      content = label || 'High';
      break;

    case 'low':
      baseClasses += " bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]";
      content = label || 'Low';
      break;

    case 'high-confidence':
    case 'high_confidence':
      baseClasses += " bg-[#F0FAF9] text-[#12244D] border border-[#0B6B69]/30 hover:border-[#0B6B69]";
      content = (
        <>
          <span className="font-bold text-[#0B6B69]">{confidence !== undefined ? `${confidence}%` : '94%'}</span>
          <span className="opacity-60 text-[#12244D]">→</span>
          <span className="truncate max-w-[210px] font-medium">{targetText || label || 'Matched'}</span>
        </>
      );
      break;

    case 'low-confidence':
    case 'low_confidence':
      baseClasses += " bg-[#fff1f4] text-[#aa0b56] border border-[#ffc0d0] border-dashed";
      content = (
        <>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d6006c] mr-0.5"></span>
          <span>{label || 'Low confidence'}</span>
        </>
      );
      break;

    default:
      baseClasses += " bg-[#f8fafc] text-[#334155] border border-[#cbd5e1]";
      content = label || status;
  }

  return (
    <span
      className={`${baseClasses} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {content}
    </span>
  );
};
