'use client';

import {
  BarChart3,
  IndianRupee,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { KpiCard } from './KpiCard';
import { FunnelChart, OPEN_STAGES, STAGE_COLORS } from './FunnelChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { fmtINR } from '@/lib/utils';

interface Lead {
  stage?: string | { name?: string; is_won?: boolean; is_lost?: boolean };
  sector?: string | { name?: string };
  estValue?: number | string;
  closedDate?: string;
  createdDate?: string;
  orgName?: string;
  [key: string]: unknown;
}

interface DashboardOverviewProps {
  leads: Lead[];
}

export function DashboardOverview({ leads }: DashboardOverviewProps) {
  function getStageName(lead: Lead): string {
    if (typeof lead.stage === 'string') return lead.stage;
    return (lead.stage as { name?: string })?.name ?? '';
  }

  function getSectorName(lead: Lead): string {
    if (typeof lead.sector === 'string') return lead.sector;
    return (lead.sector as { name?: string })?.name ?? '';
  }

  function countWhere(pred: (l: Lead) => boolean) {
    return leads.filter(pred).length;
  }

  function sumWhere(pred: (l: Lead) => boolean, val: (l: Lead) => number) {
    return leads.filter(pred).reduce((a, l) => a + (val(l) || 0), 0);
  }

  const openCount = countWhere((l) => OPEN_STAGES.includes(getStageName(l)));
  const pipelineVal = sumWhere(
    (l) => OPEN_STAGES.includes(getStageName(l)),
    (l) => Number(l.estValue) || 0
  );
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const wonThisMonth = sumWhere(
    (l) =>
      getStageName(l) === 'Won' &&
      !!l.closedDate &&
      (l.closedDate as string) >= monthStart,
    (l) => Number(l.estValue) || 0
  );
  const wonCount = countWhere((l) => getStageName(l) === 'Won');
  const lostCount = countWhere((l) => getStageName(l) === 'Lost');
  const winRate =
    wonCount + lostCount > 0
      ? Math.round((100 * wonCount) / (wonCount + lostCount))
      : 0;

  const govtCount = countWhere((l) => getSectorName(l) === 'Government');
  const nonCount = countWhere((l) => getSectorName(l) === 'Non-Government');
  const govtVal = sumWhere(
    (l) => getSectorName(l) === 'Government',
    (l) => Number(l.estValue) || 0
  );
  const nonVal = sumWhere(
    (l) => getSectorName(l) === 'Non-Government',
    (l) => Number(l.estValue) || 0
  );
  const totalVal = govtVal + nonVal || 1;

  const recent = [...leads]
    .sort((a, b) =>
      ((b.closedDate || b.createdDate) as string)?.localeCompare(
        (a.closedDate || a.createdDate) as string
      )
    )
    .slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Sales Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live snapshot across Government and Non-Government pipelines.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Open Leads"
          value={openCount}
          subtitle="Active in pipeline"
          icon={BarChart3}
          accentColor="#00AEEF"
        />
        <KpiCard
          title="Pipeline Value"
          value={fmtINR(pipelineVal)}
          subtitle="Open opportunities"
          icon={IndianRupee}
          accentColor="#EC008C"
        />
        <KpiCard
          title="Won This Month"
          value={fmtINR(wonThisMonth)}
          subtitle={`${wonCount} total won`}
          icon={Trophy}
          accentColor="#FFC300"
        />
        <KpiCard
          title="Win Rate"
          value={`${winRate}%`}
          subtitle={`${wonCount}W · ${lostCount}L`}
          icon={Target}
          accentColor={winRate >= 50 ? '#1E8A5F' : '#C0392B'}
        />
      </div>

      {/* Funnel Chart */}
      <FunnelChart leads={leads} />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Govt vs Non-Govt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Government vs Non-Government</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stacked Bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div
                className="rounded-l-full transition-all duration-700"
                style={{ width: `${(100 * govtVal) / totalVal}%`, background: '#2C3E70' }}
              />
              <div
                className="rounded-r-full transition-all duration-700"
                style={{ width: `${(100 * nonVal) / totalVal}%`, background: '#0E8C7F' }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2C3E70]" />
                  <Badge variant="govt">GOVT</Badge>
                  <span className="text-sm text-muted-foreground">{govtCount} leads</span>
                </div>
                <span className="font-mono text-sm font-semibold">{fmtINR(govtVal)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0E8C7F]" />
                  <Badge variant="nongovt">NON-GOVT</Badge>
                  <span className="text-sm text-muted-foreground">{nonCount} leads</span>
                </div>
                <span className="font-mono text-sm font-semibold">{fmtINR(nonVal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No leads yet. Add your first opportunity!
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map((l, i) => {
                  const stageName = getStageName(l);
                  const stageColor = STAGE_COLORS[stageName] ?? '#8A93A3';
                  return (
                    <div
                      key={(l.id as string) ?? i}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                        {l.orgName as string}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold font-mono shrink-0"
                        style={{
                          background: stageColor + '22',
                          color: stageColor,
                        }}
                      >
                        {stageName || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
