'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  fetchCategoriesBySegment,
  fetchSourcesBySegment,
  fetchStagesBySegment,
  fetchSectors,
} from '@/lib/services/masterDataService';

interface NewLeadFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function NewLeadForm({ onSubmit }: NewLeadFormProps) {
  const auth = useAuth() as any;
  const assignedSegments = (auth.assignedSegments || []) as { id: string; name: string }[];
  const profile = auth.profile as { full_name?: string; email?: string; id?: string } | null;

  // Track selected segment in local state — drives all downstream dropdowns
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [isGemBid, setIsGemBid] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(true);

  // Fetch sectors once on mount (they are not segment-scoped)
  useEffect(() => {
    fetchSectors()
      .then((scts) => setSectors((scts as any) || []))
      .catch(console.error)
      .finally(() => setLoadingSectors(false));
  }, []);

  // Pre-select the first segment when assignedSegments loads
  useEffect(() => {
    if (assignedSegments.length > 0 && !selectedSegmentId) {
      setSelectedSegmentId(assignedSegments[0].id);
    }
  }, [assignedSegments, selectedSegmentId]);

  // Reload categories, sources, stages whenever the selected segment changes
  useEffect(() => {
    if (!selectedSegmentId) {
      setCategories([]);
      setSources([]);
      setStages([]);
      return;
    }
    setLoadingMeta(true);
    Promise.all([
      fetchCategoriesBySegment(selectedSegmentId),
      fetchSourcesBySegment(selectedSegmentId),
      fetchStagesBySegment(selectedSegmentId),
    ])
      .then(([cats, srcs, stgs]) => {
        setCategories((cats as any) || []);
        setSources((srcs as any) || []);
        setStages((stgs as any) || []);
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false));
  }, [selectedSegmentId]);

  // No segments assigned at all
  if (assignedSegments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No segment assigned. Contact the owner to get access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Add New Opportunity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select a segment, then enter buyer and tender/RFQ details.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Buyer &amp; Opportunity Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── Segment selector (required, drives all other dropdowns) ── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="segmentId">
                  Segment <span className="text-destructive">*</span>
                </Label>
                <select
                  id="segmentId"
                  name="segmentId"
                  required
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <option value="">— Select Segment —</option>
                  {assignedSegments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loading indicator when segment master data is being fetched */}
              {loadingMeta && (
                <div className="col-span-2 flex items-end pb-2 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading segment data…
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sectorId">Sector <span className="text-destructive">*</span></Label>
                <select
                  name="sectorId"
                  required
                  disabled={loadingSectors}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
                >
                  <option value="">— Select Sector —</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Organisation / Customer Name <span className="text-destructive">*</span></Label>
                <Input name="orgName" required placeholder="e.g. District Magistrate Office, Muzaffarnagar" />
              </div>

              <div className="space-y-1.5">
                <Label>Department / Industry</Label>
                <Input name="deptIndustry" placeholder="e.g. Revenue Dept / Education" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person &amp; Role</Label>
                <Input name="contactPerson" placeholder="e.g. R.K. Sharma (Purchase Officer)" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input name="phone" placeholder="9876543210" />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="purchase@domain.gov.in" />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Input
                  readOnly
                  value={profile?.full_name || profile?.email || ''}
                  className="bg-muted/50 cursor-default"
                />
                <input type="hidden" name="assignedTo" value={profile?.id || ''} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Product Category <span className="text-destructive">*</span></Label>
                <select
                  name="categoryId"
                  required
                  disabled={loadingMeta || !selectedSegmentId}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
                >
                  <option value="">— Select Category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Model / Description</Label>
                <Input name="modelDetails" placeholder="e.g. HP LaserJet MFP M436n" />
              </div>

              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input name="qty" type="number" min="1" defaultValue="1" />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Deal Value (₹) <span className="text-destructive">*</span></Label>
                <Input name="estValue" type="number" step="1" min="0" required placeholder="540000" />
              </div>

              <div className="space-y-1.5">
                <Label>Lead Source / Channel</Label>
                <select
                  name="sourceId"
                  disabled={loadingMeta || !selectedSegmentId}
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
                  disabled={loadingMeta || !selectedSegmentId}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50"
                >
                  <option value="">— Select Stage —</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Expected Closing Date</Label>
                <Input name="expectedClose" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>Next Follow-up Date</Label>
                <Input name="nextFollowUp" type="date" />
              </div>
            </div>

            {/* GeM Toggle */}
            <Separator />
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="isGemBid"
                checked={isGemBid}
                onChange={(e) => setIsGemBid(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
              />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                🏛️ This is a GeM / Government Tender bid
              </span>
            </label>

            {/* GeM Fields */}
            {isGemBid && (
              <div className="grid grid-cols-3 gap-4 pt-1 pb-2 px-4 rounded-lg bg-primary/4 border border-primary/15">
                <p className="col-span-3 text-xs font-semibold uppercase tracking-widest text-primary py-2 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" /> GeM / Tender Bid Details
                </p>
                <div className="space-y-1.5">
                  <Label>GeM Bid Number</Label>
                  <Input name="gemBidNumber" placeholder="GEM/2026/B/998231" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tender Ref No.</Label>
                  <Input name="tenderRef" placeholder="MZN/2026/IT/017" />
                </div>
                <div className="space-y-1.5">
                  <Label>Bid End Date &amp; Time</Label>
                  <Input name="bidEndDate" type="datetime-local" />
                </div>
                <div className="space-y-1.5">
                  <Label>Bid Status</Label>
                  <select
                    name="bidStatus"
                    defaultValue="draft"
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
                  <Input name="emdAmount" type="number" step="100" defaultValue="0" />
                </div>
              </div>
            )}

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label>Remarks / Technical Specs / Bid Details</Label>
              <Textarea
                name="remarks"
                rows={3}
                placeholder="e.g. EMD submitted, awaiting technical bid evaluation."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="hp"
                size="lg"
                disabled={loadingMeta || !selectedSegmentId}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Save Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
