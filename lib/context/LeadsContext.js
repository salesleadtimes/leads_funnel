'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getLeads, createLead, updateLead, softDeleteLead, hardDeleteLead } from '../services/leadsService';

const LeadsContext = createContext(null);

export function LeadsProvider({ children }) {
  const router = useRouter();
  const { activeSegment, isOwner, profile, allSegments, loading: authLoading } = useAuth();

  const [leads, setLeads] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const dialogRef = useRef(null);
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
    if (editId && dialogRef.current) {
      dialogRef.current.showModal();
    }
  }, [editId]);

  function openEditModal(id) {
    setEditId(id);
  }

  function closeEditModal() {
    setEditId(null);
    if (dialogRef.current) dialogRef.current.close();
  }

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
      segmentId: raw.segmentId,
      orgName: raw.orgName,
      sectorId: raw.sectorId || null,
      deptIndustry: raw.deptIndustry || '',
      contactPerson: raw.contactPerson || '',
      phone: raw.phone || '',
      email: raw.email || '',
      categoryId: raw.categoryId,
      modelDetails: raw.modelDetails || '',
      qty: Number(raw.qty) || 1,
      estValue: Number(raw.estValue) || 0,
      sourceId: raw.sourceId,
      stageId: raw.stageId,
      assignedTo: raw.assignedTo || profile?.id || null,
      expectedClose: raw.expectedClose || null,
      nextFollowUp: raw.nextFollowUp || null,
      remarks: raw.remarks || '',
    };

    const gemBid = raw.gemBidNumber ? {
      gemBidNumber: raw.gemBidNumber,
      tenderRef: raw.tenderRef || '',
      bidEndDate: raw.bidEndDate || null,
      bidStatus: raw.bidStatus || 'draft',
      emdAmount: Number(raw.emdAmount) || 0,
    } : null;

    setSaving(true);
    try {
      await createLead(lead, gemBid);
      await loadLeads();
      e.target.reset();
      router.push('/leads');
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
      closeEditModal();
    }
  }

  const editingLead = editId ? leads.find(l => l.id === editId) : null;

  return (
    <LeadsContext.Provider
      value={{
        leads,
        dataLoading,
        authLoading,
        saving,
        pipelineVal,
        allSegments,
        loadLeads,
        handleAddLead,
        handleUpdate,
        handleDelete,
        editingLead,
        openEditModal,
        closeEditModal,
        openInviteModal,
        closeInviteModal,
        dialogRef,
        inviteDialogRef,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
}
