'use client';

import { fmtINR, fmtDate } from './Header';
import { STAGES, STAGE_COLORS } from './DashboardTab';

export default function LeadsListTab({
  leads,
  search, setSearch,
  filterSector, setFilterSector,
  filterStage, setFilterStage,
  onEdit,
  exportJSON, importJSON, exportCSV,
  fileInputRef
}) {
  const filteredLeads = leads.filter(l => {
    if (filterSector && l.sector !== filterSector) return false;
    if (filterStage && l.stage !== filterStage) return false;
    const q = search.toLowerCase();
    if (q && !(
      (l.orgName || '').toLowerCase().includes(q) ||
      (l.model || '').toLowerCase().includes(q) ||
      (l.tenderRef || '').toLowerCase().includes(q) ||
      (l.salesPerson || '').toLowerCase().includes(q)
    )) return false;
    return true;
  }).sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''));

  return (
    <section>
      <div className="bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 className="section-title">All Opportunities ({filteredLeads.length})</h2>
          <p className="section-desc">Search, filter, edit, or export sales leads.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={exportJSON}>Backup JSON</button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={e => e.target.files[0] && importJSON(e.target.files[0])}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14, padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search organisation, model, tender ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 200, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: 'var(--bg-input)', color: '#fff' }}
          />
          <select
            value={filterSector}
            onChange={e => setFilterSector(e.target.value)}
            style={{ flex: 1, minWidth: 140, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: 'var(--bg-input)', color: '#fff' }}
          >
            <option value="">All Sectors</option>
            <option value="Government">Government</option>
            <option value="Non-Government">Non-Government</option>
          </select>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: 'var(--bg-input)', color: '#fff' }}
          >
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line-soft)', background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Organisation / Customer</th>
              <th style={{ padding: '10px 12px' }}>Sector</th>
              <th style={{ padding: '10px 12px' }}>Product &amp; Qty</th>
              <th style={{ padding: '10px 12px' }}>Est. Value</th>
              <th style={{ padding: '10px 12px' }}>Stage</th>
              <th style={{ padding: '10px 12px' }}>Tender / Ref</th>
              <th style={{ padding: '10px 12px' }}>Close Date</th>
              <th style={{ padding: '10px 12px' }}>Sales Person</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan="9" style={{ padding: 20, textAlign: 'center', color: 'var(--ink-soft)' }}>
                  No leads match your filter criteria.
                </td>
              </tr>
            )}
            {filteredLeads.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{l.orgName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{l.deptIndustry || l.contactPerson}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`tag ${l.sector === 'Government' ? 'govt' : 'nongovt'}`}>
                    {l.sector === 'Government' ? 'GOVT' : 'NON-GOVT'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div>{l.productCategory}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{l.model} (Qty: {l.qty})</div>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {fmtINR(l.estValue)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="tag stage" style={{ background: (STAGE_COLORS[l.stage] || '#fff') + '22', color: STAGE_COLORS[l.stage] || '#fff' }}>
                    {l.stage}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                  {l.tenderRef || '—'}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 11.5 }}>
                  {l.expectedClose || '—'}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>
                  {l.salesPerson || 'Unassigned'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => onEdit(l.id)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
