"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  PlayCircle,
  Radar,
  Satellite,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemoLoader } from "@/lib/demo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const },
  }),
};

export function Hero() {
  const { loadDemo, loading } = useDemoLoader();

  return (
    <section className="relative overflow-hidden">
      {/* background glow rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-cyan-500/10 blur-3xl animate-pulseSoft" />
        <div className="absolute top-1/3 right-0 h-[360px] w-[360px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="container relative pt-20 pb-24 text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <Badge variant="default" className="gap-2 mb-6 py-1.5 px-4">
            <Radar className="h-3.5 w-3.5" />
            ISRO Problem Statement #26175 · Disaster Management
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mx-auto max-w-4xl text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
        >
          From One Image to a{" "}
          <span className="text-gradient">Navigable 3D World</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          AI-powered single-view elevation estimation and interactive terrain
          reconstruction.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button asChild size="lg" className="gap-2 text-base">
            <Link href="/upload">
              <Boxes className="h-5 w-5" />
              Start Reconstruction
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-base"
            onClick={loadDemo}
            disabled={loading}
          >
            <PlayCircle className="h-5 w-5 text-cyan-300" />
            {loading ? "Loading demo…" : "Load Demo"}
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <Satellite className="h-4 w-4 text-cyan-400/80" />
            Depth Anything V2
          </span>
          <span className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-400/80" />
            DSM + Slope Analysis
          </span>
          <span className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-cyan-400/80" />
            GeoTIFF / CRS aware
          </span>
        </motion.div>
      </div>
    </section>
  );
}