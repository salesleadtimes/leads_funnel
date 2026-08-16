'use client';

import MainShell from '../components/MainShell';
import DashboardTab from '../components/DashboardTab';
import { useLeads } from '../lib/context/LeadsContext';

function DashboardView() {
  const { leads } = useLeads();
  return <DashboardTab leads={leads} />;
}

export default function Page() {
  return (
    <MainShell>
      <DashboardView />
    </MainShell>
  );
}
