import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      const [{ data: profileRow }, { data: rolesRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      if (profileRow) setProfile(profileRow as Profile);
      else setProfile(null);
      setRoles(rolesRows?.map((r: { role: string }) => r.role) ?? []);
    } catch (e) {
      console.error('[Auth] Falha ao carregar perfil/papéis:', e);
      setProfile(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    let active = true;

    const syncFromSession = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      try {
        if (session?.user) await loadUserData(session.user.id);
        else {
          setProfile(null);
          setRoles([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        await syncFromSession(session);
      } catch (e) {
        console.error('[Auth] getSession:', e);
        if (active) {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        return;
      }
      setLoading(true);
      void syncFromSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: string) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
