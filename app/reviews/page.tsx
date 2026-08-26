'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { ReviewsBoard } from '@/features/reviews/components/ReviewsBoard';
import { useLeads } from '@/lib/context/LeadsContext';
import { useAuth } from '@/lib/context/AuthContext';
import { getPeriodRange, PeriodType } from '@/lib/utils/periodUtils';
import { getTargetAchievement, upsertTarget } from '@/lib/services/targetsService';
import { fetchAllProfiles } from '@/lib/services/masterDataService';

function ReviewsView() {
  const { leads, loadLeads } = useLeads();
  const auth = useAuth() as any;
  const isOwner = Boolean(auth.isOwner);
  const user = auth.user;
  const activeSegment = auth.activeSegment;
  const assignedSegments = auth.assignedSegments || [];
  const allSegments = auth.allSegments || [];

  const [reviewPeriod, setReviewPeriod] = useState<PeriodType>('monthly');
  const [refDate, setRefDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Scoping filters
  const [selectedUserId, setSelectedUserId] = useState<string | null>(isOwner ? null : (user?.id || null));
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(activeSegment?.id || null);

  // Members list for Owner dropdown
  const [members, setMembers] = useState<Array<{ id: string; fullName: string; email: string; role?: string }>>([]);

  // Active target & achievement data
  const [targetVal, setTargetVal] = useState<number>(0);
  const [hasTarget, setHasTarget] = useState<boolean>(false);

  // Sync segment selection when active segment loads
  useEffect(() => {
    if (!selectedSegmentId && activeSegment?.id) {
      setSelectedSegmentId(activeSegment.id);
    }
  }, [activeSegment?.id, selectedSegmentId]);

  // Load team members list if owner
  useEffect(() => {
    if (isOwner) {
      fetchAllProfiles()
        .then((profs) => {
          setMembers(
            (profs || []).map((p: any) => ({
              id: p.id,
              fullName: p.full_name || p.email.split('@')[0],
              email: p.email,
              role: p.role,
            }))
          );
        })
        .catch(console.error);
    } else if (user?.id) {
      setSelectedUserId(user.id);
    }
  }, [isOwner, user?.id]);

  const periodRange = getPeriodRange(reviewPeriod, refDate);

  // Load current target value & achievement
  const loadTargetData = useCallback(async () => {
    if (!selectedSegmentId) return;
    try {
      const ach = await getTargetAchievement({
        userId: selectedUserId,
        segmentId: selectedSegmentId,
        periodType: reviewPeriod,
        refDate,
      });
      setTargetVal(ach.targetValue);
      setHasTarget(ach.hasTarget);
    } catch (err) {
      console.warn('Failed to load target achievement:', err);
    }
  }, [selectedUserId, selectedSegmentId, reviewPeriod, refDate]);

  useEffect(() => {
    loadTargetData();
  }, [loadTargetData]);

  // Handle Owner saving a target directly from the Reviews board
  async function handleSaveTarget(newTargetValue: number) {
    if (!selectedSegmentId) return;
    await upsertTarget({
      segmentId: selectedSegmentId,
      userId: selectedUserId,
      year: periodRange.year,
      periodType: reviewPeriod,
      periodValue: periodRange.periodValue,
      targetValue: newTargetValue,
    });
    await loadTargetData();
  }

  const availableSegments = isOwner ? allSegments : assignedSegments;

  return (
    <ReviewsBoard
      leads={leads}
      currentTargetValue={targetVal}
      hasTarget={hasTarget}
      reviewPeriod={reviewPeriod}
      setReviewPeriod={setReviewPeriod}
      refDate={refDate}
      setRefDate={setRefDate}
      periodRange={periodRange}
      isOwner={isOwner}
      selectedUserId={selectedUserId}
      setSelectedUserId={setSelectedUserId}
      members={members}
      selectedSegmentId={selectedSegmentId}
      setSelectedSegmentId={setSelectedSegmentId}
      segments={availableSegments}
      onSaveTarget={isOwner ? handleSaveTarget : undefined}
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
