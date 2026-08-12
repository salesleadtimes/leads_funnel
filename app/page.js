'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { getLeads, createLead, updateLead, softDeleteLead, hardDeleteLead, upsertGemBid } from '../lib/services/leadsService';
import { getTargetValue } from '../lib/services/targetsService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import DashboardTab from '../components/DashboardTab';
import NewLeadTab from '../components/NewLeadTab';
import LeadsListTab from '../components/LeadsListTab';
import ReviewsTab from '../components/ReviewsTab';
import LeadModal from '../components/LeadModal';
import InviteUserModal from '../components/InviteUserModal';

export default function Page() {
  const { activeSegment, isOwner, profile, allSegments, loading: authLoading } = useAuth();

  const [leads, setLeads]             = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [tab, setTab]                 = useState('dashboard');
  const [editId, setEditId]           = useState(null);

  const dialogRef       = useRef(null);
  const inviteDialogRef = useRef(null);

  const loadLeads = useCallback(async () => {
    if (!activeSegment?.id) return;
    setDataLoading(true);
    try {
      const data = await getLeads({ segmentId: isOwner ? null : activeSegment.id });
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setDataLoading(false);
    }
  }, [activeSegment?.id, isOwner]);

  useEffect(() => {
    if (!authLoading) loadLeads();
  }, [authLoading, loadLeads]);

  useEffect(() => {
    if (editId && dialogRef.current) dialogRef.current.showModal();
  }, [editId]);

  function openInviteModal() {
    if (inviteDialogRef.current) {
      inviteDialogRef.current.showModal();
    }
  }

  function closeInviteModal() {
    if (inviteDialogRef.current) {
      inviteDialogRef.current.close();
    }
  }

  // Compute pipeline value from open (non-won, non-lost) leads
  const pipelineVal = leads.reduce((sum, l) => {
    if (!l.stage?.is_won && !l.stage?.is_lost) return sum + (Number(l.estValue) || 0);
    return sum;
  }, 0);

  async function handleAddLead(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const raw = Object.fromEntries(fd.entries());

    const lead = {
      segmentId:      raw.segmentId,
      orgName:        raw.orgName,
      sectorId:       raw.sectorId || null,
      deptIndustry:   raw.deptIndustry || '',
      contactPerson:  raw.contactPerson || '',
      phone:          raw.phone || '',
      email:          raw.email || '',
      categoryId:     raw.categoryId,
      modelDetails:   raw.modelDetails || '',
      qty:            Number(raw.qty) || 1,
      estValue:       Number(raw.estValue) || 0,
      sourceId:       raw.sourceId,
      stageId:        raw.stageId,
      assignedTo:     raw.assignedTo || profile?.id || null,
      expectedClose:  raw.expectedClose || null,
      nextFollowUp:   raw.nextFollowUp || null,
      remarks:        raw.remarks || '',
    };

    const gemBid = raw.gemBidNumber ? {
      gemBidNumber: raw.gemBidNumber,
      tenderRef:    raw.tenderRef || '',
      bidEndDate:   raw.bidEndDate || null,
      bidStatus:    raw.bidStatus || 'draft',
      emdAmount:    Number(raw.emdAmount) || 0,
    } : null;

    setSaving(true);
    try {
      await createLead(lead, gemBid);
      await loadLeads();
      e.target.reset();
      setTab('leads');
    } catch (err) {
      alert('Failed to save lead: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id, patch, gemBidPatch = null) {
    setSaving(true);
    try {
      await updateLead(id, patch, gemBidPatch);
      await loadLeads();
    } catch (err) {
      alert('Failed to update lead: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirm = window.confirm(
      isOwner
        ? 'Permanently (hard) delete this lead? This cannot be undone.'
        : 'Remove this lead? It will be soft-deleted and can be recovered by the owner.'
    );
    if (!confirm) return;
    setSaving(true);
    try {
      if (isOwner) await hardDeleteLead(id);
      else await softDeleteLead(id);
      await loadLeads();
    } catch (err) {
      alert('Failed to delete lead: ' + err.message);
    } finally {
      setSaving(false);
      closeDialog();
    }
  }

  function closeDialog() {
    setEditId(null);
    if (dialogRef.current) dialogRef.current.close();
  }

  const editingLead = editId ? leads.find(l => l.id === editId) : null;

  if (authLoading) return <div className="loading-screen">Verifying session…</div>;
  if (dataLoading) return (
    <>
      <Header pipelineVal={0} saving={false} onRefresh={loadLeads} onOpenInviteModal={openInviteModal} />
      <div className="loading-screen">Loading leads…</div>
    </>
  );

  return (
    <>
      <Header
        pipelineVal={pipelineVal}
        saving={saving}
        onRefresh={loadLeads}
        onOpenInviteModal={openInviteModal}
      />
      <Navigation tab={tab} setTab={setTab} />

      <main>
        {tab === 'dashboard' && (
          <DashboardTab leads={leads} />
        )}

        {tab === 'newlead' && (
          <NewLeadTab onSubmit={handleAddLead} />
        )}

        {tab === 'leads' && (
          <LeadsListTab
            leads={leads}
            onEdit={setEditId}
          />
        )}

        {tab === 'reviews' && (
          <ReviewsTab leads={leads} />
        )}

        {tab === 'admin' && isOwner && (
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
        )}
      </main>

      <LeadModal
        dialogRef={dialogRef}
        lead={editingLead}
        onClose={closeDialog}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <InviteUserModal
        dialogRef={inviteDialogRef}
        segments={allSegments}
        onClose={closeInviteModal}
      />
    </>
  );
}
