export type ParsedAuctionText = {
  name: string;
  address: string;
  limit: number | null;
  deposit: number | null;
  landArea: number | null;
  buildingArea: number | null;
  certificate: string;
  lotCode: string;
};

function moneyAfter(text: string, label: RegExp): number | null {
  const location = label.exec(text);
  if (!location) return null;
  const after = text.slice(location.index + location[0].length);
  const match = after.match(/^\s*[:\-]?\s*(?:Rp\s*)?([\d.,]+)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/\D/g, ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
function areaNumber(value: string): number | null {
  const amount = Number(value.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount > 0 && amount < 1_000_000 ? amount : null;
}
export function parseAuctionText(input: string): ParsedAuctionText {
  const text = input.replace(/\r/g, "").replace(/\u00a0/g, " ").trim();
  const title = text.match(/(?:\d+\s+bidang\s+tanah[^\n]{0,180}|tanah\s+berikut\s+bangunan[^\n]{0,180})/i)?.[0] ?? "";
  const areaText = text.match(/(?:total\s+luas|luas\s+tanah|luas)\s*[:\-]?\s*([\d.,]+)\s*m(?:²|2|\^2)?/i)?.[1] ?? "";
  const buildingText = text.match(/luas\s+bangunan\s*[:\-]?\s*([\d.,]+)\s*m(?:²|2|\^2)?/i)?.[1] ?? "";
  const addressMatch = text.match(/alamat\s*[:\-]\s*([\s\S]{0,400}?)(?=\n\s*(?:Lihat Lokasi|Jenis Barang|Bukti Kepemilikan|Info Penjual|Info Penyelenggara|Keterangan)|$)/i);
  const address = (addressMatch?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const cert = text.match(/\b(?:SHM|SHGB|HGB|HP)\s*(?:No\.?\s*)?[:\-]?\s*[\w./-]+/i)?.[0] ?? "";
  const lot = text.match(/Kode\s+Lot\s+Lelang\s*[:\-]?\s*([A-Z0-9]+)/i)?.[1] ?? "";
  return {
    name: title.trim(),
    address,
    limit: moneyAfter(text, /Nilai\s+Limit/i),
    deposit: moneyAfter(text, /Uang\s+Jaminan/i),
    landArea: areaNumber(areaText),
    buildingArea: areaNumber(buildingText),
    certificate: cert,
    lotCode: lot,
  };
}
