"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="container py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative glass-strong rounded-2xl p-12 md:p-16 text-center overflow-hidden glow-border"
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10" />
        <h2 className="relative text-3xl md:text-5xl font-bold max-w-2xl mx-auto">
          Turn your <span className="text-gradient">single image</span> into
          decision-ready terrain
        </h2>
        <p className="relative mt-4 text-muted-foreground max-w-xl mx-auto">
          Upload an image — or explore the bundled demo — and fly through the
          reconstructed 3D world in seconds.
        </p>
        <div className="relative mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="gap-2 text-base">
            <Link href="/upload">
              <Boxes className="h-5 w-5" />
              Start Reconstruction
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 text-base">
            <Link href="/disaster">
              View Disaster Intel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}