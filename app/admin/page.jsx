'use client';

import MainShell from '../../components/MainShell';
import { useAuth } from '../../lib/context/AuthContext';
import { useLeads } from '../../lib/context/LeadsContext';

function AdminView() {
  const { isOwner } = useAuth();
  const { openInviteModal } = useLeads();

  if (!isOwner) {
    return (
      <div className="card" style={{ maxWidth: 540, margin: '40px auto', textAlign: 'center', padding: 32 }}>
        <h2 style={{ fontSize: 18, color: '#C0392B', marginBottom: 8 }}>🔒 Access Restricted</h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          The System Administration page is restricted to Owners only.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="card" style={{ maxWidth: 640, background: 'var(--bg-card, #ffffff)', padding: 24, borderRadius: 12, border: '1px solid var(--line-soft, #e5e7eb)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          👑 System Administration & Onboarding
        </h2>
        <p style={{ color: 'var(--ink-soft, #6b7280)', fontSize: 14, marginBottom: 20 }}>
          As an owner, you have full access across all business segments and can onboard new team members.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openInviteModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            ✉️ Invite New Member
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <MainShell>
      <AdminView />
    </MainShell>
  );
}
