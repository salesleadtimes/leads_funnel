'use client';

import { fmtINR } from './Header';

export const STAGES = [
  "New Lead", "Qualified", "Quotation / Bid Submitted", "Technical Evaluation",
  "Negotiation / L1 Round", "PO / Work Order Received", "Won", "Lost"
];

export const STAGE_COLORS = {
  "New Lead": "#8A93A3",
  "Qualified": "#00AEEF",
  "Quotation / Bid Submitted": "#0091D5",
  "Technical Evaluation": "#6C4FC7",
  "Negotiation / L1 Round": "#EC008C",
  "PO / Work Order Received": "#B9770E",
  "Won": "#1E8A5F",
  "Lost": "#C0392B"
};

export const OPEN_STAGES = STAGES.filter(s => s !== "Won" && s !== "Lost");

export default function DashboardTab({ leads }) {
  const sumWhere = (pred, val) => leads.filter(pred).reduce((a, l) => a + (Number(val(l)) || 0), 0);
  const countWhere = (pred) => leads.filter(pred).length;

  const openCount = countWhere(l => OPEN_STAGES.includes(l.stage));
  const pipelineVal = sumWhere(l => OPEN_STAGES.includes(l.stage), l => l.estValue);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const wonThisMonth = sumWhere(l => l.stage === "Won" && l.closedDate && l.closedDate >= monthStart, l => l.estValue);
  const wonCount = countWhere(l => l.stage === "Won");
  const lostCount = countWhere(l => l.stage === "Lost");
  const winRate = (wonCount + lostCount) > 0 ? Math.round(100 * wonCount / (wonCount + lostCount)) : 0;
  const maxStageCount = Math.max(1, ...STAGES.map(s => countWhere(l => l.stage === s)));

  const govtCount = countWhere(l => l.sector === "Government");
  const nonCount = countWhere(l => l.sector === "Non-Government");
  const govtVal = sumWhere(l => l.sector === "Government", l => l.estValue);
  const nonVal = sumWhere(l => l.sector === "Non-Government", l => l.estValue);
  const totalVal = (govtVal + nonVal) || 1;

  const recent = [...leads]
    .sort((a, b) => (b.closedDate || b.createdDate).localeCompare(a.closedDate || a.createdDate))
    .slice(0, 5);

  return (
    <section>
      <h2 className="section-title">Sales Overview</h2>
      <p className="section-desc">Live snapshot across Government and Non-Government pipelines.</p>

      <div className="grid kpis">
        <div className="kpi c-cyan">
          <div className="label">Open Leads</div>
          <div className="value">{openCount}</div>
          <div className="bar"></div>
        </div>
        <div className="kpi c-magenta">
          <div className="label">Open Pipeline Value</div>
          <div className="value">{fmtINR(pipelineVal)}</div>
          <div className="bar"></div>
        </div>
        <div className="kpi c-yellow">
          <div className="label">Won (This Month)</div>
          <div className="value">{fmtINR(wonThisMonth)}</div>
          <div className="bar"></div>
        </div>
        <div className="kpi c-ink">
          <div className="label">Win Rate</div>
          <div className="value">{winRate}%</div>
          <div className="bar"></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: 15 }}>Funnel by Stage</h2>
        <div className="funnel-wrap">
          {STAGES.map(s => {
            const c = countWhere(l => l.stage === s);
            const v = sumWhere(l => l.stage === s, l => l.estValue);
            const pct = Math.max(4, Math.round(100 * c / maxStageCount));
            return (
              <div className="funnel-row" key={s}>
                <div className="funnel-label">{s}</div>
                <div className="funnel-track">
                  <div className="funnel-fill" style={{ width: pct + '%', background: STAGE_COLORS[s] }}>
                    {c > 0 ? c + ' lead' + (c !== 1 ? 's' : '') : ''}
                  </div>
                </div>
                <div className="funnel-count">{fmtINR(v)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid two" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h2 className="section-title" style={{ fontSize: 15 }}>Government vs Non-Government</h2>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: (100 * govtVal / totalVal) + '%', background: 'var(--govt)' }}></div>
            <div style={{ width: (100 * nonVal / totalVal) + '%', background: 'var(--nongovt)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span><span className="tag govt">GOVT</span> {govtCount} leads</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtINR(govtVal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span><span className="tag nongovt">NON-GOVT</span> {nonCount} leads</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtINR(nonVal)}</span>
          </div>
        </div>
        <div className="card">
          <h2 className="section-title" style={{ fontSize: 15 }}>Recent Activity</h2>
          {recent.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No leads yet.</p>}
          {recent.map(l => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5 }}>
              <span>{l.orgName}</span>
              <span className="tag stage" style={{ background: STAGE_COLORS[l.stage] + '22', color: STAGE_COLORS[l.stage] }}>{l.stage}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
