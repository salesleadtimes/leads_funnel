'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtINR } from '@/lib/utils';

export const STAGES = [
  'New Lead',
  'Qualified',
  'Quotation / Bid Submitted',
  'Technical Evaluation',
  'Negotiation / L1 Round',
  'PO / Work Order Received',
  'Won',
  'Lost',
];

export const STAGE_COLORS: Record<string, string> = {
  'New Lead': '#8A93A3',
  'Qualified': '#00AEEF',
  'Quotation / Bid Submitted': '#0091D5',
  'Technical Evaluation': '#6C4FC7',
  'Negotiation / L1 Round': '#EC008C',
  'PO / Work Order Received': '#B9770E',
  'Won': '#1E8A5F',
  'Lost': '#C0392B',
};

export const OPEN_STAGES = STAGES.filter((s) => s !== 'Won' && s !== 'Lost');

interface Lead {
  stage?: string | { name?: string; is_won?: boolean; is_lost?: boolean };
  estValue?: number | string;
  [key: string]: unknown;
}

interface FunnelChartProps {
  leads: Lead[];
}

export function FunnelChart({ leads }: FunnelChartProps) {
  function getStageName(lead: Lead): string {
    if (typeof lead.stage === 'string') return lead.stage;
    return lead.stage?.name ?? '';
  }

  function countWhere(pred: (l: Lead) => boolean) {
    return leads.filter(pred).length;
  }

  function sumWhere(pred: (l: Lead) => boolean, val: (l: Lead) => number) {
    return leads.filter(pred).reduce((a, l) => a + (val(l) || 0), 0);
  }

  const maxStageCount = Math.max(
    1,
    ...STAGES.map((s) => countWhere((l) => getStageName(l) === s))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Pipeline Funnel by Stage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {STAGES.map((s) => {
          const c = countWhere((l) => getStageName(l) === s);
          const v = sumWhere(
            (l) => getStageName(l) === s,
            (l) => Number(l.estValue) || 0
          );
          const pct = Math.max(6, Math.round((100 * c) / maxStageCount));
          const color = STAGE_COLORS[s];

          return (
            <div key={s} className="flex items-center gap-3">
              <div className="w-44 text-right text-xs text-muted-foreground shrink-0 truncate" title={s}>
                {s}
              </div>
              <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center pl-3 text-white text-xs font-mono transition-all duration-700 whitespace-nowrap"
                  style={{ width: `${pct}%`, background: color }}
                >
                  {c > 0 ? `${c} lead${c !== 1 ? 's' : ''}` : ''}
                </div>
              </div>
              <div className="w-28 shrink-0 font-mono text-xs text-muted-foreground text-right">
                {fmtINR(v)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
