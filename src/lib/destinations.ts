import type { Destination } from "@/lib/store";

/**
 * The paper sheets on the dash — one per destination (§17.2).
 * `locked` sheets show a lock and lead to a password gate (later:
 * Delhivery case studies).
 */
export interface SheetDef {
  slug: Destination;
  label: string; // big line on the paper
  sub: string; // small line under it
  locked?: boolean;
}

export const SHEETS: SheetDef[] = [
  { slug: "manifest", label: "RESUME", sub: "the manifest" },
  { slug: "tvs-accelerator", label: "TVS\nACCELERATOR", sub: "drop #01 · b2b" },
  { slug: "pennsylvania-kiosks", label: "PA HEALTH\nKIOSKS", sub: "drop #02 · civic" },
  { slug: "tvs-ux-audit", label: "TVS EV\nUX AUDIT", sub: "drop #03 · audit" },
  { slug: "gadget-commerce", label: "GADGET\nCOMMERCE", sub: "drop #04 · 48hr" },
  { slug: "about", label: "ABOUT\nTHE DRIVER", sub: "locate: abhijeet" },
  { slug: "notes", label: "FIELD\nNOTES", sub: "writing" },
  { slug: "signal", label: "CONTACT", sub: "signal: dispatch" },
];

/** Reading titles for the overlay header. */
export const TITLES: Record<Destination, string> = {
  manifest: "The Manifest — Resume",
  "tvs-accelerator": "Drop #01 — TVS Accelerator",
  "pennsylvania-kiosks": "Drop #02 — Pennsylvania Health Kiosks",
  "tvs-ux-audit": "Drop #03 — TVS iQube & 3W UX Audit",
  "gadget-commerce": "Drop #04 — Gadget Commerce",
  about: "Locate: Abhijeet",
  notes: "Field Notes",
  signal: "Signal: Dispatch",
};
