'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from './StageBadge';
import { History, Building2, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  fetchCategoriesBySegment,
  fetchSourcesBySegment,
  fetchStagesBySegment,
  fetchSectors,
} from '@/lib/services/masterDataService';
import { getLeadStageHistory } from '@/lib/services/leadsService';
import { fmtINR, fmtDate } from '@/lib/utils';

interface Lead {
  id: string;
  leadNumber?: string;
  segmentId?: string;
  orgName?: string;
  deptIndustry?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  categoryId?: string;
  modelDetails?: string;
  qty?: number;
  estValue?: number | string;
  sourceId?: string;
  stageId?: string;
  sectorId?: string;
  expectedClose?: string;
  nextFollowUp?: string;
  remarks?: string;
  gemBid?: {
    gem_bid_number?: string;
    tender_ref?: string;
    bid_end_date?: string;
    bid_status?: string;
    emd_amount?: number;
  };
  [key: string]: unknown;
}

interface LeadFormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dialogRef?: React.RefObject<HTMLDialogElement>;
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Record<string, unknown>, gemBidPatch: Record<string, unknown> | null) => void;
  onDelete: (id: string) => void;
}

export function LeadFormDialog({
  open: controlledOpen,
  onOpenChange,
  dialogRef,
  lead,
  onClose,
  onUpdate,
  onDelete,
}: LeadFormDialogProps) {
  const auth = useAuth() as any;
  const isOwner = Boolean(auth.isOwner);
  const activeSegment = auth.activeSegment as { id: string; name: string } | null;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [historyTab, setHistoryTab] = useState(false);
  const [loading, setLoading] = useState(true);

  const segId = lead?.segmentId || activeSegment?.id;

  // Sync native dialog open state if ref is provided
  useEffect(() => {
    const el = dialogRef?.current;
    if (!el) return;
    const obs = new MutationObserver(() => {
      setInternalOpen(el.open);
    });
    obs.observe(el, { attributes: true, attributeFilter: ['open'] });
    return () => obs.disconnect();
  }, [dialogRef]);

  useEffect(() => {
    if (!lead || !segId) return;
    setLoading(true);
    setHistoryTab(false);
    Promise.all([
      fetchCategoriesBySegment(segId),
      fetchSourcesBySegment(segId),
      fetchStagesBySegment(segId),
      fetchSectors(),
      getLeadStageHistory(lead.id),
    ])
      .then(([cats, srcs, stgs, scts, hist]) => {
        setCategories((cats as any) || []);
        setSources((srcs as any) || []);
        setStages((stgs as any) || []);
        setSectors((scts as any) || []);
        setHistory((hist as any) || []);
      })
      .catch((err) => console.error('Failed to load edit modal master data:', err))
      .finally(() => setLoading(false));
  }, [lead?.id, segId]);

  if (!lead) return null;

  function handleClose() {
    if (!isControlled) setInternalOpen(false);
    onOpenChange?.(false);
    const el = dialogRef?.current;
    if (el && el.open) el.close();
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lead) return;
    const fd = new FormData(e.currentTarget);

    const patch: Record<string, unknown> = Object.fromEntries(fd.entries());
    patch.qty = Number(patch.qty) || 1;
    patch.estValue = Number(patch.estValue) || 0;

    const gemBidPatch = patch.gemBidNumber
      ? {
          gemBidNumber: patch.gemBidNumber,
          tenderRef: patch.tenderRef || '',
          bidEndDate: patch.bidEndDate || null,
          bidStatus: patch.bidStatus || 'draft',
          emdAmount: Number(patch.emdAmount) || 0,
        }
      : null;

    ['gemBidNumber', 'tenderRef', 'bidEndDate', 'bidStatus', 'emdAmount'].forEach(
      (k) => delete patch[k]
    );

    onUpdate(lead.id, patch, gemBidPatch);
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-0.5">
                {lead.leadNumber}
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant={historyTab ? 'hp' : 'outline'}
              className="gap-1.5"
              onClick={() => setHistoryTab((v) => !v)}
            >
              <History className="h-3.5 w-3.5" />
              History ({(history as unknown[]).length})
            </Button>
          </div>
        </DialogHeader>

        <DialogBody className="pt-2">
          {historyTab ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(history as unknown[]).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No stage history yet.
                </p>
              )}
              {(history as Array<{
                id: string;
                changed_at: string;
                from_stage?: { name?: string };
                to_stage?: { name?: string };
                changed_by?: { full_name?: string };
                remarks?: string;
              }>).map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-2 py-2.5 border-b border-border/50 text-xs">
                  <span className="font-mono text-muted-foreground w-24 shrink-0">
                    {fmtDate(h.changed_at)}
                  </span>
                  <span className="flex-1">
                    {h.from_stage?.name && (
                      <><strong>{h.from_stage.name}</strong> → </>
                    )}
                    <strong>{h.to_stage?.name}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    by {h.changed_by?.full_name || 'System'}
                  </span>
                  {h.remarks && (
                    <span className="rounded px-1.5 py-0.5 bg-primary/8 text-primary text-[11px] font-mono">
                      {h.remarks}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <form id="lead-edit-form" className="grid grid-cols-3 gap-x-4 gap-y-4" onSubmit={handleSubmit}>
              {/* Row 1 */}
              <div className="space-y-1.5">
                <Label htmlFor="sectorId">Sector</Label>
                <select
                  name="sectorId"
                  defaultValue={lead.sectorId || ''}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <option value="">— Select Sector —</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="orgName">Organisation / Customer *</Label>
                <Input name="orgName" defaultValue={lead.orgName} required />
              </div>

              {/* Row 2 */}
              <div className="space-y-1.5">
                <Label>Department / Industry</Label>
                <Input name="deptIndustry" defaultValue={lead.deptIndustry} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input name="contactPerson" defaultValue={lead.contactPerson} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input name="phone" defaultValue={lead.phone} />
              </div>

              {/* Row 3 */}
              <div className="space-y-1.5 col-span-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={lead.email} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  name="categoryId"
                  defaultValue={lead.categoryId}
                  disabled={loading}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
                >
                  <option value="">— Select —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 4 */}
              <div className="space-y-1.5 col-span-2">
                <Label>Model / Description</Label>
                <Input name="modelDetails" defaultValue={lead.modelDetails} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input name="qty" type="number" min="1" defaultValue={lead.qty} />
              </div>

              {/* Row 5 */}
              <div className="space-y-1.5">
                <Label>Est. Value (₹) *</Label>
                <Input name="estValue" type="number" step="1000" defaultValue={lead.estValue as number} required />
              </div>
              <div className="space-y-1.5">
                <Label>Lead Source</Label>
                <select
                  name="sourceId"
                  defaultValue={lead.sourceId}
                  disabled={loading}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
                >
                  <option value="">— Select Source —</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Pipeline Stage</Label>
                <select
                  name="stageId"
                  defaultValue={lead.stageId}
                  disabled={loading}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
                >
                  <option value="">— Select Stage —</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 6 */}
              <div className="space-y-1.5">
                <Label>Expected Close</Label>
                <Input name="expectedClose" type="date" defaultValue={lead.expectedClose || ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Follow-up</Label>
                <Input name="nextFollowUp" type="date" defaultValue={lead.nextFollowUp || ''} />
              </div>

              {/* GeM Bid Section */}
              <div className="col-span-3 pt-2">
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mt-3 mb-3 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  GeM / Tender Bid Details
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>GeM Bid Number</Label>
                <Input name="gemBidNumber" defaultValue={lead.gemBid?.gem_bid_number || ''} placeholder="GEM/2026/B/998231" />
              </div>
              <div className="space-y-1.5">
                <Label>Tender Ref No.</Label>
                <Input name="tenderRef" defaultValue={lead.gemBid?.tender_ref || ''} placeholder="MZN/2026/IT/017" />
              </div>
              <div className="space-y-1.5">
                <Label>Bid End Date</Label>
                <Input name="bidEndDate" type="datetime-local" defaultValue={lead.gemBid?.bid_end_date?.slice(0, 16) || ''} />
              </div>

              <div className="space-y-1.5">
                <Label>Bid Status</Label>
                <select
                  name="bidStatus"
                  defaultValue={lead.gemBid?.bid_status || 'draft'}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="l1_pending">L1 Status Pending</option>
                  <option value="awarded">Awarded</option>
                  <option value="disqualified">Disqualified</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>EMD Amount (₹)</Label>
                <Input name="emdAmount" type="number" step="100" defaultValue={lead.gemBid?.emd_amount || 0} />
              </div>

              <div className="space-y-1.5 col-span-3">
                <Label>Remarks</Label>
                <Textarea name="remarks" rows={3} defaultValue={lead.remarks} />
              </div>
            </form>
          )}
        </DialogBody>

        {!historyTab && (
          <DialogFooter className="justify-between">
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="gap-1.5"
              onClick={() => lead && onDelete(lead.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isOwner ? 'Hard Delete' : 'Remove'}
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" form="lead-edit-form" variant="hp" size="sm">
                Update Lead
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
