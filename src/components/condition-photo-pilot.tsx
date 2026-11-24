import { useState } from "react";
import { Camera, Check, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cibinongBaseLines,
  cibinongFindings,
  defaultContingencyRate,
  lineTotal,
  sumLines,
  summarizeRab,
  withVolume,
  type RabLine,
} from "@/lib/condition-rab";
import { formatRupiah } from "@/lib/simulation";

type Props = {
  currentRenovation?: number | undefined;
  onApply?: (total: number) => void;
};

function RabRows({
  lines,
  onVolume,
}: {
  lines: RabLine[];
  onVolume: (lineId: string, volume: number) => void;
}) {
  return (
    <ul className="mt-3 divide-y divide-border rounded-md border border-border text-xs">
      {lines.map((line) => (
        <li
          key={line.id}
          className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[1fr_auto_auto]"
        >
          <span className="font-medium">{line.work}</span>
          <label className="flex items-center gap-1.5 text-muted-foreground sm:justify-end">
            <span className="sr-only">Volume {line.work}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={line.volume}
              onChange={(event) => {
                const value = Number(event.target.value);
                onVolume(line.id, Number.isFinite(value) && value >= 0 ? value : 0);
              }}
              className="h-8 w-16 rounded border border-border bg-background px-2 text-right tabular-nums text-foreground"
            />
            <span className="w-8">{line.unit}</span>
          </label>
          <span className="col-span-2 flex justify-between text-muted-foreground sm:col-span-1 sm:block sm:min-w-28 sm:text-right">
            <span className="sm:block sm:text-[11px]">× {formatRupiah(line.unitPrice)}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatRupiah(lineTotal(line))}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ConditionPhotoPilot({ currentRenovation, onApply }: Props) {
  const [findings, setFindings] = useState(cibinongFindings);
  const [baseLines, setBaseLines] = useState(cibinongBaseLines);
  const summary = summarizeRab(findings, baseLines);
  const applied = currentRenovation === summary.total;

  return (
    <section className="border-t border-border py-7" aria-labelledby="photo-pilot-title">
      <h2 id="photo-pilot-title" className="flex items-center gap-2 text-base font-semibold">
        <Camera className="size-5 text-brand" aria-hidden="true" />
        Analisis kondisi dari foto
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Setiap temuan dari foto langsung menjadi baris RAB. Ubah volume sesuai hasil ukur di lokasi,
        lalu pakai totalnya di simulasi.
      </p>
      <details className="mt-4 rounded-md border border-border" open>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand-deep">
          Foto, temuan, dan RAB renovasi
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          <figure>
            <img
              src="/demo/cibinong-kondisi.webp"
              width={960}
              height={640}
              loading="lazy"
              className="w-full rounded-md"
              alt="Atas: foto ruangan dan detail noda di plafon. Bawah: foto ruangan dan detail cat dinding mengelupas."
            />
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Demo dengan foto sintetis. Setiap baris berisi foto ruangan di kiri dan foto detail di
              kanan.
            </figcaption>
          </figure>

          {findings.map((finding) => (
            <div key={finding.id} data-testid={`finding-${finding.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  {finding.area} · {finding.photo}
                </h3>
                <span className="text-sm font-semibold tabular-nums">
                  {formatRupiah(sumLines(finding.lines))}
                </span>
              </div>
              <p className="mt-1 text-sm">{finding.observation}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{finding.note}</p>
              <RabRows
                lines={finding.lines}
                onVolume={(lineId, volume) =>
                  setFindings((current) =>
                    current.map((item) =>
                      item.id === finding.id ? withVolume(item, lineId, volume) : item,
                    ),
                  )
                }
              />
            </div>
          ))}

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">Paket renovasi standar</h3>
              <span className="text-sm font-semibold tabular-nums">
                {formatRupiah(summary.baseTotal)}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pekerjaan rutin agar rumah siap jual, di luar temuan kerusakan.
            </p>
            <RabRows
              lines={baseLines}
              onVolume={(lineId, volume) =>
                setBaseLines((current) => withVolume({ lines: current }, lineId, volume).lines)
              }
            />
          </div>

          <div className="rounded-md bg-muted/60 p-4 text-sm" data-testid="rab-summary">
            <h3 className="flex items-center gap-2 font-semibold">
              <ClipboardList className="size-4 text-brand" aria-hidden="true" />
              Ringkasan RAB
            </h3>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Perbaikan dari temuan foto</dt>
                <dd className="tabular-nums">{formatRupiah(summary.findingsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paket renovasi standar</dt>
                <dd className="tabular-nums">{formatRupiah(summary.baseTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Cadangan {Math.round(defaultContingencyRate * 100)}%
                </dt>
                <dd className="tabular-nums">{formatRupiah(summary.contingency)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Total RAB renovasi</dt>
                <dd data-testid="rab-total" className="tabular-nums text-brand-deep">
                  {formatRupiah(summary.total)}
                </dd>
              </div>
            </dl>
            {onApply && (
              <Button
                type="button"
                variant={applied ? "outline" : "default"}
                className="mt-4 h-11 w-full"
                onClick={() => onApply(summary.total)}
                disabled={applied}
              >
                {applied ? (
                  <>
                    <Check className="size-4" aria-hidden="true" /> Sudah dipakai di simulasi
                  </>
                ) : (
                  "Pakai total RAB di simulasi"
                )}
              </Button>
            )}
            <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
              Harga satuan ilustrasi untuk area Bodetabek. Sesuaikan dengan penawaran kontraktor.
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
