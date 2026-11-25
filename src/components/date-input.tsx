import { useState } from "react";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTanggal, namaBulan } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/** "YYYY-MM-DD" ↔ Date lokal, tanpa geser zona waktu. */
function parseIso(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function toIso(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  /** Nama input tersembunyi untuk formulir yang dikirim dengan FormData. */
  name?: string;
  required?: boolean;
  /** Batas tanggal "YYYY-MM-DD". */
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Pemilih tanggal berformat Indonesia ("Selasa, 15 Desember 2026"), menggantikan
 * input bawaan peramban yang mengikuti locale perangkat (misalnya mm/dd/yyyy).
 * Nilai tetap disimpan sebagai "YYYY-MM-DD".
 */
export function DateInput({
  value,
  onChange,
  id,
  name,
  required,
  min,
  max,
  placeholder = "Pilih tanggal",
  className,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const minDate = min ? parseIso(min) : undefined;
  const maxDate = max ? parseIso(max) : undefined;
  const year = new Date().getFullYear();
  return (
    <div className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={rest["aria-label"]}
            className={cn(
              "h-10 w-full justify-start gap-2 px-3 text-left font-normal",
              !selected && "text-muted-foreground",
              selected && "pr-9",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">
              {selected ? formatTanggal(selected, { withDay: true }) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={localeId}
            captionLayout="dropdown"
            startMonth={minDate ?? new Date(year - 90, 0)}
            endMonth={maxDate ?? new Date(year + 10, 11)}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            formatters={{ formatMonthDropdown: (date) => namaBulan[date.getMonth()]!.slice(0, 3) }}
            selected={selected}
            {...(selected || maxDate ? { defaultMonth: selected ?? maxDate! } : {})}
            onSelect={(date) => {
              if (date) onChange(toIso(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {selected && !required && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Hapus tanggal"
          onClick={() => onChange("")}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
