import cibinongImage from "@/assets/rumah-banyumanik.webp.asset.json";
import sawanganImage from "@/assets/rumah-tembalang.webp.asset.json";
import jatiasihImage from "@/assets/rumah-ngaliyan.webp.asset.json";
import {
  baseScenario,
  sawanganScenario,
  stressedScenario,
  type SimulationValues,
  type Verification,
} from "@/lib/simulation";

export type PropertyId = "cibinong" | "sawangan" | "jatiasih";
export type Property = {
  id: PropertyId;
  name: string;
  location: string;
  regionCode: string;
  image: string;
  auctionLimit: number;
  initialValues: SimulationValues;
  verification: Verification;
  inspection: string;
  /** Fakta aset seperti di katalog. Aset contoh memakai angka fiktif. */
  details?: AssetDetails;
};

export type AssetDetails = {
  auctionDate: string | null;
  landArea: number | null;
  /** Lebar muka (menghadap jalan) dan panjang tanah, m. */
  landWidth?: number | null;
  landLength?: number | null;
  buildingArea: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  legal: string;
};
export const properties: Property[] = [
  {
    id: "cibinong",
    name: "Rumah Cibinong",
    location: "Cibinong, Kabupaten Bogor",
    regionCode: "3201",
    image: cibinongImage.url,
    auctionLimit: 280_000_000,
    initialValues: baseScenario,
    verification: { occupancy: true, access: true, documents: true },
    inspection: "Pemeriksaan awal lengkap",
    details: {
      auctionDate: "2026-12-15",
      landArea: 120,
      landWidth: 8,
      landLength: 15,
      buildingArea: 70,
      legal: "SHM",
    },
  },
  {
    id: "sawangan",
    name: "Rumah Sawangan",
    location: "Sawangan, Depok",
    regionCode: "3276",
    image: sawanganImage.url,
    auctionLimit: 250_000_000,
    initialValues: sawanganScenario,
    verification: { occupancy: false, access: true, documents: true },
    inspection: "Penghunian belum terverifikasi",
    details: { auctionDate: "2026-12-18", landArea: 90, buildingArea: 45, legal: "SHM" },
  },
  {
    id: "jatiasih",
    name: "Rumah Jatiasih",
    location: "Jatiasih, Kota Bekasi",
    regionCode: "3275",
    image: jatiasihImage.url,
    auctionLimit: 320_000_000,
    initialValues: { ...stressedScenario, winningPrice: 320_000_000 },
    verification: { occupancy: true, access: true, documents: true },
    // Teks ini hanya status pemeriksaan; penilaian margin dilakukan di halaman analisis.
    inspection: "Pemeriksaan awal lengkap",
    details: {
      auctionDate: "2026-12-22",
      landArea: 150,
      landWidth: 12,
      landLength: 12.5,
      buildingArea: 80,
      legal: "SHM",
    },
  },
];
const previousPropertyIds = new Map<string, PropertyId>([
  ["banyumanik", "cibinong"],
  ["tembalang", "sawangan"],
  ["ngaliyan", "jatiasih"],
]);

export function getProperty(id: string): Property | undefined {
  const propertyId = previousPropertyIds.get(id) ?? id;
  return properties.find((property) => property.id === propertyId);
}
