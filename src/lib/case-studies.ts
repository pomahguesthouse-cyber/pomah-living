export type CasePhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  label: "Sebelum" | "Proses" | "Sesudah";
  caption: string;
  /** Bagian foto yang tetap terlihat saat dipotong, misalnya "center 25%". */
  focus?: string;
};

export type CaseStudy = {
  id: string;
  title: string;
  location: string;
  summary: string;
  /** Urut sesuai cerita proyek: sebelum, proses, lalu sesudah. */
  photos: CasePhoto[];
  works: string[];
  /** Angka proyek dalam rupiah, sesuai yang dilaporkan pemilik proyek. */
  figures: { purchase: number; renovation: number; sale: number };
};

export function caseStudyResult({ purchase, renovation, sale }: CaseStudy["figures"]) {
  const totalCost = purchase + renovation;
  const grossProfit = sale - totalCost;
  return { totalCost, grossProfit, margin: totalCost > 0 ? grossProfit / totalCost : 0 };
}

const base = "/images/proyek/bedahan-cibinong";

export const bedahanCibinong: CaseStudy = {
  id: "bedahan-cibinong",
  title: "Rumah Bedahan Cibinong",
  location: "Bedahan, Cibinong, Kabupaten Bogor",
  summary:
    "Rumah terbengkalai dengan halaman tertutup semak dan dinding berjamur, direnovasi menjadi rumah siap huni.",
  photos: [
    {
      label: "Sebelum",
      caption: "Tampak depan saat dibeli",
      src: `${base}/sebelum.webp`,
      alt: "Rumah sebelum renovasi: halaman ditumbuhi semak tinggi, dinding biru kusam dan berjamur",
      width: 675,
      height: 1200,
      focus: "center 25%",
    },
    {
      label: "Proses",
      caption: "Pemasangan kusen aluminium dan bata tempel",
      src: `${base}/proses-1.webp`,
      alt: "Proses renovasi: tukang memasang bata tempel dan kusen aluminium baru di teras",
      width: 1200,
      height: 675,
    },
    {
      label: "Proses",
      caption: "Bata tempel dan lantai teras baru",
      src: `${base}/proses-2.webp`,
      alt: "Tukang memasang bata tempel di dinding teras di samping jendela aluminium baru",
      width: 675,
      height: 1200,
      focus: "center 45%",
    },
    {
      label: "Sesudah",
      caption: "Tampak depan siap huni",
      src: `${base}/sesudah.webp`,
      alt: "Rumah sesudah renovasi: fasad krem dengan aksen oranye, bata tempel, dan lampu dinding",
      width: 1200,
      height: 895,
    },
    {
      label: "Sesudah",
      caption: "Ruang tamu",
      src: `${base}/ruang-tamu.webp`,
      alt: "Ruang tamu dengan plafon drop ceiling, lampu LED, dan lantai granit motif marmer",
      width: 896,
      height: 1120,
    },
    {
      label: "Sesudah",
      caption: "Ruang tengah",
      src: `${base}/ruang-tengah.webp`,
      alt: "Ruang tengah dengan lampu plafon tersembunyi dan pintu kaca rangka hitam",
      width: 885,
      height: 1112,
    },
    {
      label: "Sesudah",
      caption: "Ruang belakang",
      src: `${base}/ruang-belakang.webp`,
      alt: "Ruang belakang dengan lampu gantung, lantai merah bata, dan taman kering kecil",
      width: 896,
      height: 1099,
    },
    {
      label: "Sesudah",
      caption: "Kamar tidur",
      src: `${base}/kamar.webp`,
      alt: "Kamar tidur dengan AC, jendela kaca motif, dan lantai granit",
      width: 896,
      height: 1109,
    },
  ],
  works: [
    "Plafon PVC dan drop ceiling LED",
    "Lantai granit motif marmer",
    "Kusen aluminium dan pintu kaca",
    "Cat ulang dinding",
    "Fasad bata tempel",
  ],
  figures: { purchase: 270_000_000, renovation: 100_000_000, sale: 430_000_000 },
};
