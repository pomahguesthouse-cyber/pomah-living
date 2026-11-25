/**
 * Pisahkan teks sumber lelang menjadi label dan tautan, misalnya
 * "Lelang DJKN · https://lelang.go.id/kpknl/…" → label "Lelang DJKN", tautan, host "lelang.go.id".
 */
export function parseSource(source: string): {
  label: string;
  url: string | null;
  host: string | null;
} {
  const match = source.match(/https?:\/\/[^\s·]+/i);
  if (!match) return { label: source.trim(), url: null, host: null };
  let url: URL | null = null;
  try {
    url = new URL(match[0]);
  } catch {
    url = null;
  }
  const label = source
    .replace(match[0], "")
    .replace(/\s*·\s*$/, "")
    .replace(/^\s*·\s*/, "")
    .trim();
  const safe = url && url.protocol === "https:" ? url : null;
  return {
    label: label || (safe ? "Tautan sumber" : source.trim()),
    url: safe ? safe.toString() : null,
    host: safe ? safe.hostname.replace(/^www\./, "") : null,
  };
}
