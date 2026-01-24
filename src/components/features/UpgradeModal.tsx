"use client";

import { Modal } from "@/components/ui/modal";
import { PlansContent } from "./PlansContent";
import { ShieldCheck, ArrowRight } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Premium Access Required">
      <div className="space-y-8">
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-start gap-4">
          <ShieldCheck className="h-10 w-10 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <h3 className="font-bold text-amber-500">Unlock Premium Tasks</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This task is reserved for our **Premium Earner** members.
              Upgrade your plan now to unlock high-paying tasks and instant payouts.
            </p>
          </div>
        </div>

        <div className="px-1 border-t border-white/5 pt-8">
          <PlansContent />
        </div>

        <p className="text-[10px] text-center text-muted-foreground pb-4 uppercase tracking-widest font-bold">
          One-time monthly fee • Cancel anytime • 24/7 Support
        </p>
      </div>
    </Modal>
  );
}
