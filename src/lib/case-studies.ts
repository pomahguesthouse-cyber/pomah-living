export type CasePhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type CaseStage = CasePhoto & {
  label: "Sebelum" | "Proses" | "Sesudah";
  /** Bagian foto yang tetap terlihat saat dipotong, misalnya "center 25%". */
  focus?: string;
};

export type CaseStudy = {
  id: string;
  title: string;
  location: string;
  summary: string;
  stages: CaseStage[];
  interior: CasePhoto[];
  works: string[];
};

const base = "/images/proyek/bedahan-cibinong";

export const bedahanCibinong: CaseStudy = {
  id: "bedahan-cibinong",
  title: "Rumah Bedahan Cibinong",
  location: "Bedahan, Cibinong, Kabupaten Bogor",
  summary:
    "Rumah terbengkalai dengan halaman tertutup semak dan dinding berjamur, direnovasi menjadi rumah siap huni.",
  stages: [
    {
      label: "Sebelum",
      src: `${base}/sebelum.webp`,
      alt: "Rumah sebelum renovasi: halaman ditumbuhi semak tinggi, dinding biru kusam dan berjamur",
      width: 675,
      height: 1200,
      focus: "center 25%",
    },
    {
      label: "Proses",
      src: `${base}/proses-1.webp`,
      alt: "Proses renovasi: tukang memasang bata tempel dan kusen aluminium baru di teras",
      width: 1200,
      height: 675,
    },
    {
      label: "Sesudah",
      src: `${base}/sesudah.webp`,
      alt: "Rumah sesudah renovasi: fasad krem dengan aksen oranye, bata tempel, dan lampu dinding",
      width: 1200,
      height: 895,
    },
  ],
  interior: [
    {
      src: `${base}/ruang-tamu.webp`,
      alt: "Ruang tamu dengan plafon drop ceiling, lampu LED, dan lantai granit motif marmer",
      width: 896,
      height: 1120,
    },
    {
      src: `${base}/ruang-tengah.webp`,
      alt: "Ruang tengah dengan lampu plafon tersembunyi dan pintu kaca rangka hitam",
      width: 885,
      height: 1112,
    },
    {
      src: `${base}/ruang-belakang.webp`,
      alt: "Ruang belakang dengan lampu gantung, lantai merah bata, dan taman kering kecil",
      width: 896,
      height: 1099,
    },
    {
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
};
