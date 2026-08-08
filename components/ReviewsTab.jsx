'use client';

import { fmtINR } from './Header';
import { STAGE_COLORS } from './DashboardTab';

export function getPeriodRange(period, refDateStr) {
  const ref = new Date((refDateStr || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  let start, end, label;
  if (period === 'daily') {
    start = new Date(ref); end = new Date(ref);
    label = ref.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (period === 'weekly') {
    const day = ref.getDay();
    start = new Date(ref); start.setDate(ref.getDate() - day);
    end = new Date(start); end.setDate(start.getDate() + 6);
    label = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + " – " + end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (period === 'monthly') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (period === 'quarterly') {
    const q = Math.floor(ref.getMonth() / 3);
    start = new Date(ref.getFullYear(), q * 3, 1);
    end = new Date(ref.getFullYear(), q * 3 + 3, 0);
    label = "Q" + (q + 1) + " " + ref.getFullYear();
  } else {
    start = new Date(ref.getFullYear(), 0, 1);
    end = new Date(ref.getFullYear(), 11, 31);
    label = "Year " + ref.getFullYear();
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), label };
}

export default function ReviewsTab({
  leads,
  targets,
  reviewPeriod, setReviewPeriod,
  refDate, setRefDate,
  onTargetChange
}) {
  const rd = refDate || new Date().toISOString().slice(0, 10);
  const { start, end, label } = getPeriodRange(reviewPeriod, rd);

  const newLeadsInPeriod = leads.filter(l => l.createdDate >= start && l.createdDate <= end);
  const wonInPeriod = leads.filter(l => l.stage === "Won" && l.closedDate && l.closedDate >= start && l.closedDate <= end);
  const lostInPeriod = leads.filter(l => l.stage === "Lost" && l.closedDate && l.closedDate >= start && l.closedDate <= end);

  const wonVal = wonInPeriod.reduce((a, l) => a + (Number(l.estValue) || 0), 0);
  const lostVal = lostInPeriod.reduce((a, l) => a + (Number(l.estValue) || 0), 0);

  const target = Number(targets?.[reviewPeriod]) || 0;
  const achievementPct = target > 0 ? Math.min(150, Math.round(100 * wonVal / target)) : 0;

  const govtNewCount = newLeadsInPeriod.filter(l => l.sector === "Government").length;
  const nonNewCount = newLeadsInPeriod.filter(l => l.sector === "Non-Government").length;

  return (
    <section>
      <h2 className="section-title">Sales Performance Review</h2>
      <p className="section-desc">Track sales against targets for Daily, Weekly, Monthly, Quarterly, or Yearly reviews.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
              <button
                key={p}
                className={`btn ${reviewPeriod === p ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
                onClick={() => setReviewPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Reference Date:</span>
            <input
              type="date"
              value={rd}
              onChange={e => setRefDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line-soft)', background: 'var(--bg-input)', color: '#fff' }}
            />
          </div>
        </div>
      </div>

      <div className="grid two" style={{ gridTemplateColumns: '1.2fr 1fr', marginBottom: 16 }}>
        <div className="card">
          <h2 className="section-title" style={{ fontSize: 15 }}>Target Achievement — {label}</h2>
          <div style={{ margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span>Won: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmtINR(wonVal)}</strong></span>
              <span>Target: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmtINR(target)}</strong></span>
            </div>
            <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ width: Math.min(100, achievementPct) + '%', height: '100%', background: achievementPct >= 100 ? 'var(--won)' : 'var(--accent-cyan)' }}></div>
            </div>
            <div style={{ marginTop: 6, textAlign: 'right', fontSize: 12, color: 'var(--ink-soft)' }}>
              {achievementPct}% Target Achieved
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--line-soft)', paddingTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>New Leads Added</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{newLeadsInPeriod.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Deals Won</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--won)' }}>{wonInPeriod.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Deals Lost</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--lost)' }}>{lostInPeriod.length}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title" style={{ fontSize: 15 }}>Set Target ({reviewPeriod.toUpperCase()})</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>Update the sales target value for this period.</p>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="number"
              step="10000"
              value={target}
              onChange={e => onTargetChange(reviewPeriod, e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line-soft)', background: 'var(--bg-input)', color: '#fff', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ marginTop: 20, fontSize: 12, color: 'var(--ink-soft)' }}>
            <div>Govt New Leads: <strong>{govtNewCount}</strong></div>
            <div>Non-Govt New Leads: <strong>{nonNewCount}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
