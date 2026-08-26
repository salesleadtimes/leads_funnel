'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layouts/dashboard-layout/DashboardLayout';
import { MembersTable, MemberListItem } from '@/features/admin/components/MembersTable';
import { InviteUserForm } from '@/features/admin/components/InviteUserForm';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { getMembersList } from '@/lib/services/memberService';

export default function MembersPage() {
  const auth = useAuth() as any;
  const isOwner = Boolean(auth.isOwner);
  const allSegments = auth.allSegments || [];

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMembersList();
      setMembers(data as MemberListItem[]);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      loadMembers();
    } else if (auth.loading === false) {
      setLoading(false);
    }
  }, [isOwner, auth.loading, loadMembers]);

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
                Team & Member Management is restricted to Owners only.
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
          <p className="text-sm text-muted-foreground">Loading team members…</p>
        </div>
      ) : (
        <MembersTable
          members={members}
          onOpenInvite={() => setIsInviteOpen(true)}
          onRefresh={loadMembers}
        />
      )}

      {/* Invite Member Modal */}
      <InviteUserForm
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        segments={allSegments}
        onInviteSuccess={() => {
          setIsInviteOpen(false);
          loadMembers();
        }}
      />
    </DashboardLayout>
  );
}
