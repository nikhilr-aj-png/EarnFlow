"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Star, Crown, Users, TrendingUp, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  coins: number;
  isPremium: boolean;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard", { cache: 'no-store' });
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  // Reorder for podium: [2, 1, 3]
  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase">Calculating Standings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050608] pb-20">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 pt-10 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-white group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
          </Link>
          <div className="text-center flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest mb-3">
              <TrendingUp className="h-3 w-3" /> This Week's Performance
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic uppercase">
              Hall of <span className="text-amber-500">Fame</span>
            </h1>
          </div>
          <div className="w-[100px] hidden md:block" /> {/* Spacer */}
        </div>

        {leaderboard.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-6">
            <Trophy className="h-20 w-20 text-zinc-900" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">No legends found yet.</h2>
              <p className="text-zinc-500">Earnings for this week will appear here soon.</p>
            </div>
            <Link href="/dashboard">
              <Button className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-8">
                Start Earning
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Podium */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-0 pt-16 pb-12 overflow-visible">
              {podiumOrder.map((user, idx) => {
                const isFirst = user.rank === 1;
                const isSecond = user.rank === 2;
                const isThird = user.rank === 3;

                return (
                  <motion.div
                    key={user.userId}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className={cn(
                      "relative flex flex-col items-center w-full max-w-[280px] md:w-72 group",
                      isFirst ? "order-1 md:order-2 z-30 scale-110 mb-10 md:mb-16" : isSecond ? "order-2 md:order-1 z-20" : "order-3 md:order-3 z-20"
                    )}
                  >
                    {/* Rank Bubble */}
                    <div className={cn(
                      "absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-xl z-40 border-2",
                      isFirst ? "bg-amber-500 text-black border-amber-300" : isSecond ? "bg-zinc-400 text-black border-zinc-200" : "bg-amber-800 text-white border-amber-600"
                    )}>
                      {user.rank}
                    </div>

                    {/* Crown for #1 */}
                    {isFirst && (
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="absolute -top-16"
                      >
                        <Crown className="h-10 w-10 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                      </motion.div>
                    )}

                    <div className={cn(
                      "w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center bg-zinc-900 mb-6 relative shadow-2xl transition-all group-hover:scale-105",
                      isFirst ? "border-amber-500 shadow-amber-500/20" : isSecond ? "border-zinc-400 shadow-zinc-400/20" : "border-amber-700 shadow-amber-700/20"
                    )}>
                      {isFirst ? (
                        <Trophy className="h-12 w-12 text-amber-500" />
                      ) : isSecond ? (
                        <Medal className="h-10 w-10 text-zinc-400" />
                      ) : (
                        <Medal className="h-10 w-10 text-amber-700" />
                      )}
                    </div>

                    <div className="text-center space-y-1 relative px-4">
                      <p className="text-white font-black italic uppercase tracking-tighter text-xl truncate w-48 drop-shadow-md">
                        {user.name}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 mx-auto w-fit">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-amber-500 font-extrabold text-lg">{user.coins.toLocaleString()}</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-black tracking-widest uppercase italic">Weekly Coins</p>
                    </div>

                    {/* Podium Base Steps */}
                    <div className={cn(
                      "hidden md:block w-full mt-6 rounded-t-3xl border-t border-x border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                      isFirst ? "bg-gradient-to-b from-amber-500/10 to-transparent h-28" : isSecond ? "bg-gradient-to-b from-zinc-400/10 to-transparent h-20" : "bg-gradient-to-b from-amber-800/10 to-transparent h-14"
                    )} />
                  </motion.div>
                );
              })}
            </div>

            {/* List with improved spacing */}
            <div className="max-w-3xl mx-auto space-y-3 px-4">
              <div className="flex items-center justify-between px-6 py-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                <span>Rank & Member</span>
                <span>Earnings</span>
              </div>
              <AnimatePresence>
                {others.map((user, idx) => (
                  <motion.div
                    key={user.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (idx + 3) * 0.05 }}
                    className="flex items-center justify-between p-4 md:p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-2xl font-black text-zinc-800 italic w-8 text-center group-hover:text-amber-500 transition-colors">
                        #{user.rank}
                      </span>
                      <div className="h-12 w-12 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-white/5">
                        <Users className="h-6 w-6 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase tracking-tight group-hover:text-amber-500 transition-colors">
                          {user.name}
                        </p>
                        {user.isPremium && (
                          <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded tracking-widest uppercase">Premium</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="text-xl font-black italic text-amber-500">
                        {user.coins.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600">COINS</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
