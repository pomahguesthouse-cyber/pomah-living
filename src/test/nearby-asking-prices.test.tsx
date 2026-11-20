import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NearbyAskingPrices } from "@/components/nearby-asking-prices";
import { summarizeAskingPrices } from "@/lib/cibinong-comparables";

describe("Nearby asking prices", () => {
  it("passes the median of the curated listings to the simulator", () => {
    const onUseMedian = vi.fn();
    render(<NearbyAskingPrices onUseMedian={onUseMedian} />);

    expect(screen.getAllByRole("link", { name: /Lihat iklan/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Pakai nilai tengah di simulasi" }));
    expect(onUseMedian).toHaveBeenCalledWith(500_000_000);
  });

  it("summarizes unsorted listings and averages the middle pair", () => {
    expect(summarizeAskingPrices([40, 10, 30, 20])).toEqual({ min: 10, max: 40, median: 25 });
    expect(summarizeAskingPrices([])).toBeNull();
  });
});
