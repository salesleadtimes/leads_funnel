'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/context/AuthContext';

export default function Navigation() {
  const pathname = usePathname();
  const { isOwner } = useAuth();

  const tabs = [
    { href: '/',          label: '📊 Dashboard' },
    { href: '/leads/new', label: '＋ New Lead'  },
    { href: '/leads',     label: '📋 All Leads' },
    { href: '/reviews',   label: '🎯 Reviews'   },
    ...(isOwner ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
  ];

  return (
    <nav className="nav-tabs" role="tablist">
      {tabs.map(t => {
        const isActive = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            aria-selected={isActive}
            role="tab"
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
