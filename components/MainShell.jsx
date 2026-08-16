'use client';

import Header from './Header';
import Navigation from './Navigation';
import LeadModal from './LeadModal';
import InviteUserModal from './InviteUserModal';
import { LeadsProvider, useLeads } from '../lib/context/LeadsContext';

function ShellContent({ children }) {
  const {
    pipelineVal,
    saving,
    authLoading,
    dataLoading,
    loadLeads,
    openInviteModal,
    closeInviteModal,
    editingLead,
    closeEditModal,
    handleUpdate,
    handleDelete,
    dialogRef,
    inviteDialogRef,
    allSegments
  } = useLeads();

  if (authLoading) return <div className="loading-screen">Verifying session…</div>;
  if (dataLoading) {
    return (
      <>
        <Header pipelineVal={0} saving={false} onRefresh={loadLeads} onOpenInviteModal={openInviteModal} />
        <div className="loading-screen">Loading leads data…</div>
      </>
    );
  }

  return (
    <>
      <Header
        pipelineVal={pipelineVal}
        saving={saving}
        onRefresh={loadLeads}
        onOpenInviteModal={openInviteModal}
      />
      <Navigation />

      <main>
        {children}
      </main>

      <LeadModal
        dialogRef={dialogRef}
        lead={editingLead}
        onClose={closeEditModal}
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

export default function MainShell({ children }) {
  return (
    <LeadsProvider>
      <ShellContent>{children}</ShellContent>
    </LeadsProvider>
  );
}
