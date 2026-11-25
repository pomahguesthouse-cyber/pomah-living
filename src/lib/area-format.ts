const number = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** "120 m²", atau `fallback` bila luas kosong/nol. */
export function formatArea(value: number | null | undefined, fallback = "Belum diketahui") {
  return value && value > 0 ? `${number(value)} m²` : fallback;
}

/** Luas tanah dengan ukuran bila diketahui: "120 m² (8 × 15 m)". */
export function formatLandArea(
  area: number | null | undefined,
  width?: number | null,
  length?: number | null,
  fallback = "Belum diketahui",
) {
  const hasSize = Boolean(width && width > 0 && length && length > 0);
  const total = area && area > 0 ? area : hasSize ? width! * length! : null;
  if (!total) return fallback;
  return hasSize
    ? `${formatArea(total)} (${number(width!)} × ${number(length!)} m)`
    : formatArea(total);
}
