'use client';

import { useEffect, useRef, useState } from 'react';

const STAGES = ["New Lead","Qualified","Quotation / Bid Submitted","Technical Evaluation","Negotiation / L1 Round","PO / Work Order Received","Won","Lost"];
const STAGE_COLORS = {
  "New Lead":"#8A93A3","Qualified":"#00AEEF","Quotation / Bid Submitted":"#0091D5",
  "Technical Evaluation":"#6C4FC7","Negotiation / L1 Round":"#EC008C",
  "PO / Work Order Received":"#B9770E","Won":"#1E8A5F","Lost":"#C0392B"
};
const OPEN_STAGES = STAGES.filter(s => s !== "Won" && s !== "Lost");
const PRODUCT_CATEGORIES = ["Inkjet Printer","LaserJet Printer","MFD (Multi-Function Device)","Document Scanner","Flatbed Scanner","Large Format Plotter","Ink / Toner Cartridge","AMC / Service Contract","Spare Parts"];
const SOURCES = ["GeM Portal","Government Tender (CPPP/eProc)","Direct Government RFQ","Corporate RFQ","Channel Partner","Referral","Cold Call","Website Enquiry","Existing Customer Repeat"];

function uid(){ return "HPQ-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtINR(n){ n = Number(n)||0; return "₹" + n.toLocaleString('en-IN'); }
function fmtDate(d){ if(!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }

function getPeriodRange(period, refDateStr){
  const ref = new Date(refDateStr + "T00:00:00");
  let start, end, label;
  if(period === 'daily'){
    start = new Date(ref); end = new Date(ref);
    label = ref.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  } else if(period === 'weekly'){
    const day = ref.getDay();
    start = new Date(ref); start.setDate(ref.getDate() - day);
    end = new Date(start); end.setDate(start.getDate() + 6);
    label = fmtDate(start.toISOString().slice(0,10)) + " – " + fmtDate(end.toISOString().slice(0,10));
  } else if(period === 'monthly'){
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth()+1, 0);
    label = start.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  } else if(period === 'quarterly'){
    const q = Math.floor(ref.getMonth()/3);
    start = new Date(ref.getFullYear(), q*3, 1);
    end = new Date(ref.getFullYear(), q*3+3, 0);
    label = "Q" + (q+1) + " " + ref.getFullYear();
  } else {
    start = new Date(ref.getFullYear(), 0, 1);
    end = new Date(ref.getFullYear(), 11, 31);
    label = "Year " + ref.getFullYear();
  }
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), label };
}

export default function Page(){
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
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
    fetch('/api/data')
      .then(r => r.json())
      .then(d => {
        if(d.error){ setLoadError(d.error); }
        else { setState(d); }
        setLoaded(true);
      })
      .catch(err => { setLoadError(String(err)); setLoaded(true); });
  }, []);

  useEffect(() => {
    if(editId && dialogRef.current) dialogRef.current.showModal();
  }, [editId]);

  async function persist(next){
    setState(next);
    setSaving(true);
    try{
      await fetch('/api/data', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(next) });
    } finally {
      setSaving(false);
    }
  }

  if(!loaded){
    return <div className="loading-screen">Loading sales data…</div>;
  }
  if(loadError){
    return (
      <div className="loading-screen" style={{flexDirection:'column',gap:10,textAlign:'center',padding:20}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:16}}>Storage not connected</div>
        <div style={{maxWidth:480}}>{loadError}</div>
        <div style={{fontSize:12}}>Add "Upstash for Redis" (free) from the Vercel Storage tab and redeploy — see README.md.</div>
      </div>
    );
  }

  const leads = state.leads;
  const targets = state.targets;
  const sumWhere = (pred, val) => leads.filter(pred).reduce((a,l) => a + (Number(val(l))||0), 0);
  const countWhere = (pred) => leads.filter(pred).length;

  function handleAddLead(e){
    e.preventDefault();
    const fd = new FormData(e.target);
    const lead = Object.fromEntries(fd.entries());
    lead.id = uid();
    lead.qty = Number(lead.qty) || 1;
    lead.estValue = Number(lead.estValue) || 0;
    lead.createdDate = todayISO();
    lead.closedDate = (lead.stage === "Won" || lead.stage === "Lost") ? todayISO() : null;
    persist({ ...state, leads: [...leads, lead] });
    e.target.reset();
    setTab('leads');
  }

  function handleUpdateLead(id, patch){
    const newLeads = leads.map(l => l.id === id ? { ...l, ...patch } : l);
    persist({ ...state, leads: newLeads });
  }

  function handleDeleteLead(id){
    if(!confirm('Delete this lead permanently?')) return;
    persist({ ...state, leads: leads.filter(l => l.id !== id) });
    closeDialog();
  }

  function handleTargetChange(period, val){
    persist({ ...state, targets: { ...targets, [period]: Number(val) || 0 } });
  }

  function closeDialog(){
    setEditId(null);
    if(dialogRef.current) dialogRef.current.close();
  }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hp-sales-funnel-data-' + todayISO() + '.json';
    a.click();
  }

  function importJSON(file){
    const reader = new FileReader();
    reader.onload = (ev) => {
      try{
        const data = JSON.parse(ev.target.result);
        if(data.leads && data.targets){ persist(data); alert('Data imported: ' + data.leads.length + ' leads loaded.'); }
        else alert("This file doesn't look like a valid export.");
      } catch(err){ alert('Could not read file: ' + err.message); }
    };
    reader.readAsText(file);
  }

  function exportCSV(){
    const cols = ["id","createdDate","orgName","sector","deptIndustry","contactPerson","phone","email","productCategory","model","qty","estValue","source","tenderRef","stage","expectedClose","nextFollowUp","salesPerson","remarks","closedDate"];
    const rows = [cols.join(",")].concat(leads.map(l => cols.map(c => {
      let v = l[c] == null ? '' : String(l[c]).replace(/"/g,'""');
      if(v.includes(',') || v.includes('"') || v.includes('\n')) v = '"' + v + '"';
      return v;
    }).join(",")));
    const blob = new Blob([rows.join("\n")], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hp-sales-funnel-' + todayISO() + '.csv';
    a.click();
  }

  // ---- dashboard numbers ----
  const openCount = countWhere(l => OPEN_STAGES.includes(l.stage));
  const pipelineVal = sumWhere(l => OPEN_STAGES.includes(l.stage), l => l.estValue);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const wonThisMonth = sumWhere(l => l.stage === "Won" && l.closedDate && l.closedDate >= monthStart, l => l.estValue);
  const wonCount = countWhere(l => l.stage === "Won");
  const lostCount = countWhere(l => l.stage === "Lost");
  const winRate = (wonCount + lostCount) > 0 ? Math.round(100 * wonCount / (wonCount + lostCount)) : 0;
  const maxStageCount = Math.max(1, ...STAGES.map(s => countWhere(l => l.stage === s)));
  const govtCount = countWhere(l => l.sector === "Government");
  const nonCount = countWhere(l => l.sector === "Non-Government");
  const govtVal = sumWhere(l => l.sector === "Government", l => l.estValue);
  const nonVal = sumWhere(l => l.sector === "Non-Government", l => l.estValue);
  const totalVal = govtVal + nonVal || 1;
  const recent = [...leads].sort((a,b) => (b.closedDate||b.createdDate).localeCompare(a.closedDate||a.createdDate)).slice(0,5);

  // ---- leads list filtering ----
  const filteredLeads = leads.filter(l => {
    if(filterSector && l.sector !== filterSector) return false;
    if(filterStage && l.stage !== filterStage) return false;
    const q = search.toLowerCase();
    if(q && !(l.orgName.toLowerCase().includes(q) || (l.model||"").toLowerCase().includes(q) || (l.tenderRef||"").toLowerCase().includes(q))) return false;
    return true;
  }).sort((a,b) => b.createdDate.localeCompare(a.createdDate));

  // ---- review numbers ----
  const rd = refDate || todayISO();
  const { start, end, label } = getPeriodRange(reviewPeriod, rd);
  const newLeadsInPeriod = leads.filter(l => l.createdDate >= start && l.createdDate <= end);
  const wonInPeriod = leads.filter(l => l.stage === "Won" && l.closedDate && l.closedDate >= start && l.closedDate <= end);
  const lostInPeriod = leads.filter(l => l.stage === "Lost" && l.closedDate && l.closedDate >= start && l.closedDate <= end);
  const wonVal = wonInPeriod.reduce((a,l) => a + (Number(l.estValue)||0), 0);
  const lostVal = lostInPeriod.reduce((a,l) => a + (Number(l.estValue)||0), 0);
  const target = Number(targets[reviewPeriod]) || 0;
  const achievementPct = target > 0 ? Math.min(150, Math.round(100 * wonVal / target)) : 0;
  const govtNewCount = newLeadsInPeriod.filter(l => l.sector === "Government").length;
  const nonNewCount = newLeadsInPeriod.filter(l => l.sector === "Non-Government").length;

  const editingLead = editId ? leads.find(l => l.id === editId) : null;

  return (
    <>
      <header className="topbar">
        <svg className="regmark" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="13" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1"/>
          <circle cx="12" cy="13" r="7" fill="#00AEEF" opacity=".85"/>
          <circle cx="19" cy="13" r="7" fill="#EC008C" opacity=".85"/>
          <circle cx="15.5" cy="19" r="7" fill="#FFC300" opacity=".85"/>
          <circle cx="15" cy="15" r="1.6" fill="#14181F"/>
        </svg>
        <div className="brandtext">
          <h1>HP Print &amp; Scan — Sales Funnel</h1>
          <span className="sub">GOVERNMENT + NON-GOVERNMENT LEAD TRACKER</span>
        </div>
        <div className="spacer"></div>
        {saving && <span className="saving">Saving…</span>}
        <span className="stat-pill">Pipeline: {fmtINR(pipelineVal)}</span>
      </header>

      <nav className="tabs">
        {[['dashboard','Dashboard & Funnel'],['newlead','+ New Lead'],['leads','All Leads'],['reviews','Reviews']].map(([key,label2]) => (
          <button key={key} className={tab===key?'active':''} onClick={() => setTab(key)}>{label2}</button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && (
          <section>
            <h2 className="section-title">Sales Overview</h2>
            <p className="section-desc">Live snapshot across Government and Non-Government pipelines.</p>

            <div className="grid kpis">
              <div className="kpi c-cyan"><div className="label">Open Leads</div><div className="value">{openCount}</div><div className="bar"></div></div>
              <div className="kpi c-magenta"><div className="label">Open Pipeline Value</div><div className="value">{fmtINR(pipelineVal)}</div><div className="bar"></div></div>
              <div className="kpi c-yellow"><div className="label">Won (This Month)</div><div className="value">{fmtINR(wonThisMonth)}</div><div className="bar"></div></div>
              <div className="kpi c-ink"><div className="label">Win Rate</div><div className="value">{winRate}%</div><div className="bar"></div></div>
            </div>

            <div className="card" style={{marginBottom:16}}>
              <h2 className="section-title" style={{fontSize:15}}>Funnel by Stage</h2>
              <div className="funnel-wrap">
                {STAGES.map(s => {
                  const c = countWhere(l => l.stage === s);
                  const v = sumWhere(l => l.stage === s, l => l.estValue);
                  const pct = Math.max(4, Math.round(100 * c / maxStageCount));
                  return (
                    <div className="funnel-row" key={s}>
                      <div className="funnel-label">{s}</div>
                      <div className="funnel-track">
                        <div className="funnel-fill" style={{ width: pct+'%', background: STAGE_COLORS[s] }}>
                          {c > 0 ? c + ' lead' + (c !== 1 ? 's' : '') : ''}
                        </div>
                      </div>
                      <div className="funnel-count">{fmtINR(v)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid two" style={{gridTemplateColumns:'1fr 1fr'}}>
              <div className="card">
                <h2 className="section-title" style={{fontSize:15}}>Government vs Non-Government</h2>
                <div style={{display:'flex',height:14,borderRadius:7,overflow:'hidden',marginBottom:12}}>
                  <div style={{width:(100*govtVal/totalVal)+'%',background:'var(--govt)'}}></div>
                  <div style={{width:(100*nonVal/totalVal)+'%',background:'var(--nongovt)'}}></div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                  <span><span className="tag govt">GOVT</span> {govtCount} leads</span>
                  <span style={{fontFamily:'var(--font-mono)'}}>{fmtINR(govtVal)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span><span className="tag nongovt">NON-GOVT</span> {nonCount} leads</span>
                  <span style={{fontFamily:'var(--font-mono)'}}>{fmtINR(nonVal)}</span>
                </div>
              </div>
              <div className="card">
                <h2 className="section-title" style={{fontSize:15}}>Recent Activity</h2>
                {recent.length === 0 && <p style={{color:'var(--ink-soft)'}}>No leads yet.</p>}
                {recent.map(l => (
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--line-soft)',fontSize:12.5}}>
                    <span>{l.orgName}</span>
                    <span className="tag stage" style={{background:STAGE_COLORS[l.stage]+'22',color:STAGE_COLORS[l.stage]}}>{l.stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === 'newlead' && (
          <section>
            <h2 className="section-title">Add New Lead</h2>
            <p className="section-desc">Capture a print / scanner opportunity — Government (Tender / GeM) or Non-Government (Corporate / Retail).</p>
            <div className="card">
              <form className="leadform" onSubmit={handleAddLead}>
                <div className="field"><label>Organisation / Customer Name *</label><input type="text" name="orgName" required placeholder="e.g. District Collectorate, Muzaffarnagar" /></div>
                <div className="field"><label>Sector *</label>
                  <select name="sector" required defaultValue="Government">
                    <option value="Government">Government</option>
                    <option value="Non-Government">Non-Government</option>
                  </select>
                </div>
                <div className="field"><label>Department / Industry</label><input type="text" name="deptIndustry" placeholder="e.g. Education Dept / Manufacturing" /></div>

                <div className="field"><label>Contact Person</label><input type="text" name="contactPerson" /></div>
                <div className="field"><label>Phone</label><input type="text" name="phone" /></div>
                <div className="field"><label>Email</label><input type="email" name="email" /></div>

                <div className="field"><label>Product Category *</label>
                  <select name="productCategory" required defaultValue={PRODUCT_CATEGORIES[0]}>
                    {PRODUCT_CATEGORIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field"><label>HP Model</label><input type="text" name="model" placeholder="e.g. HP LaserJet M436n" /></div>
                <div className="field"><label>Quantity</label><input type="number" name="qty" min="1" defaultValue="1" /></div>

                <div className="field"><label>Estimated Value (₹) *</label><input type="number" name="estValue" min="0" required placeholder="e.g. 250000" /></div>
                <div className="field"><label>Lead Source</label>
                  <select name="source" defaultValue={SOURCES[0]}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field"><label>Tender / RFQ Ref No.</label><input type="text" name="tenderRef" placeholder="Govt tenders only" /></div>

                <div className="field"><label>Sales Stage</label>
                  <select name="stage" defaultValue="New Lead">
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field"><label>Expected Closing Date</label><input type="date" name="expectedClose" /></div>
                <div className="field"><label>Next Follow-up Date</label><input type="date" name="nextFollowUp" /></div>

                <div className="field"><label>Assigned Sales Person</label><input type="text" name="salesPerson" /></div>
                <div className="field full"><label>Remarks</label><textarea name="remarks" placeholder="Notes, competitor info, EMD status, etc."></textarea></div>

                <div className="formfoot">
                  <button type="reset" className="btn">Clear</button>
                  <button type="submit" className="btn primary">Save Lead</button>
                </div>
              </form>
            </div>
          </section>
        )}

        {tab === 'leads' && (
          <section>
            <h2 className="section-title">All Leads</h2>
            <p className="section-desc">Every captured opportunity — filter, update stage, or edit.</p>
            <div className="toolbar">
              <input type="text" placeholder="Search organisation, model, ref no..." value={search} onChange={e => setSearch(e.target.value)} />
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)}>
                <option value="">All Sectors</option><option>Government</option><option>Non-Government</option>
              </select>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}>
                <option value="">All Stages</option>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
              <div style={{flex:1}}></div>
              <button className="btn sm" onClick={exportJSON}>Export Data (JSON)</button>
              <button className="btn sm" onClick={() => fileInputRef.current.click()}>Import Data (JSON)</button>
              <button className="btn sm" onClick={exportCSV}>Export CSV</button>
              <input ref={fileInputRef} type="file" accept="application/json" style={{display:'none'}}
                onChange={e => { if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; }} />
            </div>

            {filteredLeads.length === 0 && <div className="empty"><p>No leads match. Try clearing filters or add a new lead.</p></div>}
            {filteredLeads.map(l => (
              <div className="docket" key={l.id}>
                <div className="stub"></div>
                <div className="body">
                  <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                    <div>
                      <div className="id">{l.id} · {fmtDate(l.createdDate)}</div>
                      <div style={{fontWeight:600,fontSize:14.5,marginTop:2}}>{l.orgName}</div>
                      <div style={{color:'var(--ink-soft)',fontSize:12.5,marginTop:2}}>
                        {l.productCategory} — {l.model || '—'} × {l.qty || 1}{l.tenderRef ? (' · Ref: ' + l.tenderRef) : ''}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:'var(--font-mono)',fontWeight:600}}>{fmtINR(l.estValue)}</div>
                      <div style={{marginTop:4}}>
                        <span className={"tag " + (l.sector === 'Government' ? 'govt' : 'nongovt')}>{l.sector === 'Government' ? 'GOVT' : 'NON-GOVT'}</span>{' '}
                        <span className={"tag " + (l.stage === 'Won' ? 'won' : l.stage === 'Lost' ? 'lost' : 'stage')}
                          style={l.stage !== 'Won' && l.stage !== 'Lost' ? {background:STAGE_COLORS[l.stage]+'22',color:STAGE_COLORS[l.stage]} : {}}>
                          {l.stage}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
                    <span style={{fontSize:12,color:'var(--ink-soft)'}}>Next follow-up: {fmtDate(l.nextFollowUp)} · {l.salesPerson || 'Unassigned'}</span>
                    <button className="btn sm" onClick={() => setEditId(l.id)}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'reviews' && (
          <section>
            <h2 className="section-title">Periodic Review</h2>
            <p className="section-desc">Daily, Weekly, Monthly, Quarterly and Yearly sales review — set a target and track achievement.</p>
            <div className="review-tabs no-print">
              {['daily','weekly','monthly','quarterly','yearly'].map(p => (
                <button key={p} className={reviewPeriod===p?'active':''} onClick={() => setReviewPeriod(p)}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
            <div className="toolbar no-print">
              <label style={{fontSize:12.5,color:'var(--ink-soft)'}}>Reference date:</label>
              <input type="date" value={rd} onChange={e => setRefDate(e.target.value)} />
              <div style={{flex:1}}></div>
              <button className="btn sm" onClick={() => window.print()}>Print / Save as PDF</button>
            </div>

            <div className="target-row no-print">
              <label style={{fontSize:12.5,color:'var(--ink-soft)',whiteSpace:'nowrap'}}>Target for this {reviewPeriod.replace('ly','')}:</label>
              <input type="text" inputMode="numeric" defaultValue={target} key={reviewPeriod+target}
                onBlur={e => handleTargetChange(reviewPeriod, e.target.value)} />
              <div className="achv-bar"><div className="achv-fill" style={{width: Math.min(100,achievementPct)+'%'}}></div></div>
              <span style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:600}}>{achievementPct}%</span>
            </div>

            <div className="card" style={{marginBottom:16}}>
              <h2 className="section-title" style={{fontSize:16}}>{reviewPeriod.charAt(0).toUpperCase()+reviewPeriod.slice(1)} Review — {label}</h2>
              <div className="grid kpis" style={{marginTop:14}}>
                <div className="kpi c-cyan"><div className="label">New Leads</div><div className="value">{newLeadsInPeriod.length}</div><div className="bar"></div></div>
                <div className="kpi c-yellow"><div className="label">Leads Won</div><div className="value">{wonInPeriod.length}</div><div className="bar"></div></div>
                <div className="kpi c-magenta"><div className="label">Revenue Booked</div><div className="value">{fmtINR(wonVal)}</div><div className="bar"></div></div>
                <div className="kpi c-ink"><div className="label">Leads Lost</div><div className="value">{lostInPeriod.length} <span style={{fontSize:12,color:'var(--ink-soft)'}}>({fmtINR(lostVal)})</span></div><div className="bar"></div></div>
              </div>
              <table style={{marginTop:6}}>
                <tbody>
                  <tr><th>Metric</th><th style={{textAlign:'right'}}>Value</th></tr>
                  <tr><td>New leads — Government</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{govtNewCount}</td></tr>
                  <tr><td>New leads — Non-Government</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{nonNewCount}</td></tr>
                  <tr><td>Open pipeline value (as of today)</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{fmtINR(pipelineVal)}</td></tr>
                  <tr><td>Target for period</td><td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}>{fmtINR(target)}</td></tr>
                  <tr><td><b>Achievement</b></td><td style={{textAlign:'right',fontFamily:'var(--font-mono)'}}><b>{achievementPct}%</b></td></tr>
                </tbody>
              </table>
            </div>

            <div className="grid two" style={{gridTemplateColumns:'1fr 1fr'}}>
              <div className="card">
                <h2 className="section-title" style={{fontSize:14.5}}>Leads Won This Period</h2>
                {wonInPeriod.length === 0 && <p style={{color:'var(--ink-soft)',fontSize:13}}>None yet.</p>}
                {wonInPeriod.map(l => (
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,padding:'6px 0',borderBottom:'1px solid var(--line-soft)'}}>
                    <span>{l.orgName}</span><span style={{fontFamily:'var(--font-mono)'}}>{fmtINR(l.estValue)}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <h2 className="section-title" style={{fontSize:14.5}}>Leads Lost This Period</h2>
                {lostInPeriod.length === 0 && <p style={{color:'var(--ink-soft)',fontSize:13}}>None.</p>}
                {lostInPeriod.map(l => (
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,padding:'6px 0',borderBottom:'1px solid var(--line-soft)'}}>
                    <span>{l.orgName}</span><span style={{fontFamily:'var(--font-mono)'}}>{fmtINR(l.estValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="note">Data is shared and stored centrally (Vercel KV) — anyone with this app's URL and login sees the same live leads.</footer>

      <dialog ref={dialogRef} onClose={() => setEditId(null)}>
        {editingLead && (
          <EditLeadForm
            lead={editingLead}
            onSave={(patch) => { handleUpdateLead(editingLead.id, patch); closeDialog(); }}
            onDelete={() => handleDeleteLead(editingLead.id)}
            onClose={closeDialog}
          />
        )}
      </dialog>
    </>
  );
}

function EditLeadForm({ lead, onSave, onDelete, onClose }){
  const [stage, setStage] = useState(lead.stage);
  const [nextFollowUp, setNextFollowUp] = useState(lead.nextFollowUp || '');
  const [remarks, setRemarks] = useState(lead.remarks || '');

  function submit(){
    const patch = { stage, nextFollowUp: nextFollowUp || null, remarks };
    if((stage === 'Won' || stage === 'Lost') && !lead.closedDate) patch.closedDate = todayISO();
    if(stage !== 'Won' && stage !== 'Lost') patch.closedDate = null;
    onSave(patch);
  }

  return (
    <>
      <div className="dhead"><strong>Edit — {lead.orgName}</strong><button className="btn sm" onClick={onClose}>✕</button></div>
      <div className="dbody">
        <div className="dfield">
          <label>Sales Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value)}>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="dfield">
          <label>Next Follow-up Date</label>
          <input type="date" value={nextFollowUp} onChange={e => setNextFollowUp(e.target.value)} />
        </div>
        <div className="dfield">
          <label>Remarks</label>
          <textarea style={{minHeight:70}} value={remarks} onChange={e => setRemarks(e.target.value)}></textarea>
        </div>
      </div>
      <div className="dfoot">
        <button className="btn danger-o" onClick={onDelete}>Delete Lead</button>
        <button className="btn primary" onClick={submit}>Save Changes</button>
      </div>
    </>
  );
}
