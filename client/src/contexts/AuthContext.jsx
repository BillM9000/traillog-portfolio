import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [adventureMemberships, setAdventureMemberships] = useState([]);
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

  const login = useCallback(async (email, password) => {
    await api.login(email, password);
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (name, email, password) => {
    return await api.signup(name, email, password);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setMemberships([]);
    setAdventureMemberships([]);
  }, []);

  const updateProfile = useCallback(async (data, ...rest) => {
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
