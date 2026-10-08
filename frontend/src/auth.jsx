import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
const storageKey = 'chainproof.session';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem(storageKey) || 'null'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!session?.token) { setReady(true); return; }
    api.me(session.token).then(({ user }) => setSession((current) => ({ ...current, user }))).catch(() => { localStorage.removeItem(storageKey); setSession(null); }).finally(() => setReady(true));
  }, []);
  const save = (data) => { const next = { token: data.token, user: data.user }; localStorage.setItem(storageKey, JSON.stringify(next)); setSession(next); return next; };
  return <AuthContext.Provider value={{ user: session?.user || null, token: session?.token || null, ready, login: async (body) => save(await api.login(body)), register: async (body) => save(await api.register(body)), logout: () => { localStorage.removeItem(storageKey); setSession(null); } }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
