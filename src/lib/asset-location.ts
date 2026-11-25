import { regionName } from "@/lib/indonesia-regions";

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, char: string) => sep + char.toUpperCase());

const shortRegency = (name: string) =>
  name.replace(/^Kabupaten\s+/i, "Kab. ").replace(/^Kota\s+/i, "Kota ");

/** Nama kecamatan dari alamat, misalnya "…, Kecamatan Kemang, Kabupaten Bogor" → "Kemang". */
export function kecamatanFrom(address: string): string | null {
  const match = address.match(/\b(?:Kecamatan|Kec\.?)\s+([\p{L}' .-]+?)\s*(?=,|$)/iu);
  const name = match?.[1]?.trim();
  return name ? titleCase(name) : null;
}

/**
 * Lokasi ringkas untuk kartu aset: kecamatan dan kabupaten/kota saja, misalnya
 * "Kec. Kemang, Kab. Bogor". Alamat pendek tanpa kata "Kecamatan" dipakai apa adanya.
 */
export function shortLocation(address: string, regionCode: string): string {
  const kecamatan = kecamatanFrom(address);
  const regency = regionName(regionCode);
  if (kecamatan)
    return [`Kec. ${kecamatan}`, regency ? shortRegency(regency) : null].filter(Boolean).join(", ");
  const trimmed = address.trim();
  if (trimmed && trimmed.length <= 40)
    return shortRegency(trimmed).replace(/,\s*Kabupaten\s+/i, ", Kab. ");
  return regency ? shortRegency(regency) : trimmed;
}
