# Spesifikasi: pengaturan standar pecah kavling

Halaman analisis aset menawarkan flip lebih dari satu rumah bila tanah muat minimal dua kavling.
Standarnya (bawaan 60 m² dan lebar muka 6 m) diatur admin di **Admin → Pengaturan** dan disimpan
di tabel `app_settings`. Sampai tabel ini ada, aplikasi memakai standar bawaan di
`src/lib/land-settings.ts` dan tombol simpan di admin menampilkan pesan bahwa tabel belum dibuat.

## Tabel `app_settings`

| Kolom        | Tipe          | Keterangan                                       |
| ------------ | ------------- | ------------------------------------------------ |
| `key`        | `text`        | Primary key. Baris pertama: `land_split`.        |
| `value`      | `jsonb`       | Isi pengaturan, divalidasi aplikasi dengan zod.  |
| `updated_at` | `timestamptz` | Default `now()`, diperbarui trigger saat update. |
| `updated_by` | `uuid`        | Opsional, `auth.uid()` saat update.              |

Isi `value` untuk `land_split`:

```json
{
  "minLotArea": 60,
  "minFrontage": 6,
  "kdbPercent": 100,
  "maxFloors": 2,
  "buildCostPerM2": 4000000
}
```

## Akses

- Semua orang (termasuk tamu) boleh `select`, karena standar ini dipakai di halaman analisis publik.
- Hanya admin boleh `insert` dan `update` (pemeriksaan admin yang sama dengan `hero_slides`).
- Tidak ada `delete` dari aplikasi.
- Setiap insert/update dicatat ke `admin_audit_log` lewat trigger, seperti tabel admin lain.

## Cara membuat tabel

Jalankan `docs/app-settings-setup.sql` di SQL editor. Atau minta Lovable dengan prompt berikut.

## Prompt untuk Lovable (database saja)

> Buat tabel Supabase `app_settings` dengan kolom `key text primary key`, `value jsonb not null`,
> `updated_at timestamptz not null default now()`, dan `updated_by uuid`. Aktifkan RLS: semua
> orang (anon dan authenticated) boleh `select`; admin (pemeriksaan yang sama dengan
> `hero_slides`) boleh `insert` dan `update`; jangan izinkan `delete`. Tambahkan trigger
> `updated_at`/`updated_by` dan trigger audit ke `admin_audit_log` seperti tabel `hero_slides`.
> Isi satu baris awal: key `land_split`, value
> `{"minLotArea":60,"minFrontage":6,"kdbPercent":100,"maxFloors":2,"buildCostPerM2":4000000}`.
> Jangan ubah kode frontend; kodenya sudah ada di `src/services/settings-service.ts`.

Setelah tabel dibuat dan tipe Supabase diperbarui, klien tanpa tipe di
`src/services/settings-service.ts` dapat diganti dengan `supabase.from("app_settings")` biasa.
