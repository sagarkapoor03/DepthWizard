"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Boxes, FileImage, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/api";
import type { JobResult } from "@/lib/types";
import { useJobStore } from "@/store/jobStore";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useExplorerStore } from "@/store/explorerStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TerrainViewer = dynamic(() => import("@/components/three/TerrainViewer").then((m) => m.TerrainViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        Initialising WebGL viewer…
      </div>
    </div>
  ),
});

const ExploreControls = dynamic(() => import("@/components/explore/ExploreControls").then((m) => m.ExploreControls), {
  ssr: false,
});

function ExploreContent() {
  const searchParams = useSearchParams();
  const jobFromQuery = searchParams.get("job");
  const { jobId, result, stats } = useJobStore();
  const [localResult, setLocalResult] = useState<JobResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeJob = jobFromQuery ?? jobId;
  useJobPolling(activeJob, !!jobFromQuery);

  useEffect(() => {
    if (!activeJob) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.result(activeJob);
        if (!cancelled) setLocalResult(res);
      } catch {
        /* still processing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeJob]);

  const finalResult = result ?? localResult;
  const dsm = finalResult?.statistics?.dsm;
  const calibrated = !!dsm?.calibrated;
  const units = dsm?.units ?? "relative";
  const crs = finalResult?.statistics?.input.crs;

  useEffect(() => {
    useExplorerStore.getState().reset();
  }, [activeJob]);

  const onFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      el.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  if (!activeJob) {
    return (
      <div className="container py-24 max-w-lg text-center">
        <FileImage className="h-12 w-12 text-cyan-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">3D Explorer</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Generate a reconstruction first — then fly through it here.
        </p>
        <Button asChild>
          <Link href="/upload">
            <Boxes className="h-4 w-4 mr-1.5" />
            Go to Upload
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
    >
      <div className="relative flex-1">
        <TerrainViewer jobId={activeJob} />
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <Badge variant={calibrated ? "success" : "warning"}>
            {calibrated ? "Metric DSM" : "Relative DSM"}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {activeJob.slice(0, 8)}…
          </Badge>
          {stats?.status === "processing" && (
            <Badge variant="secondary" className="gap-1 text-cyan-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              processing
            </Badge>
          )}
        </div>
      </div>

      {/* left control panel (overlay) */}
      <div className="absolute left-3 top-16 bottom-3 z-10 w-64 xl:w-72">
        <div className="glass-strong h-full rounded-xl shadow-2xl">
          <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Control Panel
            </span>
            {/* placeholder for future panel toggling */}
          </div>
          <ExploreControls
            calibrated={calibrated}
            units={units}
            onFullscreen={onFullscreen}
            crs={crs}
          />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <ExploreContent />
    </Suspense>
  );
}