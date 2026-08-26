'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Shield,
  Crown,
  Building2,
  Target,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Loader2,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getPeriodRange,
  getPeriodValue,
  getPeriodKey,
  normalizePeriodType,
  PeriodType,
} from '@/lib/utils/periodUtils';
import {
  updateMemberProfile,
  updateMemberSegments,
  saveMemberTargets,
} from '@/lib/services/memberService';
import { fmtINR } from '@/lib/utils';

interface Segment {
  id: string;
  code?: string;
  name: string;
  description?: string;
}

interface TargetRecord {
  id?: string;
  segment_id: string;
  user_id?: string;
  year: number;
  period_type: string;
  period_value: number | null;
  target_value: number;
}

interface MemberDetailViewProps {
  memberId: string;
  initialData: {
    profile: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      phone?: string;
      isActive: boolean;
    };
    assignedSegments: Segment[];
    allSegments: Segment[];
    targets: TargetRecord[];
    achievements?: Record<string, Record<string, any>>;
  };
  onRefresh: () => void;
}

const PRESET_AMOUNTS = [100000, 500000, 1000000, 2000000, 5000000];

export function MemberDetailView({ memberId, initialData, onRefresh }: MemberDetailViewProps) {
  const router = useRouter();

  // Profile state
  const [profile, setProfile] = useState(initialData.profile);
  const [fullName, setFullName] = useState(initialData.profile.fullName);
  const [phone, setPhone] = useState(initialData.profile.phone || '');
  const [role, setRole] = useState(initialData.profile.role || 'member');
  const [isActive, setIsActive] = useState(initialData.profile.isActive);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Segment state
  const [assignedSegments, setAssignedSegments] = useState<Segment[]>(initialData.assignedSegments || []);
  const [selectedNewSegment, setSelectedNewSegment] = useState<string>('');
  const [savingSegments, setSavingSegments] = useState(false);
  const [segmentMsg, setSegmentMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Targets state: year & reference date
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [refDate, setRefDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Form values per segment: { [segmentId]: { daily, weekly, monthly, quarterly, yearly } }
  const [segmentTargets, setSegmentTargets] = useState<Record<string, Record<PeriodType, string>>>({});
  const [savingTargetSegId, setSavingTargetSegId] = useState<string | null>(null);
  const [targetMsg, setTargetMsg] = useState<Record<string, { text: string; type: 'success' | 'error' }>>({});

  // Sync state with incoming initialData
  useEffect(() => {
    setProfile(initialData.profile);
    setFullName(initialData.profile.fullName);
    setPhone(initialData.profile.phone || '');
    setRole(initialData.profile.role || 'member');
    setIsActive(initialData.profile.isActive);
    setAssignedSegments(initialData.assignedSegments || []);
  }, [initialData]);

  // Compute period values for current reference date
  const periodRanges = useMemo(() => {
    return {
      daily: getPeriodRange('daily', refDate),
      weekly: getPeriodRange('weekly', refDate),
      monthly: getPeriodRange('monthly', refDate),
      quarterly: getPeriodRange('quarterly', refDate),
      yearly: getPeriodRange('yearly', refDate),
    };
  }, [refDate]);

  // Load existing target values from initialData.targets for current year/period
  useEffect(() => {
    const newSegTargets: Record<string, Record<PeriodType, string>> = {};

    assignedSegments.forEach((seg) => {
      newSegTargets[seg.id] = {
        daily: '',
        weekly: '',
        monthly: '',
        quarterly: '',
        yearly: '',
      };

      const segTargets = (initialData.targets || []).filter(
        (t) => (t.segment_id === seg.id || (t as any).segmentId === seg.id) && t.year === targetYear
      );

      const periodTypes: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      periodTypes.forEach((p) => {
        const pRange = periodRanges[p];
        const norm = normalizePeriodType(p);

        const match = segTargets.find((t) => {
          const tNorm = normalizePeriodType(t.period_type);
          if (tNorm !== norm) return false;
          if (pRange.periodValue === null) {
            return t.period_value === null || t.period_value === 0 || t.period_value === 1;
          }
          return t.period_value === pRange.periodValue;
        });

        if (match && Number(match.target_value) > 0) {
          newSegTargets[seg.id][p] = String(match.target_value);
        }
      });
    });

    setSegmentTargets(newSegTargets);
  }, [assignedSegments, initialData.targets, targetYear, periodRanges]);

  // Available segments to add
  const unassignedSegments = useMemo(() => {
    const assignedIds = new Set(assignedSegments.map((s) => s.id));
    return (initialData.allSegments || []).filter((s) => !assignedIds.has(s.id));
  }, [assignedSegments, initialData.allSegments]);

  // Handle Profile Update
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateMemberProfile(memberId, {
        fullName,
        phone,
        role,
        isActive,
      });
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
      onRefresh();
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  // Handle Segment Add
  async function handleAddSegment() {
    if (!selectedNewSegment) return;
    setSavingSegments(true);
    setSegmentMsg(null);
    try {
      const updatedIds = [...assignedSegments.map((s) => s.id), selectedNewSegment];
      await updateMemberSegments(memberId, updatedIds);
      setSelectedNewSegment('');
      setSegmentMsg({ text: 'Segment added successfully!', type: 'success' });
      onRefresh();
    } catch (err: any) {
      setSegmentMsg({ text: err.message || 'Failed to add segment', type: 'error' });
    } finally {
      setSavingSegments(false);
    }
  }

  // Handle Segment Remove
  async function handleRemoveSegment(segmentId: string, segmentName: string) {
    const confirm = window.confirm(
      `Remove access to "${segmentName}" for this member?\n\nExisting historical targets and leads remain safely preserved in the database.`
    );
    if (!confirm) return;

    setSavingSegments(true);
    setSegmentMsg(null);
    try {
      const updatedIds = assignedSegments.map((s) => s.id).filter((id) => id !== segmentId);
      await updateMemberSegments(memberId, updatedIds);
      setSegmentMsg({ text: `Removed "${segmentName}" from member access.`, type: 'success' });
      onRefresh();
    } catch (err: any) {
      setSegmentMsg({ text: err.message || 'Failed to remove segment', type: 'error' });
    } finally {
      setSavingSegments(false);
    }
  }

  // Handle Target Input Change
  function handleTargetValChange(segId: string, period: PeriodType, value: string) {
    setSegmentTargets((prev) => ({
      ...prev,
      [segId]: {
        ...(prev[segId] || { daily: '', weekly: '', monthly: '', quarterly: '', yearly: '' }),
        [period]: value,
      },
    }));
  }

  // Handle Target Save for specific segment
  async function handleSaveSegmentTargets(segId: string, segName: string) {
    setSavingTargetSegId(segId);
    setTargetMsg((prev) => ({ ...prev, [segId]: null as any }));

    const segForm = segmentTargets[segId] || { daily: '', weekly: '', monthly: '', quarterly: '', yearly: '' };
    const periodTypes: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

    const targetPayload = periodTypes.map((p) => {
      const pRange = periodRanges[p];
      return {
        segment_id: segId,
        user_id: memberId,
        year: targetYear,
        period_type: p,
        period_value: pRange.periodValue,
        target_value: Number(segForm[p]) || 0,
      };
    });

    try {
      await saveMemberTargets(memberId, targetPayload);
      setTargetMsg((prev) => ({
        ...prev,
        [segId]: { text: `Saved targets for ${segName}!`, type: 'success' },
      }));
      onRefresh();
    } catch (err: any) {
      setTargetMsg((prev) => ({
        ...prev,
        [segId]: { text: err.message || 'Failed to save targets', type: 'error' },
      }));
    } finally {
      setSavingTargetSegId(null);
    }
  }

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email[0].toUpperCase();

  const isOwner = profile.role === 'owner';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Team Members
        </Link>
      </div>

      {/* Member Header Card */}
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-primary/4">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                <AvatarFallback
                  className="text-white text-lg font-bold"
                  style={{
                    background: isOwner
                      ? 'linear-gradient(135deg, #FFC300, #E65100)'
                      : 'linear-gradient(135deg, #0091D5, #00AEEF)',
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-display font-bold text-foreground">
                    {profile.fullName || profile.email}
                  </h1>
                  {isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FFC300]/15 text-[#B8900A] border border-[#FFC300]/30">
                      <Crown className="h-3 w-3" /> Owner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      <User className="h-3 w-3" /> Member
                    </span>
                  )}
                  <Badge variant={profile.isActive ? 'default' : 'secondary'} className="text-xs">
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {profile.email}
                  </span>
                  {profile.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {profile.phone}
                    </span>
                  )}
                  <span className="font-mono">
                    {assignedSegments.length} assigned segment{assignedSegments.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: Member Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            1. Member Information
          </CardTitle>
          <CardDescription>Edit member contact info, system role, and access status</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileMsg && (
              <div
                className={`rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}
              >
                {profileMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email (Supabase Auth)</Label>
                <Input value={profile.email} disabled className="bg-muted/50 cursor-not-allowed" />
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">👤 Member</SelectItem>
                    <SelectItem value="owner">👑 Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                Active Account Status
              </label>

              <Button type="submit" variant="hp" size="sm" disabled={savingProfile} className="gap-1.5">
                {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SECTION 2: Business Segment Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            2. Business Segment Access
          </CardTitle>
          <CardDescription>
            Assign or revoke segment access. Multiple members can share a segment. Leads in assigned segments are visible to all members of that segment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {segmentMsg && (
            <div
              className={`rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
                segmentMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {segmentMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {segmentMsg.text}
            </div>
          )}

          {/* Assigned Segments List */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2 block">
              Currently Assigned Segments ({assignedSegments.length})
            </Label>
            {assignedSegments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                No segments currently assigned to this member. Add a segment below to configure targets.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {assignedSegments.map((seg) => (
                  <div
                    key={seg.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20 hover:border-primary/30 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#00AEEF] shrink-0" />
                        {seg.name}
                      </div>
                      {seg.code && (
                        <div className="text-[11px] font-mono text-muted-foreground">{seg.code}</div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSegment(seg.id, seg.name)}
                      disabled={savingSegments}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                      title="Remove segment access"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Segment Dropdown */}
          {unassignedSegments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Select value={selectedNewSegment} onValueChange={setSelectedNewSegment}>
                <SelectTrigger className="w-64 h-9">
                  <SelectValue placeholder="— Select segment to assign —" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedSegments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSegment}
                disabled={!selectedNewSegment || savingSegments}
                className="gap-1.5 h-9"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                Add Segment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3 & 4: Target Management & Live Performance */}
      <div className="space-y-4">
        {/* Controls Bar for Year & Reference Date */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  3. Segment Target Configuration
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure targets separately for each segment across Daily, Weekly, Monthly, Quarterly, and Yearly periods.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Reference Year:</span>
                  <Select
                    value={String(targetYear)}
                    onValueChange={(v) => setTargetYear(Number(v))}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <SelectItem key={y} value={String(y)} className="font-mono text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Reference Date:</span>
                  <input
                    type="date"
                    value={refDate}
                    onChange={(e) => setRefDate(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Segment Target Cards */}
        {assignedSegments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-30 mx-auto mb-2" />
              <p className="font-medium">No business segments assigned</p>
              <p className="text-xs">Assign at least one business segment above to configure targets.</p>
            </CardContent>
          </Card>
        ) : (
          assignedSegments.map((seg) => {
            const segForm = segmentTargets[seg.id] || {
              daily: '',
              weekly: '',
              monthly: '',
              quarterly: '',
              yearly: '',
            };
            const isSaving = savingTargetSegId === seg.id;
            const msg = targetMsg[seg.id];

            // Achievement data for this segment
            const segAch = initialData.achievements?.[seg.id] || {};
            const monthlyAch = segAch.monthly;

            return (
              <Card key={seg.id} className="border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#00AEEF]" />
                        {seg.name}
                        {seg.code && (
                          <span className="text-xs font-mono font-normal text-muted-foreground">
                            ({seg.code})
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configured for Year {targetYear} · Member: {profile.fullName}
                      </CardDescription>
                    </div>

                    {/* Quick Achievement Pill */}
                    {monthlyAch && monthlyAch.hasTarget && (
                      <div className="flex items-center gap-2 bg-background/80 border border-border/60 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-muted-foreground">Month Achieved:</span>
                        <strong className="font-mono text-foreground">
                          {fmtINR(monthlyAch.achievedValue)}
                        </strong>
                        <Badge
                          variant={monthlyAch.achievementPercentage >= 100 ? 'won' : 'outline'}
                          className="text-[10px] font-mono px-1.5"
                        >
                          {monthlyAch.achievementPercentage}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {msg && (
                    <div
                      className={`rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
                        msg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
                      }`}
                    >
                      {msg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {msg.text}
                    </div>
                  )}

                  {/* 5 Period Target Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Daily */}
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-xs text-foreground">Daily Target</Label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {periodRanges.daily.label}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="1000"
                          value={segForm.daily}
                          onChange={(e) => handleTargetValChange(seg.id, 'daily', e.target.value)}
                          placeholder="e.g. 50000"
                          className="pl-6 font-mono text-sm"
                        />
                      </div>
                      {segAch.daily && Number(segForm.daily) > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                          <span>Achieved:</span>
                          <strong className="font-mono">{fmtINR(segAch.daily.achievedValue)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Weekly */}
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-xs text-foreground">Weekly Target</Label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {periodRanges.weekly.key.split('-')[1]}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="10000"
                          value={segForm.weekly}
                          onChange={(e) => handleTargetValChange(seg.id, 'weekly', e.target.value)}
                          placeholder="e.g. 250000"
                          className="pl-6 font-mono text-sm"
                        />
                      </div>
                      {segAch.weekly && Number(segForm.weekly) > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                          <span>Achieved:</span>
                          <strong className="font-mono">{fmtINR(segAch.weekly.achievedValue)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Monthly */}
                    <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/4 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-xs text-primary">Monthly Target *</Label>
                        <span className="text-[10px] font-mono text-primary/80">
                          {periodRanges.monthly.label}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-primary">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="50000"
                          value={segForm.monthly}
                          onChange={(e) => handleTargetValChange(seg.id, 'monthly', e.target.value)}
                          placeholder="e.g. 1000000"
                          className="pl-6 font-mono text-sm font-semibold border-primary/40 focus-visible:ring-primary"
                        />
                      </div>
                      {segAch.monthly && Number(segForm.monthly) > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                          <span>Achieved:</span>
                          <strong className="font-mono text-primary">{fmtINR(segAch.monthly.achievedValue)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Quarterly */}
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-xs text-foreground">Quarterly Target</Label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {periodRanges.quarterly.label}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="100000"
                          value={segForm.quarterly}
                          onChange={(e) => handleTargetValChange(seg.id, 'quarterly', e.target.value)}
                          placeholder="e.g. 3000000"
                          className="pl-6 font-mono text-sm"
                        />
                      </div>
                      {segAch.quarterly && Number(segForm.quarterly) > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                          <span>Achieved:</span>
                          <strong className="font-mono">{fmtINR(segAch.quarterly.achievedValue)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Yearly */}
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-xs text-foreground">Yearly Target</Label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Year {targetYear}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="500000"
                          value={segForm.yearly}
                          onChange={(e) => handleTargetValChange(seg.id, 'yearly', e.target.value)}
                          placeholder="e.g. 12000000"
                          className="pl-6 font-mono text-sm"
                        />
                      </div>
                      {segAch.yearly && Number(segForm.yearly) > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                          <span>Achieved:</span>
                          <strong className="font-mono">{fmtINR(segAch.yearly.achievedValue)}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Presets & Save Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-semibold mr-1">
                        Quick Monthly Presets:
                      </span>
                      {PRESET_AMOUNTS.map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTargetValChange(seg.id, 'monthly', String(amt))}
                          className="h-6 px-2 text-[11px] font-mono"
                        >
                          {fmtINR(amt)}
                        </Button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="hp"
                      size="sm"
                      onClick={() => handleSaveSegmentTargets(seg.id, seg.name)}
                      disabled={isSaving}
                      className="gap-1.5"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Targets for {seg.name}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
