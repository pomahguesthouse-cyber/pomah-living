import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/flipping-editors";
import type { FlippingProject } from "@/lib/flipping";
import { provinceOptions } from "@/lib/indonesia-regions";
import { formatRupiah } from "@/lib/simulation";

type Property = FlippingProject["property"];
type TextKey = Exclude<keyof Property, "land" | "building" | "limit">;

const suggestions = {
  type: ["Rumah tapak 1 lantai", "Rumah tapak 2 lantai", "Rumah susun / apartemen", "Ruko"],
  legal: ["SHM", "SHGB", "HGB", "AJB", "Girik", "Belum diketahui"],
  occupancy: [
    "Belum diverifikasi",
    "Kosong",
    "Dihuni pemilik lama",
    "Dihuni penyewa",
    "Perlu pengosongan",
  ],
  documents: ["Belum diverifikasi", "Lengkap", "Sebagian", "Bermasalah"],
} as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function PropertySummaryEditor({
  property,
  onChange,
}: {
  property: Property;
  onChange: (property: Property) => void;
}) {
  const set = <K extends keyof Property>(key: K, value: Property[K]) =>
    onChange({ ...property, [key]: value });

  const text = (
    key: TextKey,
    label: string,
    options: { type?: "text" | "date"; list?: readonly string[]; className?: string } = {},
  ) => {
    const listId = options.list ? `property-${key}-options` : undefined;
    return (
      <label className={`block min-w-0 space-y-2 text-xs font-medium ${options.className ?? ""}`}>
        <span className="block leading-5">{label}</span>
        <Input
          type={options.type ?? "text"}
          value={property[key]}
          maxLength={500}
          list={listId}
          autoComplete="off"
          onChange={(event) => set(key, event.target.value)}
        />
        {options.list && (
          <datalist id={listId}>
            {options.list.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
      </label>
    );
  };

  const preview = [
    property.address || "Alamat belum diisi",
    property.land || property.building
      ? `LT ${property.land.toLocaleString("id-ID")} m² · LB ${property.building.toLocaleString("id-ID")} m²`
      : null,
    property.limit ? `Limit ${formatRupiah(property.limit)}` : null,
  ].filter(Boolean);

  return (
    <details className="no-print group border-b border-border py-4" data-testid="property-summary">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden="true"
            className="inline-block text-xs text-muted-foreground transition-transform group-open:rotate-90"
          >
            ▶
          </span>
          Ringkasan properti
        </span>
        <span className="text-xs text-muted-foreground group-open:hidden">
          {preview.join(" · ")}
        </span>
        <span className="hidden text-xs font-medium text-brand group-open:inline">Tutup</span>
      </summary>

      <div className="mt-5 space-y-7">
        <Section title="Identitas & lokasi">
          <div className="grid gap-4 sm:grid-cols-3">
            {text("name", "Nama proyek", { className: "sm:col-span-2" })}
            {text("type", "Tipe rumah", { list: suggestions.type })}
            {text("address", "Alamat", { className: "sm:col-span-2" })}
            {text("province", "Provinsi", { list: provinceOptions.map(({ name }) => name) })}
          </div>
        </Section>

        <Section title="Ukuran & nilai">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Luas tanah"
              unit="m²"
              value={property.land}
              onChange={(value) => set("land", value)}
            />
            <NumberField
              label="Luas bangunan"
              unit="m²"
              value={property.building}
              onChange={(value) => set("building", value)}
            />
            <NumberField
              label="Nilai limit lelang"
              unit="Rp"
              value={property.limit}
              onChange={(value) => set("limit", value)}
            />
          </div>
        </Section>

        <Section title="Legalitas & verifikasi">
          <div className="grid gap-4 sm:grid-cols-3">
            {text("legal", "Legalitas", { list: suggestions.legal })}
            {text("occupancy", "Status hunian", { list: suggestions.occupancy })}
            {text("documents", "Status dokumen", { list: suggestions.documents })}
          </div>
        </Section>

        <Section title="Lelang & sumber data">
          <div className="grid gap-4 sm:grid-cols-4">
            {text("source", "Sumber lelang", { className: "sm:col-span-2" })}
            {text("auctionDate", "Tanggal lelang", { type: "date" })}
            {text("referenceDate", "Tanggal sumber data", { type: "date" })}
          </div>
        </Section>
      </div>
    </details>
  );
}
