"use client";

import BentoFeatures from "@/components/auth/BentoFeatures";
import DiscoverCTA from "@/components/landing/DiscoverCTA";
import Navbar from "@/components/landing/Navbar";
import StatsBlocks from "@/components/landing/StatsBlocks";
import Footer from "@/components/layout/Footer";
import { RevealSection } from "@/components/reveal-section";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {


  return (
    <div className="bg-slate-50 dark:bg-slate-950 overflow-hidden pt-12">
      <Navbar />

      {/* Features Section */}
      <section className="py-32 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <RevealSection className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              Everything you need to manage your fleet
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Power Fleet IMS brings dispatchers, technicians, and drivers together on a single, secure platform.
            </p>
          </div>
          
          <StatsBlocks />
          
          <BentoFeatures />
        </RevealSection>
      </section>

      {/* Discover PowerFleet CTA */}
      <section className="py-32 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <DiscoverCTA />
      </section>

      {/* Footer */}
      <Footer />
      
      {/* Floating Theme Toggle (Landing Page Only) */}
      <ThemeToggle />
    </div>
  );
}
