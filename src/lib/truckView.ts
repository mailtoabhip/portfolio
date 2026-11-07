import { create } from "zustand";

type TruckView = {
  mode: "cabin" | "chase";
  asset: "loading" | "ready" | "error";
  toggle: () => void;
  setAsset: (asset: TruckView["asset"]) => void;
};

/** View changes deliberately never write to drive, sim or delivery state. */
export const useTruckView = create<TruckView>((set) => ({
  mode: "cabin",
  asset: "loading",
  toggle: () => set((s) => s.asset === "ready"
    ? { mode: s.mode === "cabin" ? "chase" : "cabin" } : {}),
  setAsset: (asset) => set(asset === "error" ? { asset, mode: "cabin" } : { asset }),
}));
