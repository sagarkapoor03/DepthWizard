"use client";

import {
  Crosshair,
  Maximize,
  Orbit as OrbitIcon,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/store/explorerStore";
import { formatNumber } from "@/lib/utils";

interface ExploreControlsProps {
  calibrated: boolean;
  units: "metric" | "relative";
  onFullscreen: () => void;
  crs?: string | null;
}

export function ExploreControls({
  calibrated,
  units,
  onFullscreen,
  crs,
}: ExploreControlsProps) {
  const wireframe = useExplorerStore((s) => s.wireframe);
  const texture = useExplorerStore((s) => s.texture);
  const exaggeration = useExplorerStore((s) => s.exaggeration);
  const cameraMode = useExplorerStore((s) => s.cameraMode);
  const flythrough = useExplorerStore((s) => s.flythrough);
  const measuring = useExplorerStore((s) => s.measuring);
  const measurement = useExplorerStore((s) => s.measurement);
  const autoRotate = useExplorerStore((s) => s.autoRotate);

  const set = useExplorerStore.getState;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 scrollbar-none">
      <CameraSection cameraMode={cameraMode} flythrough={flythrough} set={set} />
      <Separator />
      <AppearanceSection
        wireframe={wireframe}
        texture={texture}
        autoRotate={autoRotate}
        exaggeration={exaggeration}
        set={set}
      />
      <Separator />
      <MeasureSection measuring={measuring} set={set} />
      <Separator />
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Calibration Status
        </h3>
        <Badge variant={calibrated ? "success" : "warning"} className="gap-1.5">
          <ScanSearch className="h-3 w-3" />
          {calibrated ? "Metric / calibrated" : "Relative height — not metric"}
        </Badge>
        {crs && (
          <p className="text-[10px] font-mono text-muted-foreground truncate">
            CRS: {crs}
          </p>
        )}
      </section>
      <Separator />
      <section>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          onClick={onFullscreen}
        >
          <Maximize className="h-4 w-4" />
          Fullscreen
        </Button>
      </section>
      {measurement && <MeasurementReadout measurement={measurement} />}
    </div>
  );
}

function CameraSection({
  cameraMode,
  flythrough,
  set,
}: {
  cameraMode: "orbit" | "firstperson";
  flythrough: "idle" | "playing" | "paused";
  set: typeof useExplorerStore.getState;
}) {
  return (
    <>
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Flythrough Camera
        </h3>
        <div className="flex gap-2">
          {flythrough === "idle" ? (
            <Button
              size="sm"
              variant="glow"
              className="flex-1 gap-2"
              onClick={() => set().setFlythrough("playing")}
            >
              <Play className="h-4 w-4" />
              Start Flythrough
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() =>
                set().setFlythrough(flythrough === "playing" ? "paused" : "playing")
              }
            >
              {flythrough === "playing" ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Resume
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={flythrough === "idle"}
            onClick={() => {
              set().setFlythrough("idle");
              set().resetCamera();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Camera Mode
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => set().setCameraMode("orbit")}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs flex flex-col items-center gap-1 transition-colors",
              cameraMode === "orbit"
                ? "border-primary/50 bg-primary/10 text-cyan-200"
                : "border-border text-muted-foreground hover:bg-secondary/60"
            )}
          >
            <OrbitIcon className="h-4 w-4" />
            Orbit
          </button>
          <button
            onClick={() => set().setCameraMode("firstperson")}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs flex flex-col items-center gap-1 transition-colors",
              cameraMode === "firstperson"
                ? "border-primary/50 bg-primary/10 text-cyan-200"
                : "border-border text-muted-foreground hover:bg-secondary/60"
            )}
          >
            <User className="h-4 w-4" />
            First Person
          </button>
        </div>
        {cameraMode === "firstperson" && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Click the scene to lock the pointer. WASD to move, Space to rise.
            ESC releases the pointer.
          </p>
        )}
      </section>
      <Separator />
    </>
  );
}

function AppearanceSection({
  wireframe,
  texture,
  autoRotate,
  exaggeration,
  set,
}: {
  wireframe: boolean;
  texture: boolean;
  autoRotate: boolean;
  exaggeration: number;
  set: typeof useExplorerStore.getState;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
        Terrain Appearance
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Wireframe</span>
        <Switch checked={wireframe} onCheckedChange={(v) => set().setWireframe(v)} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Texture (original image)</span>
        <Switch checked={texture} onCheckedChange={(v) => set().setTexture(v)} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Auto-rotate view</span>
        <Switch checked={autoRotate} onCheckedChange={(v) => set().setAutoRotate(v)} />
      </div>
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Elevation exaggeration</span>
          <span className="font-mono">{formatNumber(exaggeration, 1)}×</span>
        </div>
        <Slider
          value={[exaggeration]}
          min={0.3}
          max={5}
          step={0.1}
          onValueChange={(v) => set().setExaggeration(v[0])}
        />
      </div>
    </section>
  );
}

function MeasureSection({
  measuring,
  set,
}: {
  measuring: boolean;
  set: typeof useExplorerStore.getState;
}) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        Measurement
      </h3>
      <Button
        size="sm"
        variant={measuring ? "glow" : "outline"}
        className="w-full gap-2"
        onClick={() => set().setMeasuring(!measuring)}
      >
        <Crosshair className="h-4 w-4" />
        {measuring ? "Measuring — click terrain" : "Enable measurement tool"}
      </Button>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Shortcut: press <span className="font-mono">M</span> to toggle.
      </p>
    </section>
  );
}

function MeasurementReadout({
  measurement,
}: {
  measurement: NonNullable<
    ReturnType<typeof useExplorerStore.getState>["measurement"]
  >;
}) {
  const pointA = measurement.pointA;
  const pointB = measurement.pointB;
  const unitLabel = measurement.calibrated ? "m" : "u";

  // Calculate derived values when both points are set
  const heightDiff = pointA && pointB ? Math.abs(pointB.elevation - pointA.elevation) : null;
  const horizontalDistance = pointA && pointB
    ? Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2))
    : null;
  const slopeAngle = horizontalDistance && horizontalDistance > 0
    ? (Math.atan2(heightDiff!, horizontalDistance) * 180) / Math.PI
    : null;

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-300">Measurement</span>
        <Badge variant="warning" className="text-[9px]">
          {measurement.calibrated ? "Metric" : "Relative"}
        </Badge>
      </div>

      {/* Point A */}
      {pointA && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
          <div className="text-[10px] font-semibold text-cyan-300 mb-1">Point A</div>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
            <dt className="text-muted-foreground">Position</dt>
            <dd>({pointA.x}, {pointA.y})</dd>
            <dt className="text-muted-foreground">Elevation</dt>
            <dd>{formatNumber(pointA.elevation, 3)} {unitLabel}</dd>
            <dt className="text-muted-foreground">Rel. height</dt>
            <dd>{formatNumber(pointA.relativeHeight * 100, 1)}%</dd>
            <dt className="text-muted-foreground">Slope</dt>
            <dd>{formatNumber(pointA.slopeDeg, 1)}°</dd>
          </dl>
        </div>
      )}

      {/* Point B */}
      {pointB && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
          <div className="text-[10px] font-semibold text-amber-300 mb-1">Point B</div>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
            <dt className="text-muted-foreground">Position</dt>
            <dd>({pointB.x}, {pointB.y})</dd>
            <dt className="text-muted-foreground">Elevation</dt>
            <dd>{formatNumber(pointB.elevation, 3)} {unitLabel}</dd>
            <dt className="text-muted-foreground">Rel. height</dt>
            <dd>{formatNumber(pointB.relativeHeight * 100, 1)}%</dd>
            <dt className="text-muted-foreground">Slope</dt>
            <dd>{formatNumber(pointB.slopeDeg, 1)}°</dd>
          </dl>
        </div>
      )}

      {/* Derived measurements */}
      {pointA && pointB && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-2">
          <div className="text-[10px] font-semibold text-white mb-1">A → B</div>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
            <dt className="text-muted-foreground">Height diff</dt>
            <dd>{formatNumber(heightDiff!, 3)} {unitLabel}</dd>
            <dt className="text-muted-foreground">Distance</dt>
            <dd>{formatNumber(horizontalDistance!, 1)} px</dd>
            <dt className="text-muted-foreground">Slope angle</dt>
            <dd>{formatNumber(slopeAngle!, 1)}°</dd>
          </dl>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {measurement.calibrated
          ? "Estimated values — derived from AI depth + calibration. Not survey-grade."
          : "Relative Height — Not Metric. Values describe shape only."}
      </p>
    </div>
  );
}