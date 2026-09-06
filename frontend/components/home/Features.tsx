"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Boxes,
  Cpu,
  Download,
  LineChart,
  Map,
  Mountain,
  Ruler,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Cpu,
    title: "Monocular AI depth",
    text: "Pretrained Depth Anything V2 via Hugging Face Transformers with a labelled fallback mode when the model is unavailable.",
  },
  {
    icon: Map,
    title: "GeoTIFF aware",
    text: "CRS, affine transform, bounds and resolution are read with rasterio and preserved when exporting DSM rasters.",
  },
  {
    icon: Ruler,
    title: "Explicit calibration",
    text: "Relative-only, DEM-assisted and GCP-assisted modes. Linear regression against reference elevation samples, with documented assumptions.",
  },
  {
    icon: Mountain,
    title: "DSM + slope",
    text: "Smooth elevation surface with full statistics plus slope maps and heatmap classification for hazard screening.",
  },
  {
    icon: Boxes,
    title: "Interactive 3D terrain",
    text: "React Three Fiber terrain with the original image as texture, wireframe, exaggeration, orbit and first-person flight.",
  },
  {
    icon: Activity,
    title: "Height measurement",
    text: "Click any terrain point for X / Y / elevation / slope — including an explicit “Relative Height — Not Metric” mode.",
  },
  {
    icon: LineChart,
    title: "Validation",
    text: "RMSE, MAE and correlation versus reference DEMs when data is provided. No fabricated accuracy values.",
  },
  {
    icon: Download,
    title: "Clean exports",
    text: "GeoTIFF DSM for georeferenced inputs plus PNG previews of depth, DSM and slope heatmaps.",
  },
];

export function Features() {
  return (
    <section className="container py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto text-center mb-12"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">
          Key Features
        </div>
        <h2 className="text-3xl md:text-4xl font-bold">Built for a serious prototype, not a toy</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 4) * 0.08, duration: 0.5 }}
          >
            <Card className="h-full group hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <CardTitle className="text-sm leading-tight">{f.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}