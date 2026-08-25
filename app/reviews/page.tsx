'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { ReviewsBoard } from '@/features/reviews/components/ReviewsBoard';
import { useLeads } from '@/lib/context/LeadsContext';

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

function ReviewsView() {
  const { leads } = useLeads();
  const [reviewPeriod, setReviewPeriod] = useState<Period>('monthly');
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0, 10));
  const [targets, setTargets] = useState<Record<Period, number>>({
    daily: 15000,
    weekly: 100000,
    monthly: 400000,
    quarterly: 1200000,
    yearly: 5000000,
  });

  const handleTargetChange = (period: Period, val: string) => {
    setTargets((prev) => ({ ...prev, [period]: Number(val) || 0 }));
  };

  return (
    <ReviewsBoard
      leads={leads}
      targets={targets}
      reviewPeriod={reviewPeriod}
      setReviewPeriod={setReviewPeriod}
      refDate={refDate}
      setRefDate={setRefDate}
      onTargetChange={handleTargetChange}
    />
  );
}

export default function ReviewsPage() {
  return (
    <DashboardLayout>
      <ReviewsView />
    </DashboardLayout>
  );
}
