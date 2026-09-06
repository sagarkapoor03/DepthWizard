"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  FileWarning,
  FlaskConical,
  Loader2,
  Ruler,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { ValidateResponse } from "@/lib/types";
import { useJobStore } from "@/store/jobStore";
import { useJobPolling } from "@/hooks/useJobPolling";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/utils";

export function ValidationPanel() {
  const searchParams = useSearchParams();
  const jobFromQuery = searchParams.get("job");
  const { jobId } = useJobStore();
  const activeJob = jobFromQuery ?? jobId;
  useJobPolling(activeJob, !!jobFromQuery);

  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDemo = useCallback(async () => {
    if (!activeJob) return;
    setValidating(true);
    setError(null);
    try {
      const res = await api.validateDemo(activeJob);
      setResult(res);
      toast.success(res.available ? "Validation complete" : "No overlap found");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Validation failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  }, [activeJob]);

  const onUploadReference = useCallback(
    async (file: File | undefined | null) => {
      if (!file || !activeJob) return;
      if (!/\.(tiff?)$/i.test(file.name)) {
        toast.error("Reference data must be a GeoTIFF (.tif/.tiff).");
        return;
      }
      setValidating(true);
      setError(null);
      try {
        const { path } = await api.uploadReference(file);
        const res = await api.validate({ jobId: activeJob, reference: path });
        setResult(res);
        toast.success(res.available ? "Validation complete" : "No overlapping pixels");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Reference upload failed.";
        setError(msg);
        toast.error(msg);
      } finally {
        setValidating(false);
      }
    },
    [activeJob]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="h-4 w-4 text-cyan-300" />
            Estimated vs Reference
          </CardTitle>
          <CardDescription>
            Compare the estimated DSM against a reference DEM. Metrics are never
            fabricated — if no reference is available, the page says so.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeJob && (
            <p className="text-sm text-muted-foreground">
              No job selected. Run a reconstruction first, then come back here.
            </p>
          )}

          {activeJob && !result?.available && !validating && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3">
              <FileWarning className="h-5 w-5 text-amber-300 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-amber-200">
                  Reference data not available.
                </span>
                <p className="text-muted-foreground text-xs mt-1">
                  Upload a reference DEM GeoTIFF (SRTM or similar) covering the
                  same area, or run the synthetic demo reference below.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex">
              <input
                type="file"
                accept=".tif,.tiff"
                className="hidden"
                onChange={(e) => onUploadReference(e.target.files?.[0])}
              />
              <Button variant="outline" size="sm" disabled={!activeJob || validating}>
                <UploadCloud className="h-4 w-4 mr-1.5" />
                Upload reference GeoTIFF
              </Button>
            </label>
            <Button
              variant="glow"
              size="sm"
              disabled={!activeJob || validating}
              onClick={runDemo}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-1.5" />
              )}
              Use synthetic demo reference
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {validating && (
        <div className="flex items-center gap-2 text-sm text-cyan-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validating…
        </div>
      )}

      {result && <MetricsCard result={result} />}
    </div>
  );
}
function MetricsCard({ result }: { result: ValidateResponse }) {
  const m = result.metrics;
  if (!result.available || !m) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Validation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {result.message}
        </CardContent>
      </Card>
    );
  }
  const isDemo = result.message.includes("SYNTHETIC");
  const metricItems = [
    { label: "RMSE", value: `${formatNumber(m.rmse, 2)} m` },
    { label: "MAE", value: `${formatNumber(m.mae, 2)} m` },
    { label: "Correlation", value: formatNumber(m.correlation, 4) },
    { label: "Bias", value: `${formatNumber(m.bias, 2)} m` },
  ];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          Validation Results
        </CardTitle>
        {isDemo && <Badge variant="warning">Synthetic demo reference</Badge>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricItems.map((it) => (
            <div key={it.label} className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="text-lg font-semibold mt-0.5">{it.value}</div>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            • Validated on{" "}
            <span className="font-mono text-foreground">
              {m.n_samples.toLocaleString()}
            </span>{" "}
            overlapping pixels.
          </p>
          <p>• {result.message}</p>
          <p>
            • These metrics describe agreement with the supplied reference —
            {isDemo
              ? " the reference itself is synthetic and NOT a real-world measurement."
              : " accuracy on this scene only, not a global guarantee."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}