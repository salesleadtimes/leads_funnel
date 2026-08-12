'use client';

import { useState, useEffect } from 'react';

export default function InviteUserModal({ dialogRef, segments = [], onClose, onInviteSuccess }) {
  const [email, setEmail]               = useState('');
  const [fullName, setFullName]         = useState('');
  const [role, setRole]                 = useState('member');
  const [selectedSegments, setSelected] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Initialize selected segments when segments list changes
  useEffect(() => {
    if (segments.length > 0 && selectedSegments.length === 0) {
      setSelected(segments.map(s => s.id)); // Default select all available segments
    }
  }, [segments]);

  function resetForm() {
    setEmail('');
    setFullName('');
    setRole('member');
    setSelected(segments.map(s => s.id));
    setError('');
    setSuccess('');
  }

  function handleClose() {
    resetForm();
    if (onClose) onClose();
  }

  function toggleSegment(segmentId) {
    setSelected(prev =>
      prev.includes(segmentId)
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  }

  function toggleSelectAll() {
    if (selectedSegments.length === segments.length) {
      setSelected([]);
    } else {
      setSelected(segments.map(s => s.id));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter the user full name.');
      return;
    }

    if (selectedSegments.length === 0) {
      setError('Please select at least one segment to assign.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          segmentIds: selectedSegments
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send invitation.');
      } else {
        setSuccess(data.message || `Invitation sent successfully to ${email}!`);
        setEmail('');
        setFullName('');
        if (onInviteSuccess) onInviteSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Network error sending invitation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="lead-dialog" style={{ padding: 0, border: 'none', borderRadius: 12, background: 'transparent' }}>
      <div className="card" style={{ maxWidth: 520, margin: 'auto', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--line-soft, #e5e7eb)', padding: '24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>✉️ Invite New Team Member</h2>
            <span style={{ fontSize: '12px', color: 'var(--ink-soft, #6b7280)' }}>Send a Supabase invitation link and assign business segments</span>
          </div>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={handleClose}>✕</button>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="user@company.com"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-soft, #d1d5db)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="R.K. Sharma"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-soft, #d1d5db)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
              Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-soft, #d1d5db)' }}
            >
              <option value="member">👤 Member (Segment Scoped)</option>
              <option value="owner">👑 Owner (Full System Access)</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>
                Assigned Business Segments *
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >
                {selectedSegments.length === segments.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--line-soft, #d1d5db)',
              padding: '10px',
              borderRadius: '6px',
              background: 'var(--bg-subtle, #f9fafb)'
            }}>
              {segments.length === 0 && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Loading available segments…</span>
              )}

              {segments.map(seg => (
                <label key={seg.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedSegments.includes(seg.id)}
                    onChange={() => toggleSegment(seg.id)}
                  />
                  <span>{seg.name} <code style={{ fontSize: '11px', color: '#6b7280' }}>({seg.code})</code></span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending Invite…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
