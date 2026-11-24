export type RabLine = {
  id: string;
  work: string;
  unit: string;
  volume: number;
  unitPrice: number;
};

export type ConditionFinding = {
  id: string;
  area: string;
  photo: string;
  observation: string;
  note: string;
  lines: RabLine[];
};

export type RabSummary = {
  findingsTotal: number;
  baseTotal: number;
  subtotal: number;
  contingency: number;
  total: number;
};

export const defaultContingencyRate = 0.1;

export function lineTotal(line: RabLine): number {
  return Math.round(Math.max(line.volume, 0) * Math.max(line.unitPrice, 0));
}

export function sumLines(lines: RabLine[]): number {
  return lines.reduce((total, line) => total + lineTotal(line), 0);
}

export function summarizeRab(
  findings: ConditionFinding[],
  baseLines: RabLine[],
  contingencyRate = defaultContingencyRate,
): RabSummary {
  const findingsTotal = findings.reduce((total, finding) => total + sumLines(finding.lines), 0);
  const baseTotal = sumLines(baseLines);
  const subtotal = findingsTotal + baseTotal;
  const contingency = Math.round(subtotal * Math.max(contingencyRate, 0));
  return { findingsTotal, baseTotal, subtotal, contingency, total: subtotal + contingency };
}

export function withVolume<T extends { lines: RabLine[] }>(
  group: T,
  lineId: string,
  volume: number,
): T {
  return {
    ...group,
    lines: group.lines.map((line) => (line.id === lineId ? { ...line, volume } : line)),
  };
}

export const cibinongFindings: ConditionFinding[] = [
  {
    id: "plafon",
    area: "Plafon",
    photo: "Foto baris atas",
    observation: "Noda kecokelatan terlihat di sudut plafon dekat jendela.",
    note: "Indikasi rembesan dari atap. Konfirmasi sumber bocor dan luas area saat survei.",
    lines: [
      {
        id: "plafon-atap",
        work: "Perbaikan kebocoran atap dan talang",
        unit: "ls",
        volume: 1,
        unitPrice: 3_500_000,
      },
      {
        id: "plafon-gypsum",
        work: "Bongkar dan pasang plafon gypsum",
        unit: "m²",
        volume: 12,
        unitPrice: 185_000,
      },
      { id: "plafon-cat", work: "Cat plafon", unit: "m²", volume: 12, unitPrice: 35_000 },
    ],
  },
  {
    id: "dinding",
    area: "Dinding",
    photo: "Foto baris bawah",
    observation: "Cat mengelupas dan bercak gelap terlihat di dinding dekat lantai.",
    note: "Indikasi kelembapan naik dari lantai. Ukur luas dinding terdampak saat survei.",
    lines: [
      {
        id: "dinding-aci",
        work: "Kerok cat, plester dan aci ulang",
        unit: "m²",
        volume: 15,
        unitPrice: 95_000,
      },
      {
        id: "dinding-waterproof",
        work: "Lapisan waterproofing dinding",
        unit: "m²",
        volume: 15,
        unitPrice: 85_000,
      },
      { id: "dinding-cat", work: "Cat dinding", unit: "m²", volume: 15, unitPrice: 35_000 },
    ],
  },
];

export const cibinongBaseLines: RabLine[] = [
  {
    id: "umum-cat",
    work: "Cat ulang interior dan eksterior",
    unit: "m²",
    volume: 180,
    unitPrice: 30_000,
  },
  { id: "umum-lantai", work: "Lantai granit 60×60", unit: "m²", volume: 45, unitPrice: 260_000 },
  {
    id: "umum-km",
    work: "Renovasi kamar mandi dan sanitair",
    unit: "ls",
    volume: 1,
    unitPrice: 9_000_000,
  },
  {
    id: "umum-listrik",
    work: "Instalasi listrik dan lampu",
    unit: "ls",
    volume: 1,
    unitPrice: 8_500_000,
  },
  { id: "umum-kusen", work: "Kusen dan daun pintu", unit: "unit", volume: 4, unitPrice: 1_750_000 },
  { id: "umum-dapur", work: "Dapur dan kitchen set", unit: "ls", volume: 1, unitPrice: 9_500_000 },
  {
    id: "umum-carport",
    work: "Carport dan taman depan",
    unit: "ls",
    volume: 1,
    unitPrice: 3_500_000,
  },
];
