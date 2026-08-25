'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { fmtINR } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export function getPeriodRange(period: Period, refDateStr?: string) {
  const ref = new Date(
    ((refDateStr || new Date().toISOString().slice(0, 10)) + 'T00:00:00') as string
  );
  let start: Date, end: Date, label: string;

  if (period === 'daily') {
    start = new Date(ref);
    end = new Date(ref);
    label = ref.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (period === 'weekly') {
    const day = ref.getDay();
    start = new Date(ref);
    start.setDate(ref.getDate() - day);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    label =
      start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ' – ' +
      end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (period === 'monthly') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (period === 'quarterly') {
    const q = Math.floor(ref.getMonth() / 3);
    start = new Date(ref.getFullYear(), q * 3, 1);
    end = new Date(ref.getFullYear(), q * 3 + 3, 0);
    label = 'Q' + (q + 1) + ' ' + ref.getFullYear();
  } else {
    start = new Date(ref.getFullYear(), 0, 1);
    end = new Date(ref.getFullYear(), 11, 31);
    label = 'Year ' + ref.getFullYear();
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label,
  };
}

interface Lead {
  stage?: string | { name?: string };
  sector?: string | { name?: string };
  estValue?: number | string;
  closedDate?: string;
  createdDate?: string;
  [key: string]: unknown;
}

interface ReviewsBoardProps {
  leads: Lead[];
  targets: Record<Period, number>;
  reviewPeriod: Period;
  setReviewPeriod: (p: Period) => void;
  refDate: string;
  setRefDate: (d: string) => void;
  onTargetChange: (period: Period, value: string) => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

export function ReviewsBoard({
  leads,
  targets,
  reviewPeriod,
  setReviewPeriod,
  refDate,
  setRefDate,
  onTargetChange,
}: ReviewsBoardProps) {
  const rd = refDate || new Date().toISOString().slice(0, 10);
  const { start, end, label } = getPeriodRange(reviewPeriod, rd);

  function getStageName(l: Lead) {
    if (typeof l.stage === 'string') return l.stage;
    return (l.stage as { name?: string })?.name ?? '';
  }

  function getSectorName(l: Lead) {
    if (typeof l.sector === 'string') return l.sector;
    return (l.sector as { name?: string })?.name ?? '';
  }

  const newLeads = leads.filter(
    (l) => l.createdDate && l.createdDate >= start && l.createdDate <= end
  );
  const wonInPeriod = leads.filter(
    (l) => getStageName(l) === 'Won' && l.closedDate && l.closedDate >= start && l.closedDate <= end
  );
  const lostInPeriod = leads.filter(
    (l) => getStageName(l) === 'Lost' && l.closedDate && l.closedDate >= start && l.closedDate <= end
  );

  const wonVal = wonInPeriod.reduce((a, l) => a + (Number(l.estValue) || 0), 0);
  const lostVal = lostInPeriod.reduce((a, l) => a + (Number(l.estValue) || 0), 0);
  const target = Number(targets?.[reviewPeriod]) || 0;
  const achievementPct = target > 0 ? Math.min(150, Math.round((100 * wonVal) / target)) : 0;

  const govtNew = newLeads.filter((l) => getSectorName(l) === 'Government').length;
  const nonNew = newLeads.filter((l) => getSectorName(l) === 'Non-Government').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Sales Performance Review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track sales against targets — Daily, Weekly, Monthly, Quarterly, or Yearly.
        </p>
      </div>

      {/* Period Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {PERIODS.map(({ key, label: pLabel }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={reviewPeriod === key ? 'hp' : 'outline'}
                  onClick={() => setReviewPeriod(key)}
                >
                  {pLabel}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Reference Date:</span>
              <input
                type="date"
                value={rd}
                onChange={(e) => setRefDate(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Target Achievement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Target Achievement — {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>
                  Won: <strong className="font-mono">{fmtINR(wonVal)}</strong>
                </span>
                <span>
                  Target: <strong className="font-mono">{fmtINR(target)}</strong>
                </span>
              </div>
              <Progress
                value={Math.min(100, achievementPct)}
                className="h-3"
                indicatorClassName={
                  achievementPct >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-[#0091D5] to-[#00AEEF]'
                }
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {achievementPct}% of target achieved
                </span>
                {achievementPct >= 100 && (
                  <Badge variant="won" className="text-[10px]">🎉 Target Achieved!</Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">New Leads</p>
                <p className="text-xl font-bold font-mono mt-1">{newLeads.length}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Won</p>
                <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{wonInPeriod.length}</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-red-600 font-semibold">Lost</p>
                <p className="text-xl font-bold font-mono text-red-700 mt-1">{lostInPeriod.length}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#2C3E70]" />
                  Govt New Leads
                </span>
                <strong>{govtNew}</strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0E8C7F]" />
                  Non-Govt New Leads
                </span>
                <strong>{nonNew}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Set Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Set Target — {reviewPeriod.charAt(0).toUpperCase() + reviewPeriod.slice(1)}
            </CardTitle>
            <CardDescription>Update the sales target value for this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="10000"
                  value={target}
                  onChange={(e) => onTargetChange(reviewPeriod, e.target.value)}
                  className="font-mono text-lg h-12 text-center font-semibold"
                  placeholder="e.g. 1000000"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Current: <span className="font-mono font-semibold">{fmtINR(target)}</span>
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick presets
              </p>
              <div className="flex flex-wrap gap-2">
                {[500000, 1000000, 2500000, 5000000].map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant="outline"
                    className="text-xs font-mono"
                    onClick={() => onTargetChange(reviewPeriod, String(v))}
                  >
                    {fmtINR(v)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Won / Lost breakdown cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold text-emerald-600">Won Value</p>
                <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">{fmtINR(wonVal)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{wonInPeriod.length} deals in period</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold text-red-600">Lost Value</p>
                <p className="text-2xl font-mono font-bold text-red-700 mt-1">{fmtINR(lostVal)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{lostInPeriod.length} deals in period</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
