import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import {
  analysisDefaultsSchema,
  defaultAnalysisDefaults,
  type AnalysisDefaults,
} from "@/lib/analysis-defaults";
import { adminError } from "@/services/admin-service";
import {
  analysisDefaultsQueryKey,
  fetchAnalysisDefaults,
  saveAnalysisDefaults,
} from "@/services/settings-service";

type Flat = {
  purchaseCostPercent: number;
  holdingSalePercent: number;
  targetProfitPercent: number;
  ringan: number;
  sedang: number;
  berat: number;
};

const fields: { key: keyof Flat; label: string; unit: string; hint: string }[] = [
  {
    key: "purchaseCostPercent",
    label: "Biaya perolehan",
    unit: "%",
    hint: "Bea lelang, BPHTB, notaris dan balik nama, dari harga menang.",
  },
  {
    key: "holdingSalePercent",
    label: "Biaya kepemilikan dan jual",
    unit: "%",
    hint: "Bunga, utilitas, pajak penjual dan komisi, dari harga jual.",
  },
  {
    key: "targetProfitPercent",
    label: "Target laba",
    unit: "%",
    hint: "Dari modal: harga menang + biaya perolehan + renovasi.",
  },
  {
    key: "ringan",
    label: "Renovasi ringan per m²",
    unit: "Rp",
    hint: "Cat, plafon, perbaikan kecil.",
  },
  {
    key: "sedang",
    label: "Renovasi sedang per m²",
    unit: "Rp",
    hint: "Lantai, kusen, sanitasi, listrik.",
  },
  {
    key: "berat",
    label: "Renovasi berat per m²",
    unit: "Rp",
    hint: "Atap, struktur ringan, bongkar besar.",
  },
];

const flatten = (value: AnalysisDefaults): Flat => ({
  purchaseCostPercent: value.purchaseCostPercent,
  holdingSalePercent: value.holdingSalePercent,
  targetProfitPercent: value.targetProfitPercent,
  ...value.renovationPerM2,
});

const nest = ({ ringan, sedang, berat, ...rest }: Flat): AnalysisDefaults => ({
  ...rest,
  renovationPerM2: { ringan, sedang, berat },
});

export function AdminAnalysisDefaults() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: analysisDefaultsQueryKey, queryFn: fetchAnalysisDefaults });
  if (query.isPending) return null;
  return (
    <DefaultsForm
      key={JSON.stringify(query.data?.settings)}
      initial={flatten(query.data?.settings ?? defaultAnalysisDefaults)}
      onSaved={() => client.invalidateQueries({ queryKey: analysisDefaultsQueryKey })}
    />
  );
}

function DefaultsForm({ initial, onSaved }: { initial: Flat; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState<Flat>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const parsed = analysisDefaultsSchema.safeParse(nest(draft));
  const errors: Partial<Record<keyof Flat, string>> = {};
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = String(issue.path.at(-1)) as keyof Flat;
      errors[key] ??= issue.message;
    }
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);

  async function save() {
    if (!parsed.success || busy) return;
    setBusy(true);
    setMessage("");
    setFailure("");
    try {
      await saveAnalysisDefaults(parsed.data);
      await onSaved();
      setMessage("Standar analisis tersimpan.");
    } catch (error) {
      setFailure(error instanceof Error && !("code" in error) ? error.message : adminError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-12 max-w-3xl border-t border-border pt-8"
      aria-labelledby="analysis-defaults-title"
    >
      <h2 id="analysis-defaults-title" className="flex items-center gap-2 text-lg font-semibold">
        <SlidersHorizontal className="size-5 text-brand" />
        Standar analisis aset
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Katalog hanya berisi fakta aset. Saat flipper membuka aset katalog, angka awal analisis
        dihitung dari standar ini: harga menang = limit, harga jual dan renovasi diisi flipper.
      </p>
      <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `analysis-${field.key}`;
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
                  className={field.unit === "Rp" ? "pl-10" : "pr-10"}
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
          <Save className="size-4" /> {busy ? "Menyimpan…" : "Simpan standar analisis"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setDraft(flatten(defaultAnalysisDefaults))}
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
