"use client";

import { motion } from "framer-motion";
import { Boxes, Compass, Cpu, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const steps = [
  {
    icon: Boxes,
    step: "01",
    title: "Upload",
    text: "Drop a single JPG, PNG, TIFF or GeoTIFF. Georeferencing (CRS, transform, bounds) is read automatically.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Depth",
    text: "Depth Anything V2 estimates a dense relative depth map from the single RGB image.",
  },
  {
    icon: Ruler,
    step: "03",
    title: "Calibrate & DSM",
    text: "With reference DEM or GCPs a robust linear fit converts relative depth into metric elevation. Without them the result is clearly labelled RELATIVE.",
  },
  {
    icon: Compass,
    step: "04",
    title: "Explore",
    text: "Fly over a textured 3D terrain, measure heights and slopes, and inspect flood/landslide zones.",
  },
];

export function HowItWorks() {
  return (
    <section className="container py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto text-center mb-12"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">
          How It Works
        </div>
        <h2 className="text-3xl md:text-4xl font-bold">One RGB image → navigable 3D world</h2>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <Card className="relative h-full overflow-hidden hover:border-primary/40 transition-colors">
              <div className="absolute -right-3 -top-5 text-7xl font-black text-primary/5 select-none">
                {s.step}
              </div>
              <CardHeader>
                <s.icon className="h-6 w-6 text-cyan-300 mb-2" />
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{s.text}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}