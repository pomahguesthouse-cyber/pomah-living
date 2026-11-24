-- Jalankan sekali di SQL editor: kolom lebar muka dan panjang tanah untuk katalog aset.
-- Dipakai halaman analisis (pecah kavling) dan kartu katalog (potensi rumah, limit per m²).
-- Sebelum skrip ini dijalankan, katalog tetap bisa disimpan selama dua kolom ini dikosongkan.
alter table public.pomah_listings
  add column if not exists land_width numeric check (land_width >= 0),
  add column if not exists land_length numeric check (land_length >= 0);

-- Kolom est_* (asumsi perhitungan lama) tidak lagi dipakai aplikasi. Biarkan dulu; hapus
-- nanti setelah fitur katalog tanpa asumsi stabil:
-- alter table public.pomah_listings drop column est_sale_price, drop column est_winning_price,
--   drop column est_purchase_costs, drop column est_renovation, drop column est_holding_sale,
--   drop column target_profit;
