import { Hero } from "@/components/home/Hero";
import { ProblemSection } from "@/components/home/Problem";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Features } from "@/components/home/Features";
import { Technology } from "@/components/home/Technology";
import { DisasterApplications } from "@/components/home/DisasterApplications";
import { Cta } from "@/components/home/Cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <Features />
      <Technology />
      <DisasterApplications />
      <Cta />
    </>
  );
}