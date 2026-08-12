'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '../supabase/client';

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the whole app.
 * Provides: user, profile (role, full_name), assignedSegments, activeSegment,
 * allSegments, setActiveSegment, refreshProfile, signOut, loading.
 */
export function AuthProvider({ children }) {
  const supabase = createSupabaseBrowserClient();

  const [user, setUser]                     = useState(null);
  const [profile, setProfile]               = useState(null);
  const [assignedSegments, setAssigned]     = useState([]);
  const [allSegments, setAllSegments]       = useState([]);
  const [activeSegment, setActiveSegment]   = useState(null);
  const [loading, setLoading]               = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    // 1. Fetch user profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', userId)
      .single();

    if (!prof) return;
    setProfile(prof);

    // 2. Always fetch all active business segments (useful for selection & owner overview)
    const { data: allSegs } = await supabase
      .from('segments')
      .select('id, code, name, description')
      .eq('is_active', true)
      .order('name');
    
    setAllSegments(allSegs || []);

    if (prof.role === 'owner') {
      // Owners see all segments
      setAssigned(allSegs || []);
      if (allSegs?.length > 0) setActiveSegment(prev => prev ?? allSegs[0]);
    } else {
      // Members see only their assigned segments
      const { data: userSegs } = await supabase
        .from('user_segments')
        .select('segment_id, segments(id, code, name, description)')
        .eq('user_id', userId);
      const mapped = (userSegs || []).map(r => r.segments).filter(Boolean);
      setAssigned(mapped);
      if (mapped.length > 0) setActiveSegment(prev => prev ?? mapped[0]);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setAssigned([]);
        setAllSegments([]);
        setActiveSegment(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role: profile?.role ?? null,
      isOwner: profile?.role === 'owner',
      assignedSegments,
      allSegments,
      activeSegment,
      setActiveSegment,
      refreshProfile,
      signOut,
      loading,
      supabase
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
