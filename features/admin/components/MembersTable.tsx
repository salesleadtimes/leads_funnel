'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  UserPlus,
  Crown,
  User,
  Shield,
  Building2,
  Target,
  ArrowRight,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtINR, fmtDate } from '@/lib/utils';

export interface MemberListItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  assignedSegments: Array<{ id: string; code?: string; name: string }>;
  targetCount: number;
  currentMonthlyTarget: number;
}

interface MembersTableProps {
  members: MemberListItem[];
  onOpenInvite: () => void;
  onRefresh?: () => void;
}

export function MembersTable({ members, onOpenInvite }: MembersTableProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');

  // Extract unique segments
  const allAvailableSegments = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => {
      (m.assignedSegments || []).forEach((s) => {
        if (s?.id && s?.name) map.set(s.id, s.name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (segmentFilter !== 'all') {
        const hasSeg = (m.assignedSegments || []).some((s) => s.id === segmentFilter);
        if (!hasSeg) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = m.fullName.toLowerCase().includes(q);
        const matchEmail = m.email.toLowerCase().includes(q);
        const matchPhone = (m.phone || '').toLowerCase().includes(q);
        const matchSeg = (m.assignedSegments || []).some((s) =>
          s.name.toLowerCase().includes(q)
        );
        return matchName || matchEmail || matchPhone || matchSeg;
      }
      return true;
    });
  }, [members, search, roleFilter, segmentFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Team & Target Management
            <span className="text-sm font-mono font-normal text-muted-foreground ml-2">
              ({filtered.length} member{filtered.length === 1 ? '' : 's'})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure member segment access and individual sales targets.
          </p>
        </div>

        <Button variant="hp" onClick={onOpenInvite} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          Invite New Member
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, segment, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">👑 Owner</SelectItem>
                <SelectItem value="member">👤 Member</SelectItem>
              </SelectContent>
            </Select>

            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {allAvailableSegments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
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
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Member
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Assigned Segments
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Monthly Target
                </th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 opacity-30" />
                      <p className="font-medium">No team members found</p>
                      <p className="text-xs">Try adjusting your filters or invite a new member.</p>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.map((m) => {
                const initials = m.fullName
                  ? m.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : m.email[0].toUpperCase();

                const isOwner = m.role === 'owner';

                return (
                  <tr
                    key={m.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    {/* Member Name & Email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback
                            className="text-white text-xs font-bold"
                            style={{
                              background: isOwner
                                ? 'linear-gradient(135deg, #FFC300, #E65100)'
                                : 'linear-gradient(135deg, #0091D5, #00AEEF)',
                            }}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                            {m.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {m.email}
                          </div>
                          {m.phone && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-2.5 w-2.5 shrink-0" />
                              {m.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FFC300]/15 text-[#B8900A] border border-[#FFC300]/30">
                          <Crown className="h-3 w-3" /> Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <User className="h-3 w-3" /> Member
                        </span>
                      )}
                    </td>

                    {/* Assigned Segments */}
                    <td className="px-4 py-3.5 max-w-[280px]">
                      <div className="flex flex-wrap gap-1">
                        {(m.assignedSegments || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            No segments assigned
                          </span>
                        ) : (
                          m.assignedSegments.map((seg) => (
                            <Badge
                              key={seg.id}
                              variant="outline"
                              className="text-[11px] bg-background border-border/70 text-foreground/80 py-0.5 px-2 font-normal"
                            >
                              <Building2 className="h-2.5 w-2.5 mr-1 text-[#00AEEF]" />
                              {seg.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Monthly Target */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div>
                        <span className="font-mono font-semibold text-foreground">
                          {m.currentMonthlyTarget > 0 ? fmtINR(m.currentMonthlyTarget) : '—'}
                        </span>
                        <div className="text-[11px] text-muted-foreground">
                          {m.targetCount > 0
                            ? `${m.targetCount} target config${m.targetCount > 1 ? 's' : ''}`
                            : 'No target set'}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Link href={`/admin/members/${m.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Manage
                          <ArrowRight className="h-3 w-3 opacity-50" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
