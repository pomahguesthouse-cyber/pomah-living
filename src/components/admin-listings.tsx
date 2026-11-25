import { useState } from "react";
import { DateInput } from "@/components/date-input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  Eye,
  ImagePlus,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Star,
  Trash2,
  Undo2,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import { importAuctionPhotos, importAuctionUrl } from "@/lib/import-auction";
import { provinceOptions, regencyOptions, regionName } from "@/lib/indonesia-regions";
import {
  emptyListingForm,
  isListingPhotoFile,
  listingFormSchema,
  listingSourceLabels,
  listingSources,
  listingStatusLabels,
  listingToForm,
  inspectionLabel,
  listingVerification,
  maxListingPhotos,
  slugify,
  type ListingFormInput,
  type ListingRow,
  type ListingStatus,
} from "@/lib/listings";
import { catalogSummary } from "@/lib/catalog-summary";
import { defaultLandSettings } from "@/lib/land-settings";
import { formatRupiah } from "@/lib/simulation";
import { fetchLandSettings, landSettingsQueryKey } from "@/services/settings-service";
import { formatArea } from "@/lib/area-format";
import { formatTanggal } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { adminError } from "@/services/admin-service";
import {
  adminListingsKey,
  deleteListing,
  fetchAdminListings,
  fetchListingPhotoUrls,
  listingKey,
  publishedListingsKey,
  removeListingPhotos,
  saveListing,
  saveListingPhotos,
  setListingStatus,
  uploadListingPhoto,
} from "@/services/listing-service";

type Editing = {
  row: ListingRow | null;
  form: ListingFormInput;
  cover: string | null;
  paths: string[];
};

const statusTone: Record<string, string> = {
  draft: "bg-warning-soft text-warning",
  published: "bg-success-soft text-success",
  archived: "bg-muted text-muted-foreground",
};

export function AdminListings({ userId }: { userId: string }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: adminListingsKey(userId), queryFn: fetchAdminListings });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<ListingStatus | "all">("all");

  async function refresh(slug?: string) {
    await Promise.all([
      client.invalidateQueries({ queryKey: adminListingsKey(userId) }),
      client.invalidateQueries({ queryKey: publishedListingsKey }),
      ...(slug ? [client.invalidateQueries({ queryKey: listingKey(slug) })] : []),
    ]);
  }
  async function run(task: () => Promise<void>, success: string) {
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await task();
      setMessage(success);
    } catch (error) {
      setFailure(adminError(error));
    } finally {
      setBusy(false);
    }
  }
  function changeStatus(row: ListingRow, status: ListingStatus, success: string) {
    void run(async () => {
      await setListingStatus(row.id, status);
      await refresh(row.slug);
    }, success);
  }
  function remove(row: ListingRow) {
    if (
      !window.confirm(`Hapus "${row.name}" beserta fotonya? Tindakan ini tidak dapat dibatalkan.`)
    )
      return;
    void run(async () => {
      await deleteListing(row);
      await refresh(row.slug);
    }, "Properti dihapus dan perubahan tercatat.");
  }

  if (editing)
    return (
      <ListingEditor
        editing={editing}
        busy={busy}
        failure={failure}
        onCancel={() => {
          setEditing(null);
          setFailure("");
        }}
        onPhotosSaved={() => void refresh(editing.row?.slug)}
        onSave={(next, publish) =>
          void run(
            async () => {
              const row = await saveListing(
                next.form,
                { cover: next.cover, paths: next.paths },
                next.row?.id,
              );
              if (publish && row.status !== "published")
                await setListingStatus(row.id, "published");
              const removed = (next.row?.photo_paths ?? []).filter(
                (path) => !next.paths.includes(path),
              );
              await removeListingPhotos(removed);
              await refresh(row.slug);
              setEditing(null);
            },
            publish ? "Properti dipublikasikan ke katalog." : "Properti tersimpan.",
          )
        }
      />
    );

  const rows = (query.data ?? []).filter((row) => filter === "all" || row.status === filter);
  return (
    <section className="mt-8 space-y-5" aria-label="Katalog aset">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Katalog aset</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Properti yang dipublikasikan tampil di halaman Pilih aset dan bisa dianalisis tanpa
            login.
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => {
            setMessage("");
            setFailure("");
            setEditing({ row: null, form: emptyListingForm(), cover: null, paths: [] });
          }}
        >
          <Plus /> Tambah properti
        </Button>
      </div>
      {message && (
        <p role="status" className="rounded-md bg-success-soft p-3 text-sm text-success">
          {message}
        </p>
      )}
      {failure && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-destructive">
          {failure}
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status">
        {(["all", "published", "draft", "archived"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "brand" : "outline"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "Semua" : listingStatusLabels[value]}
            {query.data && (
              <span className="ml-1 tabular-nums opacity-70">
                {value === "all"
                  ? query.data.length
                  : query.data.filter((row) => row.status === value).length}
              </span>
            )}
          </Button>
        ))}
      </div>
      {query.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat katalog…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="rounded-md bg-danger-soft p-4 text-sm text-destructive">
          <p>{adminError(query.error)}</p>
          <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw /> Muat ulang
          </Button>
        </div>
      )}
      {query.isSuccess && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {filter === "all"
            ? "Belum ada properti. Tambahkan properti pertama untuk mengisi katalog."
            : "Tidak ada properti dengan status ini."}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((row) => {
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{row.name}</h3>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[11px] font-medium",
                        statusTone[row.status] ?? statusTone["draft"],
                      )}
                    >
                      {listingStatusLabels[row.status as ListingStatus] ?? row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {regionName(row.regency_code) ?? row.regency_code} · limit{" "}
                    {formatRupiah(row.auction_limit)}
                    {` · tanah ${formatArea(row.land_area, "–")}`}
                    {` · bangunan ${formatArea(row.building_area, "–")}`} ·{" "}
                    {inspectionLabel(listingVerification(row))}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    /analisis/{row.slug} · diperbarui {formatTanggal(new Date(row.updated_at))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/analisis/$assetId" params={{ assetId: row.slug }}>
                      <Eye /> Pratinjau
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setMessage("");
                      setFailure("");
                      setEditing({
                        row,
                        form: listingToForm(row),
                        cover: row.cover_photo_path,
                        paths: row.photo_paths,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {row.status === "published" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        changeStatus(row, "draft", "Properti ditarik dari katalog menjadi draf.")
                      }
                    >
                      <Undo2 /> Tarik
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="brand"
                      disabled={busy}
                      onClick={() =>
                        changeStatus(row, "published", "Properti dipublikasikan ke katalog.")
                      }
                    >
                      <Send /> Publikasikan
                    </Button>
                  )}
                  {row.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => changeStatus(row, "archived", "Properti diarsipkan.")}
                    >
                      <Archive /> Arsipkan
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    aria-label={`Hapus ${row.name}`}
                    onClick={() => remove(row)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>
      )}
      {error && (
        <span role="alert" className="mt-1 block text-[11px] text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ListingEditor({
  editing,
  busy,
  failure,
  onCancel,
  onSave,
  onPhotosSaved,
}: {
  editing: Editing;
  busy: boolean;
  failure: string;
  onCancel: () => void;
  onSave: (next: Editing, publish: boolean) => void;
  /** Dipanggil setelah foto properti yang sudah ada tersimpan langsung. */
  onPhotosSaved?: () => void;
}) {
  const [form, setForm] = useState(editing.form);
  const [cover, setCover] = useState(editing.cover);
  const [paths, setPaths] = useState(editing.paths);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [province, setProvince] = useState(form.regency_code.slice(0, 2));
  const [slugTouched, setSlugTouched] = useState(Boolean(editing.row));
  const [auctionUrl, setAuctionUrl] = useState(form.source_url ?? "");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  /** Foto objek di situs lelang dari hasil impor tautan; belum diunduh sampai admin memilih. */
  const [sourcePhotos, setSourcePhotos] = useState<string[]>([]);
  const [fetchingSource, setFetchingSource] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const photoUrls = useQuery({
    queryKey: ["listing-photo-urls", [...paths].sort()],
    queryFn: () => fetchListingPhotoUrls(paths),
    enabled: paths.length > 0,
    staleTime: 600_000,
    retry: false,
  });

  const parsed = listingFormSchema.safeParse(form);
  const errors: Record<string, string> = {};
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      errors[key] ??= issue.message;
    }
  const showError = (key: string) => (submitted ? errors[key] : undefined);

  const landSettings = useQuery({ queryKey: landSettingsQueryKey, queryFn: fetchLandSettings });
  const summary = catalogSummary(
    {
      auctionLimit: Number(form.auction_limit) || 0,
      landArea: form.land_area ?? null,
      landWidth: form.land_width ?? null,
      landLength: form.land_length ?? null,
    },
    landSettings.data?.settings ?? defaultLandSettings,
  );

  function set<K extends keyof ListingFormInput>(key: K, value: ListingFormInput[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  }

  async function importFromUrl() {
    setImporting(true);
    setImportNote("");
    try {
      const data = await importAuctionUrl({ data: { url: auctionUrl.trim() } });
      setForm((current) => {
        const limit = data.limit ?? current.auction_limit;
        const name = data.title || current.name;
        return {
          ...current,
          source_url: data.sourceUrl,
          source: data.sourceUrl.includes("btn.co.id") ? "btn" : "djkn",
          name,
          slug: slugTouched ? current.slug : slugify(name),
          address: data.address || current.address,
          auction_limit: limit,
          land_area: data.landArea ?? current.land_area,
          auction_date: data.auctionDate ?? current.auction_date,
          legal: data.legal || current.legal,
          building_area: data.buildingArea ?? current.building_area,
          notes: current.notes || data.description,
        };
      });
      setSourcePhotos(data.photoUrls ?? []);
      setImportNote(data.warning ?? "Data awal terisi. Periksa kembali sebelum menyimpan.");
    } catch (error) {
      setImportNote(
        error instanceof Error
          ? error.message
          : "Tautan belum bisa dibaca. Isi data secara manual.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function addPhotos(files: FileList | File[] | null) {
    if (!files?.length) return;
    setPhotoError("");
    setPhotoNote("");
    const list = Array.from(files);
    if (paths.length + list.length > maxListingPhotos) {
      setPhotoError(`Maksimal ${maxListingPhotos} foto per properti.`);
      return;
    }
    if (list.some((file) => !isListingPhotoFile(file))) {
      setPhotoError("Gunakan JPG, PNG, atau WebP maksimal 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of list) added.push(await uploadListingPhoto(file));
      const nextPaths = [...paths, ...added];
      const nextCover = cover ?? added[0] ?? null;
      setPaths(nextPaths);
      setCover(nextCover);
      const id = editing.row?.id;
      if (id) {
        // Properti yang sudah ada: foto langsung tersimpan, tidak menunggu tombol Simpan.
        await saveListingPhotos(id, { cover: nextCover, paths: nextPaths });
        onPhotosSaved?.();
        setPhotoNote(
          `${added.length} foto tersimpan${editing.row?.status === "published" ? " dan tampil di katalog" : ""}.`,
        );
      } else {
        setUploaded((current) => [...current, ...added]);
        setPhotoNote("Foto akan tersimpan saat formulir disimpan.");
      }
    } catch (error) {
      setPhotoError(adminError(error));
    } finally {
      setUploading(false);
    }
  }
  async function takeSourcePhotos() {
    const room = maxListingPhotos - paths.length;
    if (room <= 0) {
      setPhotoError(`Maksimal ${maxListingPhotos} foto per properti.`);
      return;
    }
    setFetchingSource(true);
    setPhotoError("");
    try {
      const photos = await importAuctionPhotos({
        data: { urls: sourcePhotos.slice(0, Math.min(8, room)) },
      });
      const files = photos.map(({ name, type, base64 }) => {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        return new File([bytes], name, { type });
      });
      await addPhotos(files);
      setSourcePhotos([]);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : adminError(error));
    } finally {
      setFetchingSource(false);
    }
  }
  function removePhoto(path: string) {
    setPaths((current) => current.filter((item) => item !== path));
    setCover((current) =>
      current === path ? (paths.find((item) => item !== path) ?? null) : current,
    );
    if (uploaded.includes(path)) {
      setUploaded((current) => current.filter((item) => item !== path));
      void removeListingPhotos([path]);
    }
  }
  function cancel() {
    if (uploaded.length) void removeListingPhotos(uploaded);
    onCancel();
  }
  function save(publish: boolean) {
    setSubmitted(true);
    if (!parsed.success) return;
    onSave({ row: editing.row, form, cover, paths }, publish);
  }

  const money = (key: keyof ListingFormInput, label: string, hint?: string) => (
    <Field label={label} error={showError(key)} {...(hint ? { hint } : {})}>
      <FormattedNumberInput
        value={Number(form[key]) || 0}
        onValueChange={(value) => set(key, Math.round(value) as never)}
        aria-invalid={Boolean(showError(key))}
      />
    </Field>
  );
  const optionalNumber = (
    key: "land_area" | "land_width" | "land_length" | "building_area" | "bedrooms" | "bathrooms",
    label: string,
  ) => (
    <Field label={label} error={showError(key)}>
      <Input
        type="number"
        min={0}
        step={key === "land_area" || key === "building_area" ? "any" : 1}
        value={form[key] ?? ""}
        onChange={(event) =>
          set(key, event.target.value === "" ? null : Number(event.target.value))
        }
      />
    </Field>
  );

  return (
    <section className="mt-8 space-y-6" aria-label="Form properti">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={cancel}>
            <ArrowLeft /> Kembali ke katalog
          </Button>
          <h2 className="mt-2 text-xl font-semibold">
            {editing.row ? `Edit ${editing.row.name}` : "Tambah properti"}
          </h2>
        </div>
        {editing.row && (
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              statusTone[editing.row.status] ?? statusTone["draft"],
            )}
          >
            {listingStatusLabels[editing.row.status as ListingStatus] ?? editing.row.status}
          </span>
        )}
      </div>
      {failure && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-destructive">
          {failure}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <fieldset className="rounded-xl border border-border bg-card p-5">
            <legend className="px-1 text-sm font-semibold">Isi cepat dari tautan lelang</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                placeholder="https://lelang.go.id/… atau https://balelelang.btn.co.id/…"
                value={auctionUrl}
                onChange={(event) => setAuctionUrl(event.target.value)}
                aria-label="Tautan lelang"
              />
              <Button
                type="button"
                variant="outline"
                disabled={importing || !auctionUrl.trim()}
                onClick={() => void importFromUrl()}
              >
                <Link2 /> {importing ? "Membaca…" : "Ambil data awal"}
              </Button>
            </div>
            {importNote && (
              <p role="status" className="mt-2 text-xs text-muted-foreground">
                {importNote}
              </p>
            )}
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Data aset</legend>
            <div className="sm:col-span-2">
              <Field label="Nama properti" error={showError("name")}>
                <Input value={form.name} onChange={(event) => set("name", event.target.value)} />
              </Field>
            </div>
            <Field
              label="Slug (alamat halaman)"
              error={showError("slug")}
              hint={`/analisis/${form.slug || "…"}`}
            >
              <Input
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", slugify(event.target.value));
                }}
              />
            </Field>
            <Field label="Sumber" error={showError("source")}>
              <select
                className={selectClass}
                value={form.source}
                onChange={(event) =>
                  set("source", event.target.value as ListingFormInput["source"])
                }
              >
                {listingSources.map((source) => (
                  <option key={source} value={source}>
                    {listingSourceLabels[source]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Alamat / lokasi" error={showError("address")}>
                <Input
                  value={form.address}
                  onChange={(event) => set("address", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Provinsi">
              <select
                className={selectClass}
                value={province}
                onChange={(event) => {
                  setProvince(event.target.value);
                  set("regency_code", "");
                }}
              >
                <option value="">Pilih provinsi</option>
                {provinceOptions.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kabupaten / kota" error={showError("regency_code")}>
              <select
                className={selectClass}
                value={form.regency_code}
                disabled={!province}
                onChange={(event) => set("regency_code", event.target.value)}
              >
                <option value="">Pilih kabupaten/kota</option>
                {regencyOptions(province).map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            {money("auction_limit", "Nilai limit lelang")}
            <Field label="Tanggal lelang" error={showError("auction_date")}>
              <DateInput
                value={form.auction_date ?? ""}
                onChange={(value) => set("auction_date", value)}
              />
            </Field>
            {optionalNumber("land_area", "Luas tanah (m²)")}
            {optionalNumber("land_width", "Lebar muka tanah (m, menghadap jalan)")}
            {optionalNumber("land_length", "Panjang tanah (m)")}
            {optionalNumber("building_area", "Luas bangunan (m²)")}
            {!(Number(form.building_area) > 0) && (
              <p className="flex gap-2 rounded-md bg-warning-soft p-2 text-[11px] leading-5 text-warning sm:col-span-2">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Luas bangunan belum diisi: perkiraan cepat renovasi dan penyesuaian pembanding per
                m² bangunan tidak bisa dihitung. Data impor lelang.go.id tidak membawa luas
                bangunan; isi dari pengumuman lelang atau survei.
              </p>
            )}
            {optionalNumber("bedrooms", "Kamar tidur")}
            {optionalNumber("bathrooms", "Kamar mandi")}
            <Field label="Legalitas" error={showError("legal")}>
              <Input value={form.legal} onChange={(event) => set("legal", event.target.value)} />
            </Field>
            <Field
              label="Urutan tampil"
              error={showError("sort_order")}
              hint="Angka kecil tampil lebih dulu"
            >
              <Input
                type="number"
                value={form.sort_order}
                onChange={(event) => set("sort_order", Number(event.target.value) || 0)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tautan sumber" error={showError("source_url")}>
                <Input
                  type="url"
                  value={form.source_url ?? ""}
                  onChange={(event) => set("source_url", event.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Catatan untuk calon flipper" error={showError("notes")}>
                <Textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-border bg-card p-5">
            <legend className="px-1 text-sm font-semibold">Pemeriksaan awal</legend>
            <div className="divide-y divide-border">
              {(
                [
                  ["occupancy_verified", "Status penghunian terverifikasi"],
                  ["access_verified", "Akses fisik terverifikasi"],
                  ["documents_verified", "Dokumen terverifikasi"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 py-3 text-sm">
                  {label}
                  <Switch checked={form[key]} onCheckedChange={(checked) => set(key, checked)} />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-border bg-card p-5">
            <legend className="px-1 text-sm font-semibold">
              Foto ({paths.length}/{maxListingPhotos})
            </legend>
            <p className="text-xs text-muted-foreground">
              Foto tersimpan saat formulir disimpan. Tandai bintang untuk foto sampul katalog.
            </p>
            {sourcePhotos.length > 0 && (
              <div className="mt-3 rounded-md border border-brand/40 bg-brand-soft/40 p-3">
                <p className="text-xs font-medium">
                  {sourcePhotos.length} foto objek tersedia di situs lelang
                </p>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {sourcePhotos.slice(0, 8).map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Foto objek dari situs lelang"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-16 w-24 shrink-0 rounded object-cover"
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="brand"
                  className="mt-3"
                  disabled={fetchingSource || uploading}
                  onClick={() => void takeSourcePhotos()}
                >
                  {fetchingSource
                    ? "Mengambil foto…"
                    : `Ambil ${Math.min(sourcePhotos.length, 8)} foto ke katalog`}
                </Button>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  Foto diunduh dari lelang.go.id dan disimpan di katalog. Tautan sumber tetap
                  ditampilkan di halaman analisis.
                </p>
              </div>
            )}
            {paths.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {paths.map((path) => (
                  <li
                    key={path}
                    className="relative overflow-hidden rounded-md border border-border"
                  >
                    {photoUrls.data?.[path] ? (
                      <img
                        src={photoUrls.data[path]}
                        alt="Foto properti"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-muted" />
                    )}
                    <div className="absolute inset-x-1 top-1 flex justify-between">
                      <Button
                        type="button"
                        size="icon"
                        variant={cover === path ? "brand" : "outline"}
                        className="size-7"
                        aria-label={cover === path ? "Foto sampul" : "Jadikan foto sampul"}
                        aria-pressed={cover === path}
                        onClick={() => setCover(path)}
                      >
                        <Star className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-7 text-destructive"
                        aria-label="Hapus foto"
                        onClick={() => removePhoto(path)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-brand-deep hover:border-brand">
              <ImagePlus className="size-4" />
              {uploading ? "Mengunggah…" : "Tambah foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={uploading || paths.length >= maxListingPhotos}
                onChange={(event) => {
                  void addPhotos(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            {photoNote && !photoError && (
              <p role="status" className="mt-2 text-xs text-success">
                {photoNote}
              </p>
            )}
            {photoError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {photoError}
              </p>
            )}
          </fieldset>
        </div>

        <aside className="space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28">
          <h3 className="font-semibold">Ringkasan aset</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Nilai limit</dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(summary.auctionLimit)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Limit per m² tanah</dt>
              <dd className="tabular-nums">
                {summary.limitPerM2 === null ? "–" : formatRupiah(summary.limitPerM2)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Luas tanah</dt>
              <dd className="tabular-nums">{formatArea(summary.landArea, "–")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Luas bangunan</dt>
              <dd className="tabular-nums">
                {formatArea(Number(form.building_area) || null, "–")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Potensi kavling</dt>
              <dd className="tabular-nums">
                {summary.potentialUnits >= 2 ? `${summary.potentialUnits} rumah` : "1 rumah"}
              </dd>
            </div>
          </dl>
          <p className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
            Katalog hanya berisi fakta aset. Harga jual, RAB, dan batas tawar dihitung sendiri oleh
            flipper di halaman analisis.
          </p>
          {submitted && !parsed.success && (
            <p role="alert" className="text-xs text-destructive">
              Periksa kembali kolom yang ditandai merah.
            </p>
          )}
          <div className="space-y-2">
            <Button
              type="button"
              className="h-11 w-full"
              variant="outline"
              disabled={busy || uploading}
              onClick={() => save(false)}
            >
              <Save /> Simpan {editing.row?.status === "published" ? "perubahan" : "draf"}
            </Button>
            {editing.row?.status !== "published" && (
              <Button
                type="button"
                className="h-11 w-full"
                variant="brand"
                disabled={busy || uploading}
                onClick={() => save(true)}
              >
                <Send /> Simpan dan publikasikan
              </Button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
