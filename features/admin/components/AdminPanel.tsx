'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, UserPlus, Settings } from 'lucide-react';
import { useLeads } from '@/lib/context/LeadsContext';
import { useAuth } from '@/lib/context/AuthContext';

export function AdminPanel() {
  const auth = useAuth() as any;
  const isOwner = Boolean(auth.isOwner);
  const leadsCtx = useLeads() as any;
  const openInviteModal = leadsCtx.openInviteModal;


  if (!isOwner) {
    return (
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
              The System Administration page is restricted to Owners only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-primary" />
          System Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Owner-only controls: onboard team members, manage segments, and configure the system.
        </p>
      </div>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">Team Onboarding</CardTitle>
              <CardDescription>
                Invite new team members with email and assign them to business segments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex-1">
              <p className="text-sm font-medium">Invite a New Team Member</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send a Supabase magic link invite and assign to segment(s)
              </p>
            </div>
            <Button
              variant="hp"
              size="sm"
              onClick={openInviteModal}
              className="gap-1.5 shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Owner Info */}
      <Card className="border-[#FFC300]/25">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FFC300]/15 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-[#B8900A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#B8900A]">You are an Owner</p>
              <p className="text-xs text-muted-foreground mt-1">
                Owners have full access across all business segments, can manage users,
                view all leads regardless of segment assignment, and configure system settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
