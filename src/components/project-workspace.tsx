import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { projectsClient } from "@/lib/projects-client";
import {
  moneyFields,
  projectProfit,
  projectStatuses,
  readProjectFields,
  type ProjectRecord,
} from "@/lib/project-records";
import { formatRupiah } from "@/lib/simulation";

const projectColumns =
  "id,name,location,status,expected_sale,expected_cost,actual_sale,actual_cost,updated_at";

export function ProjectWorkspace({ userId }: { userId: string }) {
  const [selection, setSelection] = useState<string | null>(null);
  const cache = useQueryClient();
  const queryKey = ["pomah-projects", userId];
  const projects = useQuery({
    queryKey,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const { data, error } = await projectsClient
        .from("pomah_projects")
        .select(projectColumns)
        .order("updated_at", { ascending: false })
        .abortSignal(signal)
        .returns<ProjectRecord[]>();
      if (error) throw error;
      return data;
    },
  });
  const selected = projects.data?.find(({ id }) => id === selection);

  async function save(fields: FormData, baseline: ProjectRecord | undefined) {
    const values = readProjectFields(fields);
    const table = projectsClient.from("pomah_projects");
    const response = baseline
      ? await table
          .update(values)
          .eq("id", baseline.id)
          .eq("updated_at", baseline.updated_at)
          .select(projectColumns)
          .maybeSingle()
          .returns<ProjectRecord>()
      : await table.insert(values).select(projectColumns).single().returns<ProjectRecord>();
    if (response.error) throw new Error("Proyek gagal disimpan. Coba lagi.");
    if (!response.data) {
      void projects.refetch();
      throw new Error(
        "Proyek sudah berubah. Pilih proyek lain lalu buka kembali detailnya sebelum menyimpan.",
      );
    }

    const saved = response.data;
    cache.setQueryData<ProjectRecord[]>(queryKey, (existing = []) => [
      saved,
      ...existing.filter(({ id }) => id !== saved.id),
    ]);
    setSelection((current) => (current === "new" && !baseline ? saved.id : current));
    void cache.invalidateQueries({ queryKey, exact: true });
    return saved;
  }

  return (
    <section
      id="proyek-saya"
      aria-labelledby="project-workspace-title"
      className="min-w-0 scroll-mt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="project-workspace-title" className="text-xl font-bold text-foreground">
          Proyek Saya
        </h2>
        <Button type="button" onClick={() => setSelection("new")}>
          Buat proyek
        </Button>
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
        <section aria-label="Daftar proyek" className="rounded-md border border-border bg-card p-4">
          {projects.isPending && (
            <p className="text-sm" role="status">
              Memuat proyek…
            </p>
          )}
          {projects.isError && (
            <div className="space-y-2">
              <p className="text-sm" role="alert">
                Daftar proyek gagal dimuat.
              </p>
              <Button variant="outline" size="sm" onClick={() => void projects.refetch()}>
                Coba lagi
              </Button>
            </div>
          )}
          {projects.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada proyek.</p>
          )}
          <ul className="divide-y divide-border">
            {projects.data?.map(({ id, name, location, status }) => (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selection === id}
                  className="w-full rounded p-3 text-left hover:bg-accent aria-pressed:bg-brand-soft"
                  onClick={() => setSelection(id)}
                >
                  <span className="block text-sm font-semibold">{name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {location ? `${location} · ` : ""}
                    {projectStatuses[status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {(selection === "new" || selected) && (
          <ProjectForm key={selected?.id ?? "new"} project={selected} onSave={save} />
        )}
      </div>
    </section>
  );
}

function ProjectForm({
  project,
  onSave,
}: {
  project: ProjectRecord | undefined;
  onSave: (fields: FormData, baseline: ProjectRecord | undefined) => Promise<ProjectRecord>;
}) {
  const [baseline, setBaseline] = useState(project);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const forecast = projectProfit(project?.expected_sale ?? null, project?.expected_cost ?? null);
  const actual = projectProfit(project?.actual_sale ?? null, project?.actual_cost ?? null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    try {
      setBaseline(await onSave(fields, baseline));
      setIsError(false);
      setMessage("Proyek tersimpan.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Proyek gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-md border border-border bg-card p-5" onSubmit={submit}>
      <h2 className="mb-4 text-base font-semibold">{project ? "Detail proyek" : "Proyek baru"}</h2>
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Nama proyek</span>
          <Input name="name" defaultValue={project?.name} required maxLength={100} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Lokasi</span>
          <Input name="location" defaultValue={project?.location} maxLength={160} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Status</span>
          <select
            name="status"
            defaultValue={project?.status ?? "analysis"}
            className="h-9 w-full rounded-md border border-input bg-background px-3"
          >
            {Object.entries(projectStatuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {moneyFields.map(({ key, label }) => (
          <label className="space-y-1 text-sm" key={key}>
            <span>{label} (Rp)</span>
            <Input
              name={key}
              inputMode="numeric"
              pattern="[0-9]+"
              maxLength={13}
              defaultValue={project?.[key] ?? ""}
            />
          </label>
        ))}
      </fieldset>
      <p className="mt-3 text-xs text-muted-foreground">
        Total biaya mencakup pembelian, renovasi, dan biaya lain yang terkait dengan proyek.
      </p>
      {(forecast !== null || actual !== null) && (
        <dl className="mt-4 grid gap-3 rounded-md bg-brand-soft p-3 text-sm sm:grid-cols-2">
          {forecast !== null && (
            <div>
              <dt>Perkiraan laba/rugi</dt>
              <dd className="font-semibold">{formatRupiah(forecast)}</dd>
            </div>
          )}
          {actual !== null && (
            <div>
              <dt>Laba/rugi aktual</dt>
              <dd className="font-semibold">{formatRupiah(actual)}</dd>
            </div>
          )}
        </dl>
      )}
      {message && (
        <p className="mt-4 text-sm" role={isError ? "alert" : "status"}>
          {message}
        </p>
      )}
      <Button className="mt-4" type="submit" disabled={saving}>
        {saving ? "Menyimpan…" : "Simpan proyek"}
      </Button>
    </form>
  );
}
