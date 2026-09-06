import { create } from "zustand";
import type {
  JobResult,
  JobStatistics,
  StatisticsResponse,
  UploadResponse,
} from "@/lib/types";

export const PIPELINE_STAGES = [
  "Image Upload",
  "Metadata Detection",
  "AI Depth Estimation",
  "Scale Calibration",
  "DSM Generation",
  "Slope Analysis",
  "3D Mesh Generation",
  "Ready for Exploration",
];

interface JobState {
  jobId: string | null;
  upload: UploadResponse | null;
  stats: StatisticsResponse | null;
  result: JobResult | null;
  statistics: JobStatistics | null;
  depthMode: "ai" | "fallback" | null;
  calibrated: boolean;
  processing: boolean;
  selectedImageUrl: string | null;

  setJobId: (id: string | null) => void;
  setUpload: (upload: UploadResponse) => void;
  setProcessing: (processing: boolean) => void;
  setStats: (stats: StatisticsResponse) => void;
  setResult: (result: JobResult) => void;
  setStatistics: (statistics: JobStatistics) => void;
  setSelectedImageUrl: (url: string | null) => void;
  reset: () => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobId: null,
  upload: null,
  stats: null,
  result: null,
  statistics: null,
  depthMode: null,
  calibrated: false,
  processing: false,
  selectedImageUrl: null,

  setJobId: (jobId) => set({ jobId, result: null, statistics: null, stats: null }),
  setUpload: (upload) =>
    set({ upload, jobId: upload.job_id, depthMode: upload.mode }),
  setProcessing: (processing) => set({ processing }),
  setStats: (stats) => {
    set({
      stats,
      statistics: stats.statistics ?? useJobStore.getState().statistics,
      calibrated: !!stats.statistics?.dsm.calibrated,
    });
  },
  setResult: (result) =>
    set({
      result,
      statistics: result.statistics ?? undefined,
      calibrated: !!result.statistics?.dsm.calibrated,
    }),
  setStatistics: (statistics) =>
    set({ statistics, calibrated: !!statistics.dsm.calibrated }),
  setSelectedImageUrl: (url) => set({ selectedImageUrl: url }),
  reset: () =>
    set({
      jobId: null,
      upload: null,
      stats: null,
      result: null,
      statistics: null,
      depthMode: null,
      calibrated: false,
      processing: false,
      selectedImageUrl: null,
    }),
}));

/** Global UI flag so any page can hint whether the backend is reachable. */
interface HealthState {
  backendOnline: boolean | null;
  depthMode: "ai" | "fallback" | null;
  setBackendOnline: (online: boolean) => void;
  setDepthMode: (mode: "ai" | "fallback") => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  backendOnline: null,
  depthMode: null,
  setBackendOnline: (backendOnline) => set({ backendOnline }),
  setDepthMode: (depthMode) => set({ depthMode }),
}));