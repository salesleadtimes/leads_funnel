'use client';

import { useState } from 'react';
import MainShell from '../../components/MainShell';
import ReviewsTab from '../../components/ReviewsTab';
import { useLeads } from '../../lib/context/LeadsContext';

function ReviewsView() {
  const { leads } = useLeads();
  const [reviewPeriod, setReviewPeriod] = useState('monthly');
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0, 10));
  const [targets, setTargets] = useState({
    daily: 15000,
    weekly: 100000,
    monthly: 400000,
    quarterly: 1200000,
    yearly: 5000000
  });

  const handleTargetChange = (period, val) => {
    setTargets(prev => ({
      ...prev,
      [period]: Number(val) || 0
    }));
  };

  return (
    <ReviewsTab
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
    <MainShell>
      <ReviewsView />
    </MainShell>
  );
}
