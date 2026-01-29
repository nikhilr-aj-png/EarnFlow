"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Coins, ArrowUpRight, Loader2, Sparkles, Timer, Crown, Zap, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export default function GamesGalleryPage() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'premium' | 'standard'>('all');
  const [serverOffset, setServerOffset] = useState(0);

  useEffect(() => {
    // 0. Sync Server Time (RTT Compensated)
    const syncTime = async () => {
      try {
        const t0 = Date.now();
        const res = await fetch("/api/time");
        const t1 = Date.now();
        const { serverTime } = await res.json();
        const rtt = t1 - t0;
        const offset = serverTime - (t1 / 1000) + (rtt / 2000);
        setServerOffset(offset);
        console.log(`[GALLERY SYNC] RTT: ${rtt}ms, Offset: ${offset.toFixed(3)}s`);
      } catch (err) { }
    };
    syncTime();
    const syncInterval = setInterval(syncTime, 30000);

    // Query ALL games (Active + Inactive Manual History)
    const q = query(collection(db, "cardGames"));
    const unsub = onSnapshot(q, (snap) => {
      const allActive = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const filtered = allActive.filter(g => g.status === 'active');

      filtered.sort((a, b) => {
        const durDiff = (a.duration || 0) - (b.duration || 0);
        if (durDiff !== 0) return durDiff;
        const priceDiff = (a.price || 0) - (b.price || 0);
        if (priceDiff !== 0) return priceDiff;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });

      setActiveGames(filtered);
      setLoading(false);
    }, (err) => console.error("Games Gallery Error:", err));

    return () => {
      unsub();
      clearInterval(syncInterval);
    };
  }, []);

  const displayedGames = activeGames.filter(g => {
    if (filter === 'all') return true;
    const isPrem = g.isPremium;
    return filter === 'premium' ? isPrem : !isPrem;
  });

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest w-fit">
            <Sparkles className="h-3 w-3" /> Gaming Zone
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Live Arena</h1>
          <p className="text-zinc-400">Join active sessions and compete for the prize pool.</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/5 p-1 rounded-xl">
          <button onClick={() => setFilter('all')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filter === 'all' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white")}>ALL</button>
          <button onClick={() => setFilter('premium')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", filter === 'premium' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white")}><Crown className="h-4 w-4" /> PREMIUM</button>
          <button onClick={() => setFilter('standard')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filter === 'standard' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white")}>STANDARD</button>
        </div>
      </div>

      <div className="px-4 py-2 text-xs font-mono text-zinc-500">
        Results: {displayedGames.length} / {activeGames.length}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayedGames.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-black/20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center">
            <Gamepad2 className="h-16 w-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-zinc-500">No active games found</h3>
            <p className="text-zinc-600">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          displayedGames.map((game) => (
            <div key={game.id}>
              <GalleryGameCard game={game} serverOffset={serverOffset} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GalleryGameCard({ game, serverOffset }: { game: any; serverOffset: number }) {
  const [localTime, setLocalTime] = useState(0);
  const [hasTriggeredCycle, setTriggeredCycle] = useState(false);

  useEffect(() => {
    if (!game.startTime) return;
    const updateTimer = () => {
      const start = game.startTime.seconds;
      const now = Math.floor(Date.now() / 1000) + serverOffset;
      const remains = Math.max(0, game.duration - (now - start));
      setLocalTime(remains);

      if (remains === 0 && game.status === 'active' && !hasTriggeredCycle) {
        setTriggeredCycle(true);
        fetch('/api/games/card/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: game.id })
        }).catch(err => console.error(err));
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [game.startTime, game.duration, game.status, game.id, hasTriggeredCycle, serverOffset]);

  return (
    <div className="group relative bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-amber-500/50 hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)] hover:-translate-y-2">
      {/* Image Layer */}
      <div className="aspect-[4/3] relative overflow-hidden bg-black/50">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
        <img
          src={game.cardImages?.[0] || "/images/games/default-card.jpg"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
          alt="Game Preview"
        />

        {/* Badges */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
          {game.isPremium && (
            <div className="px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </div>
          )}
          <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1", localTime > 0 ? "bg-red-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-500")}>
            {localTime > 0 ? <><Zap className="h-3 w-3" /> Live</> : "Ended"}
          </div>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 left-3 z-20">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-white font-bold text-sm">{game.price}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors line-clamp-1">{game.question}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <Timer className="h-3 w-3" />
            <span>Duration: {formatDuration(game.duration)}</span>
            {Number(localTime) > 0 && <span className="text-red-400 font-mono">({Number(localTime).toFixed(1)}s left)</span>}
          </div>
        </div>

        <Link href={`/dashboard/cards/${game.id}`} className="block">
          <Button className="w-full bg-white/5 hover:bg-amber-500 hover:text-black text-white border border-white/10 hover:border-amber-500 transition-all font-bold uppercase tracking-wider h-10 group-hover:shadow-lg">
            {localTime > 0 ? "Enter Arena" : "View Results"} <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`;
  return `${s}s`;
}
