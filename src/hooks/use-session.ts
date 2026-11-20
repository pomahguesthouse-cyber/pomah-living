import { useEffect } from "react";
import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Status sesi disimpan di Zustand agar header dan halaman memakai sumber yang sama.
type SessionState = { session: Session | null; ready: boolean };

export const useSessionStore = create<SessionState>(() => ({ session: null, ready: false }));

// Dipasang sekali di root untuk menyinkronkan sesi.
export function useSessionSync() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      useSessionStore.setState({ session, ready: true });
    });
    void supabase.auth.getSession().then(({ data: current }) => {
      useSessionStore.setState({ session: current.session, ready: true });
    });
    return () => data.subscription.unsubscribe();
  }, []);
}

export function useSession() {
  return useSessionStore();
}
