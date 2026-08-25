'use client';

import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { NewLeadForm } from '@/features/leads/components/NewLeadForm';
import { useLeads } from '@/lib/context/LeadsContext';

function NewLeadView() {
  const { handleAddLead } = useLeads();
  return <NewLeadForm onSubmit={handleAddLead} />;
}

export default function NewLeadPage() {
  return (
    <DashboardLayout>
      <NewLeadView />
    </DashboardLayout>
  );
}
