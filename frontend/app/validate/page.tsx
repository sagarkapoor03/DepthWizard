import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { ValidationPanel } from "@/components/validate/ValidationPanel";

export default function ValidatePage() {
  return (
    <div className="container py-10 max-w-3xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30">
          <ShieldAlert className="h-6 w-6 text-cyan-300" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Validation</h1>
          <p className="text-muted-foreground text-sm">
            Estimated DSM vs reference DEM — honest accuracy reporting only.
          </p>
        </div>
      </div>
      <Suspense fallback={<div className="py-20 text-center">Loading…</div>}>
        <ValidationPanel />
      </Suspense>
    </div>
  );
}