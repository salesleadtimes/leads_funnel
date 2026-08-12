'use client';

import { useAuth } from '../lib/context/AuthContext';

export function fmtINR(n) {
  n = Number(n) || 0;
  return '₹' + n.toLocaleString('en-IN');
}

export default function Header({ pipelineVal, saving, onRefresh, onOpenInviteModal }) {
  const { profile, isOwner, assignedSegments, activeSegment, setActiveSegment, signOut } = useAuth();

  return (
    <header className="topbar">
      <img src="/Logo-2.png" alt="App Logo" className="regmark" width="30" height="30" style={{ objectFit: 'contain' }} />

      <div className="brandtext">
        <h1>Lead & Bid Manager</h1>
        <span className="sub">GeM · Government · Corporate</span>
      </div>

      <div className="spacer" />

      {/* Segment Switcher — visible when user has multiple segments */}
      {assignedSegments.length > 1 && (
        <select
          className="segment-switcher"
          value={activeSegment?.id || ''}
          onChange={e => {
            const seg = assignedSegments.find(s => s.id === e.target.value);
            if (seg) setActiveSegment(seg);
          }}
        >
          {assignedSegments.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      {/* Active segment pill when only one */}
      {assignedSegments.length === 1 && activeSegment && (
        <span className="segment-pill">{activeSegment.name}</span>
      )}

      {saving && <span className="saving">Saving…</span>}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Refresh live data"
        >
          🔄 Refresh
        </button>
      )}

      {/* Owner-only Invite User Action Button */}
      {isOwner && onOpenInviteModal && (
        <button
          type="button"
          onClick={onOpenInviteModal}
          className="btn btn-secondary"
          style={{
            padding: '6px 12px',
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderColor: 'var(--accent-blue, #2563eb)',
            color: 'var(--accent-blue, #2563eb)'
          }}
          title="Invite new team member"
        >
          ✉️ Invite User
        </button>
      )}

      <span className="stat-pill">Pipeline: {fmtINR(pipelineVal)}</span>

      {/* User info + Role badge */}
      <div className="user-menu">
        <span className={`role-badge ${isOwner ? 'role-owner' : 'role-member'}`}>
          {isOwner ? '👑 Owner' : '👤 Member'}
        </span>
        <span className="user-name">{profile?.full_name || profile?.email || ''}</span>
        <button className="btn btn-ghost signout-btn" onClick={signOut} title="Sign out">
          Sign out
        </button>
      </div>
    </header>
  );
}
