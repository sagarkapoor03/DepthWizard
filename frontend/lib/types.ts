// DEPTHWIZARD shared frontend types (mirror of the backend schemas)

export type DepthMode = "ai" | "fallback";
export type JobStatus = "queued" | "processing" | "completed" | "error";
export type StageState = "pending" | "processing" | "completed" | "error";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  depth_mode: DepthMode;
  model_name: string | null;
  device: string;
  demo_file: string | null;
}

export interface UploadResponse {
  job_id: string;
  filename: string;
  size_bytes: number;
  extension: string;
  input_type: "georeferenced" | "image";
  georeferenced: boolean;
  crs: string | null;
  resolution: number[] | null;
  bounds: number[] | null;
  width: number;
  height: number;
  mode: DepthMode;
  message?: string;
}

export interface StageStatus {
  name: string;
  status: StageState;
  detail?: string;
}

export interface StatisticsResponse {
  job_id: string;
  status: JobStatus;
  current_stage: string | null;
  progress: number;
  stages: StageStatus[];
  statistics: JobStatistics | null;
  messages: string[];
  error: string | null;
}

export interface ResultFile {
  url: string;
  mime: string;
  kind: string;
}

export interface JobResult {
  job_id: string;
  status: JobStatus;
  files: Record<string, ResultFile>;
  statistics: JobStatistics | null;
  metadata: Record<string, unknown> | null;
}

export interface JobStatistics {
  job_id: string;
  status: string;
  depth_mode: DepthMode;
  model_name: string | null;
  calibration: {
    mode: string;
    scale: number;
    offset: number;
    n_samples: number;
    r_squared: number | null;
    calibrated: boolean;
    notes: string[];
  };
  depth: Record<string, number>;
  dsm: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    units: "metric" | "relative";
    calibrated: boolean;
    histogram?: { edges: number[]; counts: number[]; bins: number };
  };
  slope: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    classes: Record<string, number>;
  };
  mesh: {
    width: number;
    height: number;
    min_elevation: number;
    max_elevation: number;
    span: number;
    units: "metric" | "relative";
    calibrated: boolean;
    georeferenced: boolean;
  };
  input: {
    filename: string;
    width: number;
    height: number;
    georeferenced: boolean;
    crs: string | null;
    input_type: string;
  };
  processing_time_s: number;
  generated_at: string;
}

export interface CalibrationResponse {
  job_id: string;
  mode: "relative" | "dem" | "gcp";
  scale: number;
  offset: number;
  n_samples: number;
  r_squared: number | null;
  notes: string[];
  calibrated: boolean;
}

export interface ValidationMetrics {
  n_samples: number;
  rmse: number;
  mae: number;
  correlation: number;
  bias: number;
}

export interface ValidateResponse {
  job_id: string | null;
  available: boolean;
  metrics: ValidationMetrics | null;
  message: string;
}

export interface GcpPoint {
  x: number;
  y: number;
  elevation: number;
}

export interface MeshScene {
  width: number;
  height: number;
  min_elevation: number;
  max_elevation: number;
  span: number;
  units: "metric" | "relative";
  calibrated: boolean;
  georeferenced: boolean;
  bounds: number[] | null;
  encoded: string;
  dtype: "float32";
  compression: "zlib";
}