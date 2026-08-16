'use client';

import MainShell from '../../../components/MainShell';
import NewLeadTab from '../../../components/NewLeadTab';
import { useLeads } from '../../../lib/context/LeadsContext';

function NewLeadView() {
  const { handleAddLead } = useLeads();
  return <NewLeadTab onSubmit={handleAddLead} />;
}

export default function NewLeadPage() {
  return (
    <MainShell>
      <NewLeadView />
    </MainShell>
  );
}
