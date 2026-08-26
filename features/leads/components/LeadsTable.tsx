'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Eye, FileX } from 'lucide-react';
import { StageBadge } from './StageBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/context/AuthContext';
import { fmtINR, fmtDate } from '@/lib/utils';

interface Lead {
  id: string;
  leadNumber?: string | null;
  orgName?: string | null;
  deptIndustry?: string | null;
  contactPerson?: string | null;
  estValue?: number | string | null;
  expectedClose?: string | null;
  stage?: { name?: string; is_won?: boolean; is_lost?: boolean } | string | null;
  sector?: { name?: string } | string | null;
  category?: { name?: string } | null;
  modelDetails?: string | null;
  qty?: number | null;
  gemBid?: { gem_bid_number?: string; tender_ref?: string } | null;
  assignedProfile?: { full_name?: string } | null;
  createdAt?: string | null;
  createdBy?: string | null;
  [key: string]: unknown;
}

interface LeadsTableProps {
  leads: Lead[];
  onEdit: (id: string) => void;
}

type SortKey = 'leadNumber' | 'orgName' | 'estValue' | 'expectedClose' | 'createdAt';

export function LeadsTable({ leads, onEdit }: LeadsTableProps) {
  const auth = useAuth() as any;
  const isOwner = Boolean(auth.isOwner);
  const activeSegment = auth.activeSegment as { id: string; name: string } | null;

  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const getStageName = (lead: Lead) =>
    typeof lead.stage === 'string' ? lead.stage : lead.stage?.name ?? '';

  const getSectorName = (lead: Lead) =>
    typeof lead.sector === 'string' ? lead.sector : (lead.sector as { name?: string })?.name ?? '';

  const availableStages = useMemo(
    () => [...new Set(leads.map(getStageName).filter(Boolean))],
    [leads]
  );
  const availableSectors = useMemo(
    () => [...new Set(leads.map(getSectorName).filter(Boolean))],
    [leads]
  );

  const filtered = useMemo(() => {
    let result = leads.filter((l) => {
      if (filterStage !== 'all' && getStageName(l) !== filterStage) return false;
      if (filterSector !== 'all' && getSectorName(l) !== filterSector) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (l.orgName ?? '').toLowerCase().includes(q) ||
          (l.category?.name ?? '').toLowerCase().includes(q) ||
          (l.gemBid?.gem_bid_number ?? '').toLowerCase().includes(q) ||
          (l.gemBid?.tender_ref ?? '').toLowerCase().includes(q) ||
          (l.assignedProfile?.full_name ?? '').toLowerCase().includes(q) ||
          (l.leadNumber ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let va: string | number = (a[sortKey] ?? '') as string | number;
      let vb: string | number = (b[sortKey] ?? '') as string | number;
      if (sortKey === 'estValue') { va = Number(va); vb = Number(vb); }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [leads, search, filterStage, filterSector, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 opacity-30 ml-1" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-primary ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary ml-1" />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            All Leads
            <span className="ml-2 text-lg font-mono text-muted-foreground">
              ({filtered.length}{leads.length !== filtered.length ? `/${leads.length}` : ''})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeSegment ? `Segment: ${activeSegment.name}` : 'All segments'} — search, filter, and manage.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search org, bid no., category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {availableSectors.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {availableStages.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th
                  className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort('leadNumber')}
                >
                  <span className="inline-flex items-center">Lead # <SortIcon col="leadNumber" /></span>
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort('orgName')}
                >
                  <span className="inline-flex items-center">Organisation <SortIcon col="orgName" /></span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">Category</th>
                <th
                  className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort('estValue')}
                >
                  <span className="inline-flex items-center">Est. Value <SortIcon col="estValue" /></span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">Stage</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">GeM / Ref</th>
                <th
                  className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => toggleSort('expectedClose')}
                >
                  <span className="inline-flex items-center">Close Date <SortIcon col="expectedClose" /></span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileX className="h-8 w-8 opacity-40" />
                      <p className="font-medium">No leads match your criteria</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((l, idx) => (
                <tr
                  key={l.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {l.leadNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="font-semibold text-foreground truncate">{l.orgName}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {l.deptIndustry || l.contactPerson}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <div className="truncate">{l.category?.name || '—'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {l.modelDetails} {l.qty && l.qty > 1 ? `× ${l.qty}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-foreground whitespace-nowrap">
                      {fmtINR(l.estValue)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge stage={l.stage} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {l.gemBid?.gem_bid_number || l.gemBid?.tender_ref || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-foreground">
                    {fmtDate(l.expectedClose)}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                    {l.assignedProfile?.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(() => {
                      const canEdit = isOwner || (l.createdBy && auth.user?.id && l.createdBy === auth.user.id);
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2.5 gap-1.5"
                          onClick={() => onEdit(l.id)}
                        >
                          {canEdit ? (
                            <>
                              <Pencil className="h-3 w-3" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" />
                              View
                            </>
                          )}
                        </Button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
