import { Suspense } from "react";
import { DisasterClient } from "@/components/disaster/DisasterClient";

export default function DisasterPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <DisasterClient />
    </Suspense>
  );
}