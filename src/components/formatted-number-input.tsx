import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { ComponentProps } from "react";

export function formatIndonesianNumber(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 6 });
}
export function parseIndonesianNumber(raw: string): number | null {
  const clean = raw.trim().replace(/\s/g, "");
  if (!/^\d{0,3}(?:\.\d{3})+(?:,\d*)?$|^\d+(?:,\d*)?$/.test(clean)) return null;
  const number = Number(clean.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}
export function FormattedNumberInput({
  value, onValueChange, maximum = 1_000_000_000_000, ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number; onValueChange: (value: number) => void; maximum?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const shown = focused ? (draft ?? String(value).replace(".", ",")) : formatIndonesianNumber(value);
  return <Input {...props} type="text" inputMode="decimal" value={shown}
    onFocus={(e) => { setFocused(true); setDraft(String(value).replace(".", ",")); props.onFocus?.(e); }}
    onBlur={(e) => { setFocused(false); setDraft(null); props.onBlur?.(e); }}
    onChange={(e) => {
      const next = e.target.value;
      setDraft(next);
      const number = parseIndonesianNumber(next);
      if (number !== null && number >= 0 && number <= maximum) onValueChange(number);
    }}
  />;
}
