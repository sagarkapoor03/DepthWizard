import { create } from "zustand";

export type CameraMode = "orbit" | "firstperson";
export type FlythroughState = "idle" | "playing" | "paused";

export interface MeasurementPoint {
  x: number; // grid column
  y: number; // grid row
  z: number; // scene/vertical world position
  elevation: number; // recovered elevation in original units
  relativeHeight: number; // normalized 0..1
  slopeDeg: number; // terrain slope at the point, in degrees
}

export interface Measurement {
  pointA: MeasurementPoint | null;
  pointB: MeasurementPoint | null;
  calibrated: boolean;
  units: "metric" | "relative";
}

interface ExplorerState {
  wireframe: boolean;
  texture: boolean;
  exaggeration: number;
  cameraMode: CameraMode;
  flythrough: FlythroughState;
  measuring: boolean;
  measurement: Measurement | null;
  autoRotate: boolean;
  resetToken: number;

  setWireframe: (v: boolean) => void;
  setTexture: (v: boolean) => void;
  setExaggeration: (v: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  setFlythrough: (s: FlythroughState) => void;
  setMeasuring: (v: boolean) => void;
  setMeasurement: (m: Measurement | null) => void;
  addMeasurementPoint: (point: MeasurementPoint) => void;
  setAutoRotate: (v: boolean) => void;
  resetCamera: () => void;
  reset: () => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  wireframe: false,
  texture: true,
  exaggeration: 1.5,
  cameraMode: "orbit",
  flythrough: "idle",
  measuring: false,
  measurement: null,
  autoRotate: false,
  resetToken: 0,

  setWireframe: (wireframe) => set({ wireframe }),
  setTexture: (texture) => set({ texture }),
  setExaggeration: (exaggeration) => set({ exaggeration }),
  setCameraMode: (cameraMode) => set({ cameraMode, flythrough: "idle" }),
  setFlythrough: (flythrough) => set({ flythrough }),
  setMeasuring: (measuring) => set({ measuring, measurement: null }),
  setMeasurement: (measurement) => set({ measurement }),
  addMeasurementPoint: (point) =>
    set((state) => {
      const meas = state.measurement || { pointA: null, pointB: null, calibrated: false, units: "relative" };
      // First click sets A, second sets B, third resets and sets new A
      if (!meas.pointA) {
        return { measurement: { ...meas, pointA: point } };
      } else if (!meas.pointB) {
        return { measurement: { ...meas, pointB: point } };
      } else {
        // Third click - reset and start new measurement with point A
        return { measurement: { ...meas, pointA: point, pointB: null } };
      }
    }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  resetCamera: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  reset: () =>
    set({
      wireframe: false,
      texture: true,
      exaggeration: 1.5,
      cameraMode: "orbit",
      flythrough: "idle",
      measuring: false,
      measurement: null,
      autoRotate: false,
      resetToken: 0,
    }),
}));