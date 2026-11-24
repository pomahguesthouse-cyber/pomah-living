import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Ruler, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import { defaultLandSettings, landSettingsSchema, type LandSettings } from "@/lib/land-settings";
import { adminError } from "@/services/admin-service";
import {
  fetchLandSettings,
  landSettingsQueryKey,
  saveLandSettings,
} from "@/services/settings-service";

const fields: { key: keyof LandSettings; label: string; unit: string; hint: string }[] = [
  {
    key: "minLotArea",
    label: "Luas kavling minimum",
    unit: "m²",
    hint: "Tanah ditawarkan untuk dipecah bila muat minimal dua kavling seluas ini.",
  },
  {
    key: "minFrontage",
    label: "Lebar muka minimum per kavling",
    unit: "m",
    hint: "Mencegah tawaran pada tanah yang sempit memanjang.",
  },
  {
    key: "kdbPercent",
    label: "KDB bawaan",
    unit: "%",
    hint: "Batas luas lantai dasar per kavling.",
  },
  {
    key: "maxFloors",
    label: "Jumlah lantai maksimal",
    unit: "lantai",
    hint: "Bersama KDB membatasi luas bangunan.",
  },
  {
    key: "buildCostPerM2",
    label: "Biaya bangun rumah baru per m²",
    unit: "Rp",
    hint: "Titik awal perhitungan; flipper dapat mengubahnya per aset.",
  },
];

export function AdminSettings() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: landSettingsQueryKey, queryFn: fetchLandSettings });
  if (query.isPending)
    return <p className="mt-8 text-sm text-muted-foreground">Memuat pengaturan…</p>;
  return (
    <SettingsForm
      key={JSON.stringify(query.data?.settings)}
      initial={query.data?.settings ?? defaultLandSettings}
      fromDatabase={query.data?.source === "database"}
      onSaved={() => client.invalidateQueries({ queryKey: landSettingsQueryKey })}
    />
  );
}

function SettingsForm({
  initial,
  fromDatabase,
  onSaved,
}: {
  initial: LandSettings;
  fromDatabase: boolean;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<LandSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const parsed = landSettingsSchema.safeParse(draft);
  const errors = parsed.success
    ? {}
    : Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]));
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);

  async function save() {
    if (!parsed.success || busy) return;
    setBusy(true);
    setMessage("");
    setFailure("");
    try {
      await saveLandSettings(parsed.data);
      await onSaved();
      setMessage("Pengaturan tersimpan dan berlaku di halaman analisis aset.");
    } catch (error) {
      setFailure(error instanceof Error && !("code" in error) ? error.message : adminError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 max-w-3xl" aria-labelledby="land-settings-title">
      <h2 id="land-settings-title" className="flex items-center gap-2 text-lg font-semibold">
        <Ruler className="size-5 text-brand" />
        Standar pecah kavling
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Dipakai di halaman analisis aset untuk menawarkan flip lebih dari satu rumah. Flipper tetap
        dapat menyesuaikan angka ini per aset sesuai KRK setempat.
      </p>
      {!fromDatabase && (
        <p className="mt-4 flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Pengaturan belum tersimpan di database, jadi platform memakai standar bawaan. Bila
          penyimpanan gagal, tabel app_settings belum dibuat (lihat docs/spec-pengaturan-tanah.md).
        </p>
      )}
      <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `setting-${field.key}`;
          const error = errors[field.key];
          return (
            <div key={field.key}>
              <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
                {field.label}
              </label>
              <div className="relative">
                {field.unit === "Rp" && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                )}
                <FormattedNumberInput
                  id={id}
                  className={field.unit === "Rp" ? "pl-10" : "pr-16"}
                  value={draft[field.key]}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${id}-hint`}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, [field.key]: value }))
                  }
                />
                {field.unit !== "Rp" && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {field.unit}
                  </span>
                )}
              </div>
              <p
                id={`${id}-hint`}
                className={`mt-1.5 text-[11px] leading-5 ${error ? "text-destructive" : "text-muted-foreground"}`}
              >
                {error ?? field.hint}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="brand"
          disabled={!parsed.success || !changed || busy}
          onClick={save}
        >
          <Save className="size-4" /> {busy ? "Menyimpan…" : "Simpan pengaturan"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setDraft(defaultLandSettings)}
        >
          Pakai standar bawaan
        </Button>
      </div>
      {message && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="size-4" /> {message}
        </p>
      )}
      {failure && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {failure}
        </p>
      )}
    </section>
  );
}
