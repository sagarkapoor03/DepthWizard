import Link from "next/link";
import { Satellite } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Satellite className="h-4 w-4 text-cyan-400/70" />
          <span>
            DEPTHWIZARD — Smart India Hackathon 2026 · ISRO PS #26175
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs">
            AI depth is <span className="text-amber-300/90">relative</span> unless
            calibrated with reference data.
          </span>
          <Link
            href="/validate"
            className="text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            Validation
          </Link>
          <Link
            href="https://github.com/IMG-PROCESS-SAC/SIH2026/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Reference
          </Link>
        </div>
      </div>
    </footer>
  );
}