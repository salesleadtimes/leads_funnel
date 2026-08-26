'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, UserPlus, Settings, Users, Target, ArrowRight, Building2 } from 'lucide-react';
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
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-primary" />
          System Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Owner-only controls: manage team members, assign business segments, and configure sales targets.
        </p>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team & Member Target Management */}
        <Card className="hover:border-primary/40 transition-all group">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Team & Targets</CardTitle>
                <CardDescription className="text-xs">
                  Manage members, segments & targets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              View all team members, assign or remove segment access, and configure individual sales targets for each segment.
            </p>
            <Link href="/admin/members" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between group-hover:border-primary/40">
                <span>Manage Team Members</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Onboarding */}
        <Card className="hover:border-primary/40 transition-all group">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#00AEEF]/10 flex items-center justify-center shrink-0 group-hover:bg-[#00AEEF]/20 transition-colors">
                <UserPlus className="h-5 w-5 text-[#00AEEF]" />
              </div>
              <div>
                <CardTitle className="text-base">Invite Member</CardTitle>
                <CardDescription className="text-xs">
                  Send email invite with segments & targets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Send a Supabase magic link invitation, assign initial segments, and optionally set sales targets right away.
            </p>
            <Button
              variant="hp"
              size="sm"
              onClick={openInviteModal}
              className="w-full justify-between"
            >
              <span>Invite New Member</span>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Owner Info Banner */}
      <Card className="border-[#FFC300]/25 bg-[#FFC300]/4">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FFC300]/15 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-[#B8900A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#B8900A]">Owner Privileges Active</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                As an Owner, you have full administrative authority to manage business segments, assign team members, configure targets for any member, and edit all leads across the organization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
