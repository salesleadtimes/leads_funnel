'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Crown,
  Building2,
  Target,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Phone,
  Mail,
  Loader2,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  saveMemberDailyTarget,
  updateMemberProfile,
  updateMemberSegments,
} from '@/lib/services/memberService';
import { MemberTarget } from '@/lib/services/targetsService';
import { fmtINR } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Segment {
  id: string;
  code?: string;
  name: string;
  description?: string;
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
    memberTargets: MemberTarget[];
    achievements?: Record<string, Record<string, any>>;
  };
  onRefresh: () => void;
}

// ─── Period configuration ─────────────────────────────────────────────────────

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

const PERIODS: {
  key: PeriodKey;
  label: string;
  sublabel: string;
  multiplier: number;
  placeholder: string;
  accent?: boolean;
}[] = [
  { key: 'daily',     label: 'Daily',     sublabel: '× 1 day',   multiplier: 1,   placeholder: '₹1,00,000'   },
  { key: 'weekly',    label: 'Weekly',    sublabel: '× 7 days',  multiplier: 7,   placeholder: '₹7,00,000'   },
  { key: 'monthly',   label: 'Monthly',   sublabel: '× 30 days', multiplier: 30,  placeholder: '₹30,00,000',  accent: true },
  { key: 'quarterly', label: 'Quarterly', sublabel: '× 90 days', multiplier: 90,  placeholder: '₹90,00,000'  },
  { key: 'annual',    label: 'Annual',    sublabel: '× 365 days',multiplier: 365, placeholder: '₹3,65,00,000' },
];

/** Round to 2 decimal places — avoids floating point drift */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Given a daily base amount, compute all period values.
 */
function deriveAllFromDaily(daily: number): Record<PeriodKey, number> {
  const d = Math.max(0, daily || 0);
  return {
    daily:     round2(d),
    weekly:    round2(d * 7),
    monthly:   round2(d * 30),
    quarterly: round2(d * 90),
    annual:    round2(d * 365),
  };
}

/**
 * Back-calculate daily from a value entered in any period field.
 */
function backCalcDaily(period: PeriodKey, value: number): number {
  const multiplier = PERIODS.find((p) => p.key === period)!.multiplier;
  return round2(Math.max(0, value) / multiplier);
}

/** Format number as Indian short-form: ₹1L, ₹30L, ₹3.65Cr */
function fmtShort(amount: number): string {
  if (!amount || amount === 0) return '';
  if (amount >= 1_00_00_000)
    return `₹${(amount / 1_00_00_000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (amount >= 1_00_000)
    return `₹${(amount / 1_00_000).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (amount >= 1_000)
    return `₹${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${amount}`;
}

// ─── Per-segment target form state ───────────────────────────────────────────

interface SegmentTargetFields {
  daily:     string;
  weekly:    string;
  monthly:   string;
  quarterly: string;
  annual:    string;
}

const EMPTY_FIELDS: SegmentTargetFields = {
  daily: '', weekly: '', monthly: '', quarterly: '', annual: '',
};

const DAILY_PRESETS = [50_000, 1_00_000, 2_00_000, 5_00_000, 10_00_000];

// ─── Synced Period Inputs ─────────────────────────────────────────────────────

interface SyncedPeriodInputsProps {
  segId: string;
  fields: SegmentTargetFields;
  onChange: (segId: string, changedPeriod: PeriodKey, rawValue: string) => void;
  achievements?: Record<string, any>;
}

function SyncedPeriodInputs({ segId, fields, onChange, achievements = {} }: SyncedPeriodInputsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {PERIODS.map((p) => {
        const numVal = Number(fields[p.key]) || 0;
        const ach = achievements[p.key];

        return (
          <div
            key={p.key}
            className={`space-y-1.5 rounded-xl border p-3 transition-all ${
              p.accent
                ? 'border-primary/35 bg-primary/4 shadow-sm'
                : 'border-border/60 bg-muted/10'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <Label
                className={`font-semibold text-xs ${
                  p.accent ? 'text-primary' : 'text-foreground'
                }`}
              >
                {p.label}
              </Label>
              <span
                className={`text-[10px] font-mono ${
                  p.accent ? 'text-primary/70' : 'text-muted-foreground'
                }`}
              >
                {p.sublabel}
              </span>
            </div>

            {/* Input */}
            <div className="relative">
              <span
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono pointer-events-none ${
                  p.accent ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                ₹
              </span>
              <Input
                id={`target-${segId}-${p.key}`}
                type="number"
                step="1"
                min="0"
                value={fields[p.key]}
                onChange={(e) => onChange(segId, p.key, e.target.value)}
                placeholder="0"
                className={`pl-6 font-mono text-sm ${
                  p.accent
                    ? 'font-semibold border-primary/40 focus-visible:ring-primary'
                    : ''
                }`}
              />
            </div>

            {/* Human-readable hint */}
            {numVal > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {fmtShort(numVal)}
              </p>
            )}

            {/* Achievement */}
            {ach && ach.hasTarget && numVal > 0 && (
              <div className="text-[11px] text-muted-foreground pt-0.5 flex justify-between border-t border-border/40">
                <span>Achieved:</span>
                <strong className={`font-mono ${p.accent ? 'text-primary' : ''}`}>
                  {fmtShort(ach.achievedValue)}
                </strong>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MemberDetailView({ memberId, initialData, onRefresh }: MemberDetailViewProps) {
  // ── Profile state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(initialData.profile);
  const [fullName, setFullName] = useState(initialData.profile.fullName);
  const [phone, setPhone] = useState(initialData.profile.phone || '');
  const [role, setRole] = useState(initialData.profile.role || 'member');
  const [isActive, setIsActive] = useState(initialData.profile.isActive);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Segment state ─────────────────────────────────────────────────────────
  const [assignedSegments, setAssignedSegments] = useState<Segment[]>(initialData.assignedSegments || []);
  const [selectedNewSegment, setSelectedNewSegment] = useState<string>('');
  const [savingSegments, setSavingSegments] = useState(false);
  const [segmentMsg, setSegmentMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Target state ──────────────────────────────────────────────────────────
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());

  /**
   * segmentFields: { [segmentId]: SegmentTargetFields }
   * All 5 period fields for each segment — kept in sync via handleFieldChange.
   */
  const [segmentFields, setSegmentFields] = useState<Record<string, SegmentTargetFields>>({});
  const [savingTargetSegId, setSavingTargetSegId] = useState<string | null>(null);
  const [targetMsg, setTargetMsg] = useState<Record<string, { text: string; type: 'success' | 'error' }>>({});

  // Sync profile/segments when initialData changes
  useEffect(() => {
    setProfile(initialData.profile);
    setFullName(initialData.profile.fullName);
    setPhone(initialData.profile.phone || '');
    setRole(initialData.profile.role || 'member');
    setIsActive(initialData.profile.isActive);
    setAssignedSegments(initialData.assignedSegments || []);
  }, [initialData]);

  // Load existing daily targets → derive all 5 fields for each segment
  useEffect(() => {
    const newFields: Record<string, SegmentTargetFields> = {};
    (initialData.assignedSegments || []).forEach((seg) => {
      const match = (initialData.memberTargets || []).find(
        (t) => t.segment_id === seg.id && t.year === targetYear
      );
      if (match && Number(match.daily_target_amount) > 0) {
        const derived = deriveAllFromDaily(Number(match.daily_target_amount));
        newFields[seg.id] = {
          daily:     String(derived.daily),
          weekly:    String(derived.weekly),
          monthly:   String(derived.monthly),
          quarterly: String(derived.quarterly),
          annual:    String(derived.annual),
        };
      } else {
        newFields[seg.id] = { ...EMPTY_FIELDS };
      }
    });
    setSegmentFields(newFields);
  }, [initialData.assignedSegments, initialData.memberTargets, targetYear]);

  // Unassigned segments
  const unassignedSegments = useMemo(() => {
    const assignedIds = new Set(assignedSegments.map((s) => s.id));
    return (initialData.allSegments || []).filter((s) => !assignedIds.has(s.id));
  }, [assignedSegments, initialData.allSegments]);

  // ── Field change handler (the core sync logic) ────────────────────────────

  /**
   * When any period field changes:
   * 1. Parse the new value for that period
   * 2. Back-calculate the implied daily base
   * 3. Derive all other period values from that daily base
   * 4. Update all 5 fields simultaneously
   *
   * The field the user is currently editing retains the raw string they typed
   * (avoids cursor-jump issues). All other fields are filled with derived values.
   */
  const handleFieldChange = useCallback(
    (segId: string, changedPeriod: PeriodKey, rawValue: string) => {
      setSegmentFields((prev) => {
        const currentFields = prev[segId] || { ...EMPTY_FIELDS };

        // If the user cleared the field, clear all
        if (rawValue === '' || rawValue === '-') {
          return { ...prev, [segId]: { ...EMPTY_FIELDS } };
        }

        const numValue = Number(rawValue);
        if (isNaN(numValue) || numValue < 0) {
          return { ...prev, [segId]: { ...currentFields, [changedPeriod]: rawValue } };
        }

        // Back-calculate daily from whichever period was edited
        const impliedDaily = backCalcDaily(changedPeriod, numValue);
        const derived = deriveAllFromDaily(impliedDaily);

        // Keep the field the user typed in as the raw string (no rounding surprise)
        // but fill others from the derived daily
        return {
          ...prev,
          [segId]: {
            daily:     changedPeriod === 'daily'     ? rawValue : (derived.daily     > 0 ? String(derived.daily)     : ''),
            weekly:    changedPeriod === 'weekly'    ? rawValue : (derived.weekly    > 0 ? String(derived.weekly)    : ''),
            monthly:   changedPeriod === 'monthly'   ? rawValue : (derived.monthly   > 0 ? String(derived.monthly)   : ''),
            quarterly: changedPeriod === 'quarterly' ? rawValue : (derived.quarterly > 0 ? String(derived.quarterly) : ''),
            annual:    changedPeriod === 'annual'    ? rawValue : (derived.annual    > 0 ? String(derived.annual)    : ''),
          },
        };
      });
    },
    []
  );

  /**
   * Apply a preset daily amount — sets daily field and derives all others.
   */
  function applyDailyPreset(segId: string, dailyAmount: number) {
    const derived = deriveAllFromDaily(dailyAmount);
    setSegmentFields((prev) => ({
      ...prev,
      [segId]: {
        daily:     String(derived.daily),
        weekly:    String(derived.weekly),
        monthly:   String(derived.monthly),
        quarterly: String(derived.quarterly),
        annual:    String(derived.annual),
      },
    }));
  }

  // ── Save handler ──────────────────────────────────────────────────────────

  async function handleSaveSegmentTarget(segId: string, segName: string) {
    setSavingTargetSegId(segId);
    setTargetMsg((prev) => ({ ...prev, [segId]: null as any }));

    const fields = segmentFields[segId] || EMPTY_FIELDS;
    // Always save the daily amount as the source of truth
    const dailyAmount = Math.max(0, Number(fields.daily) || 0);

    try {
      await saveMemberDailyTarget(memberId, segId, targetYear, dailyAmount);
      setTargetMsg((prev) => ({
        ...prev,
        [segId]: {
          text: `Saved targets for ${segName} (${targetYear}) — Daily: ${fmtINR(dailyAmount)}`,
          type: 'success',
        },
      }));
      onRefresh();
    } catch (err: any) {
      setTargetMsg((prev) => ({
        ...prev,
        [segId]: { text: err.message || 'Failed to save target', type: 'error' },
      }));
    } finally {
      setSavingTargetSegId(null);
    }
  }

  // ── Profile handlers ──────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateMemberProfile(memberId, { fullName, phone, role, isActive });
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
      onRefresh();
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

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

  async function handleRemoveSegment(segmentId: string, segmentName: string) {
    if (
      !window.confirm(
        `Remove access to "${segmentName}" for this member?\n\nExisting historical targets and leads remain safely preserved.`
      )
    )
      return;

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

  // ── Render ────────────────────────────────────────────────────────────────

  const initials = profile.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  const isOwnerProfile = profile.role === 'owner';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Breadcrumb */}
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Team Members
      </Link>

      {/* ── Member Header ──────────────────────────────────────────────────── */}
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-primary/4">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                <AvatarFallback
                  className="text-white text-lg font-bold"
                  style={{
                    background: isOwnerProfile
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
                  {isOwnerProfile ? (
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
                    {assignedSegments.length} segment{assignedSegments.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 1: Member Information ─────────────────────────────────── */}
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
                {profileMsg.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="space-y-1.5">
                <Label>Email (Supabase Auth)</Label>
                <Input value={profile.email} disabled className="bg-muted/50 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
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

      {/* ── SECTION 2: Business Segment Access ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            2. Business Segment Access
          </CardTitle>
          <CardDescription>
            Assign or revoke segment access. Multiple members can share a segment.
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

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2 block">
              Currently Assigned Segments ({assignedSegments.length})
            </Label>
            {assignedSegments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                No segments assigned yet. Add a segment below to configure targets.
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

      {/* ── SECTION 3: Target Configuration ───────────────────────────────── */}
      <div className="space-y-4">
        {/* Controls bar */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  3. Segment Target Configuration
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                  Enter a value in <strong>any</strong> period field — all other fields auto-calculate instantly.
                  Only the daily amount is stored; all periods are derived from it.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Year:</span>
                <Select value={String(targetYear)} onValueChange={(v) => setTargetYear(Number(v))}>
                  <SelectTrigger className="w-24 h-8 text-xs font-mono">
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
            </div>

            {/* How-it-works callout */}
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200/60 px-3 py-2.5 text-xs text-blue-700">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
              <div>
                <strong>How it works: </strong>
                Edit any field (e.g. type ₹2.5L in Weekly) → all other fields auto-fill using the
                standard multipliers{' '}
                <span className="font-mono">
                  (Daily × 1 · Weekly × 7 · Monthly × 30 · Quarterly × 90 · Annual × 365)
                </span>
                . Click <em>Save</em> to persist.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-segment cards */}
        {assignedSegments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-30 mx-auto mb-2" />
              <p className="font-medium">No business segments assigned</p>
              <p className="text-xs">Assign at least one segment above to configure targets.</p>
            </CardContent>
          </Card>
        ) : (
          assignedSegments.map((seg) => {
            const fields = segmentFields[seg.id] || { ...EMPTY_FIELDS };
            const isSaving = savingTargetSegId === seg.id;
            const msg = targetMsg[seg.id];
            const segAch = initialData.achievements?.[seg.id] || {};
            const monthlyAch = segAch.monthly;
            const dailyNum = Math.max(0, Number(fields.daily) || 0);

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
                        Year {targetYear} · Member: {profile.fullName}
                        {dailyNum > 0 && (
                          <span className="ml-2 text-primary font-semibold">
                            · Daily base: {fmtINR(dailyNum)}
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    {/* Monthly achievement pill */}
                    {monthlyAch && monthlyAch.hasTarget && (
                      <div className="flex items-center gap-2 bg-background/80 border border-border/60 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-muted-foreground">This Month:</span>
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
                  {/* Success / error message */}
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

                  {/* 5 synced period inputs */}
                  <SyncedPeriodInputs
                    segId={seg.id}
                    fields={fields}
                    onChange={handleFieldChange}
                    achievements={segAch}
                  />

                  {/* Presets + Save */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-semibold mr-0.5">
                        Quick Daily Presets:
                      </span>
                      {DAILY_PRESETS.map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyDailyPreset(seg.id, amt)}
                          className={`h-6 px-2 text-[11px] font-mono transition-all ${
                            dailyNum === amt ? 'border-primary bg-primary/10 text-primary' : ''
                          }`}
                        >
                          {fmtShort(amt)}/day
                        </Button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="hp"
                      size="sm"
                      onClick={() => handleSaveSegmentTarget(seg.id, seg.name)}
                      disabled={isSaving}
                      className="gap-1.5"
                      id={`save-target-${seg.id}`}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
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
