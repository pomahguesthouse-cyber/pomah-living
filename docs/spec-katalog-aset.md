# Spesifikasi: Katalog aset yang dikelola admin

Status: rancangan · November 2026

## Tujuan

Admin Pomah Living dapat menambahkan, mengedit, mempublikasikan, dan mengarsipkan properti
(rumah lelang BTN/DJKN atau stok Pomah Living sendiri). Properti yang dipublikasikan tampil di
**Katalog aset** halaman `/pilih-aset` dan dapat dianalisis di `/analisis/:id` dengan alur yang
sama seperti aset contoh: pemeriksaan awal → asumsi perhitungan → batas tawar → KPR pembeli →
lanjut ke perencanaan proyek.

Aset contoh (Cibinong, Sawangan, Jatiasih) tetap ada sebagai tutorial dengan badge "Contoh".

## Ruang lingkup versi pertama

Termasuk:

- Tabel properti, penyimpanan foto, dan aturan akses (RLS).
- Panel admin: daftar, tambah, edit, unggah foto, publikasikan, arsipkan.
- Isi cepat dari URL lelang memakai parser yang sudah ada (`src/lib/import-auction.ts`,
  `src/lib/auction-text-parser.ts`).
- Katalog publik dan halaman analisis untuk properti dari database.

Belum termasuk: sinkron otomatis dengan situs lelang, analisis foto otomatis (AI), RAB per
properti dari foto (aset contoh Cibinong tetap memakai `src/lib/condition-rab.ts`).

## Data

### Tabel `pomah_listings`

| Kolom                | Tipe         | Keterangan                                                  |
| -------------------- | ------------ | ----------------------------------------------------------- |
| `id`                 | uuid PK      | default `gen_random_uuid()`                                 |
| `slug`               | text unique  | dipakai di URL `/analisis/:slug`, huruf kecil dan tanda `-` |
| `name`               | text         | contoh: "Rumah Cilodong"                                    |
| `address`            | text         | alamat atau lokasi umum                                     |
| `regency_code`       | text(4)      | kode kabupaten/kota, sama dengan `regionCode` aset contoh   |
| `source`             | text         | `btn`, `djkn`, `pomah`, `lainnya`                           |
| `source_url`         | text null    | tautan detail lelang                                        |
| `auction_limit`      | bigint       | nilai limit lelang (Rp)                                     |
| `auction_date`       | date null    |                                                             |
| `land_area`          | numeric null | m²                                                          |
| `building_area`      | numeric null | m²                                                          |
| `bedrooms`           | int null     |                                                             |
| `bathrooms`          | int null     |                                                             |
| `legal`              | text         | SHM, HGB, lainnya                                           |
| `occupancy_verified` | boolean      | default `false`                                             |
| `access_verified`    | boolean      | default `false`                                             |
| `documents_verified` | boolean      | default `false`                                             |
| `cover_photo_path`   | text null    | path di bucket `listing-photos`                             |
| `photo_paths`        | text[]       | default `{}`, maksimal 24                                   |
| `est_sale_price`     | bigint       | perkiraan harga jual setelah renovasi                       |
| `est_winning_price`  | bigint       | default sama dengan `auction_limit`                         |
| `est_purchase_costs` | bigint       | pajak, bea lelang, notaris                                  |
| `est_renovation`     | bigint       | RAB renovasi termasuk cadangan                              |
| `est_holding_sale`   | bigint       | biaya kepemilikan sementara dan biaya jual                  |
| `target_profit`      | bigint       |                                                             |
| `notes`              | text         | default `''`                                                |
| `status`             | text         | `draft`, `published`, `archived`; default `draft`           |
| `sort_order`         | int          | default `0`                                                 |
| `created_by`         | uuid         | `auth.uid()`                                                |
| `created_at`         | timestamptz  | default `now()`                                             |
| `updated_at`         | timestamptz  | diperbarui otomatis                                         |

Semua kolom rupiah `>= 0`. Kolom `est_*` dan `target_profit` memetakan langsung ke
`SimulationValues` di `src/lib/simulation.ts`, sehingga rumus `calculateSimulation` dan
`getDecision` tidak berubah.

### Penyimpanan foto

Bucket `listing-photos`: baca publik untuk properti `published`, tulis hanya admin. JPG, PNG,
WebP, maksimal 10 MB per file (sama dengan aturan foto demo).

### Aturan akses (RLS)

- `select`: publik bila `status = 'published'`; admin dapat melihat semua status.
- `insert`, `update`, `delete`: hanya admin, memakai pemeriksaan peran yang sama dengan
  `hero_slides` dan `pomah_flipping_demos` (tabel `admin_roles`).
- Setiap perubahan tercatat di `admin_audit_log` lewat trigger database, seperti tabel admin
  lainnya.

## Panel admin

Bagian baru **Katalog aset** di Admin Control Center (`src/routes/admin.tsx`):

1. Tabel properti: nama, lokasi, limit, status, tanggal diperbarui; filter status.
2. Tombol **Tambah properti** membuka form:
   - Tempel URL lelang → **Ambil data awal** (parser yang sudah ada) mengisi nama, alamat,
     limit, luas, legalitas. Admin memeriksa ulang.
   - Data aset, pemeriksaan awal (tiga sakelar), foto (unggah, pilih foto sampul), asumsi
     perhitungan (`est_*`, target laba).
   - Pratinjau langsung: batas tawar dan keputusan memakai `getDecision`.
3. **Simpan draf**, **Publikasikan**, **Arsipkan**. Properti yang dipublikasikan langsung
   tampil di katalog.

## Halaman publik

- `/pilih-aset`: katalog menampilkan properti `published` (urut `sort_order`, lalu terbaru),
  disusul aset contoh dengan badge "Contoh". Filter wilayah memakai `regency_code`.
- `/analisis/:id`: bila `id` cocok dengan aset contoh, pakai data bawaan; bila tidak, ambil
  properti berdasarkan `slug`. Loader route perlu menjadi asinkron dan menampilkan "Properti
  tidak ditemukan" bila slug tidak ada atau belum dipublikasikan.
- State simulasi di `simulation-store` perlu dikunci per `slug` (saat ini `PropertyId` hanya
  tiga nilai tetap).
- `/proyek/:id` untuk properti katalog: proyek baru diisi dari `est_*` seperti aset contoh.

## Kriteria selesai

- Admin dapat menambah properti dari URL lelang, mengunggah foto, dan mempublikasikannya
  tanpa menyentuh kode.
- Pengguna tanpa login melihat properti tersebut di katalog dan dapat menganalisisnya; angka di
  kartu sama dengan angka di halaman analisis.
- Pengguna bukan admin tidak dapat menulis ke tabel atau bucket (diuji lewat RLS).
- Properti `draft` dan `archived` tidak tampil di katalog publik.
- Unit test untuk pemetaan baris `pomah_listings` → `Property`, termasuk validasi angka.

## Pembagian kerja (hemat kredit Lovable)

Menurut `AGENTS.md`, perubahan skema database dikelola Lovable. Jadi:

1. **Lovable (satu permintaan):** migrasi tabel, RLS, trigger audit, bucket foto, dan
   regenerasi `src/integrations/supabase/types.ts`. Gunakan prompt di bawah.
2. **Di repo (tanpa kredit Lovable):** service `src/services/listing-service.ts`, panel admin,
   katalog publik, route analisis/proyek, dan test.

### Prompt untuk Lovable (database saja)

> Buat tabel Supabase `pomah_listings` sesuai kolom di `docs/spec-katalog-aset.md` bagian
> "Tabel pomah_listings", dengan constraint rupiah >= 0, `status` hanya `draft`, `published`,
> `archived`, dan `slug` unik. Aktifkan RLS: publik boleh `select` bila `status = 'published'`;
> admin (pemeriksaan yang sama dengan `hero_slides`) boleh select, insert, update, delete semua
> baris. Tambahkan trigger `updated_at` dan trigger audit ke `admin_audit_log` seperti tabel
> `hero_slides`. Buat bucket storage `listing-photos`: baca publik, tulis hanya admin, JPG/PNG/WebP
> maksimal 10 MB. Jangan ubah halaman atau komponen apa pun; hanya database, storage, dan
> regenerasi types.
