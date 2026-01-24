"use client";

import { PlansContent } from "@/components/features/PlansContent";

export default function PremiumPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upgrade to Premium</h1>
        <p className="text-muted-foreground">Unlock high-paying tasks and priority withdrawals.</p>
      </div>

      <div className="py-8">
        <PlansContent />
      </div>
    </div>
  );
}
