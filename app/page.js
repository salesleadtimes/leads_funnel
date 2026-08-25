'use client';

import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';
import { useLeads } from '@/lib/context/LeadsContext';

function DashboardView() {
  const { leads } = useLeads();
  return <DashboardOverview leads={leads} />;
}

export default function Page() {
  return (
    <DashboardLayout>
      <DashboardView />
    </DashboardLayout>
  );
}
