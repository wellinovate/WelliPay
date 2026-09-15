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
      baseClasses += " bg-[#e9f8ff] text-[#006786] border border-[#99e0ff]";
      content = label || 'Paid';
      break;

    case 'approved':
      baseClasses += " bg-[#eafaf0] text-[#1e7e47] border border-[#2a9d5c]/40";
      content = label || 'Approved';
      break;

    case 'pending':
    case 'submitted':
      baseClasses += " bg-[#f3f1ea] text-[#605d5d] border border-[#d7d3d3]";
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
      baseClasses += " bg-[#f8f4f4] text-[#605d5d] border border-[#d7d3d3]";
      content = label || 'Low';
      break;

    case 'high-confidence':
    case 'high_confidence':
      baseClasses += " bg-[#eaf1fb] text-[#006786] border border-[#0088b0]/30 hover:border-[#0088b0]";
      content = (
        <>
          <span className="font-semibold text-[#004961]">{confidence !== undefined ? `${confidence}%` : '94%'}</span>
          <span className="opacity-80">→</span>
          <span className="truncate max-w-[210px]">{targetText || label || 'Matched'}</span>
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
      baseClasses += " bg-[#f3f1ea] text-[#444141] border border-[#d7d3d3]";
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
