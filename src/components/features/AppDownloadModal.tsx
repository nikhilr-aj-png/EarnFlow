"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, CheckCircle2, ShieldCheck } from "lucide-react";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  targetUrl: string;
  reward: number;
}

export function AppDownloadModal({ isOpen, onClose, onComplete, targetUrl, reward }: AppDownloadModalProps) {
  const [isRedirectionComplete, setIsRedirectionComplete] = useState(false);

  const handleDownload = () => {
    window.open(targetUrl, "_blank");
    setIsRedirectionComplete(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install & Earn">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 text-center space-y-4">
          <div className="inline-flex p-4 bg-amber-500/20 rounded-full">
            <Smartphone className="h-10 w-10 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">App Installation Reward</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Step 1: Download & Install the app.<br />
              Step 2: Login or Register a new account.<br />
              Step 3: Return here to claim your **{reward.toLocaleString()} Coins**.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleDownload}
            className="w-full h-14 bg-black text-white hover:bg-zinc-900 border border-white/10 font-bold text-lg"
          >
            <Download className="mr-2 h-5 w-5" /> Download App Now
          </Button>

          <Button
            disabled={!isRedirectionComplete}
            onClick={onComplete}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest transition-all shadow-xl shadow-green-950/30"
          >
            {isRedirectionComplete ? "Verify & Claim Coins" : "Waiting for Download..."}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-[3px] font-bold opacity-50">
          <ShieldCheck className="h-3 w-3" /> Secure Verification
        </div>
      </div>
    </Modal>
  );
}
