"use client";

import { motion } from "framer-motion";
import { Layers, FlaskConical, Mountain, Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const tech = [
  {
    group: "Frontend",
    icon: Layers,
    items: [
      "Next.js 14 + TypeScript",
      "Tailwind CSS + shadcn/ui",
      "Three.js · React Three Fiber · drei",
      "Zustand · Framer Motion · Recharts",
    ],
  },
  {
    group: "AI",
    icon: FlaskConical,
    items: [
      "Depth Anything V2",
      "Hugging Face Transformers",
      "PyTorch (CPU/GPU auto)",
      "Graceful DEMO fallback mode",
    ],
  },
  {
    group: "GIS",
    icon: Mountain,
    items: [
      "Rasterio GeoTIFF I/O",
      "CRS / transform / bounds handling",
      "DSM & slope rasters",
      "Reference DEM / GCP calibration",
    ],
  },
  {
    group: "Backend",
    icon: Radar,
    items: [
      "FastAPI + Uvicorn",
      "Pydantic schemas + Swagger",
      "UUID job processing",
      "async pipeline status polling",
    ],
  },
];

export function Technology() {
  return (
    <section className="container py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto text-center mb-12"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">
          Technology
        </div>
        <h2 className="text-3xl md:text-4xl font-bold">A modern geo-AI software stack</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tech.map((t, i) => (
          <motion.div
            key={t.group}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <Card className="h-full glass hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <t.icon className="h-5 w-5 text-cyan-300" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {t.group}
                  </span>
                </div>
                <ul className="space-y-2">
                  {t.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-cyan-400/70 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}