import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { defaultLandSettings, resolveLandSize, type LandSize } from "@/lib/land-settings";
import {
  compareStrategies,
  defaultNewBuild,
  defaultRenovationMonths,
  splitOffer,
  type LandRules,
  type NewBuildAssumptions,
} from "@/lib/land-strategy";
import type { SimulationValues } from "@/lib/simulation";
import { fetchLandSettings, landSettingsQueryKey } from "@/services/settings-service";

export type RuleKey = "minLotArea" | "minFrontage" | "kdbPercent" | "maxFloors";

/** Anchor bagian perbandingan strategi di halaman analisis. */
export const strategySectionId = "perbandingan-strategi";

type Options = {
  values: SimulationValues | null;
  initialLandArea: number | null;
  /** Lebar muka dan panjang dari katalog, bila admin mengisinya. */
  initialWidth?: number | null;
  initialLength?: number | null;
  isSample: boolean;
};

function initialSize({
  initialLandArea,
  initialWidth,
  initialLength,
  isSample,
}: Options): LandSize {
  if (initialWidth && initialWidth > 0 && initialLength && initialLength > 0)
    return { mode: "dimensions", length: initialLength, width: initialWidth, area: 0, frontage: 0 };
  if (initialLandArea && initialLandArea > 0)
    return {
      mode: "area",
      length: 0,
      width: 0,
      area: initialLandArea,
      frontage: initialWidth && initialWidth > 0 ? initialWidth : 0,
    };
  if (isSample) return { mode: "dimensions", length: 18, width: 8, area: 0, frontage: 0 };
  return { mode: "dimensions", length: 0, width: 0, area: 0, frontage: 0 };
}

/** Status analisis tanah untuk satu aset, dipakai bersama oleh bagian ukuran, tawaran, dan perbandingan. */
export function useLandAnalysis(options: Options) {
  const settingsQuery = useQuery({
    queryKey: landSettingsQueryKey,
    queryFn: fetchLandSettings,
    staleTime: 5 * 60_000,
  });
  const settings = settingsQuery.data?.settings ?? defaultLandSettings;
  const [size, setSize] = useState<LandSize>(() => initialSize(options));
  const [ruleOverrides, setRuleOverrides] = useState<Partial<Record<RuleKey, number>>>({});
  const [buildOverrides, setBuildOverrides] = useState<Partial<NewBuildAssumptions>>({});
  const [renovationMonths, setRenovationMonths] = useState(defaultRenovationMonths);

  const { values } = options;
  const rules: LandRules = {
    ...resolveLandSize(size),
    minLotArea: ruleOverrides.minLotArea ?? settings.minLotArea,
    minFrontage: ruleOverrides.minFrontage ?? settings.minFrontage,
    kdbPercent: ruleOverrides.kdbPercent ?? settings.kdbPercent,
    maxFloors: ruleOverrides.maxFloors ?? settings.maxFloors,
  };
  const build: NewBuildAssumptions = {
    ...defaultNewBuild,
    buildCostPerM2: settings.buildCostPerM2,
    salePerUnit: values ? Math.round((values.salePrice * 0.8) / 5_000_000) * 5_000_000 : 0,
    ...buildOverrides,
  };
  const comparison =
    values && rules.landArea > 0 ? compareStrategies(values, rules, build, renovationMonths) : null;
  return {
    settings,
    settingsSource: settingsQuery.data?.source ?? "default",
    size,
    setSize,
    rules,
    ruleOverrides,
    setRule: (key: RuleKey, value: number) =>
      setRuleOverrides((current) => ({ ...current, [key]: value })),
    resetRules: () => setRuleOverrides({}),
    build,
    setBuild: (key: keyof NewBuildAssumptions, value: number) =>
      setBuildOverrides((current) => ({ ...current, [key]: value })),
    renovationMonths,
    setRenovationMonths,
    comparison,
    offer: comparison ? splitOffer(comparison) : ({ tier: "none" } as const),
  };
}
export type LandAnalysis = ReturnType<typeof useLandAnalysis>;
