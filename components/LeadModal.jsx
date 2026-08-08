'use client';

import { STAGES } from './DashboardTab';
import { PRODUCT_CATEGORIES, SOURCES } from './NewLeadTab';

export default function LeadModal({
  dialogRef,
  lead,
  onClose,
  onUpdate,
  onDelete
}) {
  if (!lead) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const patch = Object.fromEntries(fd.entries());
    patch.qty = Number(patch.qty) || 1;
    patch.estValue = Number(patch.estValue) || 0;
    if (patch.stage === "Won" || patch.stage === "Lost") {
      if (!lead.closedDate) patch.closedDate = new Date().toISOString().slice(0, 10);
    } else {
      patch.closedDate = null;
    }
    onUpdate(lead.id, patch);
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="lead-dialog" style={{ padding: 0, border: 'none', borderRadius: 12, background: 'transparent' }}>
      <div className="card" style={{ maxWidth: 680, margin: 'auto', background: 'var(--bg-card)', border: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Edit Opportunity Details</h2>
          <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        <form className="leadform form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label>Sector</label>
            <select name="sector" defaultValue={lead.sector}>
              <option value="Government">Government</option>
              <option value="Non-Government">Non-Government</option>
            </select>
          </div>

          <div className="field">
            <label>Organisation / Customer</label>
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
            <select name="productCategory" defaultValue={lead.productCategory}>
              {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>HP Model</label>
            <input name="model" defaultValue={lead.model} />
          </div>

          <div className="field">
            <label>Quantity</label>
            <input name="qty" type="number" min="1" defaultValue={lead.qty} />
          </div>

          <div className="field">
            <label>Est. Value (INR ₹)</label>
            <input name="estValue" type="number" step="1000" defaultValue={lead.estValue} required />
          </div>

          <div className="field">
            <label>Lead Source</label>
            <select name="source" defaultValue={lead.source}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Tender / Ref No.</label>
            <input name="tenderRef" defaultValue={lead.tenderRef} />
          </div>

          <div className="field">
            <label>Stage</label>
            <select name="stage" defaultValue={lead.stage}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Expected Closing Date</label>
            <input name="expectedClose" type="date" defaultValue={lead.expectedClose || ''} />
          </div>

          <div className="field">
            <label>Next Follow-up Date</label>
            <input name="nextFollowUp" type="date" defaultValue={lead.nextFollowUp || ''} />
          </div>

          <div className="field">
            <label>Sales Person</label>
            <input name="salesPerson" defaultValue={lead.salesPerson} />
          </div>

          <div className="field full">
            <label>Remarks</label>
            <textarea name="remarks" rows="3" defaultValue={lead.remarks}></textarea>
          </div>

          <div className="actions full" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" style={{ background: 'rgba(192,57,43,0.2)', color: '#e74c3c' }} onClick={() => onDelete(lead.id)}>
              Delete Lead
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Update Lead</button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
