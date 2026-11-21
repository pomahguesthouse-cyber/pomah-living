import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, subYears } from "date-fns";
import { ArrowLeft, Camera, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  maxPreferredRegions,
  provinceOptions,
  regencyOptions,
  regionName,
} from "@/lib/indonesia-regions";
import {
  accountDetailsKey,
  fetchAccountDetails,
  preferredRegionsKey,
  saveAccountDetails,
  type AccountDetails,
} from "@/services/account-details";

export const Route = createFileRoute("/_authenticated/akun/edit")({
  head: () => ({
    meta: [
      { title: "Edit akun — Pomah Living" },
      {
        name: "description",
        content: "Perbarui profil pribadi dan preferensi wilayah properti di Pomah Living.",
      },
      { property: "og:title", content: "Edit akun — Pomah Living" },
      {
        property: "og:description",
        content: "Perbarui profil dan preferensi wilayah properti Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditAccountPage,
});

function EditAccountPage() {
  const { session } = useSession();
  return (
    <main className="page-container max-w-3xl py-8 sm:py-12">
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/profil">
          <ArrowLeft aria-hidden="true" /> Akun Saya
        </Link>
      </Button>
      <h1 className="section-title">Edit akun</h1>
      {session && (
        <AccountDetailsLoader
          key={session.user.id}
          id={session.user.id}
          email={session.user.email ?? ""}
        />
      )}
    </main>
  );
}

function AccountDetailsLoader({ id, email }: { id: string; email: string }) {
  const query = useQuery({
    queryKey: accountDetailsKey(id),
    queryFn: () => fetchAccountDetails(id),
    gcTime: 0,
  });
  if (query.isPending)
    return (
      <p className="mt-6 text-sm" role="status">
        Memuat data akun…
      </p>
    );
  if (query.isError)
    return (
      <div className="mt-6 space-y-3">
        <p role="alert" className="text-sm">
          Data akun gagal dimuat.
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  return (
    <AccountDetailsForm
      id={id}
      email={email}
      initial={query.data.details}
      experienceAvailable={query.data.experienceAvailable}
    />
  );
}

function AccountDetailsForm({
  id,
  email,
  initial,
  experienceAvailable,
}: {
  id: string;
  email: string;
  initial: AccountDetails | null;
  experienceAvailable: boolean;
}) {
  const cache = useQueryClient();
  const [residenceProvince, setResidenceProvince] = useState(initial?.residence_province ?? "");
  const [residenceRegency, setResidenceRegency] = useState(initial?.residence_regency ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const maxBirthDate = format(subYears(new Date(), 18), "yyyy-MM-dd");
  const [regions, setRegions] = useState(initial?.preferred_regions ?? []);
  const [province, setProvince] = useState("");
  const [regency, setRegency] = useState("");
  const selectedRegion = regency || province;
  const canAdd =
    Boolean(selectedRegion) &&
    !regions.includes(selectedRegion) &&
    regions.length < maxPreferredRegions;
  const mutation = useMutation({
    mutationFn: (values: AccountDetails) => saveAccountDetails(id, values),
    onSuccess: (values) => {
      cache.setQueryData(accountDetailsKey(id), { details: values, experienceAvailable });
      cache.setQueryData(preferredRegionsKey(id), values.preferred_regions);
      void cache.invalidateQueries({ queryKey: preferredRegionsKey(id), exact: true });
    },
  });

  function addRegion() {
    if (!canAdd) return;
    setRegions([...regions, selectedRegion]);
    setProvince("");
    setRegency("");
    mutation.reset();
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAvatarError("Gunakan JPG, PNG, atau WebP maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
    setAvatarError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || savingAvatar) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    const full_name = value("full_name");
    if (!full_name) return;
    if (!birthDate || birthDate > maxBirthDate || !/^\\d{4}-\\d{2}-\\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
      setAvatarError("Tanggal lahir harus valid dan usia minimal 18 tahun.");
      return;
    }
    if (!residenceProvince || !residenceRegency || !regencyOptions(residenceProvince).some((item) => item.code === residenceRegency)) {
      setAvatarError("Provinsi dan kabupaten/kota domisili wajib dipilih.");
      return;
    }
    setAvatarError("");
    let savedAvatar = avatarUrl || null;
    if (avatarFile) {
      setSavingAvatar(true);
      const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
      const storagePath = `${id}/profile-${Date.now()}.${ext}`;
      const upload = await supabase.storage.from("avatars").upload(storagePath, avatarFile, { contentType: avatarFile.type, upsert: false });
      setSavingAvatar(false);
      if (upload.error) {
        setAvatarError("Foto gagal diunggah. Periksa konfigurasi storage avatars.");
        return;
      }
      savedAvatar = supabase.storage.from("avatars").getPublicUrl(storagePath).data.publicUrl;
    }
    const experience = value("property_experience");
    const savedRegions = canAdd ? [...regions, selectedRegion] : regions;
    mutation.mutate(
      {
        full_name,
        birth_date: birthDate,
        occupation: value("occupation"),
        ...(experienceAvailable && {
          has_property_experience: experience === null ? null : experience === "yes",
        }),
        display_name: value("display_name"),
        avatar_url: savedAvatar,
        contact_phone: value("contact_phone"),
        address: value("address"),
        residence_province: residenceProvince,
        residence_regency: residenceRegency,
        preferred_regions: savedRegions,
      },
      {
        onSuccess: () => {
          setAvatarUrl(savedAvatar ?? "");
          setAvatarFile(null);
          setAvatarPreview(null);
          setRegions(savedRegions);
          setProvince("");
          setRegency("");
        },
      },
    );
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50";

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={submit}
      onChange={() => {
        if (!mutation.isPending) mutation.reset();
      }}
    >
      <fieldset
        disabled={mutation.isPending}
        className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"
      >
        <legend className="px-2 text-base font-semibold">Data pribadi</legend>
        <label className="space-y-1 text-sm">
          <span>Nama lengkap</span>
          <Input
            name="full_name"
            defaultValue={initial?.full_name ?? ""}
            autoComplete="name"
            required
            maxLength={120}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Nama tampilan</span>
          <Input
            name="display_name"
            defaultValue={initial?.display_name ?? ""}
            autoComplete="nickname"
            maxLength={120}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Tanggal lahir (minimal 18 tahun)</span>
          <Input
            name="birth_date"
            type="date"
            autoComplete="bday"
            max={maxBirthDate}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Pekerjaan (opsional)</span>
          <Input name="occupation" defaultValue={initial?.occupation ?? ""} maxLength={120} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Nomor telepon</span>
          <Input
            name="contact_phone"
            defaultValue={initial?.contact_phone ?? ""}
            type="tel"
            autoComplete="tel"
            maxLength={32}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Email masuk</span>
          <Input type="email" value={email} readOnly />
        </label>
        <div className="space-y-2 text-sm sm:col-span-2">
          <span className="block">Foto profil</span>
          <div className="flex items-center gap-3">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-semibold">
              {avatarPreview || avatarUrl ? <img src={avatarPreview || avatarUrl} alt="Foto profil" className="size-full object-cover" /> : (initial?.display_name || initial?.full_name || email).slice(0, 2).toUpperCase()}
            </div>
            <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" capture={undefined} className="hidden" onChange={selectAvatar} aria-label="Pilih foto profil" />
            <Button type="button" variant="outline" onClick={() => avatarInput.current?.click()}><Camera className="mr-2 size-4" /> Ubah foto</Button>
            {(avatarUrl || avatarPreview) && <Button type="button" variant="ghost" onClick={() => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); setAvatarPreview(null); setAvatarFile(null); setAvatarUrl(""); }}>Hapus foto</Button>}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, atau WebP, maksimal 5 MB. Pilih dari perangkat atau kamera.</p>
        </div>
        <fieldset disabled={!experienceAvailable} className="space-y-2 sm:col-span-2">
          <legend className="text-sm">Pengalaman di bidang properti (opsional)</legend>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="property_experience"
                value="yes"
                defaultChecked={initial?.has_property_experience === true}
              />
              Ada
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="property_experience"
                value="no"
                defaultChecked={initial?.has_property_experience === false}
              />
              Tidak ada
            </label>
          </div>
          {!experienceAvailable && (
            <p className="text-xs text-muted-foreground">
              Pilihan pengalaman properti sedang disiapkan.
            </p>
          )}
        </fieldset>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Alamat</span>
          <Textarea
            name="address"
            defaultValue={initial?.address ?? ""}
            autoComplete="street-address"
            maxLength={500}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Provinsi domisili</span>
          <select
            name="residence_province"
            className={selectClass}
            autoComplete="address-level1"
            value={residenceProvince}
            required
            onChange={(event) => { setResidenceProvince(event.target.value); setResidenceRegency(""); }}
          >
            <option value="">Pilih provinsi domisili</option>
            {provinceOptions.map(({ code, name }) => (
              <option value={code} key={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Kabupaten/kota domisili</span>
          <select name="residence_regency" className={selectClass} autoComplete="address-level2" value={residenceRegency} required disabled={!residenceProvince} onChange={(event) => setResidenceRegency(event.target.value)}>
            <option value="">Pilih kabupaten/kota</option>
            {regencyOptions(residenceProvince).map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </fieldset>
      <fieldset
        disabled={mutation.isPending}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <legend className="px-2 text-base font-semibold">Wilayah properti yang diminati</legend>
        <p className="text-sm text-muted-foreground">
          Pilihan ini otomatis memfilter daftar Pilih aset saat kamu masuk.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="preferred-province">Provinsi</Label>
            <select
              id="preferred-province"
              className={selectClass}
              value={province}
              onChange={(event) => {
                setProvince(event.target.value);
                setRegency("");
              }}
            >
              <option value="">Pilih provinsi</option>
              {provinceOptions.map(({ code, name }) => (
                <option value={code} key={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="preferred-regency">Kabupaten atau kota</Label>
            <select
              id="preferred-regency"
              className={selectClass}
              value={regency}
              disabled={!province}
              onChange={(event) => setRegency(event.target.value)}
            >
              <option value="">Seluruh provinsi</option>
              {regencyOptions(province).map(({ code, name }) => (
                <option value={code} key={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={addRegion}>
          Tambah wilayah
        </Button>
        <ul className="flex flex-wrap gap-2" aria-label="Wilayah terpilih">
          {regions.map((code) => (
            <li
              key={code}
              className="flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-sm text-brand-deep"
            >
              <MapPin className="size-3.5" aria-hidden="true" />
              {regionName(code) ?? code}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Hapus ${regionName(code) ?? code}`}
                onClick={() => {
                  setRegions(regions.filter((item) => item !== code));
                  mutation.reset();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        {regions.length === maxPreferredRegions && (
          <p className="text-xs">Maksimal {maxPreferredRegions} wilayah.</p>
        )}
      </fieldset>
      {avatarError && <p role="alert" className="text-sm text-destructive">{avatarError}</p>}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          Data akun gagal disimpan. Coba lagi.
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm">
          Data akun dan preferensi tersimpan.
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending || savingAvatar || !birthDate || birthDate > maxBirthDate || !residenceProvince || !residenceRegency}>
        {mutation.isPending || savingAvatar ? "Menyimpan…" : "Simpan akun"}
      </Button>
    </form>
  );
}
