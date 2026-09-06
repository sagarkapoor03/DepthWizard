import { Suspense } from "react";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading dashboard…</div>}>
      <DashboardClient />
    </Suspense>
  );
}