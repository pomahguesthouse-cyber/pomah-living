export const projectStatuses = {
  analysis: "Analisis",
  renovation: "Renovasi",
  for_sale: "Dijual",
  sold: "Terjual",
} as const;

export type ProjectStatus = keyof typeof projectStatuses;

export type ProjectFields = {
  name: string;
  location: string;
  status: ProjectStatus;
  expected_sale: number | null;
  expected_cost: number | null;
  actual_sale: number | null;
  actual_cost: number | null;
};

export type ProjectRecord = ProjectFields & { id: string; updated_at: string };

export const moneyFields = [
  { key: "expected_sale", label: "Perkiraan harga jual" },
  { key: "expected_cost", label: "Perkiraan total biaya" },
  { key: "actual_sale", label: "Harga jual aktual" },
  { key: "actual_cost", label: "Total biaya aktual" },
] as const;

export function readProjectFields(fields: FormData): ProjectFields {
  const name = String(fields.get("name") ?? "").trim();
  const location = String(fields.get("location") ?? "").trim();
  const status = String(fields.get("status") ?? "");
  if (name.length < 1 || name.length > 100 || location.length > 160) {
    throw new Error("Isi nama proyek dan gunakan lokasi maksimal 160 karakter.");
  }
  if (!Object.hasOwn(projectStatuses, status)) throw new Error("Pilih status proyek.");

  const amounts = moneyFields.map(({ key, label }) => {
    const value = String(fields.get(key) ?? "").trim();
    if (!value) return null;
    const amount = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(amount) || amount > 1_000_000_000_000) {
      throw new Error(`${label} harus berupa rupiah bulat antara 0 dan 1 triliun.`);
    }
    return amount;
  });
  const [expected_sale = null, expected_cost = null, actual_sale = null, actual_cost = null] =
    amounts;
  if (status === "sold" && (actual_sale === null || actual_cost === null)) {
    throw new Error("Isi harga jual dan total biaya aktual sebelum menandai proyek terjual.");
  }
  return {
    name,
    location,
    status: status as ProjectStatus,
    expected_sale,
    expected_cost,
    actual_sale,
    actual_cost,
  };
}

export function projectProfit(sale: number | null, cost: number | null) {
  return sale === null || cost === null ? null : sale - cost;
}
