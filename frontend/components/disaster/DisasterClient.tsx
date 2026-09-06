"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Crosshair,
  MountainSnow,
  Mountain,
  Radar,
  Route,
  Satellite,
  ShieldAlert,
  Waves,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { JobStatistics } from "@/lib/types";
import { useJobStore } from "@/store/jobStore";
import { useJobPolling } from "@/hooks/useJobPolling";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatNumber } from "@/lib/utils";

const SLOPE_COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#f87171"];
const SLOPE_LABELS = ["Flat <5°", "Moderate 5-15°", "Steep 15-30°", "Very steep >30°"];

export function DisasterClient() {
  const searchParams = useSearchParams();
  const jobFromQuery = searchParams.get("job");
  const { jobId, result, statistics } = useJobStore();
  const [localStats, setLocalStats] = useState<JobStatistics | null>(null);

  const activeJob = jobFromQuery ?? jobId;
  useJobPolling(activeJob, !!jobFromQuery);

  useEffect(() => {
    if (!activeJob) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.result(activeJob);
        if (!cancelled && res.statistics) setLocalStats(res.statistics);
      } catch {
        /* still processing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeJob]);

  const stats: JobStatistics | null =
    statistics ?? localStats ?? result?.statistics ?? null;

  if (!activeJob) return <EmptyDisaster />;
  if (!stats) {
    return (
      <div className="container py-24 text-center text-muted-foreground">
        Waiting for reconstruction results…
      </div>
    );
  }

  const dsm = stats.dsm;
  const slope = stats.slope;
  const classes = slope.classes ?? { flat: 0, moderate: 0, steep: 0, very_steep: 0 };
  const calibrated = !!dsm.calibrated;

  const slopePie = SLOPE_LABELS.map((label, i) => ({
    name: label,
    value: Math.round((classes[["flat", "moderate", "steep", "very_steep"][i]] ?? 0) * 100),
  }));

  const hist = dsm.histogram;
  const histData = hist && hist.counts.length
    ? hist.counts.map((c, i) => ({
        bin: `${formatNumber(hist.edges[i], 1)}–${formatNumber(hist.edges[i + 1], 1)}`,
        pixels: c,
      }))
    : [];

  const lowElevPct = computeLowElevationPct(hist, dsm);
  const floodRisk = dsm.min / Math.max(1, dsm.max) < 0.45 ? "Moderate" : "Low";

  // Flood stage slider state - derived from DSM elevation range
  const dsmRange = dsm.max - dsm.min;
  const [floodLevel, setFloodLevel] = useState(dsm.min + dsmRange * 0.3);
  const floodPercent = computeFloodPercent(hist, dsm, floodLevel);
  const floodDepth = Math.max(0, floodLevel - dsm.min);
  const floodRiskLevel = floodPercent > 30 ? "High" : floodPercent > 15 ? "Moderate" : "Low";

  return (
    <div className="container py-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30">
            <ShieldAlert className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Disaster Intelligence</h1>
            <p className="text-muted-foreground text-sm">
              Decision-support analyses derived from the reconstructed DSM.
            </p>
          </div>
        </div>
        <Badge variant="warning" className="w-fit">
          Advisory — verify against ground truth before operational use
        </Badge>
      </header>
<div className="grid md:grid-cols-2 gap-4">
        <AnalysisCard
          icon={Waves}
          title="Flood Stage Analysis"
          accent="text-cyan-300"
          badge={<Badge variant="warning">{floodRiskLevel} risk</Badge>}
        >
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Water Level</span>
                <span className="font-mono text-cyan-300">
                  {formatNumber(floodLevel, 2)} {calibrated ? "m" : "u"}
                </span>
              </div>
              <Slider
                value={[floodLevel]}
                min={dsm.min}
                max={dsm.max}
                step={dsmRange > 0 ? dsmRange / 100 : 0.01}
                onValueChange={(v) => setFloodLevel(v[0])}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Min: {formatNumber(dsm.min, 2)}</span>
                <span>Max: {formatNumber(dsm.max, 2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
                <div className="text-lg font-bold text-cyan-300">{formatNumber(floodPercent, 1)}%</div>
                <div className="text-[10px] text-muted-foreground">Area flooded</div>
              </div>
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
                <div className="text-lg font-bold text-cyan-300">{formatNumber(floodDepth, 2)}</div>
                <div className="text-[10px] text-muted-foreground">Max depth ({calibrated ? "m" : "u"})</div>
              </div>
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
                <div className="text-lg font-bold text-cyan-300">{formatNumber(floodLevel, 2)}</div>
                <div className="text-[10px] text-muted-foreground">Water level ({calibrated ? "m" : "u"})</div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              PROTOTYPE: Terrain-based flood screening. Assumes flat water surface at selected level.
              Not hydrologically accurate.
            </p>
          </div>
        </AnalysisCard>

        <AnalysisCard
          icon={MountainSnow}
          title="Landslide Screening"
          accent="text-amber-300"
          badge={
            <Badge variant={classes.very_steep > 0.05 ? "destructive" : "success"}>
              {classes.very_steep > 0.05 ? "watch steep zones" : "low very-steep share"}
            </Badge>
          }
        >
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>
              • Steep (15–30°):{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(classes.steep * 100, 1)}%
              </span>
            </li>
            <li>
              • Very steep (&gt;30°):{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(classes.very_steep * 100, 1)}%
              </span>
            </li>
            <li>
              • Max slope: <span className="font-mono">{formatNumber(slope.max)}°</span>, mean{" "}
              <span className="font-mono">{formatNumber(slope.mean)}°</span>
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-amber-300/80">
            Slope is screened from the DSM; lithology, soil moisture and rainfall
            history decide actual landslide susceptibility.
          </p>
        </AnalysisCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <AnalysisCard icon={Route} title="Emergency Route Support" accent="text-emerald-300">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                <div className="text-lg font-bold text-emerald-300">{formatNumber(classes.flat * 100, 1)}%</div>
                <div className="text-[10px] text-muted-foreground">Accessible (flat)</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                <div className="text-lg font-bold text-amber-300">{formatNumber(classes.moderate * 100, 1)}%</div>
                <div className="text-[10px] text-muted-foreground">Moderate slope</div>
              </div>
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2 text-center">
                <div className="text-lg font-bold text-orange-300">{formatNumber(classes.steep * 100, 1)}%</div>
                <div className="text-[10px] text-muted-foreground">Steep (15-30°)</div>
              </div>
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
                <div className="text-lg font-bold text-red-300">{formatNumber(classes.very_steep * 100, 1)}%</div>
                <div className="text-[10px] text-muted-foreground">Blocked (&gt;30°)</div>
              </div>
            </div>
            {/* Terrain accessibility legend */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400"></span> Low cost</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"></span> Medium</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400"></span> High</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400"></span> Blocked</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              PROTOTYPE: Terrain cost based on slope analysis. Low slope = preferred routes.
              Very steep areas (&gt;30°) marked as likely inaccessible.
            </p>
            <Button asChild size="sm" variant="outline" className="gap-2 w-full">
              <Link href={`/explore?job=${activeJob}`}>
                <Crosshair className="h-4 w-4" />
                Inspect terrain in 3D
              </Link>
            </Button>
          </div>
        </AnalysisCard>

        <AnalysisCard
          icon={Satellite}
          title="Rapid 3D Situation Awareness"
          accent="text-fuchsia-300"
          badge={
            <Badge variant="secondary">
              {calibrated ? "metric values" : "relative values"}
            </Badge>
          }
        >
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Full textured terrain ready for first-person and orbit navigation.</li>
            <li>• Click-to-measure elevation and slope at any point.</li>
            <li>
              • {calibrated ? "Metric elevations (m)" : "Relative elevations — not metric"} in
              this scene.
            </li>
          </ul>
          <div className="mt-3">
            <Button asChild size="sm" variant="glow" className="gap-2">
              <Link href={`/explore?job=${activeJob}`}>
                <Satellite className="h-4 w-4" />
                Open 3D Explorer
              </Link>
            </Button>
          </div>
        </AnalysisCard>
      </div>
<div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Mountain className="h-4 w-4 text-cyan-300" />
              Slope class distribution (% of scene)
            </CardTitle>
            <CardDescription>Computed from the DSM slope analysis.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slopePie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {slopePie.map((_, i) => (
                    <Cell key={i} fill={SLOPE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
              </PieChart>
            </ResponsiveContainer>
            <LegendRow />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Radar className="h-4 w-4 text-cyan-300" />
              Elevation distribution
            </CardTitle>
            <CardDescription>
              Real histogram of reconstructed{" "}
              {calibrated ? "elevation (m)" : "relative elevation"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 overflow-hidden">
            {histData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="bin" tick={{ fontSize: 9 }} interval={0} angle={-30} height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                  <Bar dataKey="pixels" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No histogram computed for this job.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function computeLowElevationPct(
  hist: { edges: number[]; counts: number[] } | undefined,
  dsm: JobStatistics["dsm"]
): number {
  if (!hist || !hist.counts.length) {
    const midpoint = (dsm.min + dsm.max) / 2;
    const below = Math.max(0, midpoint - dsm.mean) / Math.max(1, dsm.max - dsm.min);
    return Math.min(100, below * 100);
  }
  const span = hist.edges[hist.edges.length - 1] - hist.edges[0];
  if (span <= 0) return 0;
  const quartile = hist.edges[0] + span * 0.25;
  let total = 0;
  let below = 0;
  for (let i = 0; i < hist.counts.length; i++) {
    total += hist.counts[i];
    if (hist.edges[i + 1] <= quartile) below += hist.counts[i];
  }
  return total > 0 ? (below / total) * 100 : 0;
}

/**
 * Calculate the percentage of terrain below a given water level.
 * Uses the DSM histogram to compute the flooded area percentage.
 */
function computeFloodPercent(
  hist: { edges: number[]; counts: number[] } | undefined,
  dsm: JobStatistics["dsm"],
  waterLevel: number
): number {
  if (!hist || !hist.counts.length) {
    // Fallback: estimate based on mean position
    if (dsm.max <= dsm.min) return 0;
    const ratio = Math.max(0, Math.min(1, (waterLevel - dsm.min) / (dsm.max - dsm.min)));
    return ratio * 100;
  }
  let total = 0;
  let below = 0;
  for (let i = 0; i < hist.counts.length; i++) {
    total += hist.counts[i];
    if (hist.edges[i + 1] <= waterLevel) {
      below += hist.counts[i];
    } else if (hist.edges[i] < waterLevel) {
      // Partial bin - interpolate
      const binWidth = hist.edges[i + 1] - hist.edges[i];
      if (binWidth > 0) {
        const fraction = (waterLevel - hist.edges[i]) / binWidth;
        below += hist.counts[i] * fraction;
      }
    }
  }
  return total > 0 ? (below / total) * 100 : 0;
}

function LegendRow() {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] text-muted-foreground">
      {SLOPE_LABELS.map((label, i) => (
        <span key={label} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: SLOPE_COLORS[i] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function AnalysisCard({
  icon: Icon,
  title,
  accent,
  badge,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-3">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${accent}`} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {badge}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyDisaster() {
  return (
    <div className="container py-24 max-w-xl text-center">
      <ShieldAlert className="h-12 w-12 text-cyan-300 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Disaster Intelligence</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Reconstruct a scene first — then inspect flood, landslide and route
        insights from its DSM.
      </p>
      <Button asChild>
        <Link href="/upload">Go to Upload</Link>
      </Button>
    </div>
  );
}