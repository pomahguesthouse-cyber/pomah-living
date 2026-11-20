import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
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
    meta: [{ title: "Edit akun — Pomah Living" }, { name: "robots", content: "noindex" }],
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
  return <AccountDetailsForm id={id} email={email} initial={query.data} />;
}

function AccountDetailsForm({
  id,
  email,
  initial,
}: {
  id: string;
  email: string;
  initial: AccountDetails | null;
}) {
  const cache = useQueryClient();
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
      cache.setQueryData(accountDetailsKey(id), values);
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    const full_name = value("full_name");
    if (!full_name) return;
    const age = value("age");
    const savedRegions = canAdd ? [...regions, selectedRegion] : regions;
    mutation.mutate(
      {
        full_name,
        age: age === null ? null : Number(age),
        display_name: value("display_name"),
        avatar_url: value("avatar_url"),
        contact_phone: value("contact_phone"),
        address: value("address"),
        preferred_regions: savedRegions,
      },
      {
        onSuccess: () => {
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
          <span>Umur (tahun, opsional)</span>
          <Input
            name="age"
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            max={130}
            defaultValue={initial?.age ?? ""}
          />
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
        <label className="space-y-1 text-sm">
          <span>Tautan foto akun</span>
          <Input name="avatar_url" type="url" defaultValue={initial?.avatar_url ?? ""} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Alamat</span>
          <Textarea
            name="address"
            defaultValue={initial?.address ?? ""}
            autoComplete="street-address"
            maxLength={500}
          />
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
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Menyimpan…" : "Simpan akun"}
      </Button>
    </form>
  );
}
