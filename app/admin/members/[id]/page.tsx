'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { MemberDetailView } from '@/features/admin/components/MemberDetailView';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2, UserX } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { getMemberDetails } from '@/lib/services/memberService';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const auth = useAuth() as any;
  const isOwner = Boolean(auth.isOwner);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMemberDetails(id);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load member detail:', err);
      setError(err.message || 'Member not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isOwner) {
      loadDetails();
    } else if (auth.loading === false) {
      setLoading(false);
    }
  }, [isOwner, auth.loading, loadDetails]);

  if (!isOwner && !auth.loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Card className="max-w-sm w-full text-center">
            <CardContent className="py-12">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-2">
                Access Restricted
              </h2>
              <p className="text-sm text-muted-foreground">
                Only owners can access member management and configure targets.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading member profile & targets…</p>
        </div>
      ) : error || !data ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <UserX className="h-12 w-12 text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold">Member Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {error || "The requested team member could not be loaded."}
          </p>
        </div>
      ) : (
        <MemberDetailView
          memberId={id}
          initialData={data}
          onRefresh={loadDetails}
        />
      )}
    </DashboardLayout>
  );
}
