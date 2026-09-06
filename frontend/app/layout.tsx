import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "DEPTHWIZARD | From One Image to a Navigable 3D World",
  description:
    "AI-powered single-view elevation estimation and interactive terrain reconstruction — SIH 2026 (ISRO PS #26175).",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}