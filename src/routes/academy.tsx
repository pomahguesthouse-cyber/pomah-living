import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, LockKeyhole, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "POMAH Academy — Belajar Flipping" },
      {
        name: "description",
        content: "Belajar flipping rumah melalui misi dan simulasi interaktif POMAH Academy.",
      },
      { property: "og:title", content: "POMAH Academy — Belajar Flipping" },
      {
        property: "og:description",
        content: "Belajar flipping rumah melalui misi dan simulasi interaktif POMAH Academy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Academy,
});

const missions = [
  {
    question: "Apa tujuan utama flipping rumah?",
    options: [
      "Membeli, memperbaiki, lalu menjual kembali dengan perhitungan matang",
      "Membeli rumah tanpa pemeriksaan",
      "Menjual rumah tanpa menghitung biaya",
    ],
    correct: 0,
    explanation:
      "Flipping membutuhkan perhitungan harga beli, renovasi, biaya transaksi, waktu, dan risiko.",
  },
  {
    question: "Sebelum memilih rumah untuk flipping, apa yang paling penting?",
    options: [
      "Warna cat rumah",
      "Legalitas, kondisi bangunan, dan pembanding harga pasar",
      "Jumlah pengikut penjual",
    ],
    correct: 1,
    explanation:
      "Dokumen, kondisi fisik, dan harga pembanding membantu menilai risiko dan kelayakan aset.",
  },
  {
    question:
      "Harga jual perkiraan Rp500 juta, harga beli Rp350 juta, renovasi Rp80 juta, biaya lain Rp30 juta. Berapa perkiraan laba?",
    options: ["Rp150 juta", "Rp70 juta", "Rp40 juta"],
    correct: 2,
    explanation:
      "Rp500 juta − Rp350 juta − Rp80 juta − Rp30 juta = Rp40 juta, sebelum biaya tambahan yang belum dimasukkan.",
  },
];
const levels = ["Pemula", "Praktik Dasar", "Menengah", "Simulasi Lengkap"];

function Academy() {
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) {
      setCompleted(false);
      setLoadedFor(null);
      return;
    }
    let cancelled = false;
    setLoadedFor(null);
    void supabase
      .from("academy_progress" as never)
      .select("mission_index,xp,completed")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error)
          setSaveError("Progres belum dapat dimuat. Pastikan tabel Academy sudah disiapkan.");
        else {
          const progress = data as { mission_index: number; completed: boolean } | null;
          setCompleted(Boolean(progress?.completed));
          setStep(Math.min(2, Math.max(0, progress?.mission_index ?? 0)));
          setSaveError(null);
        }
        setSelected(null);
        setLoadedFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const saveProgress = async (nextStep: number, isComplete: boolean) => {
    if (!userId) return false;
    const { error } = await supabase.from("academy_progress" as never).upsert({
      user_id: userId,
      level: 1,
      mission_index: nextStep,
      xp: isComplete ? 100 : nextStep * 25,
      completed: isComplete,
      updated_at: new Date().toISOString(),
    } as never);
    if (error) {
      setSaveError("Gagal menyimpan progres ke database. Coba lagi.");
      return false;
    }
    setSaveError(null);
    return true;
  };
  const question = missions[step];
  if (!question) {
    return (
      <main className="page-container py-10 sm:py-14">
        <h1 className="section-title">POMAH Academy</h1>
        <p role="alert" className="mt-4 text-sm text-destructive">
          Misi tidak tersedia. Mulai kembali dari misi pertama.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            setStep(0);
            setSelected(null);
          }}
        >
          <RotateCcw /> Mulai kembali
        </Button>
      </main>
    );
  }
  const correct = selected === question.correct;
  const xp = completed ? 100 : step * 25 + (correct ? 25 : 0);
  const finish = async () => {
    if (await saveProgress(3, true)) setCompleted(true);
  };
  const advance = async () => {
    if (step === missions.length - 1) {
      await finish();
      return;
    }
    if (await saveProgress(step + 1, false)) {
      setStep(step + 1);
      setSelected(null);
    }
  };
  const restart = () => {
    setStep(0);
    setSelected(null);
  };
  return (
    <main className="page-container py-10 sm:py-14">
      <div className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">
          Beranda
        </Link>{" "}
        / POMAH Academy
      </div>
      <p className="eyebrow text-brand">Belajar flipping sambil bermain</p>
      <h1 className="section-title mt-3">POMAH Academy</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        Selesaikan misi, pelajari keputusan penting dalam flipping, dan kumpulkan XP. Seluruh angka
        dan skenario adalah simulasi edukasi, bukan penawaran investasi.
      </p>
      <section className="mt-8 grid gap-4 sm:grid-cols-4" aria-label="Daftar level">
        {levels.map((name, index) => (
          <div
            key={name}
            className={`rounded-xl border p-5 ${index === 0 ? "border-brand bg-card" : "border-border bg-muted/30"}`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Level {index + 1}</span>
              {index === 0 ? (
                <Award className="size-4 text-brand" />
              ) : (
                <LockKeyhole className="size-4" />
              )}
            </div>
            <h2 className="mt-3 font-semibold">{name}</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {index === 0
                ? completed
                  ? "Selesai • Badge terbuka"
                  : "Tersedia untuk dimainkan"
                : "Segera hadir"}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Level 1 — Pemula</h2>
          <span className="text-sm font-semibold text-brand-deep">{xp} / 100 XP</span>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={xp}
          aria-label="Progres XP"
        >
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${xp}%` }}
          />
        </div>
        {saveError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {saveError}
          </p>
        )}
        {!ready || (userId && loadedFor !== userId) ? (
          <p className="mt-6">Memuat progres…</p>
        ) : !userId ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm">Masuk ke akun untuk memainkan misi dan menyimpan pencapaian.</p>
            <Button asChild>
              <Link to="/auth">
                Masuk untuk mulai <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : completed ? (
          <div className="mt-8 space-y-4">
            <Trophy className="size-12 text-amber-500" />
            <h3 className="text-xl font-semibold">Selamat! Badge Rookie Flipper terbuka.</h3>
            <p className="text-sm text-muted-foreground">
              Kamu telah menyelesaikan tiga misi dasar dan mendapatkan 100 XP. Level berikutnya
              sedang disiapkan.
            </p>
            <Button variant="outline" onClick={restart}>
              <RotateCcw /> Ulangi latihan
            </Button>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Misi {step + 1} dari {missions.length}
            </p>
            <h3 className="mt-3 text-lg font-semibold">{question.question}</h3>
            <div className="mt-5 space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  disabled={selected !== null}
                  onClick={() => setSelected(index)}
                  className={`block w-full rounded-lg border p-4 text-left text-sm transition-colors ${selected === index ? "border-brand bg-brand/10" : "border-border hover:border-brand"} disabled:cursor-default`}
                >
                  {String.fromCharCode(65 + index)}. {option}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div role="status" className="mt-5 rounded-lg bg-muted/60 p-4 text-sm">
                <p className="font-semibold">
                  {correct ? "Tepat! +25 XP" : "Belum tepat. Coba lagi agar bisa lanjut."}
                </p>
                <p className="mt-2 leading-6">{question.explanation}</p>
                {correct ? (
                  <Button className="mt-4" onClick={() => void advance()}>
                    {step === missions.length - 1 ? "Selesaikan Level 1" : "Misi berikutnya"}{" "}
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button className="mt-4" variant="outline" onClick={() => setSelected(null)}>
                    Coba lagi
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Progres tersimpan di database akun setelah setiap misi selesai dan dapat dilanjutkan di
        perangkat lain. Badge merupakan pencapaian permainan, bukan sertifikasi profesi.
      </p>
    </main>
  );
}
