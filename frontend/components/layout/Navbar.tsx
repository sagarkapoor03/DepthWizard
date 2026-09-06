"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Menu, Satellite, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackendHealth } from "@/hooks/useJobPolling";
import { useHealthStore } from "@/store/jobStore";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explore", label: "3D Explorer" },
  { href: "/disaster", label: "Disaster Intel" },
  { href: "/validate", label: "Validation" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useBackendHealth();
  const backendOnline = useHealthStore((s) => s.backendOnline);
  const depthMode = useHealthStore((s) => s.depthMode);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 glow-border">
            <Satellite className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-[0.18em] text-sm">
              DEPTH<span className="text-gradient">WIZARD</span>
            </div>
            <div className="text-[10px] text-muted-foreground tracking-wide uppercase">
              ISRO · SIH 2026 #26175
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors hover:text-foreground",
                  active
                    ? "text-cyan-300 bg-primary/10"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs rounded-full border px-3 py-1",
              backendOnline === false
                ? "border-red-500/30 text-red-300"
                : "border-emerald-500/30 text-emerald-300"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                backendOnline === false
                  ? "bg-red-400"
                  : "bg-emerald-400 animate-pulseSoft"
              )}
            />
            {backendOnline === false
              ? "Backend offline"
              : depthMode === "fallback"
                ? "Circuit: DEMO"
                : "Backend online"}
          </div>
          <Button asChild size="sm" variant="glow">
            <Link href="/upload">
              <Boxes className="h-4 w-4 mr-1.5" />
              Reconstruct
            </Link>
          </Button>
        </div>

        <button
          className="md:hidden text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <nav className="container py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2.5 text-sm rounded-md text-muted-foreground hover:bg-secondary/60"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/upload" className="px-3 py-2.5 text-sm rounded-md text-cyan-300 hover:bg-secondary/60">
              Start Reconstruction
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}