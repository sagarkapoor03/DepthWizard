"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Boxes,
  Clock,
  FileImage,
  Globe,
  Hash,
  Image as ImageIcon,
  Layers,
  Loader2,
  Mountain,
  Play,
} from "lucide-react";
import { api, resultUrl, API_BASE } from "@/lib/api";
import type { JobResult, JobStatistics } from "@/lib/types";
import { useJobStore } from "@/store/jobStore";
import { useJobPolling } from "@/hooks/useJobPolling";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineProgress } from "@/components/pipeline/PipelineProgress";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/utils";

export function DashboardClient() {
  const searchParams = useSearchParams();
  const jobFromQuery = searchParams.get("job");
  const autostart = searchParams.get("autostart") === "1";
  const { stats, result, jobId, statistics } = useJobStore();
  const [localResult, setLocalResult] = useState<JobResult | null>(null);

  const activeJob = jobFromQuery ?? jobId;

  useJobPolling(activeJob, !!jobFromQuery || autostart);

  // Fetch the full result payload (file URLs) once available.
  useEffect(() => {
    if (!activeJob) return;
    let cancelled = false;
    setLocalResult(null);
    const load = async () => {
      try {
        const res = await api.result(activeJob);
        if (!cancelled) setLocalResult(res);
      } catch {
        /* still processing - poller will refresh */
      }
    };
    load();
    const id = window.setInterval(async () => {
      try {
        const res = await api.result(activeJob);
        if (!cancelled) setLocalResult(res);
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeJob]);

  const jobStatus = stats?.status ?? "queued";
  const finalResult = result ?? localResult;
  const finalStats: JobStatistics | null =
    finalResult?.statistics ?? statistics ?? ((stats?.statistics ?? null) as JobStatistics | null);
  const isProcessing = jobStatus === "processing" || jobStatus === "queued";

  if (!activeJob) {
    return <EmptyState />;
  }

  return (
    <div className="container py-8 space-y-6">
      <Header jobId={activeJob} isProcessing={isProcessing} statistics={finalStats} />

      {(isProcessing || !finalStats) && (
        <PipelineProgress stages={stats?.stages} progress={stats?.progress ?? 0} status={jobStatus} />
      )}

      {finalStats ? (
        <>
          <VisualCards result={finalResult} stats={finalStats} />
          <StatisticsGrid statistics={finalStats} />
          <CalibrationPanel jobId={activeJob} statistics={finalStats} />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="glow" className="gap-2">
              <Link href={`/explore?job=${activeJob}`}>
                <Boxes className="h-5 w-5" />
                Open 3D Explorer
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href={`/disaster?job=${activeJob}`}>
                <Activity className="h-5 w-5" />
                Disaster Intelligence
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href={`/validate?job=${activeJob}`}>
                <ArrowRight className="h-5 w-5" />
                Validate vs Reference
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
function Header({
  jobId,
  isProcessing,
  statistics,
}: {
  jobId: string;
  isProcessing: boolean;
  statistics: JobStatistics | null;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Analysis Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          <span className="font-mono text-xs bg-secondary rounded px-2 py-0.5">
            {jobId.slice(0, 8)}…
          </span>
          {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
          {statistics && (
            <Badge variant={statistics.dsm.calibrated ? "success" : "warning"}>
              {statistics.dsm.calibrated ? "Metric DSM" : "Relative DSM (not metric)"}
            </Badge>
          )}
        </p>
      </div>
      {statistics && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1.5">
            <Globe className="h-3 w-3" />
            {statistics.input.georeferenced ? "Georeferenced" : "Non-georeferenced"}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Hash className="h-3 w-3" />
            {statistics.input.width}×{statistics.input.height}
          </Badge>
        </div>
      )}
    </div>
  );
}

function VisualCards({ result, stats }: { result: JobResult | null; stats: JobStatistics }) {
  const base = result?.files ?? {};
  const jobId = result?.job_id;
  const cards = [
    { key: "input_rgb", label: "Original Image", icon: ImageIcon },
    { key: "depth_color", label: "AI Depth Map", icon: Layers },
    { key: "dsm_color", label: "DSM / Elevation", icon: Mountain },
    { key: "slope_heatmap", label: "Slope Heatmap", icon: Activity },
  ];
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {cards.map(({ key, label, icon: Icon }) => {
        const relUrl = base[key]?.url;
        const url = relUrl ? (relUrl.startsWith("http") ? relUrl : `${API_BASE}${relUrl}`) : null;
        return (
          <Card key={key} className="overflow-hidden">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="h-4 w-4 text-cyan-300" />
                {label}
              </CardTitle>
              {key === "dsm_color" && !stats.dsm.calibrated && (
                <Badge variant="warning" className="text-[10px]">
                  Relative
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-border bg-black/20 relative aspect-[4/3]">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={label} className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    No preview
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatisticsGrid({ statistics }: { statistics: JobStatistics }) {
  const items = [
    {
      label: "Min Elevation",
      value: formatNumber(statistics.dsm.min),
      unit: statistics.dsm.units === "metric" ? "m" : "",
    },
    {
      label: "Max Elevation",
      value: formatNumber(statistics.dsm.max),
      unit: statistics.dsm.units === "metric" ? "m" : "",
    },
    {
      label: "Mean Elevation",
      value: formatNumber(statistics.dsm.mean),
      unit: statistics.dsm.units === "metric" ? "m" : "",
    },
    { label: "Mean Slope", value: `${formatNumber(statistics.slope.mean)}°`, unit: "" },
    { label: "Resolution", value: `${statistics.input.width}×${statistics.input.height}`, unit: "px" },
    { label: "Processing Time", value: `${statistics.processing_time_s.toFixed(1)}s`, unit: "" },
    { label: "Input Type", value: statistics.input.input_type, unit: "" },
    { label: "Georeferenced", value: statistics.input.georeferenced ? "Yes" : "No", unit: "" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-300" />
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-lg font-semibold mt-0.5 text-foreground inline-flex items-baseline gap-1">
              {it.value}
              {it.unit && (
                <span className="text-xs text-muted-foreground font-normal">{it.unit}</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function CalibrationPanel({ jobId, statistics }: { jobId: string; statistics: JobStatistics }) {
  const cal = statistics.calibration;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-300" />
          Calibration
        </CardTitle>
        <Badge variant={cal.calibrated ? "success" : "warning"}>
          {cal.calibrated ? `Calibrated (${cal.mode})` : "Relative-only mode"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">Mode</div>
            <div className="font-semibold mt-0.5 capitalize">{cal.mode}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">Scale / Offset</div>
            <div className="font-mono text-xs mt-1.5">
              {formatNumber(cal.scale, 4)} / {formatNumber(cal.offset, 2)}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">Samples / R²</div>
            <div className="font-mono text-xs mt-1.5">
              {cal.n_samples} / {cal.r_squared !== null ? formatNumber(cal.r_squared, 3) : "—"}
            </div>
          </div>
        </div>
        {cal.notes.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            {cal.notes.map((n, i) => (
              <p key={i}>• {n}</p>
            ))}
          </div>
        )}
        {!cal.calibrated && (
          <p className="mt-3 text-xs text-amber-300/90">
            This scan used no reference data. Relative values describe shape, not
            real-world metres. Upload a reference DEM or GCPs to calibrate.
          </p>
        )}
      </CardContent>
      <Separator />
      <CardContent className="pt-4">
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href={`/validate?job=${jobId}`}>
            <Play className="h-4 w-4" />
            Calibrate with reference data
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="container py-24 max-w-xl">
      <div className="text-center glass rounded-2xl p-12">
        <FileImage className="h-12 w-12 text-cyan-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">No job selected</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Upload an image or load the built-in demo to see the analysis dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link href="/upload">Upload an image</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}