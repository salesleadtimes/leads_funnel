'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Building2,
  User,
  Crown,
  Calendar,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { PeriodType, PeriodRange } from '@/lib/utils/periodUtils';
import { fmtINR } from '@/lib/utils';

interface Lead {
  id?: string;
  stage?: string | { name?: string; is_won?: boolean; is_lost?: boolean } | null;
  sector?: string | { name?: string } | null;
  estValue?: number | string | null;
  closedDate?: string | null;
  createdDate?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  segmentId?: string | null;
  [key: string]: unknown;
}

interface MemberOption {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

interface SegmentOption {
  id: string;
  name: string;
  code?: string;
}

interface ReviewsBoardProps {
  leads: Lead[];
  currentTargetValue: number;
  hasTarget: boolean;
  reviewPeriod: PeriodType;
  setReviewPeriod: (p: PeriodType) => void;
  refDate: string;
  setRefDate: (d: string) => void;
  periodRange: PeriodRange;
  // Scoping props
  isOwner: boolean;
  selectedUserId: string | null; // null = all leads aggregate / segment-wide
  setSelectedUserId: (id: string | null) => void;
  members: MemberOption[];
  selectedSegmentId: string | null;
  setSelectedSegmentId: (id: string | null) => void;
  segments: SegmentOption[];
  onSaveTarget?: (newTargetValue: number) => Promise<void>;
}

const PERIODS: { key: PeriodType; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

export function ReviewsBoard({
  leads,
  currentTargetValue,
  hasTarget,
  reviewPeriod,
  setReviewPeriod,
  refDate,
  setRefDate,
  periodRange,
  isOwner,
  selectedUserId,
  setSelectedUserId,
  members,
  selectedSegmentId,
  setSelectedSegmentId,
  segments,
  onSaveTarget,
}: ReviewsBoardProps) {
  const { start, end, label } = periodRange;

  const [inputTarget, setInputTarget] = useState<string>(String(currentTargetValue || ''));
  const [savingTarget, setSavingTarget] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync input value when current target changes externally
  const displayTarget = Number(currentTargetValue) || 0;

  function getStageName(l: Lead) {
    if (typeof l.stage === 'string') return l.stage;
    return (l.stage as { name?: string })?.name ?? '';
  }

  function getSectorName(l: Lead) {
    if (typeof l.sector === 'string') return l.sector;
    return (l.sector as { name?: string })?.name ?? '';
  }

  // Filter leads for this period & segment & creator
  const leadsInScope = leads.filter((l) => {
    // Segment check
    if (selectedSegmentId && l.segmentId && l.segmentId !== selectedSegmentId) return false;
    // Creator check: if selectedUserId is set, achievement is strictly leads created by that member
    if (selectedUserId && l.createdBy && l.createdBy !== selectedUserId) return false;
    return true;
  });

  const newLeads = leadsInScope.filter((l) => {
    const d = (l.createdAt || l.createdDate) as string;
    return d && d >= start && d < end;
  });

  const wonInPeriod = leadsInScope.filter((l) => {
    const isWon = getStageName(l) === 'Won' || (l.stage as any)?.is_won;
    const d = (l.closedDate || l.createdAt || l.createdDate) as string;
    return isWon && d && d >= start && d < end;
  });

  const lostInPeriod = leadsInScope.filter((l) => {
    const isLost = getStageName(l) === 'Lost' || (l.stage as any)?.is_lost;
    const d = (l.closedDate || l.createdAt || l.createdDate) as string;
    return isLost && d && d >= start && d < end;
  });

  const totalCreatedVal = newLeads.reduce((a, l) => a + (Number(l.estValue) || 0), 0);
  const wonVal = wonInPeriod.reduce((a, l) => a + (Number(l.estValue) || 0), 0);
  const lostVal = lostInPeriod.reduce((a, l) => a + (Number(l.estValue) || 0), 0);

  const achievementPct =
    displayTarget > 0 ? Math.min(150, Math.round((100 * totalCreatedVal) / displayTarget)) : 0;

  const govtNew = newLeads.filter((l) => getSectorName(l) === 'Government').length;
  const nonNew = newLeads.filter((l) => getSectorName(l) === 'Non-Government').length;

  const selectedMemberObj = members.find((m) => m.id === selectedUserId);
  const selectedSegmentObj = segments.find((s) => s.id === selectedSegmentId);

  async function handleTargetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onSaveTarget) return;
    setSavingTarget(true);
    setSavedSuccess(false);
    try {
      await onSaveTarget(Number(inputTarget) || 0);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save target:', err);
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Sales Performance Review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track sales target achievement for individual members and business segments.
        </p>
      </div>

      {/* Filter & Scope Controls Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Period Tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {PERIODS.map(({ key, label: pLabel }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={reviewPeriod === key ? 'hp' : 'outline'}
                  onClick={() => {
                    setReviewPeriod(key);
                    setInputTarget('');
                  }}
                >
                  {pLabel}
                </Button>
              ))}
            </div>

            {/* Scope Selectors (Member & Segment) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Member Selector for Owner */}
              {isOwner && members.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={selectedUserId || 'all'}
                    onValueChange={(v) => {
                      setSelectedUserId(v === 'all' ? null : v);
                      setInputTarget('');
                    }}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue placeholder="All Members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👥 All Team Leads</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.fullName || m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Segment Selector */}
              {segments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={selectedSegmentId || 'all'}
                    onValueChange={(v) => {
                      setSelectedSegmentId(v === 'all' ? null : v);
                      setInputTarget('');
                    }}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="All Segments" />
                    </SelectTrigger>
                    <SelectContent>
                      {isOwner && <SelectItem value="all">🌐 All Segments</SelectItem>}
                      {segments.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reference Date Picker */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={refDate}
                  onChange={(e) => {
                    setRefDate(e.target.value);
                    setInputTarget('');
                  }}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Active Context Scope Info Badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
            <span>Reviewing:</span>
            <span className="font-semibold text-foreground">
              {selectedMemberObj ? selectedMemberObj.fullName : 'All Members (Aggregate)'}
            </span>
            <span>·</span>
            <span>Segment:</span>
            <span className="font-semibold text-foreground">
              {selectedSegmentObj ? selectedSegmentObj.name : 'All Segments'}
            </span>
            <span>·</span>
            <span>Period:</span>
            <span className="font-mono text-primary font-semibold">{label}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Target Achievement Card */}
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
                  Created Pipeline: <strong className="font-mono">{fmtINR(totalCreatedVal)}</strong>
                </span>
                <span>
                  Target: <strong className="font-mono">{fmtINR(displayTarget)}</strong>
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
                  {hasTarget
                    ? `${achievementPct}% of target achieved`
                    : 'No specific target set for this period'}
                </span>
                {achievementPct >= 100 && (
                  <Badge variant="won" className="text-[10px]">
                    🎉 Target Achieved!
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  New Leads
                </p>
                <p className="text-xl font-bold font-mono mt-1">{newLeads.length}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                  Won Deals
                </p>
                <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                  {wonInPeriod.length}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-red-600 font-semibold">
                  Lost Deals
                </p>
                <p className="text-xl font-bold font-mono text-red-700 mt-1">
                  {lostInPeriod.length}
                </p>
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

        {/* Set Target Card (Owner Live Configuration or Member Target Info) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {isOwner ? 'Configure Target' : 'Target Overview'} —{' '}
              {reviewPeriod.charAt(0).toUpperCase() + reviewPeriod.slice(1)}
            </CardTitle>
            <CardDescription>
              {isOwner
                ? `Update sales target for ${
                    selectedMemberObj ? selectedMemberObj.fullName : 'all members'
                  } (${selectedSegmentObj ? selectedSegmentObj.name : 'segment'})`
                : 'Your sales performance target for this review period'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOwner && onSaveTarget ? (
              <form onSubmit={handleTargetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-lg font-semibold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="10000"
                      value={inputTarget !== '' ? inputTarget : displayTarget || ''}
                      onChange={(e) => setInputTarget(e.target.value)}
                      className="font-mono text-lg h-12 text-center font-semibold pl-8"
                      placeholder="e.g. 1000000"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                    <span>
                      Current: <strong className="font-mono">{fmtINR(displayTarget)}</strong>
                    </span>
                    {savedSuccess && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Target Saved!
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {[500000, 1000000, 2500000, 5000000].map((v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs font-mono h-7 px-2"
                        onClick={() => setInputTarget(String(v))}
                      >
                        {fmtINR(v)}
                      </Button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="hp"
                    size="sm"
                    disabled={savingTarget}
                    className="gap-1.5 h-8"
                  >
                    {savingTarget ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save Target
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Assigned Target Value
                </p>
                <p className="text-3xl font-bold font-mono text-primary">
                  {hasTarget ? fmtINR(displayTarget) : 'No target assigned'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Targets are configured by your administrator per segment and review period.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Won / Lost breakdown cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold text-emerald-600">
                  Won Value
                </p>
                <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">
                  {fmtINR(wonVal)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wonInPeriod.length} deals in period
                </p>
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
                <p className="text-xs uppercase tracking-widest font-semibold text-red-600">
                  Lost Value
                </p>
                <p className="text-2xl font-mono font-bold text-red-700 mt-1">
                  {fmtINR(lostVal)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lostInPeriod.length} deals in period
                </p>
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
