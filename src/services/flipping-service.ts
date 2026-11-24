import { supabase } from "@/integrations/supabase/client";
import {
  calculateFlipping,
  makeFlippingProject,
  makeProjectFromAnalysis,
  readFlippingProject,
  type AnalysisSnapshot,
  type FlippingProject,
} from "@/lib/flipping";
import type { Json } from "@/integrations/supabase/types";

export async function loadFlippingProject(id: string, userId: string) {
  const parent = await supabase
    .from("pomah_projects")
    .select("id,name,location,expected_sale")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (parent.error) throw new Error("Proyek gagal dimuat. Coba lagi.");
  if (!parent.data) throw new Error("Proyek tidak ditemukan atau bukan milik Anda.");
  const result = await supabase
    .from("pomah_project_details")
    .select("payload,revision")
    .eq("project_id", id)
    .maybeSingle();
  if (result.error) throw new Error("Rincian proyek gagal dimuat. Data lama tetap aman.");
  const project = result.data
    ? readFlippingProject(result.data.payload)
    : makeFlippingProject(id, parent.data.name, parent.data.location);
  if (!result.data && parent.data.expected_sale !== null)
    project.finance.sale = parent.data.expected_sale;
  return { project, revision: result.data?.revision ?? 0 };
}
export async function saveFlippingProject(id: string, project: FlippingProject, revision: number) {
  const payload = JSON.parse(JSON.stringify(readFlippingProject(project))) as Json;
  const response =
    revision === 0
      ? await supabase
          .from("pomah_project_details")
          .insert({ project_id: id, payload })
          .select("revision")
          .single()
      : await supabase
          .from("pomah_project_details")
          .update({ payload, revision: revision + 1, updated_at: new Date().toISOString() })
          .eq("project_id", id)
          .eq("revision", revision)
          .select("revision")
          .maybeSingle();
  if (response.error || !response.data)
    throw new Error(
      "Penyimpanan gagal atau proyek telah berubah di perangkat lain. Muat ulang sebelum mencoba lagi.",
    );
  return response.data.revision;
}

export type ExistingProject = { id: string; name: string; updated_at: string };
export const projectsForListingKey = (userId: string, slug: string) =>
  ["projects-for-listing", userId, slug] as const;

/** Proyek milik pengguna yang dibuat dari properti katalog tertentu (terbaru dulu). */
export async function findProjectsForListing(
  userId: string,
  listingSlug: string,
): Promise<ExistingProject[]> {
  const details = await supabase
    .from("pomah_project_details")
    .select("project_id")
    .eq("payload->origin->>listingSlug", listingSlug);
  if (details.error) throw new Error("Gagal memeriksa proyek yang sudah ada.");
  const ids = details.data.map((row) => row.project_id);
  if (!ids.length) return [];
  const parents = await supabase
    .from("pomah_projects")
    .select("id,name,updated_at")
    .in("id", ids)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (parents.error) throw new Error("Gagal memeriksa proyek yang sudah ada.");
  return parents.data;
}

/** Membuat proyek milik pengguna dari hasil analisis aset, lalu menyimpan rincian awalnya. */
export async function createProjectFromAnalysis(snapshot: AnalysisSnapshot) {
  const project = makeProjectFromAnalysis(snapshot);
  const totals = calculateFlipping(project.finance, project.rab);
  const parent = await supabase
    .from("pomah_projects")
    .insert({
      name: snapshot.name.slice(0, 200),
      location: snapshot.location.slice(0, 500),
      status: "analysis",
      expected_sale: project.finance.sale,
      expected_cost: Math.round(totals.allIn),
    })
    .select("id")
    .single();
  if (parent.error || !parent.data) throw new Error("Proyek gagal dibuat. Coba lagi.");
  await saveFlippingProject(parent.data.id, project, 0);
  return parent.data.id;
}

/**
 * Menghapus proyek milik pengguna. Rincian proyek ikut terhapus lewat ON DELETE CASCADE.
 * Bila kebijakan database tidak mengizinkan, tidak ada baris yang terhapus dan kita beri tahu.
 */
export async function deleteProject(id: string, userId: string) {
  const { data, error } = await supabase
    .from("pomah_projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id");
  if (error) throw new Error("Proyek gagal dihapus. Coba lagi.");
  if (!data.length)
    throw new Error(
      "Proyek tidak terhapus. Proyek mungkin sudah dihapus atau akun ini belum diizinkan menghapusnya.",
    );
}
