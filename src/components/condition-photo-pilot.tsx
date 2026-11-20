import { Camera } from "lucide-react";

export function ConditionPhotoPilot() {
  return (
    <section className="border-t border-border py-7" aria-labelledby="photo-pilot-title">
      <h2 id="photo-pilot-title" className="flex items-center gap-2 text-base font-semibold">
        <Camera className="size-5 text-brand" aria-hidden="true" />
        Analisis kondisi dari foto
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Demo Rumah Cibinong dengan foto sintetis dan hasil analisis contoh.
      </p>
      <details className="mt-4 rounded-md border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand-deep">
          Lihat foto dan hasil analisis contoh
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <figure>
            <img
              src="/demo/cibinong-kondisi.webp"
              width={960}
              height={640}
              loading="lazy"
              className="w-full rounded-md"
              alt="Atas: foto ruangan dan detail noda di plafon. Bawah: foto ruangan dan detail cat dinding mengelupas."
            />
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Setiap baris berisi foto ruangan di kiri dan foto detail di kanan.
            </figcaption>
          </figure>
          <ul className="divide-y divide-border">
            <li className="py-3">
              <h3 className="text-sm font-semibold">Plafon · Foto baris atas</h3>
              <p className="mt-1 text-sm">
                Noda kecokelatan terlihat di sudut plafon dekat jendela.
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sumber kelembapan belum terlihat. Konfirmasi penyebab dan area yang terdampak saat
                survei.
              </p>
            </li>
            <li className="py-3">
              <h3 className="text-sm font-semibold">Dinding · Foto baris bawah</h3>
              <p className="mt-1 text-sm">
                Cat mengelupas dan bercak gelap terlihat di dinding dekat lantai.
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Periksa sumber kelembapan serta luas area yang terdampak saat survei.
              </p>
            </li>
          </ul>
          <p className="text-xs leading-5 text-muted-foreground">
            Konfirmasi kebutuhan pekerjaan dan ukur volumenya sebelum memasukkan biayanya ke
            simulasi renovasi.
          </p>
        </div>
      </details>
    </section>
  );
}
