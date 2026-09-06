"use client";

import { motion } from "framer-motion";
import { MountainSnow, Route, Satellite, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const apps = [
  {
    icon: Waves,
    title: "Flood analysis",
    text: "Low-elevation regions are extracted from the DSM and combined with slope to highlight areas that are likely flood-prone during heavy rain.",
  },
  {
    icon: MountainSnow,
    title: "Landslide screening",
    text: "Steep-slope classes (15–30° and >30°) are computed from the terrain and overlaid on the 3D model for quick visual screening.",
  },
  {
    icon: Route,
    title: "Emergency route insight",
    text: "The elevation surface exposes terrain barriers, ridges and valley crossings that affect route feasibility for ground crews.",
  },
  {
    icon: Satellite,
    title: "Rapid 3D awareness",
    text: "A fully textured, navigable 3D scene of the affected terrain is available within minutes of upload — no stereo pairs required.",
  },
];

export function DisasterApplications() {
  return (
    <section className="container py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto text-center mb-8"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-3">
          Disaster Management
        </div>
        <h2 className="text-3xl md:text-4xl font-bold">
          Decision-support, not guaranteed prediction
        </h2>
        <p className="mt-4 text-muted-foreground">
          Every analysis is clearly framed as assistance for human analysts and
          first responders — never as an automatic disaster verdict.
        </p>
      </motion.div>

      <div className="flex justify-center mb-10">
        <Badge variant="warning" className="gap-2">
          Analyses are advisory and must be confirmed against ground truth
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {apps.map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <a.icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{a.text}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}