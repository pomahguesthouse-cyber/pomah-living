import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

// Lapisan layanan untuk semua pemanggilan autentikasi dan profil.
export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  // Tanpa sesi berarti pengguna harus mengonfirmasi email terlebih dahulu.
  return { needsConfirmation: data.session === null };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signInWithProvider(provider: "google" | "lovable") {
  const result = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw result.error;
  return { redirected: Boolean(result.redirected) };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, values: { display_name: string; avatar_url: string }) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: values.display_name, avatar_url: values.avatar_url || null });
  if (error) throw error;
}
