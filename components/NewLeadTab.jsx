'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import {
  fetchCategoriesBySegment,
  fetchSourcesBySegment,
  fetchStagesBySegment,
  fetchSectors
} from '../lib/services/masterDataService';

export default function NewLeadTab({ onSubmit }) {
  const { activeSegment, assignedSegments, profile } = useAuth();

  const [categories, setCategories] = useState([]);
  const [sources, setSources]       = useState([]);
  const [stages, setStages]         = useState([]);
  const [sectors, setSectors]       = useState([]);
  const [isGemBid, setIsGemBid]     = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Reload dropdowns whenever the active segment changes
  useEffect(() => {
    if (!activeSegment?.id) return;
    setLoadingMeta(true);
    Promise.all([
      fetchCategoriesBySegment(activeSegment.id),
      fetchSourcesBySegment(activeSegment.id),
      fetchStagesBySegment(activeSegment.id),
      fetchSectors()
    ]).then(([cats, srcs, stgs, scts]) => {
      setCategories(cats);
      setSources(srcs);
      setStages(stgs);
      setSectors(scts);
    }).catch(console.error)
      .finally(() => setLoadingMeta(false));
  }, [activeSegment?.id]);

  if (!activeSegment) {
    return (
      <section>
        <p className="section-desc">No segment assigned. Contact the owner to get access.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="section-title">Add New Opportunity</h2>
      <p className="section-desc">
        Segment: <strong>{activeSegment.name}</strong> — Enter buyer and tender/RFQ details.
      </p>

      {loadingMeta && <div className="loading-inline">Loading form options…</div>}

      <form className="card leadform form-grid" onSubmit={onSubmit}>
        {/* Hidden fields */}
        <input type="hidden" name="segmentId" value={activeSegment.id} />

        {/* Row 1 */}
        <div className="field">
          <label>Sector *</label>
          <select name="sectorId" required>
            <option value="">— Select Sector —</option>
            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Organisation / Customer Name *</label>
          <input name="orgName" required placeholder="e.g. District Magistrate Office, Muzaffarnagar" />
        </div>

        <div className="field">
          <label>Department / Industry</label>
          <input name="deptIndustry" placeholder="e.g. Revenue Dept / Education / Healthcare" />
        </div>

        <div className="field">
          <label>Contact Person & Role</label>
          <input name="contactPerson" placeholder="e.g. R.K. Sharma (Purchase Officer)" />
        </div>

        <div className="field">
          <label>Phone</label>
          <input name="phone" placeholder="9876543210" />
        </div>

        <div className="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="purchase@domain.gov.in" />
        </div>

        {/* Row 2 — segment-specific category */}
        <div className="field">
          <label>Product Category *</label>
          <select name="categoryId" required disabled={loadingMeta}>
            <option value="">— Select Category —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Model / Description</label>
          <input name="modelDetails" placeholder="e.g. HP LaserJet MFP M436n" />
        </div>

        <div className="field">
          <label>Quantity</label>
          <input name="qty" type="number" min="1" defaultValue="1" />
        </div>

        <div className="field">
          <label>Estimated Deal Value (₹) *</label>
          <input name="estValue" type="number" step="1000" required placeholder="540000" />
        </div>

        {/* Row 3 — source, stage */}
        <div className="field">
          <label>Lead Source / Channel</label>
          <select name="sourceId" disabled={loadingMeta}>
            <option value="">— Select Source —</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Pipeline Stage</label>
          <select name="stageId" disabled={loadingMeta}>
            <option value="">— Select Stage —</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Expected Closing Date</label>
          <input name="expectedClose" type="date" />
        </div>

        <div className="field">
          <label>Next Follow-up Date</label>
          <input name="nextFollowUp" type="date" />
        </div>

        {/* Assigned person — hidden (backend uses auth.uid()), display only */}
        <div className="field">
          <label>Assigned To</label>
          <input readOnly value={profile?.full_name || profile?.email || ''} className="input-readonly" />
          <input type="hidden" name="assignedTo" value={profile?.id || ''} />
        </div>

        {/* GeM Bid toggle */}
        <div className="field full">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isGemBid"
              checked={isGemBid}
              onChange={e => setIsGemBid(e.target.checked)}
            />
            This is a GeM / Government Tender bid
          </label>
        </div>

        {/* GeM-specific fields */}
        {isGemBid && (
          <>
            <div className="field">
              <label>GeM Bid Number</label>
              <input name="gemBidNumber" placeholder="GEM/2026/B/998231" />
            </div>
            <div className="field">
              <label>Tender Ref No.</label>
              <input name="tenderRef" placeholder="MZN/2026/IT/017" />
            </div>
            <div className="field">
              <label>Bid End Date & Time</label>
              <input name="bidEndDate" type="datetime-local" />
            </div>
            <div className="field">
              <label>Bid Status</label>
              <select name="bidStatus" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="l1_pending">L1 Status Pending</option>
                <option value="awarded">Awarded</option>
                <option value="disqualified">Disqualified</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="field">
              <label>EMD Amount (₹)</label>
              <input name="emdAmount" type="number" step="100" defaultValue="0" />
            </div>
          </>
        )}

        <div className="field full">
          <label>Remarks / Technical Specs / Bid Details</label>
          <textarea name="remarks" rows="3" placeholder="e.g. EMD submitted, awaiting technical bid evaluation." />
        </div>

        <div className="actions full">
          <button type="submit" className="btn btn-primary" disabled={loadingMeta}>
            + Save Lead
          </button>
        </div>
      </form>
    </section>
  );
}
