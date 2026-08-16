'use client';

import { useState, useMemo } from 'react';
import { fmtINR } from './Header';
import { useAuth } from '../lib/context/AuthContext';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN') : '—';
}

export default function LeadsListTab({ leads, onEdit }) {
  const { isOwner, activeSegment } = useAuth();
  const [search, setSearch]           = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [sortKey, setSortKey]         = useState('createdAt');
  const [sortDir, setSortDir]         = useState('desc');

  // Get unique stages & sectors from loaded lead data for dynamic filter dropdowns
  const availableStages  = useMemo(() => [...new Set(leads.map(l => l.stage?.name).filter(Boolean))], [leads]);
  const availableSectors = useMemo(() => [...new Set(leads.map(l => l.sector?.name || l.deptIndustry).filter(Boolean))], [leads]);

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      if (filterStage  && l.stage?.name !== filterStage)   return false;
      if (filterSector && !(`${l.sector?.name || ''} ${l.deptIndustry || ''}`).includes(filterSector)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (l.orgName || '').toLowerCase().includes(q) ||
          (l.category?.name || '').toLowerCase().includes(q) ||
          (l.gemBid?.gem_bid_number || '').toLowerCase().includes(q) ||
          (l.gemBid?.tender_ref || '').toLowerCase().includes(q) ||
          (l.assignedProfile?.full_name || '').toLowerCase().includes(q) ||
          (l.leadNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (sortKey === 'estValue') { va = Number(va); vb = Number(vb); }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [leads, search, filterStage, filterSector, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortTh({ col, label }) {
    const active = sortKey === col;
    return (
      <th
        style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => toggleSort(col)}
      >
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
      </th>
    );
  }

  return (
    <section>
      <div className="bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 className="section-title">
            All Leads ({filtered.length}{leads.length !== filtered.length ? ` / ${leads.length}` : ''})
          </h2>
          <p className="section-desc">
            {activeSegment ? `Segment: ${activeSegment.name}` : 'All segments'} — search, filter, and edit.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search org, bid no., category, assigned…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 220, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: '#fff', color: 'var(--ink)' }}
          />
          <select
            value={filterSector}
            onChange={e => setFilterSector(e.target.value)}
            style={{ flex: 1, minWidth: 140, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: '#fff', color: 'var(--ink)' }}
          >
            <option value="">All Sectors</option>
            {availableSectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: '#fff', color: 'var(--ink)' }}
          >
            <option value="">All Stages</option>
            {availableStages.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line-soft)', background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
              <SortTh col="leadNumber" label="Lead #" />
              <SortTh col="orgName" label="Organisation" />
              <th style={{ padding: '10px 12px' }}>Category</th>
              <SortTh col="estValue" label="Est. Value" />
              <th style={{ padding: '10px 12px' }}>Stage</th>
              <th style={{ padding: '10px 12px' }}>GeM Bid / Ref</th>
              <SortTh col="expectedClose" label="Close Date" />
              <th style={{ padding: '10px 12px' }}>Assigned To</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="9" style={{ padding: 20, textAlign: 'center', color: 'var(--ink-soft)' }}>
                  No leads match your criteria.
                </td>
              </tr>
            )}
            {filtered.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                  {l.leadNumber}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{l.orgName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{l.deptIndustry || l.contactPerson}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div>{l.category?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{l.modelDetails} {l.qty > 1 ? `× ${l.qty}` : ''}</div>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {fmtINR(l.estValue)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`tag stage ${l.stage?.is_won ? 'won' : l.stage?.is_lost ? 'lost' : ''}`}>
                    {l.stage?.name || '—'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                  {l.gemBid?.gem_bid_number || l.gemBid?.tender_ref || '—'}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 11.5 }}>
                  {fmtDate(l.expectedClose)}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>
                  {l.assignedProfile?.full_name || '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => onEdit(l.id)}
                  >
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
