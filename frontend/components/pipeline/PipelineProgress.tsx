"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { StageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const STAGE_ICONS: Record<StageStatus["status"], React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground/60" />,
  processing: <Loader2 className="h-4 w-4 text-cyan-300 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
};

export function PipelineProgress({
  stages,
  progress,
  status,
}: {
  stages: StageStatus[] | undefined;
  progress: number;
  status: string;
}) {
  if (!stages?.length) return null;
  const errorStage = stages.some((s) => s.status === "error");

  return (
    <div className="rounded-xl border border-border bg-card/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider">Processing Pipeline</h4>
        <span
          className={cn(
            "text-xs rounded-full px-3 py-1 border",
            status === "completed"
              ? "border-emerald-500/30 text-emerald-300"
              : errorStage
                ? "border-red-500/30 text-red-300"
                : "border-cyan-500/30 text-cyan-300 animate-pulseSoft"
          )}
        >
          {status === "completed" ? "COMPLETE" : errorStage ? "ERROR" : "PROCESSING"}
        </span>
      </div>

      <Progress value={Math.round(progress * 100)} />

      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {stages.map((stage) => (
          <li
            key={stage.name}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
              stage.status === "pending" && "border-border/50 bg-background/30 text-muted-foreground",
              stage.status === "processing" && "border-cyan-500/30 bg-cyan-500/5 text-cyan-200",
              stage.status === "completed" && "border-emerald-500/20 bg-emerald-500/5 text-muted-foreground",
              stage.status === "error" && "border-red-500/30 bg-red-500/5 text-red-300"
            )}
          >
            {STAGE_ICONS[stage.status]}
            <span className="font-medium">{stage.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}