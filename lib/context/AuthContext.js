'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createSupabaseBrowserClient } from '../supabase/client';

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the whole app.
 * Provides: user, profile (role, full_name), assignedSegments, activeSegment,
 * allSegments, setActiveSegment, refreshProfile, signOut, loading.
 */
export function AuthProvider({ children }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [assignedSegments, setAssigned]   = useState([]);
  const [allSegments, setAllSegments]     = useState([]);
  const [activeSegment, setActiveSegment] = useState(null);
  const [loading, setLoading]             = useState(true);

  const fetchProfile = useCallback(async (userId, sessionUser = null) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch user profile (maybeSingle avoids PGRST116 when 0 rows exist)
      let { data: prof } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', userId)
        .maybeSingle();

      // If profile is missing, auto-create it from session user metadata
      if (!prof) {
        const email = sessionUser?.email || '';
        if (email) {
          const fallbackName = sessionUser?.user_metadata?.full_name || email.split('@')[0] || 'User';
          const fallbackRole = sessionUser?.user_metadata?.role || 'owner';

          const { data: createdProf } = await supabase
            .from('profiles')
            .upsert(
              {
                id: userId,
                email,
                full_name: fallbackName,
                role: fallbackRole,
                is_active: true,
              },
              { onConflict: 'id' }
            )
            .select()
            .maybeSingle();

          prof = createdProf || {
            id: userId,
            email,
            full_name: fallbackName,
            role: fallbackRole,
            is_active: true,
          };
        }
      }

      if (prof) {
        setProfile(prof);

        // 2. Fetch all active business segments
        const { data: allSegs } = await supabase
          .from('segments')
          .select('id, code, name, description')
          .eq('is_active', true)
          .order('name');

        const activeSegs = allSegs || [];
        setAllSegments(activeSegs);

        if (prof.role === 'owner') {
          // Owners see all segments
          setAssigned(activeSegs);
          if (activeSegs.length > 0) {
            setActiveSegment((prev) => prev ?? activeSegs[0]);
          }
        } else {
          // Members see only their assigned segments
          const { data: userSegs } = await supabase
            .from('user_segments')
            .select('segment_id, segments(id, code, name, description)')
            .eq('user_id', userId);

          const mapped = (userSegs || []).map((r) => r.segments).filter(Boolean);
          setAssigned(mapped);
          if (mapped.length > 0) {
            setActiveSegment((prev) => prev ?? mapped[0]);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] Auth initialization error:', err);
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setProfile(null);
        setAssigned([]);
        setAllSegments([]);
        setActiveSegment(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
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
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
