import { useCallback, useEffect, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { useJobStore } from "@/store/jobStore";
import { useHealthStore } from "@/store/jobStore";
import { toast } from "sonner";

/**
 * Polls /api/statistics/:jobId while a job is processing and hydrates the job
 * store once it completes / fails.
 */
export function useJobPolling(jobId: string | null, enabled = true) {
  const startedRef = useRef(false);

  const stop = useCallback(() => {
    startedRef.current = false;
  }, []);

  useEffect(() => {
    if (!jobId || !enabled) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const s = await api.statistics(jobId);
        if (cancelled) return;
        useJobStore.getState().setStats(s);

        if (s.status === "completed") {
          const res = await api.result(jobId);
          if (!cancelled) {
            useJobStore.getState().setProcessing(false);
            useJobStore.getState().setResult(res);
            useJobStore.getState().setStats({
              ...s,
              statistics: res.statistics,
            });
          }
          return; // stop polling
        }
        if (s.status === "error") {
          if (!cancelled) {
            useJobStore.getState().setProcessing(false);
            toast.error(s.error || "Processing failed.");
          }
          return;
        }
        // keep polling
        poll();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          toast.error(err.message);
        }
      }
    };

    const poll = () => {
      if (cancelled) return;
      window.setTimeout(tick, 700);
    };

    startedRef.current = true;
    tick();
    return () => {
      cancelled = true;
    };
  }, [jobId, enabled]);

  return { stop };
}

/** One-time backend health probe used by navbar / notification banners. */
export function useBackendHealth() {
  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((h) => {
        if (cancelled) return;
        useHealthStore.getState().setBackendOnline(true);
        useHealthStore.getState().setDepthMode(h.depth_mode);
      })
      .catch(() => {
        if (cancelled) return;
        useHealthStore.getState().setBackendOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
}