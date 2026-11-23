import { createServerFn } from "@tanstack/react-start";

export type AuctionMetadata = {
  title: string;
  description: string;
  limit: number | null;
  sourceUrl: string;
  warning: string | null;
};

const allowedHosts = new Set(["lelang.go.id", "www.lelang.go.id", "balelelang.btn.co.id"]);

function parseAllowedUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase()))
    throw new Error("Gunakan tautan HTTPS dari lelang.go.id atau balelelang.btn.co.id.");
  if (url.username || url.password || url.port)
    throw new Error("Tautan tidak valid.");
  return url;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function metadata(html: string, property: string): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!new RegExp('(?:property|name)\\s*=\\s*["\\\']' + property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '["\\\']', "i").test(tag)) continue;
    const content = tag.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (content) return decodeEntities(content).trim();
  }
  return "";
}

function extractLimit(text: string): number | null {
  const candidate = text.match(/(?:nilai\s+limit|harga\s+limit|limit\s+lelang)\s*[:\-]?\s*(?:rp\.?\s*)?([\d.,]{5,})/i)?.[1];
  if (!candidate) return null;
  const digits = candidate.replace(/\D/g, "");
  const value = Number(digits);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export const importAuctionUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (typeof data?.url !== "string" || data.url.length > 2048)
      throw new Error("URL tidak valid.");
    return { url: parseAllowedUrl(data.url).toString() };
  })
  .handler(async ({ data }): Promise<AuctionMetadata> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(data.url, {
        signal: controller.signal,
        redirect: "manual",
        headers: { Accept: "text/html" },
      });
      if (!response.ok || response.status >= 300 || response.status < 200)
        throw new Error("Halaman lelang tidak dapat dibaca otomatis. Silakan isi data manual.");
      const type = response.headers.get("content-type") ?? "";
      if (!type.toLowerCase().includes("text/html"))
        throw new Error("URL tidak mengarah ke halaman HTML.");
      const length = Number(response.headers.get("content-length") ?? "0");
      if (length > 1_000_000) throw new Error("Halaman terlalu besar untuk diproses.");
      const html = (await response.text()).slice(0, 1_000_000);
      const pageTitle = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
      const title = metadata(html, "og:title") || pageTitle;
      const description = metadata(html, "og:description") || metadata(html, "description");
      const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      return {
        title: title.slice(0, 180),
        description: description.slice(0, 500),
        limit: extractLimit(decodeEntities(text)),
        sourceUrl: data.url,
        warning: "Data berasal dari metadata halaman dan belum diverifikasi. Periksa nominal dan dokumen resmi sebelum mengambil keputusan.",
      };
    } finally {
      clearTimeout(timeout);
    }
  });
