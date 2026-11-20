import banyumanikImage from "@/assets/rumah-banyumanik.webp.asset.json";
import tembalangImage from "@/assets/rumah-tembalang.webp.asset.json";
import ngaliyanImage from "@/assets/rumah-ngaliyan.webp.asset.json";
import {
  baseScenario,
  stressedScenario,
  type SimulationValues,
  type Verification,
} from "@/lib/simulation";

export type PropertyId = "banyumanik" | "tembalang" | "ngaliyan";
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
    id: "banyumanik",
    name: "Rumah Banyumanik",
    location: "Banyumanik, Semarang",
    image: banyumanikImage.url,
    auctionLimit: 280_000_000,
    initialValues: baseScenario,
    verification: { occupancy: true, access: true, documents: true },
    inspection: "Pemeriksaan awal lengkap",
  },
  {
    id: "tembalang",
    name: "Rumah Tembalang",
    location: "Tembalang, Semarang",
    image: tembalangImage.url,
    auctionLimit: 250_000_000,
    initialValues: baseScenario,
    verification: { occupancy: false, access: true, documents: true },
    inspection: "Penghunian belum terverifikasi",
  },
  {
    id: "ngaliyan",
    name: "Rumah Ngaliyan",
    location: "Ngaliyan, Semarang",
    image: ngaliyanImage.url,
    auctionLimit: 320_000_000,
    initialValues: { ...stressedScenario, winningPrice: 320_000_000 },
    verification: { occupancy: true, access: true, documents: true },
    inspection: "Pemeriksaan awal lengkap",
  },
];
export function getProperty(id: string): Property | undefined {
  return properties.find((property) => property.id === id);
}
