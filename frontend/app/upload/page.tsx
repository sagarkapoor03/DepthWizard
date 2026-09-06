"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CloudUpload } from "lucide-react";
import { UploadZone } from "@/components/upload/UploadZone";
import { PipelineProgress } from "@/components/pipeline/PipelineProgress";
import { useJobStore } from "@/store/jobStore";
import { useJobPolling } from "@/hooks/useJobPolling";

function UploadContent() {
  const searchParams = useSearchParams();
  const jobFromQuery = searchParams.get("job");
  const autostart = searchParams.get("autostart") === "1";
  const { stats, result, jobId } = useJobStore();

  useJobPolling(jobFromQuery ?? jobId, !!jobFromQuery || autostart);

  const activeJobId = jobFromQuery ?? jobId;

  return (
    <div className="container py-10 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30">
            <CloudUpload className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Upload / Analyze</h1>
            <p className="text-muted-foreground text-sm">
              Upload a single optical RGB remote-sensing image to begin reconstruction.
            </p>
          </div>
        </div>
      </div>

      {activeJobId && (stats?.status === "processing" || stats?.status === "queued") && (
        <div className="mb-8">
          <PipelineProgress
            stages={stats?.stages}
            progress={stats?.progress ?? 0}
            status={stats?.status ?? "queued"}
          />
        </div>
      )}

      {activeJobId && stats?.status === "completed" && result && (
        <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm">
          <p className="font-medium text-emerald-300 mb-1">
            Reconstruction ready — none of the results are shown below. Open the dashboard.
          </p>
        </div>
      )}

      <UploadZone />
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <UploadContent />
    </Suspense>
  );
}