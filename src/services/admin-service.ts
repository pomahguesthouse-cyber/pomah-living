import { supabase } from "@/integrations/supabase/client";
import { directorySchema, slideSchema, isSafeImageUrl, type SlideInput } from "@/lib/admin";
import type { Tables } from "@/integrations/supabase/types";

export type HeroSlide = Tables<"hero_slides">;
export async function fetchAdminRole(userId: string) {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}
export async function fetchAdminSlides() {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("sort_order")
    .order("id");
  if (error) throw error;
  return data;
}
export async function fetchPublishedSlides() {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id,sort_order,eyebrow,title,description,image_url,image_alt,button_label,button_href")
    .eq("published", true)
    .order("sort_order")
    .order("id");
  if (error) throw error;
  return data.filter((slide) => isSafeImageUrl(slide.image_url));
}
export async function saveAdminSlide(value: SlideInput, id?: string) {
  const payload = slideSchema.parse(value);
  const result = id
    ? await supabase.from("hero_slides").update(payload).eq("id", id).select("id").single()
    : await supabase.from("hero_slides").insert(payload).select("id").single();
  if (result.error) throw result.error;
  return result.data;
}
export async function deleteAdminSlide(id: string) {
  const { error, data } = await supabase
    .from("hero_slides")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
export async function fetchAdminDirectory(
  search: string,
  status: string,
  role: string,
  page: number,
) {
  const { data, error } = await supabase.rpc("pomah_admin_directory", {
    search_text: search,
    status_filter: status,
    role_filter: role,
    page_number: page,
  });
  if (error) throw error;
  return directorySchema.parse(data);
}
export async function reviewPartner(
  userId: string,
  status: "approved" | "rejected" | "revision",
  note: string,
) {
  const { error } = await supabase
    .from("partner_approvals")
    .update({ status, note })
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("user_id")
    .single();
  if (error) throw error;
}
export async function fetchAdminAudit(page: number) {
  const { data, error, count } = await supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(page * 25, page * 25 + 24);
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}
export function adminError(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message;
  return "Permintaan gagal. Periksa koneksi dan hak akses, lalu coba lagi.";
}

/** Aggregated on the database with SECURITY DEFINER; never query other users' projects from the browser. */
export type AdminMetrics = { users: number; projects: number; sold: number; pending: number; published: number; assets: number | null };
export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const { data, error } = await supabase.rpc("pomah_admin_metrics");
  if (error) throw error;
  const result = data as unknown as AdminMetrics;
  if (!result || typeof result.users !== "number" || typeof result.projects !== "number") throw new Error("Format statistik admin tidak valid.");
  return result;
}
