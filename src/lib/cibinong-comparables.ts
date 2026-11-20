export const cibinongComparables = [
  {
    area: "Karadenan, Cibinong",
    condition: "Baru, iklan menawarkan unit siap huni dan inden",
    landArea: 60,
    buildingArea: 36,
    askingPrice: 425_000_000,
    source: "Rumah123",
    url: "https://www.rumah123.com/properti/bogor-cibinong/rumah-dijual-di-karadenan-bogor-400-jtaan-hos18422529/",
  },
  {
    area: "Perumahan Kedung Waringin",
    condition: "Siap huni, 1 lantai",
    landArea: 60,
    buildingArea: 60,
    askingPrice: 500_000_000,
    source: "Rumah123",
    url: "https://www.rumah123.com/properti/bogor-cibinong/rumah-2-kamar-akses-dekat-cibinong-city-mall-shm-siap-hunni-j55427-hos42803894/",
  },
  {
    area: "Cibinong, Bogor",
    condition: "Siap huni, 1 lantai",
    landArea: 60,
    buildingArea: 45,
    askingPrice: 550_000_000,
    source: "99.co",
    url: "https://www.99.co/id/properti/rumah-dijual-550jt-cibinong-cp-1014670123",
  },
] as const;

export function summarizeAskingPrices(prices: readonly number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted.at(-1);
  const middle = sorted[Math.floor(sorted.length / 2)];
  if (min === undefined || max === undefined || middle === undefined) return null;

  const lowerMiddle = sorted[Math.floor((sorted.length - 1) / 2)] ?? middle;
  return { min, max, median: Math.round((lowerMiddle + middle) / 2) };
}
