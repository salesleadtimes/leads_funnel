'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Target,
  Settings2,
  LogOut,
  RefreshCw,
  ChevronDown,
  Users,
  Crown,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useLeads } from '@/lib/context/LeadsContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { fmtINR } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads/new', label: 'New Lead', icon: PlusCircle },
  { href: '/leads', label: 'All Leads', icon: ClipboardList },
  { href: '/reviews', label: 'Reviews', icon: Target },
];

const ADMIN_ITEMS = [
  { href: '/admin', label: 'Admin', icon: Settings2 },
  { href: '/admin/members', label: 'Members & Targets', icon: Users },
];

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:bg-white/8 hover:text-white/90'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-[#00AEEF]' : 'text-white/40 group-hover:text-white/70'
        )}
      />
      {label}
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00AEEF]" />
      )}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth() as any;
  const profile = auth.profile as { full_name?: string; email?: string } | null;
  const isOwner = Boolean(auth.isOwner);
  const assignedSegments = (auth.assignedSegments || []) as { id: string; name: string }[];
  const activeSegment = auth.activeSegment as { id: string; name: string } | null;
  const setActiveSegment = auth.setActiveSegment;
  const signOut = auth.signOut;

  const leadsCtx = useLeads() as any;
  const pipelineVal = leadsCtx.pipelineVal;
  const saving = leadsCtx.saving;
  const loadLeads = leadsCtx.loadLeads;
  const openInviteModal = leadsCtx.openInviteModal;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0]?.toUpperCase() ?? 'U');



  return (
    <aside
      className="flex flex-col w-64 shrink-0 h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0D1B3E 0%, #0A152F 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Logo / Brand ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/8">
        <div className="relative w-9 h-9 shrink-0">
          <Image
            src="/Logo-2.png"
            alt="Times IT Solutions"
            fill
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-display font-semibold leading-tight truncate">
            Lead & Bid Manager
          </p>
          <p className="text-white/40 text-[11px] font-mono truncate">
            GeM · Govt · Corporate
          </p>
        </div>
      </div>

      {/* ── Segment Switcher (if multiple) ───────────── */}
      {assignedSegments.length > 1 && (
        <div className="px-3 py-3 border-b border-white/8">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-1.5 px-1">
            Segment
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between gap-2 rounded-lg bg-white/8 border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/12 transition-colors">
                <span className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-3.5 w-3.5 text-[#00AEEF] shrink-0" />
                  <span className="truncate">{activeSegment?.name ?? 'All Segments'}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56"
              style={{ background: '#1A2B5E', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <DropdownMenuLabel className="text-white/50">Switch Segment</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {assignedSegments.map((seg: { id: string; name: string }) => (
                <DropdownMenuItem
                  key={seg.id}
                  onClick={() => setActiveSegment(seg)}
                  className={cn(
                    'text-white/80 focus:bg-white/10 focus:text-white cursor-pointer',
                    activeSegment?.id === seg.id && 'text-[#00AEEF] font-medium'
                  )}
                >
                  {seg.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Single segment pill ──────────────────────── */}
      {assignedSegments.length === 1 && activeSegment && (
        <div className="px-4 py-2 border-b border-white/8">
          <div className="flex items-center gap-2 rounded-lg bg-[#00AEEF]/12 border border-[#00AEEF]/20 px-3 py-1.5">
            <Building2 className="h-3 w-3 text-[#00AEEF]" />
            <span className="text-[#00AEEF] text-xs font-mono">{activeSegment.name}</span>
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2 px-1">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}

        {isOwner && (
          <>
            <div className="mt-4 mb-2">
              <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold px-1">
                Admin
              </p>
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
            <button
              onClick={openInviteModal}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white/90 transition-all duration-150 group"
            >
              <Users className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white/70" />
              Invite Member
            </button>
          </>
        )}
      </nav>

      {/* ── Pipeline Stat ────────────────────────────── */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/6 border border-white/8 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-[10px] uppercase tracking-wide font-semibold">Pipeline</p>
            <p className="text-white text-sm font-mono font-semibold">{fmtINR(pipelineVal)}</p>
          </div>
          <button
            onClick={loadLeads}
            title="Refresh"
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {saving && (
            <span className="text-[#FFC300] text-[10px] font-mono animate-pulse-soft">Saving…</span>
          )}
        </div>
      </div>

      {/* ── User Profile Footer ──────────────────────── */}
      <div className="px-3 py-3 border-t border-white/8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 rounded-lg hover:bg-white/8 px-2 py-2 transition-colors group">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  style={{ background: 'linear-gradient(135deg, #0091D5, #00AEEF)' }}
                  className="text-white text-xs font-bold"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white text-xs font-medium truncate">
                  {profile?.full_name || profile?.email || 'User'}
                </p>
                <p className="text-white/40 text-[10px] font-mono truncate">
                  {isOwner ? '👑 Owner' : '👤 Member'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-white/30 shrink-0 group-hover:text-white/60 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-52 mb-1"
            style={{ background: '#1A2B5E', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <DropdownMenuLabel className="text-white/50">
              {profile?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={signOut}
              className="text-red-400 focus:bg-red-500/15 focus:text-red-300 cursor-pointer gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
