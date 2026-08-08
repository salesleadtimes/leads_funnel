'use client';

export function fmtINR(n) {
  n = Number(n) || 0;
  return "₹" + n.toLocaleString('en-IN');
}

export default function Header({ pipelineVal, saving, onRefresh }) {
  return (
    <header className="topbar">
      <svg className="regmark" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="13" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1"/>
        <circle cx="12" cy="13" r="7" fill="#00AEEF" opacity=".85"/>
        <circle cx="19" cy="13" r="7" fill="#EC008C" opacity=".85"/>
        <circle cx="15.5" cy="19" r="7" fill="#FFC300" opacity=".85"/>
        <circle cx="15" cy="15" r="1.6" fill="#14181F"/>
      </svg>
      <div className="brandtext">
        <h1>HP Print &amp; Scan — Sales Funnel</h1>
        <span className="sub">GOVERNMENT + NON-GOVERNMENT LEAD TRACKER</span>
      </div>
      <div className="spacer"></div>
      {saving && <span className="saving">Saving…</span>}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Refresh live data from Supabase"
        >
          🔄 Refresh DB
        </button>
      )}
      <span className="stat-pill">Pipeline: {fmtINR(pipelineVal)}</span>
    </header>
  );
}
