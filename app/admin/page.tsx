'use client';

import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { AdminPanel } from '@/features/admin/components/AdminPanel';

export default function AdminPage() {
  return (
    <DashboardLayout>
      <AdminPanel />
    </DashboardLayout>
  );
}
