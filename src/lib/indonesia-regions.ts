import regionData from "@/data/indonesia-regions.json";

type Province = { name: string; regencies: Record<string, string> };
const provinces: Record<string, Province> = regionData;

export const maxPreferredRegions = 10;
export const provinceOptions = Object.entries(provinces)
  .map(([code, { name }]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name, "id"));

export function regencyOptions(provinceCode: string) {
  return Object.entries(provinces[provinceCode]?.regencies ?? {})
    .map(([code, name]) => ({
      code,
      name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export function regionName(code: string): string | undefined {
  if (!/^\d{2}(\d{2})?$/.test(code)) return;
  const province = provinces[code.slice(0, 2)];
  return code.length === 2 ? province?.name : province?.regencies[code];
}

export function matchesPreferredRegions(regency: string, regions: readonly string[]) {
  return regions.length === 0 || regions.includes(regency) || regions.includes(regency.slice(0, 2));
}
