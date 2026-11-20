# Pomah Living Checklist Calculator

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ddbf805-5089-40a6-bb7c-583e14230f99).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Akun dan Proyek Saya

Gunakan proyek Supabase terpisah untuk mengaktifkan penyimpanan akun dan proyek.
Jalankan `database/pomah-projects.sql` sekali via SQL Editor di proyek tersebut.
Konfigurasikan dua variabel build berikut, lalu build/deploy ulang aplikasi.

- `VITE_SUPABASE_URL` berisi URL HTTPS proyek.
- `VITE_SUPABASE_PUBLISHABLE_KEY` berisi publishable key berawalan `sb_publishable_`.

Aktifkan login email di Supabase Auth dan atur URL situs serta URL redirect
`https://pomahliving.com/proyek-saya`. Siapkan pengiriman email konfirmasi untuk
pendaftaran produksi. Gunakan dua akun uji untuk memverifikasi pendaftaran,
login, penyimpanan beberapa proyek, dan isolasi data antar akun sebelum publikasi.
