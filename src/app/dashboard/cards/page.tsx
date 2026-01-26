"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Coins, ArrowUpRight, Loader2, Sparkles, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function GamesGalleryPage() {
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "cardGames"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snap) => {
      const allActive = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const now = Math.floor(Date.now() / 1000);
      const filtered = allActive.filter(game => {
        if (!game.startTime) return true;
        const end = game.startTime.seconds + (game.duration || 60);
        return now < end + 600;
      });
      setActiveGames(filtered);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest w-fit">
          <Sparkles className="h-3 w-3" />
          Gaming Zone
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Live Card Games</h1>
        <p className="text-muted-foreground">Select an active session to start earning coins.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activeGames.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-card/20 rounded-2xl border border-dashed border-white/10">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">No active games at the moment. Check back soon!</p>
          </div>
        ) : (
          activeGames.map((game) => (
            <GalleryGameCard key={game.id} game={game} />
          ))
        )}
      </div>
    </div>
  );
}

function GalleryGameCard({ game }: { game: any }) {
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    if (!game.startTime) return;
    const updateTimer = () => {
      const start = game.startTime.seconds;
      const now = Math.floor(Date.now() / 1000);
      const remains = Math.max(0, game.duration - (now - start));
      setLocalTime(remains);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [game.startTime, game.duration]);

  return (
    <Card className="bg-card/50 border-white/10 overflow-hidden group hover:border-amber-500/30 transition-all duration-500">
      <div className="aspect-video relative overflow-hidden bg-black/20">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        <img
          src={game.cardImages?.[0] || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
          alt="Game Preview"
        />
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          {game.isPremium && (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg bg-amber-500 text-black border border-amber-400">
              PREMIUM
            </div>
          )}
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg",
            localTime > 0 ? "bg-red-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-500"
          )}>
            {localTime > 0 ? "LIVE NOW" : "SESSION ENDED"}
          </div>
        </div>

      </div>
      <CardHeader>
        <CardTitle className="text-xl group-hover:text-amber-500 transition-colors flex items-center justify-between">
          {game.question}
          {localTime > 0 && <span className="text-xs font-mono text-red-400 flex items-center gap-1"><Timer className="h-3 w-3" /> {localTime}s</span>}
        </CardTitle>
        <CardDescription>Timed reveal session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Entry Price</span>
            <div className="flex items-center gap-1 text-amber-500 font-bold text-lg">
              <Coins className="h-4 w-4" /> {game.price}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Duration</span>
            <div className="text-white font-bold">{formatDuration(game.duration)}</div>
          </div>
        </div>
        <Link href={`/dashboard/cards/${game.id}`}>
          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest h-11">
            {localTime > 0 ? "Play Now" : "View Result"} <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
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
