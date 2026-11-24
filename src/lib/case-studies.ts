export type CasePhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** "Desain" untuk ilustrasi rencana hasil akhir, bukan foto. */
  label: "Sebelum" | "Proses" | "Sesudah" | "Desain";
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
  /** Proyek masih berjalan: harga jual dan laba masih estimasi. */
  inProgress?: boolean;
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

const karadenanBase = "/images/proyek/karadenan-bogor";

export const karadenanBogor: CaseStudy = {
  id: "karadenan-bogor",
  title: "Rumah Karadenan Bogor",
  location: "Karadenan, Cibinong, Kabupaten Bogor",
  summary:
    "Rumah rusak berat dengan atap runtuh, dibangun ulang menjadi rumah dua lantai bergaya modern.",
  inProgress: true,
  photos: [
    {
      label: "Sebelum",
      caption: "Tampak depan saat diperoleh",
      src: `${karadenanBase}/sebelum-depan.webp`,
      alt: "Rumah sebelum renovasi: dinding hijau kusam, atap seng rusak, jemuran dan tumpukan kayu di depan",
      width: 1200,
      height: 560,
    },
    {
      label: "Sebelum",
      caption: "Atap runtuh dan ruangan penuh puing",
      src: `${karadenanBase}/sebelum-dalam.webp`,
      alt: "Ruangan tanpa atap dengan rangka kayu patah, dinding merah kusam, dan perabot rusak berserakan",
      width: 1200,
      height: 560,
    },
    {
      label: "Proses",
      caption: "Pembongkaran dan perkuatan struktur",
      src: `${karadenanBase}/bongkar.webp`,
      alt: "Ruangan setelah dibongkar dengan penyangga bambu, besi tulangan, dan puing genteng di lantai",
      width: 675,
      height: 1200,
      focus: "center 40%",
    },
    {
      label: "Proses",
      caption: "Lantai dua dan atap baru terpasang",
      src: `${karadenanBase}/proses-1.webp`,
      alt: "Rumah dua lantai dalam pengerjaan: dinding atas sudah dicat, lisplang kayu, tangga dan gerobak di depan",
      width: 675,
      height: 1200,
      focus: "center 35%",
    },
    {
      label: "Proses",
      caption: "Fasad dan lampu plafon mulai terpasang",
      src: `${karadenanBase}/proses-2.webp`,
      alt: "Fasad lantai dua dengan panel kayu vertikal, jendela baru, dan lampu sorot plafon menyala",
      width: 1200,
      height: 900,
    },
    {
      label: "Desain",
      caption: "Ilustrasi desain akhir",
      src: `${karadenanBase}/desain.webp`,
      alt: "Ilustrasi rencana rumah dua lantai berwarna krem dengan panel kayu, pintu lengkung, dan pagar besi hitam",
      width: 1200,
      height: 900,
    },
  ],
  works: [
    "Bongkar dan perkuatan struktur",
    "Penambahan lantai dua",
    "Atap dan lisplang baru",
    "Fasad panel kayu",
    "Kusen aluminium",
  ],
  figures: { purchase: 88_000_000, renovation: 250_000_000, sale: 600_000_000 },
};

export const caseStudies: CaseStudy[] = [bedahanCibinong, karadenanBogor];
