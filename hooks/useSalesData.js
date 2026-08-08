import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'hp_sales_funnel_backup_data';

export function uid() {
  return "HPQ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useSalesData() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/data', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        setLoadError(data.error);
      } else {
        setState(data);
        setLoadError(null);
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch {}
      }
    } catch (err) {
      // Fallback to local storage if API fails
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          setState(JSON.parse(cached));
        } else {
          setLoadError(String(err));
        }
      } catch {
        setLoadError(String(err));
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addLead(leadData) {
    if (!state) return;
    const lead = {
      ...leadData,
      id: leadData.id || uid(),
      qty: Number(leadData.qty) || 1,
      estValue: Number(leadData.estValue) || 0,
      createdDate: leadData.createdDate || todayISO(),
      closedDate: (leadData.stage === "Won" || leadData.stage === "Lost") ? todayISO() : null
    };

    const nextState = { ...state, leads: [lead, ...state.leads] };
    setState(nextState);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState)); } catch {}

    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (!res.ok) {
        console.warn('API sync warning: failed to create lead on server');
      }
    } catch (err) {
      console.warn('API sync error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function updateLead(id, patch) {
    if (!state) return;
    const newLeads = state.leads.map(l => l.id === id ? { ...l, ...patch } : l);
    const nextState = { ...state, leads: newLeads };
    setState(nextState);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState)); } catch {}

    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) {
        console.warn('API sync warning: failed to update lead on server');
      }
    } catch (err) {
      console.warn('API sync error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(id) {
    if (!state) return;
    const nextState = { ...state, leads: state.leads.filter(l => l.id !== id) };
    setState(nextState);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState)); } catch {}

    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        console.warn('API sync warning: failed to delete lead on server');
      }
    } catch (err) {
      console.warn('API sync error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function updateTargets(newTargets) {
    if (!state) return;
    const updatedTargets = { ...state.targets, ...newTargets };
    const nextState = { ...state, targets: updatedTargets };
    setState(nextState);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState)); } catch {}

    setSaving(true);
    try {
      const res = await fetch('/api/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTargets)
      });
      if (!res.ok) {
        console.warn('API sync warning: failed to update targets on server');
      }
    } catch (err) {
      console.warn('API sync error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function importState(newState) {
    setState(newState);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState)); } catch {}
    setSaving(true);
    try {
      const res = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState)
      });
      if (!res.ok) {
        console.warn('API sync warning: backend update failed, local backup preserved');
      }
    } catch (err) {
      console.warn('API sync failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return {
    state,
    loaded,
    loadError,
    saving,
    refreshData: loadData,
    addLead,
    updateLead,
    deleteLead,
    updateTargets,
    importState
  };
}
