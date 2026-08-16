'use client';

import MainShell from '../../components/MainShell';
import LeadsListTab from '../../components/LeadsListTab';
import { useLeads } from '../../lib/context/LeadsContext';

function LeadsView() {
  const { leads, openEditModal } = useLeads();
  return <LeadsListTab leads={leads} onEdit={openEditModal} />;
}

export default function LeadsPage() {
  return (
    <MainShell>
      <LeadsView />
    </MainShell>
  );
}
