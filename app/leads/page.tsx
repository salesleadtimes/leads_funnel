'use client';

import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { LeadsTable } from '@/features/leads/components/LeadsTable';
import { useLeads } from '@/lib/context/LeadsContext';

function LeadsView() {
  const { leads, openEditModal } = useLeads();
  return <LeadsTable leads={leads} onEdit={openEditModal} />;
}

export default function LeadsPage() {
  return (
    <DashboardLayout>
      <LeadsView />
    </DashboardLayout>
  );
}
