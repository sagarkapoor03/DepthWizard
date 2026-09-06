/**
 * DEPTHWIZARD API client.
 *
 * All calls go to the FastAPI backend. The base URL is configured through the
 * NEXT_PUBLIC_API_URL environment variable (see frontend/.env.example).
 */
import type {
  CalibrationResponse,
  GcpPoint,
  HealthResponse,
  JobResult,
  StatisticsResponse,
  UploadResponse,
  ValidateResponse,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the DEPTHWIZARD backend. Make sure it is running on " +
        `${API_BASE} (see README for setup).`,
      0
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data && typeof data.detail === "string"
        ? data.detail
        : data && typeof data.detail === "object"
          ? JSON.stringify(data.detail)
          : `Request failed with status ${res.status}`;
    throw new ApiError(detail, res.status);
  }
  return data as T;
}

export function resultUrl(jobId: string, filename: string): string {
  return `${API_BASE}/api/results/${jobId}/${filename}`;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<UploadResponse>("/api/upload", { method: "POST", body: form });
  },

  analyze: (
    jobId: string,
    opts: {
      mode?: "relative" | "dem" | "gcp";
      referencePath?: string | null;
      gcps?: GcpPoint[];
      smoothSigma?: number;
    } = {}
  ) =>
    request<{ job_id: string; status: string }>("/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        job_id: jobId,
        mode: opts.mode ?? "relative",
        reference_path: opts.referencePath ?? null,
        gcps: opts.gcps ?? null,
        smooth_sigma: opts.smoothSigma ?? 1.5,
      }),
    }),

  demo: () => request<UploadResponse>("/api/demo", { method: "POST" }),

  statistics: (jobId: string) =>
    request<StatisticsResponse>(`/api/statistics/${jobId}`),

  result: (jobId: string) =>
    request<JobResult>(`/api/result/${jobId}`, {
      headers: { "Cache-Control": "no-cache" },
    }),

  calibrate: (
    jobId: string,
    opts: {
      mode?: "relative" | "dem" | "gcp";
      referencePath?: string | null;
      gcps?: GcpPoint[];
    } = {}
  ) =>
    request<CalibrationResponse>("/api/calibrate", {
      method: "POST",
      body: JSON.stringify({
        job_id: jobId,
        mode: opts.mode ?? "relative",
        reference_path: opts.referencePath ?? null,
        gcps: opts.gcps ?? null,
      }),
    }),

  validate: (
    opts: {
      jobId?: string;
      estimated?: string;
      reference?: string;
    }
  ) =>
    request<ValidateResponse>("/api/validate", {
      method: "POST",
      body: JSON.stringify({
        job_id: opts.jobId ?? null,
        estimated: opts.estimated ?? null,
        reference: opts.reference ?? null,
      }),
    }),

  uploadReference: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ path: string }>("/api/reference", {
      method: "POST",
      body: form,
    });
  },

  validateDemo: (jobId: string, estimated?: string) =>
    request<ValidateResponse>("/api/validate-demo", {
      method: "POST",
      body: JSON.stringify({
        job_id: jobId,
        estimated: estimated ?? null,
      }),
    }),
};

/** Fetch + decode the zlib/base64 height map from the backend mesh.json. */
export async function fetchHeightMap(sceneUrl: string): Promise<{
  width: number;
  height: number;
  heights: Float32Array;
}> {
  const res = await fetch(sceneUrl, { cache: "no-store" });
  if (!res.ok) throw new ApiError("Unable to fetch terrain mesh file.", res.status);
  const scene = (await res.json()) as {
    width: number;
    height: number;
    encoded: string;
  };
  // base64 -> Uint8Array
  const bin = atob(scene.encoded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  // zlib (RFC 1950) inflate via CompressionStream
  const stream = new Blob([bytes]).stream().pipeThrough(
    new DecompressionStream("deflate")
  );
  const buf = await new Response(stream).arrayBuffer();
  return {
    width: scene.width,
    height: scene.height,
    heights: new Float32Array(buf),
  };
}