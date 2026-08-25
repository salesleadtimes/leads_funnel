'use client';

import { cn } from '@/lib/utils';
import { STAGE_COLORS } from '@/features/dashboard/components/FunnelChart';

interface StageBadgeProps {
  stage?: string | { name?: string; is_won?: boolean; is_lost?: boolean };
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const stageName = typeof stage === 'string' ? stage : stage?.name ?? '—';
  const isWon = typeof stage === 'object' ? stage?.is_won : stageName === 'Won';
  const isLost = typeof stage === 'object' ? stage?.is_lost : stageName === 'Lost';
  const color = STAGE_COLORS[stageName] ?? '#8A93A3';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono whitespace-nowrap',
        className
      )}
      style={{
        background: color + '20',
        color,
        border: `1px solid ${color}35`,
      }}
    >
      {isWon && '✓ '}
      {isLost && '✗ '}
      {stageName}
    </span>
  );
}
