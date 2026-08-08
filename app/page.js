'use client';

import { useState, useRef, useEffect } from 'react';
import { useSalesData, todayISO } from '../hooks/useSalesData';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import DashboardTab, { OPEN_STAGES } from '../components/DashboardTab';
import NewLeadTab from '../components/NewLeadTab';
import LeadsListTab from '../components/LeadsListTab';
import ReviewsTab from '../components/ReviewsTab';
import LeadModal from '../components/LeadModal';

export default function Page() {
  const {
    state,
    loaded,
    loadError,
    saving,
    refreshData,
    addLead,
    updateLead,
    deleteLead,
    updateTargets,
    importState
  } = useSalesData();

  const [tab, setTab] = useState('dashboard');
  const [reviewPeriod, setReviewPeriod] = useState('daily');
  const [refDate, setRefDate] = useState('');
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [editId, setEditId] = useState(null);

  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    setRefDate(todayISO());
  }, []);

  useEffect(() => {
    if (editId && dialogRef.current) {
      dialogRef.current.showModal();
    }
  }, [editId]);

  if (!loaded) {
    return <div className="loading-screen">Loading sales data…</div>;
  }

  if (loadError && !state) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 10, textAlign: 'center', padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>Connection Error</div>
        <div style={{ maxWidth: 480 }}>{loadError}</div>
      </div>
    );
  }

  const leads = state?.leads || [];
  const targets = state?.targets || {};
  const pipelineVal = leads
    .filter(l => OPEN_STAGES.includes(l.stage))
    .reduce((a, l) => a + (Number(l.estValue) || 0), 0);

  function handleAddLead(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const lead = Object.fromEntries(fd.entries());
    addLead(lead);
    e.target.reset();
    setTab('leads');
  }

  function closeDialog() {
    setEditId(null);
    if (dialogRef.current) dialogRef.current.close();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hp-sales-funnel-data-' + todayISO() + '.json';
    a.click();
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.leads && data.targets) {
          importState(data);
          alert('Data imported: ' + data.leads.length + ' leads loaded.');
        } else {
          alert("Invalid data file format.");
        }
      } catch (err) {
        alert('Could not read file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function exportCSV() {
    const cols = ["id", "createdDate", "orgName", "sector", "deptIndustry", "contactPerson", "phone", "email", "productCategory", "model", "qty", "estValue", "source", "tenderRef", "stage", "expectedClose", "nextFollowUp", "salesPerson", "remarks", "closedDate"];
    const rows = [cols.join(",")].concat(leads.map(l => cols.map(c => {
      let v = l[c] == null ? '' : String(l[c]).replace(/"/g, '""');
      if (v.includes(',') || v.includes('"') || v.includes('\n')) v = '"' + v + '"';
      return v;
    }).join(",")));
    const blob = new Blob([rows.join("\n")], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hp-sales-funnel-' + todayISO() + '.csv';
    a.click();
  }

  const editingLead = editId ? leads.find(l => l.id === editId) : null;

  return (
    <>
      <Header pipelineVal={pipelineVal} saving={saving} onRefresh={refreshData} />
      <Navigation tab={tab} setTab={setTab} />

      <main>
        {tab === 'dashboard' && <DashboardTab leads={leads} />}

        {tab === 'newlead' && <NewLeadTab onSubmit={handleAddLead} />}

        {tab === 'leads' && (
          <LeadsListTab
            leads={leads}
            search={search} setSearch={setSearch}
            filterSector={filterSector} setFilterSector={setFilterSector}
            filterStage={filterStage} setFilterStage={setFilterStage}
            onEdit={setEditId}
            exportJSON={exportJSON}
            importJSON={importJSON}
            exportCSV={exportCSV}
            fileInputRef={fileInputRef}
          />
        )}

        {tab === 'reviews' && (
          <ReviewsTab
            leads={leads}
            targets={targets}
            reviewPeriod={reviewPeriod} setReviewPeriod={setReviewPeriod}
            refDate={refDate} setRefDate={setRefDate}
            onTargetChange={(period, val) => updateTargets({ [period]: Number(val) || 0 })}
          />
        )}
      </main>

      <LeadModal
        dialogRef={dialogRef}
        lead={editingLead}
        onClose={closeDialog}
        onUpdate={(id, patch) => updateLead(id, patch)}
        onDelete={(id) => {
          if (confirm('Delete this lead permanently?')) {
            deleteLead(id);
            closeDialog();
          }
        }}
      />
    </>
  );
}
