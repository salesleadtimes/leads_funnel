'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Mail, User, ShieldCheck } from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  code?: string;
}

interface InviteUserFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dialogRef?: React.RefObject<HTMLDialogElement>;
  segments?: Segment[];
  onClose?: () => void;
  onInviteSuccess?: (user: unknown) => void;
}

export function InviteUserForm({
  open: controlledOpen,
  onOpenChange,
  dialogRef,
  segments = [],
  onClose,
  onInviteSuccess,
}: InviteUserFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [selectedSegments, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync native dialog open state if ref is provided
  useEffect(() => {
    const el = dialogRef?.current;
    if (!el) return;
    const obs = new MutationObserver(() => setInternalOpen(el.open));
    obs.observe(el, { attributes: true, attributeFilter: ['open'] });
    return () => obs.disconnect();
  }, [dialogRef]);

  useEffect(() => {
    if (segments.length > 0 && selectedSegments.length === 0) {
      setSelected(segments.map((s) => s.id));
    }
  }, [segments]);

  function resetForm() {
    setEmail('');
    setFullName('');
    setRole('member');
    setSelected(segments.map((s) => s.id));
    setError('');
    setSuccess('');
  }

  function handleClose() {
    resetForm();
    if (!isControlled) setInternalOpen(false);
    onOpenChange?.(false);
    const el = dialogRef?.current;
    if (el && el.open) el.close();
    onClose?.();
  }

  function toggleSegment(segmentId: string) {
    setSelected((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId]
    );
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!fullName.trim()) { setError('Please enter the user full name.'); return; }
    if (selectedSegments.length === 0) { setError('Please select at least one segment.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), full_name: fullName.trim(), role, segmentIds: selectedSegments }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send invitation.');
      } else {
        setSuccess(data.message || `Invitation sent successfully to ${email}!`);
        setEmail('');
        setFullName('');
        onInviteSuccess?.(data.user);
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Invite New Team Member</DialogTitle>
              <DialogDescription>Send a Supabase invitation link and assign business segments</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✅ {success}
            </div>
          )}

          <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Mail className="h-3 w-3" />Email Address *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><User className="h-3 w-3" />Full Name *</Label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="R.K. Sharma"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Role</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('member')}
                  className={`flex flex-col items-start rounded-lg border p-3 text-sm transition-all ${
                    role === 'member'
                      ? 'border-primary/50 bg-primary/6 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <span className="font-semibold">👤 Member</span>
                  <span className="text-xs mt-0.5 opacity-70">Segment-scoped access</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`flex flex-col items-start rounded-lg border p-3 text-sm transition-all ${
                    role === 'owner'
                      ? 'border-[#FFC300]/50 bg-[#FFC300]/8 text-[#B8900A]'
                      : 'border-border text-muted-foreground hover:border-[#FFC300]/30'
                  }`}
                >
                  <span className="font-semibold">👑 Owner</span>
                  <span className="text-xs mt-0.5 opacity-70">Full system access</span>
                </button>
              </div>
            </div>

            {segments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assigned Business Segments *</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      if (selectedSegments.length === segments.length) setSelected([]);
                      else setSelected(segments.map((s) => s.id));
                    }}
                  >
                    {selectedSegments.length === segments.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-lg border border-input bg-muted/30 p-3">
                  {segments.map((seg) => (
                    <label
                      key={seg.id}
                      className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-foreground text-foreground/80"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSegments.includes(seg.id)}
                        onChange={() => toggleSegment(seg.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <span>{seg.name}</span>
                      {seg.code && (
                        <code className="text-[11px] text-muted-foreground font-mono">({seg.code})</code>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" variant="hp" disabled={loading} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            {loading ? 'Sending…' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
