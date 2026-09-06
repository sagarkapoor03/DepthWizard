"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileImage,
  FileUp,
  Globe,
  Loader2,
  MapPin,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useJobStore } from "@/store/jobStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = [".jpg", ".jpeg", ".png", ".tif", ".tiff", "image/jpeg", "image/png", "image/tiff"];

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setError(null);
      const ok = /\.(jpe?g|png|tiff?)$/i.test(file.name);
      if (!ok) {
        const msg = "Unsupported format — please upload JPG, PNG, TIFF or GeoTIFF.";
        setError(msg);
        toast.error(msg);
        return;
      }
      setPreview(URL.createObjectURL(file));
      setUploading(true);
      try {
        const upload = await api.upload(file);
        useJobStore.getState().setUpload(upload);
        toast.success(`Image accepted — ${upload.filename}`);
        try {
          await api.analyze(upload.job_id, { mode: "relative" });
          router.push(`/dashboard?job=${upload.job_id}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not start analysis.");
          router.push(`/dashboard?job=${upload.job_id}`);
        }
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Upload failed — please try again.";
        setError(msg);
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-12 md:p-16 text-center transition-all",
          dragOver
            ? "border-cyan-400 bg-cyan-500/10 glow-border"
            : "border-border bg-card/40 hover:border-primary/50 hover:bg-card/70"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-cyan-300 animate-spin" />
          ) : (
            <UploadCloud className="h-8 w-8 text-cyan-300" />
          )}
        </div>
        <h3 className="text-lg font-semibold">
          {uploading ? "Uploading image…" : "Drag & drop a satellite or aerial image"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          JPG · JPEG · PNG · TIFF · GeoTIFF — max 30 MB. Single-view RGB only.
        </p>
        <div className="mt-5">
          <Button variant="outline" size="sm" type="button">
            <FileUp className="h-4 w-4 mr-1.5" />
            Browse files
          </Button>
        </div>
        {error && (
          <p className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 inline-block">
            {error}
          </p>
        )}
      </div>

      {preview && (
        <div className="rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-80 w-full object-contain bg-black/30" />
        </div>
      )}

      <GridInfo />
    </div>
  );
}

function GridInfo() {
  const items = [
    {
      icon: FileImage,
      title: "Geo or plain",
      text: "TIFF/GeoTIFF keeps CRS metadata; JPG/PNG are processed as relative scenes.",
    },
    {
      icon: Globe,
      title: "Honest output",
      text: "Relative depth is never presented as metric height unless calibrated.",
    },
    {
      icon: MapPin,
      title: "Reference-ready",
      text: "For metric DSMs, provide a reference DEM or GCPs on the dashboard.",
    },
  ];
  return (
    <div className="grid sm:grid-cols-3 gap-3 text-sm">
      {items.map((it) => (
        <div key={it.title} className="rounded-xl border border-border bg-card/50 p-4 flex gap-3">
          <it.icon className="h-5 w-5 text-cyan-300 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">{it.title}</div>
            <p className="text-muted-foreground text-xs mt-1">{it.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}