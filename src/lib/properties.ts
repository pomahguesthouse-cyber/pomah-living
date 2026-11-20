import cibinongImage from "@/assets/rumah-banyumanik.webp.asset.json";
import sawanganImage from "@/assets/rumah-tembalang.webp.asset.json";
import jatiasihImage from "@/assets/rumah-ngaliyan.webp.asset.json";
import {
  baseScenario,
  stressedScenario,
  type SimulationValues,
  type Verification,
} from "@/lib/simulation";

export type PropertyId = "cibinong" | "sawangan" | "jatiasih";
export type Property = {
  id: PropertyId;
  name: string;
  location: string;
  image: string;
  auctionLimit: number;
  initialValues: SimulationValues;
  verification: Verification;
  inspection: string;
};
export const properties: Property[] = [
  {
    id: "cibinong",
    name: "Rumah Cibinong",
    location: "Cibinong, Kabupaten Bogor",
    image: cibinongImage.url,
    auctionLimit: 280_000_000,
    initialValues: baseScenario,
    verification: { occupancy: true, access: true, documents: true },
    inspection: "Pemeriksaan awal lengkap",
  },
  {
    id: "sawangan",
    name: "Rumah Sawangan",
    location: "Sawangan, Depok",
    image: sawanganImage.url,
    auctionLimit: 250_000_000,
    initialValues: baseScenario,
    verification: { occupancy: false, access: true, documents: true },
    inspection: "Penghunian belum terverifikasi",
  },
  {
    id: "jatiasih",
    name: "Rumah Jatiasih",
    location: "Jatiasih, Kota Bekasi",
    image: jatiasihImage.url,
    auctionLimit: 320_000_000,
    initialValues: { ...stressedScenario, winningPrice: 320_000_000 },
    verification: { occupancy: true, access: true, documents: true },
    inspection: "Pemeriksaan awal lengkap",
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
