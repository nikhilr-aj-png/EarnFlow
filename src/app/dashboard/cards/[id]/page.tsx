"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Timer, Coins, Trophy, AlertCircle, CheckCircle2, XCircle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CardGameSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, userData } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rewardProcessed, setRewardProcessed] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Selecting the lucky winner...");
  const isCalculating = timeLeft <= 0 && !reveal;
  const isArchived = game?.winnerSelection === 'manual';

  useEffect(() => {
    if (!user || !id) return;
    const unsubGame = onSnapshot(doc(db, "cardGames", id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGame(data);
        if (data.startTime?.seconds) {
          const elapsed = Math.floor(Date.now() / 1000) - data.startTime.seconds;
          setTimeLeft(Math.max(0, data.duration - elapsed));
        } else if (data.status === 'active') {
          setTimeLeft(data.duration);
        }
      } else {
        setGame(null);
      }
      setLoading(false);
    }, (err) => console.error("Session Game Error:", err));
    return () => { unsubGame(); };
  }, [user, id]);

  const isHardExpired = timeLeft < -600;

  useEffect(() => {
    if (!user || !game?.startTime?.seconds || !id) return;
    const gameSessionId = `${user.uid}_${id}_${game.startTime.seconds}`;
    const unsubEntry = onSnapshot(doc(db, "cardGameEntries", gameSessionId), (doc) => {
      if (doc.exists()) {
        const d = doc.data();
        setSelectedCards(d.selectedCards || []);
        if (d.rewardProcessed) setRewardProcessed(true);
      } else {
        setSelectedCards([]);
        setRewardProcessed(false);
      }
    }, (err) => console.error("Session Entry Error:", err));
    return () => unsubEntry();
  }, [user, game?.startTime, id]);

  const hasFinished = useRef(false);

  useEffect(() => {
    hasFinished.current = false;
  }, [id]);

  // SAFETY REVEAL: Guaranteed transition if winner exists in DB
  useEffect(() => {
    if (game?.winnerIndex !== undefined && game.winnerIndex !== -1 && !reveal) {
      setReveal(true);
    }
  }, [game, reveal]);

  // SAFETY: Force reveal if stuck calculating for > 15s
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isCalculating) {
      timeout = setTimeout(() => {
        setReveal(true);
        setStatusMsg("Connection Slow - Showing Result");
      }, 15000);
    }
    return () => clearTimeout(timeout);
  }, [isCalculating]);

  // Effect to trigger Auto-Cycle after reveal
  useEffect(() => {
    if (reveal && !isArchived) {
      const timer = setTimeout(() => {
        cycleGame();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reveal, isArchived]);

  useEffect(() => {
    if (timeLeft > 0 && game?.startTime?.seconds) {
      setIsPlaying(true);
      setReveal(false);
      const end = game.startTime.seconds + game.duration;
      const timer = setInterval(() => setTimeLeft(Math.max(0, end - Math.floor(Date.now() / 1000))), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0 && isPlaying) {
      setIsPlaying(false);

      const handleFinish = async () => {
        if (!game) return;

        // Finalize if needed
        if (game.winnerIndex === -1 || game.winnerIndex === undefined) {
          try {
            // Race: If finalizeGame hangs, the safety reveal effect will kick in anyway
            const winnerIdx = await finalizeGame();
            if (winnerIdx !== -1) {
              setGame((prev: any) => ({ ...prev, winnerIndex: winnerIdx }));
            }
          } catch (e) {
            console.error("Finalize Error during finish:", e);
          }
        }

        // Guaranteed reveal
        setReveal(true);

        // Process reward if applicable
        if (selectedCards.length > 0 && !rewardProcessed) {
          await processResult();
        }
      };

      handleFinish();
    }
  }, [timeLeft, isPlaying, game, selectedCards.length, rewardProcessed]);

  const finalizeGame = async () => {
    if (!id) return -1;
    setStatusMsg("Connecting to server...");
    try {
      const res = await fetch("/api/games/card/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id, gameStartTime: game?.startTime?.seconds })
      });
      setStatusMsg("Processing Winner...");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Finalize Failed");

      setStatusMsg("Winner Decided!");
      return data.winnerIndex ?? -1;
    } catch (e: any) {
      setStatusMsg(`Failed: ${e.message}`);
      toast.error(`Finalize Error: ${e.message}`);
      return -1;
    }
  };

  const cycleGame = async () => {
    if (!id) return false;
    try {
      const res = await fetch("/api/games/card/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: id,
          expiryLabel: game?.expiryLabel,
          isPremium: game?.isPremium
        })
      });
      const data = await res.json();

      if (data.success && data.newGameId) {
        router.replace(`/dashboard/cards/${data.newGameId}`);
        return true;
      } else if (data.success && data.action === "archived") {
        toast.info("Game Finished (Manual).");
        router.replace("/dashboard");
        return true;
      } else if (data.success) {
        toast.info("Game ended.");
        router.replace("/dashboard");
        return true;
      }
      return false;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  const processResult = async () => {
    if (rewardProcessed || !user || !game || !id) return;
    setRewardProcessed(true);
    try {
      const res = await fetch("/api/games/card/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          gameId: id,
          gameStartTime: game.startTime?.seconds
        }),
      });
      const data = await res.json();
      if (data.won) toast.success(`🎊 Won ${data.reward || (game.price * 2)} Coins!`);
      else if (data.success && !data.won) toast.error("Better luck next time!");
      else if (data.error === "Reward already processed") {
        // This is actually GOOD - it means our server-side automation already paid them!
        const won = selectedCards.includes(game.winnerIndex);
        if (won) toast.success(`🎊 Won Coins! (Auto-credited)`);
      }
    } catch (e: any) {
      console.error(e);
      setRewardProcessed(false); // Allow retry on fatal network error
    }
  };

  const selectCard = async (index: number) => {
    if (!isPlaying || selectedCards.includes(index) || reveal || isProcessingSelection) return;
    if ((userData?.coins || 0) < game.price) return toast.error("Need more coins!");
    if (game.isPremium && !userData?.isPremium) return toast.error("Premium Only!");

    setIsProcessingSelection(true);
    try {
      const res = await fetch("/api/games/card/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user!.uid,
          gameId: id,
          cardIndex: index,
          gameStartTime: game.startTime?.seconds,
          price: game.price
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Card Locked In!");
    } catch { toast.error("Purchase failed"); }
    finally { setIsProcessingSelection(false); }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;

  // Allow 'inactive' for Manual History viewing
  const isGameVisible = game && (game.status === 'active' || game.status === 'inactive' || (game.status === 'expired' && !isHardExpired));

  if (!isGameVisible) {
    const isNotStarted = game?.status === 'active' && !game?.startTime;
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
          <Sparkles className="h-16 w-16 text-amber-500 relative z-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">{isNotStarted ? "Preparing..." : "Session Closed"}</h2>
          <p className="text-zinc-500 max-w-sm mt-2">The dealer is shuffling. Check back in a moment.</p>
        </div>
        <Button onClick={() => router.back()} className="rounded-full px-8 bg-zinc-800 hover:bg-zinc-700">Return to Lobby</Button>
      </div>
    )
  }

  const userWon = reveal && game && selectedCards.includes(game.winnerIndex);
  // Removed duplicate isCalculating

  return (
    <div className="relative min-h-[85vh] w-full max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl bg-[#050505] border border-white/5 flex flex-col items-center">

      {/* Calculating Overlay */}
      <AnimatePresence>
        {isCalculating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
              <Loader2 className="h-16 w-16 text-amber-500 animate-spin relative z-10" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-widest mt-6 animate-pulse">Finalizing Results</h2>
            <p className="text-zinc-500 font-medium mt-2">{statusMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory FX */}
      {userWon && <VictoryConfetti />}

      {/* Ambient Backlighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-black/50 to-black pointer-events-none z-0" />

      {/* Header */}
      <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between p-6 md:p-8 bg-black/20 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic">{game.question}</h1>
            <p className="text-amber-500 font-bold text-xs uppercase tracking-widest">High Stakes Table</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 md:mt-0 bg-black/40 p-2 pr-6 rounded-full border border-white/5">
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
            <Coins className="h-5 w-5 text-amber-500" />
            <span className="text-xl font-black text-amber-500">{game.price}</span>
          </div>
          <div className="flex items-col md:flex-row items-end md:items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Time Remaining</span>
            <span className={cn("text-2xl font-black font-mono", timeLeft < 10 ? "text-red-500 animate-pulse" : "text-white")}>
              {timeLeft > 0 ? `${timeLeft}s` : "0s"}
            </span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center p-6 md:p-12">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl perspective-1000">
          {game.cardImages.map((img: string, idx: number) => {
            const isWinner = reveal && idx === game.winnerIndex;
            const isSelected = selectedCards.includes(idx);
            const isLost = reveal && !isWinner;

            // If revealed, and not this card, dim it down
            const isDimmed = reveal && !isWinner;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isDimmed ? 0.3 : 1, y: 0, scale: isWinner ? 1.05 : 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative group"
              >
                <div
                  onClick={() => selectCard(idx)}
                  className={cn(
                    "relative aspect-[3/4] rounded-2xl cursor-pointer transition-all duration-500 preserve-3d shadow-2xl",
                    isSelected ? "ring-4 ring-amber-500 ring-offset-4 ring-offset-black" : "hover:scale-[1.02]",
                    isWinner && "ring-4 ring-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)] z-20"
                  )}>
                  {/* Card Image */}
                  <img src={img} alt="Card" className="w-full h-full object-cover rounded-2xl bg-zinc-900" />

                  {/* Overlays */}
                  {isSelected && !reveal && (
                    <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[2px] rounded-2xl flex items-center justify-center border-2 border-amber-500">
                      <div className="bg-black/80 text-amber-500 px-4 py-2 rounded-full font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Locked
                      </div>
                    </div>
                  )}

                  {reveal && isWinner && (
                    <div className="absolute inset-0 bg-green-500/20 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center border-2 border-green-500 animate-pulse">
                      <Trophy className="h-16 w-16 text-white drop-shadow-xl mb-2" />
                      <span className="bg-green-500 text-black px-4 py-1 rounded-full font-black uppercase tracking-widest">WINNER</span>
                    </div>
                  )}

                  {reveal && isLost && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center border-2 border-zinc-800">
                      <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-1">Pass</span>
                      <XCircle className="h-8 w-8 text-zinc-600" />
                    </div>
                  )}

                  {reveal && isLost && isSelected && (
                    <div className="absolute inset-0 bg-red-500/40 backdrop-blur-[4px] rounded-2xl flex flex-col items-center justify-center border-2 border-red-500 z-10">
                      <XCircle className="h-12 w-12 text-white mb-2 drop-shadow-lg" />
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-xs uppercase shadow-lg">YOU LOST</span>
                    </div>
                  )}
                </div>

                {/* Interactive Button */}
                <div className="mt-4">
                  <Button
                    disabled={!isPlaying || isSelected || reveal || isProcessingSelection}
                    onClick={() => selectCard(idx)}
                    className={cn(
                      "w-full h-12 rounded-xl font-bold uppercase tracking-widest transition-all",
                      isSelected
                        ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                        : "bg-white/10 hover:bg-white/20 text-white hover:scale-[1.02]"
                    )}
                  >
                    {isSelected ? "Owned" : `Select`}
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Notification Removed */}

        {timeLeft <= 0 && !reveal && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
            <Button
              onClick={() => { hasFinished.current = false; cycleGame(); }}
              variant="outline"
              className="bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Game Stuck? Force New Round
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}

function VictoryConfetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, x: Math.random() * 100 + "%", rotate: 0 }}
          animate={{ y: "120vh", rotate: 720 }}
          transition={{ duration: Math.random() * 2 + 3, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
          className="absolute"
          style={{ left: Math.random() * 100 + "%" }}
        >
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6'][i % 4] }}
          />
        </motion.div>
      ))}
    </div>
  )
}
