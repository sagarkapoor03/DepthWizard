"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Map, Mountain, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const problems = [
  {
    icon: Map,
    title: "Single image, no elevation",
    text: "Disaster responders often hold one aerial or satellite image per area. Conventional DEM generation demands stereo pairs or LiDAR that may not exist during a crisis window.",
  },
  {
    icon: Mountain,
    title: "Height remains unknown",
    text: "Without elevation information, slope, exposure and drainage cannot be assessed, and 3D situational awareness is impossible to build quickly.",
  },
  {
    icon: Waves,
    title: "Slow downstream analysis",
    text: "Flood depth, landslide and route planning all require a surface model. Waiting days for conventional DEMs loses the response advantage.",
  },
  {
    icon: AlertTriangle,
    title: "Overclaiming relative AI depth",
    text: "Monocular depth is relative. Claiming it is real-world height in metres is scientifically unsound and dangerous for decision support — our pipeline never does that.",
  },
];

export function ProblemSection() {
  return (
    <section className="container py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="max-w-2xl mx-auto text-center mb-12"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">
          The Problem
        </div>
        <h2 className="text-3xl md:text-4xl font-bold">
          Elevation is the missing layer in rapid disaster response
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {problems.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardHeader>
                <p.icon className="h-6 w-6 text-cyan-300 mb-2" />
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">
                  {p.text}
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}