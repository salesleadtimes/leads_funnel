'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { useLeads } from '@/lib/context/LeadsContext';
import { AppSidebar } from '@/components/shared/app-sidebar/AppSidebar';
import { LeadFormDialog } from '@/features/leads/components/LeadFormDialog';
import { InviteUserForm } from '@/features/admin/components/InviteUserForm';
import { Skeleton } from '@/components/ui/skeleton';

function LoadingShell() {
  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 h-full bg-[#0D1B3E]" />
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const leadsCtx = useLeads() as any;
  const {
    authLoading,
    dataLoading,
    editingLead,
    closeEditModal,
    handleUpdate,
    handleDelete,
    dialogRef,
    inviteDialogRef,
    isInviteOpen,
    allSegments,
    closeInviteModal,
  } = leadsCtx;

  if (authLoading) return <LoadingShell />;
  if (dataLoading) return <LoadingShell />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <LeadFormDialog
        open={Boolean(editingLead)}
        dialogRef={dialogRef}
        lead={editingLead}
        onClose={closeEditModal}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <InviteUserForm
        open={Boolean(isInviteOpen)}
        dialogRef={inviteDialogRef}
        segments={allSegments}
        onClose={closeInviteModal}
      />
    </div>
  );
}

