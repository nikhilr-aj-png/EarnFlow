"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Sparkles, Timer, Coins, Trophy, AlertCircle,
  CheckCircle2, XCircle, Crown, Users, History,
  ArrowUpRight, Plane, Zap, Info, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CardGameSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, userData } = useAuth();

  // Game State
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rewardProcessed, setRewardProcessed] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  // Aviator Logic States
  const [allBets, setAllBets] = useState<any[]>([]);
  const [pastWinners, setPastWinners] = useState<any[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [currentBetAmount, setCurrentBetAmount] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const isCalculating = timeLeft <= 0 && !reveal;
  const isArchived = game?.winnerSelection === 'manual';

  // 1. Listen to Game Document
  useEffect(() => {
    if (!user || !id) return;
    const unsubGame = onSnapshot(doc(db, "cardGames", id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGame(data);
        if (data.startTime?.seconds) {
          const elapsed = Math.floor(Date.now() / 1000) - data.startTime.seconds;
          setTimeLeft(Math.max(0, data.duration - elapsed));
        }
        // Sync default bet amount
        if (currentBetAmount === 0 || data.betMode === 'fixed') {
          setCurrentBetAmount(data.price || 10);
        }
      } else {
        setGame(null);
      }
      setLoading(false);
    }, (err) => console.error("Session Game Error:", err));
    return () => unsubGame();
  }, [user, id]);

  // 2. Listen to ALL Bets (Live Community Feed)
  useEffect(() => {
    if (!user || !game?.startTime?.seconds || !id) return;
    const q = query(
      collection(db, "cardGameEntries"),
      where("gameId", "==", id),
      where("gameStartTime", "==", game.startTime.seconds),
      limit(100)
    );
    const unsubBets = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map(doc => doc.data())
        .sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
        .slice(0, 50);
      setAllBets(sorted);
    }, (err) => console.error("Live Bets Error:", err));
    return () => unsubBets();
  }, [user, id, game?.startTime?.seconds]);

  // 3. Listen to Current User's Specific Selection (Aggregated)
  useEffect(() => {
    if (!user || !game?.startTime?.seconds || !id) return;
    const q = query(
      collection(db, "cardGameEntries"),
      where("userId", "==", user.uid),
      where("gameId", "==", id),
      where("gameStartTime", "==", game.startTime.seconds)
    );
    const unsubTarget = onSnapshot(q, (snap) => {
      const allSelected: number[] = [];
      let isProcessed = false;
      snap.forEach(doc => {
        const d = doc.data();
        if (d.cardIndex !== undefined) allSelected.push(d.cardIndex);
        if (d.rewardProcessed) isProcessed = true;
      });
      setSelectedCards(Array.from(new Set(allSelected)));
      setRewardProcessed(isProcessed);
    }, (err) => console.error("User Selection Error:", err));
    return () => unsubTarget();
  }, [user, id, game?.startTime?.seconds]);

  // 4. Listen to History (Segmented by Game ID)
  useEffect(() => {
    if (!user || !id) return;
    const q = query(
      collection(db, "cardGameHistory"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsubHist = onSnapshot(q, (snap) => {
      const allHistory = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Filter by current game ID AND deduplicate by round StartTime
      const seen = new Set();
      const segmentedHistory = allHistory.filter(h => {
        if (h.gameId !== id) return false;
        // Create a unique key for the round
        const roundKey = `${h.gameId}_${h.startTime?.seconds || h.startTime}`;
        if (seen.has(roundKey)) return false;
        seen.add(roundKey);
        return true;
      }).slice(0, 30);

      setPastWinners(segmentedHistory);
    }, (err) => console.error("History Error:", err));
    return () => unsubHist();
  }, [user, id]);

  // 5. New Round Detector
  const prevStartTime = useRef<number>(0);
  useEffect(() => {
    if (game?.startTime?.seconds && game.startTime.seconds !== prevStartTime.current) {
      if (prevStartTime.current !== 0) {
        setReveal(false);
        setSelectedCards([]);
        setRewardProcessed(false);
      }
      prevStartTime.current = game.startTime.seconds;
    }
  }, [game?.startTime?.seconds]);

  // Timer & Auto-Finalize Logic
  useEffect(() => {
    if (timeLeft > 0 && game?.startTime?.seconds) {
      setIsPlaying(true);
      setReveal(false);
      const end = game.startTime.seconds + game.duration;
      const timer = setInterval(() => setTimeLeft(Math.max(0, end - Math.floor(Date.now() / 1000))), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0 && isPlaying) {
      setIsPlaying(false);
      handleRoundFinish();
    }
  }, [timeLeft, isPlaying, game]);

  const handleRoundFinish = async () => {
    if (!game) return;
    if (game.winnerIndex === -1 || game.winnerIndex === undefined) {
      const winnerIdx = await finalizeGame();
      if (winnerIdx !== -1) setGame((prev: any) => ({ ...prev, winnerIndex: winnerIdx }));
    }
    setReveal(true);
    if (selectedCards.length > 0 && !rewardProcessed) await processResult();
    if (!isArchived) setTimeout(() => cycleGame(), 5000);
  };

  const finalizeGame = async () => {
    try {
      const res = await fetch("/api/games/card/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id, gameStartTime: game?.startTime?.seconds })
      });
      const data = await res.json();
      return res.ok ? data.winnerIndex : -1;
    } catch { return -1; }
  };

  const cycleGame = async () => {
    try {
      const res = await fetch("/api/games/card/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id, expiryLabel: game?.expiryLabel, isPremium: game?.isPremium })
      });
      const data = await res.json();
      if (data.success && data.newGameId) router.replace(`/dashboard/cards/${data.newGameId}`);
    } catch { }
  };

  const processResult = async () => {
    try {
      await fetch("/api/games/card/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.uid, gameId: id, gameStartTime: game.startTime?.seconds }),
      });
    } catch { }
  };

  const selectCard = async (index: number) => {
    if (!isPlaying || selectedCards.includes(index) || reveal || isProcessingSelection) return;

    // In Quick Mode, we use currentBetAmount. In Fixed Mode, we use game.price.
    const betPrice = game.betMode === 'quick' ? currentBetAmount : game.price;

    if (game.isPremium && !userData?.isPremium) {
      return toast.error("Upgrade to Premium to play this game! 🔐");
    }

    if ((userData?.coins || 0) < betPrice) return toast.error("Need more coins!");

    setIsProcessingSelection(true);
    try {
      const res = await fetch("/api/games/card/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          gameId: id,
          cardIndex: index,
          gameStartTime: game.startTime?.seconds,
          price: betPrice
        }),
      });
      if (res.ok) toast.success("Bet Placed!");
      else {
        const d = await res.json();
        toast.error(d.error || "Bet failed");
      }
    } catch { toast.error("Bet failed"); }
    finally { setIsProcessingSelection(false); }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;
  if (!game) return <div className="p-20 text-center"><h2 className="text-2xl font-bold">Game not found</h2><Button onClick={() => router.back()}>Back</Button></div>;

  return (
    <div className="flex flex-col h-full min-h-[90vh] bg-[#0c0d10] text-[#cfd1d6] overflow-hidden font-sans">

      {/* 1. TOP BAR: History Strip */}
      <div className="flex items-center gap-2 p-2 bg-[#14151a] border-b border-[#1c1d24] overflow-x-auto no-scrollbar shadow-lg z-20">
        <div className="flex items-center gap-2 px-3 border-r border-zinc-800">
          <History className="h-4 w-4 text-zinc-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">History</span>
        </div>
        <div className="flex items-center gap-2">
          {pastWinners.map((pw, i) => (
            <motion.div
              key={pw.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="px-4 py-1.5 rounded-full bg-[#1c1d24] border border-[#2c2d3a] text-xs font-black text-amber-500 hover:bg-amber-500 hover:text-black transition-colors cursor-default whitespace-nowrap"
            >
              {pw.winnerIndex === 0 ? "King" : "Queen"}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* 2. THE ARENA */}
        <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 relative">

          <AnimatePresence>
            {isCalculating && (
              <motion.div exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-amber-500/30 blur-3xl animate-pulse" />
                  <Plane className="h-20 w-20 text-amber-500 animate-bounce relative z-10" />
                </div>
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Calculating Results...</h2>
                <p className="text-amber-500 font-bold mt-2 uppercase tracking-widest text-sm">Wait for the reveal!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Round Header */}
          <div className="bg-[#1c1d24] border border-[#2c2d3a] p-6 rounded-[2rem] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 transition-all duration-1000" style={{ width: `${(timeLeft / game.duration) * 100}%` }} />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Crown className="h-8 w-8 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">{game.question}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Round ID: {id.slice(-6)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 uppercase italic">Live Arena</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Time Left</p>
                  <p className={cn("text-5xl font-black font-mono tracking-tighter leading-none", timeLeft < 5 ? "text-red-500 animate-pulse" : "text-white")}>
                    {timeLeft}s
                  </p>
                </div>
                <div className="h-14 w-px bg-zinc-800" />
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Potential Win</p>
                  <p className="text-5xl font-black text-amber-500 font-mono tracking-tighter leading-none">x2.0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex justify-center gap-6 md:gap-16 px-2">
            {game.cardImages.slice(0, 2).map((img: string, idx: number) => {
              const isWinner = reveal && idx === game.winnerIndex;
              const isSelected = selectedCards.includes(idx);
              const isDimmed = reveal && !isWinner;

              return (
                <motion.div
                  key={idx}
                  whileHover={!reveal && isPlaying ? { y: -8, scale: 1.02 } : {}}
                  className="relative group cursor-pointer w-32 md:w-56"
                  onClick={() => selectCard(idx)}
                >
                  <div className={cn(
                    "aspect-[3/4.2] rounded-2xl bg-[#14151a] border-2 border-transparent relative overflow-hidden transition-all duration-500 shadow-xl flex items-center justify-center",
                    isSelected ? "border-amber-500 bg-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.2)]" : "hover:border-zinc-700",
                    isWinner ? "border-green-500 bg-green-500/5 shadow-[0_0_50px_rgba(34,197,94,0.4)] z-20 scale-105" : "",
                    isDimmed ? "opacity-20 grayscale scale-95" : ""
                  )}>
                    {/* Background loader placeholder */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1c1d24] to-[#0c0d10] animate-pulse -z-10" />

                    <img
                      src={img}
                      className={cn(
                        "w-full h-full object-cover p-1.5 rounded-[2rem] relative z-10 transition-opacity duration-500",
                        loadedImages[img] ? "opacity-100" : "opacity-0"
                      )}
                      alt=""
                      loading="eager"
                      onLoad={() => setLoadedImages(prev => ({ ...prev, [img]: true }))}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        setLoadedImages(prev => ({ ...prev, [img]: true }));
                      }}
                    />

                    {!loadedImages[img] && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500/20" />
                      </div>
                    ) /* URL-based tracking avoids stuck spinner on re-render */}

                    {/* KING/QUEEN Labels */}
                    <div className="absolute top-3 left-0 right-0 flex flex-col items-center gap-1 z-30">
                      {game.isPremium && (
                        <div className="bg-amber-600 text-black px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border border-amber-400/50 shadow-xl">
                          Premium Card
                        </div>
                      )}
                      <div className="bg-black/80 px-4 py-1 rounded-full text-[10px] font-black text-amber-500 border border-amber-500/20 uppercase tracking-[0.2em] shadow-lg">
                        {idx === 0 ? "KING" : "QUEEN"}
                      </div>
                    </div>

                    <AnimatePresence>
                      {reveal && isWinner && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                          <Trophy className="h-16 w-16 text-white mb-3 drop-shadow-lg" />
                          <span className="bg-white text-black text-xs font-black px-4 py-1.5 rounded-full uppercase italic tracking-tighter">WINNER!!</span>
                        </motion.div>
                      )}
                      {reveal && !isWinner && isSelected && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-500/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                          <XCircle className="h-16 w-16 text-white mb-3" />
                          <span className="bg-red-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase italic">CRASHED</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    disabled={!isPlaying || isSelected || reveal || isProcessingSelection}
                    className={cn(
                      "w-full mt-4 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all border shadow-lg",
                      isSelected
                        ? "bg-amber-500 text-black border-amber-500 shadow-amber-500/20"
                        : (game.isPremium && !userData?.isPremium)
                          ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 cursor-not-allowed"
                          : "bg-[#1c1d24] text-zinc-400 border-[#2c2d3a] hover:text-white hover:border-zinc-500"
                    )}
                  >
                    {isSelected
                      ? "Bet Active"
                      : (game.isPremium && !userData?.isPremium)
                        ? "UPGRADE TO PLAY"
                        : isPlaying
                          ? "SELECT CARD"
                          : "LOCKED"}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Controls Bar */}
          <div className="bg-[#14151a] border border-[#1c1d24] p-5 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-8 px-2">

              {/* Balance */}
              <div className="flex flex-col items-center md:items-start gap-1">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  <User className="h-3 w-3" /> Your Account
                </div>
                <div className="flex items-center gap-3 text-3xl font-black text-white italic">
                  <Coins className="h-8 w-8 text-amber-500" />
                  <span>{userData?.coins || 0}</span>
                </div>
              </div>

              <div className="hidden md:block h-12 w-px bg-zinc-800/50" />

              {/* Betting Controls */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-zinc-500">
                  <span>Betting Configuration</span>
                  <span className="text-amber-500">{game.betMode === 'quick' ? 'Flexible Mode' : 'Fixed Price Mode'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {game.betMode === 'quick' ? (
                    <>
                      <div className="flex items-center bg-[#0c0d10] border border-zinc-800 rounded-2xl p-1 shrink-0">
                        {[10, 50, 100, 500].map(val => (
                          <button
                            key={val}
                            onClick={() => setCurrentBetAmount(val)}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-xs font-black transition-all",
                              currentBetAmount === val
                                ? "bg-amber-500 text-black shadow-lg"
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <Input
                        type="number"
                        value={currentBetAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentBetAmount(Number(e.target.value))}
                        className="w-24 bg-[#0c0d10] border-zinc-800 font-black text-amber-500 h-12 rounded-2xl"
                      />
                    </>
                  ) : (
                    <div className="px-6 py-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-lg font-black text-white italic">
                      ENTRY: {game.price} COINS
                    </div>
                  )}

                  <Link href="/wallet" className="ml-auto">
                    <Button className="rounded-2xl bg-white text-black font-black uppercase tracking-tighter text-sm h-12 px-8 hover:bg-amber-400 transition-all active:scale-95 shadow-lg group">
                      DEPOSIT <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 3. COMMUNITY FEED: All Bets (Now at Bottom) */}
          <div className="bg-[#14151a] border border-[#1c1d24] rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#1c1d24] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight leading-none text-white">Live Community Feed</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">Real-time player activity</p>
                </div>
              </div>
              <div className="bg-zinc-800 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-zinc-300 font-extrabold">{allBets.length} TOTAL BETS</span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto no-scrollbar">
              {allBets.length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-zinc-700 space-y-3">
                  <Zap className="h-10 w-10 animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] italic">Waiting for the community to join...</p>
                </div>
              ) : (
                allBets.map((bet, i) => {
                  const isWin = reveal && bet.cardIndex === game.winnerIndex;
                  const isLoss = reveal && bet.cardIndex !== game.winnerIndex;
                  const displayPrice = bet.price || game.price;

                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl bg-[#0c0d10] border border-white/5 relative overflow-hidden group transition-all duration-500",
                        bet.userId === user?.uid ? "border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20" : "",
                        isWin ? "border-green-500/50 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]" : "",
                        isLoss ? "border-red-500/20 bg-red-500/5 opacity-60" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black border uppercase italic transition-colors",
                          isWin ? "bg-green-500 border-green-400 text-black" : "bg-zinc-800 border-amber-500/20 text-amber-500"
                        )}>
                          {bet.cardIndex === 0 ? "K" : "Q"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white italic">
                            {bet.userName || "Player"} <span className="text-[9px] text-zinc-600 font-medium not-italic ml-1">ID: {bet.userId?.slice(0, 4)}</span>
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase leading-none",
                            isWin ? "text-green-500" : isLoss ? "text-red-500" : "text-zinc-500"
                          )}>
                            {isWin ? "Victory Achievement" : isLoss ? "Crashed Card" : `Placed on ${bet.cardIndex === 0 ? "King" : "Queen"}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-[10px] font-black uppercase italic",
                          isWin ? "text-green-400 animate-pulse" : isLoss ? "text-red-400" : "text-zinc-600"
                        )}>
                          {isWin ? "WON" : isLoss ? "LOST" : "BET"}
                        </span>
                        <span className={cn(
                          "text-sm font-black italic",
                          isWin ? "text-green-500" : isLoss ? "text-red-500/50" : "text-amber-500"
                        )}>
                          {isWin ? displayPrice * 2 : displayPrice} <span className="text-[9px] opacity-50">COINS</span>
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

        </main>
      </div>

      <AnimatePresence>
        {reveal && selectedCards.includes(game.winnerIndex) && <VictoryConfetti />}
      </AnimatePresence>

    </div>
  );
}

function VictoryConfetti() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[60]">
      {[...Array(60)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, x: Math.random() * 100 + "%", rotate: 0 }}
          animate={{ y: "120vh", rotate: 1080 }}
          transition={{ duration: Math.random() * 2 + 3, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
          className="absolute"
        >
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: ['#f59e0b', '#fff', '#ef4444', '#10b981'][i % 4] }} />
        </motion.div>
      ))}
    </div>
  );
}

function Link({ href, children, className }: any) {
  return <a href={href} className={className}>{children}</a>;
}
