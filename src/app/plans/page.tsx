"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PlansContent } from "@/components/features/PlansContent";

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-20 lg:py-32">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Choose Your <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Earning Potential</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start for free or upgrade to Premium to multiply your earnings and unlock exclusive tasks.
          </p>
        </div>

        <PlansContent />
      </div>

      <Footer />
    </div>
  );
}
