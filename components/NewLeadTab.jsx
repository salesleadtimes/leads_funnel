'use client';

import { STAGES } from './DashboardTab';

export const PRODUCT_CATEGORIES = [
  "Inkjet Printer", "LaserJet Printer", "MFD (Multi-Function Device)",
  "Document Scanner", "Flatbed Scanner", "Large Format Plotter",
  "Ink / Toner Cartridge", "AMC / Service Contract", "Spare Parts"
];

export const SOURCES = [
  "GeM Portal", "Government Tender (CPPP/eProc)", "Direct Government RFQ",
  "Corporate RFQ", "Channel Partner", "Referral", "Cold Call",
  "Website Enquiry", "Existing Customer Repeat"
];

export default function NewLeadTab({ onSubmit }) {
  return (
    <section>
      <h2 className="section-title">Add New Opportunity</h2>
      <p className="section-desc">Enter buyer and tender/RFQ details to track in the funnel.</p>

      <form className="card leadform form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label>Sector *</label>
          <select name="sector" required defaultValue="Government">
            <option value="Government">Government (GeM / Tender / RFQ)</option>
            <option value="Non-Government">Non-Government (Private / Corporate / Retail)</option>
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
          <label>Contact Person &amp; Role</label>
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

        <div className="field">
          <label>Product Category *</label>
          <select name="productCategory" required defaultValue="MFD (Multi-Function Device)">
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="field">
          <label>HP Model / Description</label>
          <input name="model" placeholder="e.g. HP LaserJet MFP M436n" />
        </div>

        <div className="field">
          <label>Quantity</label>
          <input name="qty" type="number" min="1" defaultValue="1" />
        </div>

        <div className="field">
          <label>Estimated Deal Value (INR ₹) *</label>
          <input name="estValue" type="number" step="1000" required placeholder="540000" />
        </div>

        <div className="field">
          <label>Lead Source / Channel</label>
          <select name="source" defaultValue="GeM Portal">
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Tender / Bid Reference No.</label>
          <input name="tenderRef" placeholder="e.g. GEM/2026/B/123456" />
        </div>

        <div className="field">
          <label>Initial Stage</label>
          <select name="stage" defaultValue="New Lead">
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
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

        <div className="field">
          <label>Assigned Sales Person</label>
          <input name="salesPerson" placeholder="e.g. RK Jindal" defaultValue="RK Jindal" />
        </div>

        <div className="field full">
          <label>Remarks / Technical Specs / Bid Details</label>
          <textarea name="remarks" rows="3" placeholder="e.g. EMD submitted, awaiting technical bid evaluation. Dual-tray requirement."></textarea>
        </div>

        <div className="actions full">
          <button type="submit" className="btn btn-primary">+ Save Lead</button>
        </div>
      </form>
    </section>
  );
}
