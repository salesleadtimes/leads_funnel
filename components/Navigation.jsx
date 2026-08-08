'use client';

export default function Navigation({ tab, setTab }) {
  const tabs = [
    ['dashboard', 'Dashboard & Funnel'],
    ['newlead', '+ New Lead'],
    ['leads', 'All Leads'],
    ['reviews', 'Reviews']
  ];

  return (
    <nav className="tabs">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          className={tab === key ? 'active' : ''}
          onClick={() => setTab(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
