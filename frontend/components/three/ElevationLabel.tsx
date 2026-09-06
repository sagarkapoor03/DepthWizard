"use client";

import { Html } from "@react-three/drei";
import { useExplorerStore } from "@/store/explorerStore";

/** Persistent scene readout of the current measurement (HTML overlay). */
export function ElevationLabel() {
  const measurement = useExplorerStore((s) => s.measurement);
  if (!measurement) return null;
  return null; // readout is handled by the 2D panel for clarity
}