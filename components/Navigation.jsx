'use client';

import { useAuth } from '../lib/context/AuthContext';

export default function Navigation({ tab, setTab }) {
  const { isOwner } = useAuth();

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'newlead',   label: '＋ New Lead'  },
    { id: 'leads',     label: '📋 All Leads' },
    { id: 'reviews',   label: '🎯 Reviews'   },
    ...(isOwner ? [{ id: 'admin', label: '⚙️ Admin' }] : []),
  ];

  return (
    <nav className="nav-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          id={`nav-${t.id}`}
          role="tab"
          aria-selected={tab === t.id}
          className={`nav-tab ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
