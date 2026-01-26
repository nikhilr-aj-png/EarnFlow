"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ExternalLink, Timer, CheckCircle2, AlertCircle } from "lucide-react";

interface VisitTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  targetUrl: string;
}

export function VisitTimerModal({ isOpen, onClose, onComplete, targetUrl }: VisitTimerModalProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [hasVisited, setHasVisited] = useState(false);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(60);
      setHasVisited(false);
      setCanClaim(false);
      return;
    }

    if (hasVisited && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (hasVisited && timeLeft === 0) {
      setCanClaim(true);
    }
  }, [isOpen, hasVisited, timeLeft]);

  const handleVisit = () => {
    window.open(targetUrl, "_blank");
    setHasVisited(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => canClaim && onClose()} title="Visit & Earn">
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-blue-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Instructions</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Click the button below to visit our partner's page. You must stay on that page for at least **60 seconds** to verify your visit and earn coins.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/5 border border-white/10 space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
              <span className="text-3xl font-black font-mono text-amber-500">{timeLeft}s</span>
            </div>
            {hasVisited && (
              <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-amber-500 transition-all duration-1000 ease-linear"
                  strokeDasharray="276"
                  strokeDashoffset={276 - (276 * (60 - timeLeft)) / 60}
                />
              </svg>
            )}
          </div>

          {!hasVisited ? (
            <Button onClick={handleVisit} className="w-full bg-amber-500 text-black font-bold h-12">
              <ExternalLink className="mr-2 h-4 w-4" /> Visit Partner Page
            </Button>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-amber-500 animate-pulse">Stay on the page... Verification in progress</p>
              <p className="text-[10px] text-muted-foreground">Do not close this modal or browser tab.</p>
            </div>
          )}
        </div>

        <Button
          disabled={!canClaim}
          onClick={onComplete}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-[2px] shadow-lg shadow-green-900/20"
        >
          {canClaim ? (
            <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Claim My Reward</span>
          ) : (
            `Unlock in ${timeLeft}s`
          )}
        </Button>
      </div>
    </Modal>
  );
}
