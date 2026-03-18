import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../api";
import type { User, Membership, AdventureMembership } from "../types";

interface AuthContextValue {
  user: User | null;
  memberships: Membership[];
  approvedTroops: Membership[];
  adventureMemberships: AdventureMembership[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, tos_accepted: boolean) => Promise<unknown>;
  logout: () => Promise<void>;
  updateProfile: (data: Record<string, unknown> | string, ...rest: (string | null | undefined)[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [adventureMemberships, setAdventureMemberships] = useState<AdventureMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setMemberships(data.memberships || []);
      setAdventureMemberships(data.adventureMemberships || []);
    } catch {
      setUser(null);
      setMemberships([]);
      setAdventureMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await api.login(email, password);
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (name: string, email: string, password: string, tos_accepted: boolean) => {
    return await api.signup(name, email, password, tos_accepted);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setMemberships([]);
    setAdventureMemberships([]);
  }, []);

  const updateProfile = useCallback(async (data: Record<string, unknown> | string, ...rest: (string | null | undefined)[]) => {
    if (typeof data === "string") {
      // Legacy: updateProfile(user_type, parent_email, parent_email_2)
      await api.updateProfile({ user_type: data, parent_email: rest[0], parent_email_2: rest[1] || null });
    } else {
      await api.updateProfile(data);
    }
    await refresh();
  }, [refresh]);

  const approvedTroops = memberships.filter(m => m.status === "approved");

  return (
    <AuthContext.Provider value={{
      user, memberships, approvedTroops, adventureMemberships, loading,
      login, signup, logout, updateProfile, refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
