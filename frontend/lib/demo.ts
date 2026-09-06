import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useJobStore } from "@/store/jobStore";

/**
 * "Load Demo" — asks the backend to create a job from the bundled synthetic
 * demo image, then jumps to the dashboard where analysis starts automatically.
 */
export function useDemoLoader() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const upload = await api.demo();
      useJobStore.getState().setUpload(upload);
      useJobStore.getState().setJobId(upload.job_id);
      toast.info("Demo image loaded — the synthetic demo scene is being processed.");
      router.push(`/dashboard?job=${upload.job_id}&autostart=1`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load the demo image.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  return { loadDemo, loading, error };
}