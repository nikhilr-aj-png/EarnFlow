"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Timer, Sparkles, CheckCircle2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AdModal({ isOpen, onClose, onComplete }: AdModalProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [canSkip, setCanSkip] = useState(false);
  const [wasAdClicked, setWasAdClicked] = useState(false);

  // ... inside component ...
  const [directLink, setDirectLink] = useState("");

  useEffect(() => {
    // Fetch Ad Settings
    const fetchAdSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ads"));
        if (snap.exists() && snap.data().monetagDirectLink) {
          setDirectLink(snap.data().monetagDirectLink);
        }
      } catch (error) {
        console.error("Failed to load ad link:", error);
      }
    };
    fetchAdSettings();
  }, [isOpen]); // Re-check on open

  const handleAdClick = () => {
    const url = directLink || "https://monetag.com"; // Fallback
    window.open(url, "_blank");
    setWasAdClicked(true);
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => canSkip && onClose()} title="Daily Reward Ad">
      <div className="space-y-6">
        <div
          onClick={handleAdClick}
          className="aspect-video w-full rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
        >
          {/* Mock Ad Content */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000" />

          <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-4">
            <div className="bg-amber-500/20 p-4 rounded-full animate-bounce">
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-2xl font-black italic text-amber-500 tracking-tighter uppercase">Click to Visit Sponsor</h3>
            <p className="text-sm text-zinc-300 font-medium">Supporting EarnFlow keeps rewards high!</p>
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Timer className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-bold font-mono">0:0{timeLeft}s</span>
          </div>

          {wasAdClicked && (
            <div className="absolute top-4 right-4 bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <CheckCircle2 className="h-3 w-3" /> Visit Verified
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs text-center text-muted-foreground italic leading-relaxed">
            Please watch the full ad to receive your task coins.
            Ads help us keep the platform free for everyone.
          </p>

          <Button
            className="w-full h-12 bg-white text-black font-bold hover:bg-zinc-200 transition-all disabled:opacity-50"
            disabled={!canSkip}
            onClick={handleFinish}
          >
            {canSkip ? (
              <>Claim Reward <SkipForward className="ml-2 h-4 w-4" /></>
            ) : (
              `Wait ${timeLeft}s...`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
