'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import {
  fetchCategoriesBySegment,
  fetchSourcesBySegment,
  fetchStagesBySegment,
  fetchSectors
} from '../lib/services/masterDataService';
import { getLeadStageHistory } from '../lib/services/leadsService';
import { fmtINR } from './Header';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function LeadModal({ dialogRef, lead, onClose, onUpdate, onDelete }) {
  const { isOwner, activeSegment } = useAuth();

  const [categories, setCategories] = useState([]);
  const [sources, setSources]       = useState([]);
  const [stages, setStages]         = useState([]);
  const [sectors, setSectors]       = useState([]);
  const [history, setHistory]       = useState([]);
  const [historyTab, setHistoryTab] = useState(false);
  const [loading, setLoading]       = useState(true);

  const segId = lead?.segmentId || activeSegment?.id;

  useEffect(() => {
    if (!lead || !segId) return;
    setLoading(true);
    setHistoryTab(false);
    Promise.all([
      fetchCategoriesBySegment(segId),
      fetchSourcesBySegment(segId),
      fetchStagesBySegment(segId),
      fetchSectors(),
      getLeadStageHistory(lead.id)
    ]).then(([cats, srcs, stgs, scts, hist]) => {
      setCategories(cats);
      setSources(srcs);
      setStages(stgs);
      setSectors(scts);
      setHistory(hist);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [lead?.id, segId]);

  if (!lead) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const patch = Object.fromEntries(fd.entries());
    patch.qty      = Number(patch.qty) || 1;
    patch.estValue = Number(patch.estValue) || 0;

    // Build gem bid patch if fields are present
    const gemBidPatch = patch.gemBidNumber ? {
      gemBidNumber: patch.gemBidNumber,
      tenderRef:    patch.tenderRef || '',
      bidEndDate:   patch.bidEndDate || null,
      bidStatus:    patch.bidStatus || 'draft',
      emdAmount:    Number(patch.emdAmount) || 0,
    } : null;

    // Remove gem fields from main patch
    ['gemBidNumber','tenderRef','bidEndDate','bidStatus','emdAmount'].forEach(k => delete patch[k]);

    onUpdate(lead.id, patch, gemBidPatch);
    onClose();
  }

  const hasGemBid = !!(lead.gemBid?.gem_bid_number);

  return (
    <dialog ref={dialogRef} className="lead-dialog" style={{ padding: 0, border: 'none', borderRadius: 12, background: 'transparent' }}>
      <div className="card" style={{ maxWidth: 720, margin: 'auto', background: 'var(--bg-card)', border: '1px solid var(--line-soft)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Edit Lead</h2>
            <code style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{lead.leadNumber}</code>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn ${historyTab ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setHistoryTab(v => !v)}
            >
              📜 History ({history.length})
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Stage History Tab */}
        {historyTab ? (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {history.length === 0 && <p style={{ color: 'var(--ink-soft)', padding: 12 }}>No stage history yet.</p>}
            {history.map(h => (
              <div key={h.id} className="history-row">
                <span className="history-time">{fmtDate(h.changed_at)}</span>
                <span className="history-arrow">
                  {h.from_stage?.name ? <><strong>{h.from_stage.name}</strong> → </> : ''}
                  <strong>{h.to_stage?.name}</strong>
                </span>
                <span className="history-by">by {h.changed_by?.full_name || 'System'}</span>
                {h.remarks && <span className="history-note">{h.remarks}</span>}
              </div>
            ))}
          </div>
        ) : (
          <form className="leadform form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label>Sector</label>
              <select name="sectorId" defaultValue={lead.sectorId || ''}>
                <option value="">— Select Sector —</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Organisation / Customer *</label>
              <input name="orgName" defaultValue={lead.orgName} required />
            </div>

            <div className="field">
              <label>Department / Industry</label>
              <input name="deptIndustry" defaultValue={lead.deptIndustry} />
            </div>

            <div className="field">
              <label>Contact Person</label>
              <input name="contactPerson" defaultValue={lead.contactPerson} />
            </div>

            <div className="field">
              <label>Phone</label>
              <input name="phone" defaultValue={lead.phone} />
            </div>

            <div className="field">
              <label>Email</label>
              <input name="email" type="email" defaultValue={lead.email} />
            </div>

            <div className="field">
              <label>Product Category</label>
              <select name="categoryId" defaultValue={lead.categoryId} disabled={loading}>
                <option value="">— Select Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Model / Description</label>
              <input name="modelDetails" defaultValue={lead.modelDetails} />
            </div>

            <div className="field">
              <label>Quantity</label>
              <input name="qty" type="number" min="1" defaultValue={lead.qty} />
            </div>

            <div className="field">
              <label>Est. Value (₹) *</label>
              <input name="estValue" type="number" step="1000" defaultValue={lead.estValue} required />
            </div>

            <div className="field">
              <label>Lead Source</label>
              <select name="sourceId" defaultValue={lead.sourceId} disabled={loading}>
                <option value="">— Select Source —</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Pipeline Stage</label>
              <select name="stageId" defaultValue={lead.stageId} disabled={loading}>
                <option value="">— Select Stage —</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Expected Close</label>
              <input name="expectedClose" type="date" defaultValue={lead.expectedClose || ''} />
            </div>

            <div className="field">
              <label>Next Follow-up</label>
              <input name="nextFollowUp" type="date" defaultValue={lead.nextFollowUp || ''} />
            </div>

            {/* GeM Bid Section */}
            <div className="field full" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 12, marginTop: 4 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--accent-blue)' }}>
                🏛️ GeM / Tender Bid Details
              </h3>
            </div>

            <div className="field">
              <label>GeM Bid Number</label>
              <input name="gemBidNumber" defaultValue={lead.gemBid?.gem_bid_number || ''} placeholder="GEM/2026/B/998231" />
            </div>

            <div className="field">
              <label>Tender Ref No.</label>
              <input name="tenderRef" defaultValue={lead.gemBid?.tender_ref || ''} placeholder="MZN/2026/IT/017" />
            </div>

            <div className="field">
              <label>Bid End Date</label>
              <input name="bidEndDate" type="datetime-local" defaultValue={lead.gemBid?.bid_end_date?.slice(0,16) || ''} />
            </div>

            <div className="field">
              <label>Bid Status</label>
              <select name="bidStatus" defaultValue={lead.gemBid?.bid_status || 'draft'}>
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
              <input name="emdAmount" type="number" step="100" defaultValue={lead.gemBid?.emd_amount || 0} />
            </div>

            <div className="field full">
              <label>Remarks</label>
              <textarea name="remarks" rows="3" defaultValue={lead.remarks} />
            </div>

            <div className="actions full" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ background: 'rgba(192,57,43,0.15)', color: '#e74c3c' }}
                onClick={() => onDelete(lead.id)}
              >
                {isOwner ? '🗑 Delete (Hard)' : '🗑 Remove'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Lead</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
