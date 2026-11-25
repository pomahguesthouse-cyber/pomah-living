/** Format tanggal Indonesia, misalnya "15 Desember 2026". Tidak bergantung pada locale peramban. */
export const namaBulan = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

function toParts(
  value: string | Date,
): { year: number; month: number; day: number; date: Date } | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth(),
      day: value.getDate(),
      date: value,
    };
  }
  // Tanggal ISO (YYYY-MM-DD) dibaca apa adanya agar tidak bergeser karena zona waktu.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return { year, month, day, date: new Date(year, month, day) };
  }
  return null;
}

/**
 * "15 Desember 2026"; dengan `withDay` menjadi "Selasa, 15 Desember 2026"; dengan `short`
 * menjadi "15 Des 2026". Mengembalikan `fallback` bila tanggal kosong atau tidak sah.
 */
export function formatTanggal(
  value: string | Date | null | undefined,
  options: { withDay?: boolean; short?: boolean; fallback?: string } = {},
) {
  const parts = value ? toParts(value) : null;
  if (!parts) return options.fallback ?? "";
  const bulan = namaBulan[parts.month]!;
  const text = `${parts.day} ${options.short ? bulan.slice(0, 3) : bulan} ${parts.year}`;
  return options.withDay ? `${namaHari[parts.date.getDay()]}, ${text}` : text;
}
