'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  FormEvent,
  RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  getLeads,
  createLead,
  updateLead,
  softDeleteLead,
  hardDeleteLead,
  LeadModel,
} from '../services/leadsService';

export interface LeadsContextType {
  leads: LeadModel[];
  dataLoading: boolean;
  authLoading: boolean;
  saving: boolean;
  pipelineVal: number;
  allSegments: any[];
  loadLeads: () => Promise<void>;
  handleAddLead: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleUpdate: (
    id: string,
    patch: Record<string, any>,
    gemBidPatch?: Record<string, any> | null
  ) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  editingLead: LeadModel | null;
  isEditOpen: boolean;
  openEditModal: (id: string) => void;
  closeEditModal: () => void;
  isInviteOpen: boolean;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  dialogRef: RefObject<HTMLDialogElement>;
  inviteDialogRef: RefObject<HTMLDialogElement>;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { activeSegment, isOwner, profile, allSegments, loading: authLoading } = useAuth();

  const [leads, setLeads] = useState<LeadModel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inviteDialogRef = useRef<HTMLDialogElement>(null);

  const loadLeads = useCallback(async () => {
    setDataLoading(true);
    try {
      const segId = activeSegment?.id || null;
      const data = await getLeads({ segmentId: isOwner ? segId : segId || null });
      setLeads((data || []) as LeadModel[]);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setDataLoading(false);
    }
  }, [activeSegment?.id, isOwner]);

  useEffect(() => {
    if (!authLoading) {
      loadLeads();
    }
  }, [authLoading, loadLeads]);

  const [isInviteOpen, setIsInviteOpen] = useState(false);

  function openEditModal(id: string) {
    setEditId(id);
  }

  function closeEditModal() {
    setEditId(null);
  }

  function openInviteModal() {
    setIsInviteOpen(true);
  }

  function closeInviteModal() {
    setIsInviteOpen(false);
  }

  // Compute pipeline value from open (non-won, non-lost) leads
  const pipelineVal = leads.reduce((sum, l) => {
    const stage = l.stage as any;
    if (!stage?.is_won && !stage?.is_lost) return sum + (Number(l.estValue) || 0);
    return sum;
  }, 0);

  async function handleAddLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());

    const lead = {
      segmentId: raw.segmentId as string,
      orgName: raw.orgName as string,
      sectorId: (raw.sectorId as string) || null,
      deptIndustry: (raw.deptIndustry as string) || '',
      contactPerson: (raw.contactPerson as string) || '',
      phone: (raw.phone as string) || '',
      email: (raw.email as string) || '',
      categoryId: raw.categoryId as string,
      modelDetails: (raw.modelDetails as string) || '',
      qty: Number(raw.qty) || 1,
      estValue: Number(raw.estValue) || 0,
      sourceId: raw.sourceId as string,
      stageId: raw.stageId as string,
      assignedTo: (raw.assignedTo as string) || profile?.id || null,
      expectedClose: (raw.expectedClose as string) || null,
      nextFollowUp: (raw.nextFollowUp as string) || null,
      remarks: (raw.remarks as string) || '',
    };

    const gemBid = raw.gemBidNumber
      ? {
          gemBidNumber: raw.gemBidNumber as string,
          tenderRef: (raw.tenderRef as string) || '',
          bidEndDate: (raw.bidEndDate as string) || null,
          bidStatus: (raw.bidStatus as string) || 'draft',
          emdAmount: Number(raw.emdAmount) || 0,
        }
      : null;

    setSaving(true);
    try {
      await createLead(lead, gemBid);
      await loadLeads();
      e.currentTarget.reset();
      router.push('/leads');
    } catch (err: any) {
      alert('Failed to save lead: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, patch: Record<string, any>, gemBidPatch: Record<string, any> | null = null) {
    setSaving(true);
    try {
      await updateLead(id, patch, gemBidPatch);
      await loadLeads();
    } catch (err: any) {
      alert('Failed to update lead: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
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
    } catch (err: any) {
      alert('Failed to delete lead: ' + err.message);
    } finally {
      setSaving(false);
      closeEditModal();
    }
  }

  const editingLead = editId ? leads.find((l) => l.id === editId) || null : null;

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
        isEditOpen: Boolean(editId),
        openEditModal,
        closeEditModal,
        isInviteOpen,
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

export function useLeads(): LeadsContextType {
  const context = useContext(LeadsContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
}
