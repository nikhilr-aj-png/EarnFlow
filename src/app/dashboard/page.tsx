"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Coins, IndianRupee, Trophy, Users, ArrowUpRight, Loader2, Timer, Plus, Sparkles, TrendingUp, Crown, Minus, ArrowDownToLine, Gem, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ReferralCard } from "@/components/features/ReferralCard";
import { DepositModal } from "@/components/features/DepositModal";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, query, collection, where, limit } from "firebase/firestore";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const activitiesQuery = query(collection(db, "activities"), where("userId", "==", user.uid));
    const unsubActivities = onSnapshot(activitiesQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Client-side sorting to avoid index requirement
      const sorted = data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      }).slice(0, 6); // Requested: Show recent 6 items
      setRecentActivities(sorted);
    }, (err) => console.error("Activities Snapshot Error:", err));

    const gamesQuery = query(collection(db, "cardGames"), where("status", "==", "active"));
    const unsubGames = onSnapshot(gamesQuery, (snap) => {
      const allActive = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setActiveGames(allActive);
    }, (err) => console.error("Games Snapshot Error:", err));

    return () => { unsubActivities(); unsubGames(); };
  }, [user]);

  // Sync loading state with auth
  useEffect(() => {
    if (!authLoading) setLoading(false);
  }, [authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  const coins = userData?.coins || 0;
  const balance = coins / 100;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-7xl mx-auto">

      {/* Hero Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white italic uppercase">
            Dashboard
          </h1>
          <p className="text-zinc-400 text-base md:text-lg">
            Welcome, <span className="text-amber-500 font-bold">{userData?.name || "Earner"}</span>. Ready to win?
          </p>
        </div>
        <Link href="/wallet" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-8 py-6 rounded-xl shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95">
            Withdraw Funds <ArrowUpRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Coins"
          value={coins.toLocaleString()}
          sub="Balance"
          icon={Coins}
          color="text-amber-500"
          action={() => setIsDepositOpen(true)}
        />
        <StatsCard
          title="Tasks"
          value={`₹${((userData?.taskEarnings || 0) / 100).toFixed(0)}`}
          sub="Earned"
          icon={TrendingUp}
          color="text-blue-500"
        />
        <StatsCard
          title="Wins"
          value={`₹${((userData?.gameEarnings || 0) / 100).toFixed(0)}`}
          sub="Games"
          icon={Trophy}
          color="text-amber-500"
        />
        <StatsCard
          title="Wallet"
          value={`₹${balance.toFixed(0)}`}
          sub="Cash"
          icon={IndianRupee}
          color="text-green-500"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Recent Activity */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" /> Recent Activity
            </h2>
            <Link href="/dashboard/activities" className="text-xs font-bold text-amber-500 hover:text-white transition-colors">VIEW ALL</Link>
          </div>

          <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden p-2 space-y-2">
            {recentActivities.length > 0 ? recentActivities.map((activity) => {
              const isGain = ['game_win', 'task', 'deposit'].includes(activity.type);
              const isLoss = ['bet', 'withdrawal'].includes(activity.type);

              let Icon = Coins;
              let colorClass = "bg-zinc-500/10 border-zinc-500/20 text-zinc-500";
              let amountColor = "text-white";

              if (activity.type === 'game_win') {
                Icon = Trophy;
                colorClass = "bg-amber-500/10 border-amber-500/20 text-amber-500 group-hover:border-amber-500/50";
                amountColor = "text-amber-500";
              } else if (activity.type === 'task') {
                Icon = CheckCircle2;
                colorClass = "bg-green-500/10 border-green-500/20 text-green-500 group-hover:border-green-500/50";
                amountColor = "text-green-500";
              } else if (activity.type === 'bet') {
                Icon = Minus;
                colorClass = "bg-red-500/10 border-red-500/20 text-red-500 group-hover:border-red-500/50";
                amountColor = "text-red-400";
              } else if (activity.type === 'deposit') {
                Icon = Plus;
                colorClass = "bg-blue-500/10 border-blue-500/20 text-blue-500 group-hover:border-blue-500/50";
                amountColor = "text-blue-500";
              } else if (activity.type === 'withdrawal') {
                Icon = ArrowDownToLine;
                colorClass = "bg-purple-500/10 border-purple-500/20 text-purple-500 group-hover:border-purple-500/50";
                amountColor = "text-purple-400";
              } else if (activity.type === 'upgrade') {
                Icon = Gem;
                colorClass = "bg-cyan-500/10 border-cyan-500/20 text-cyan-500 group-hover:border-cyan-500/50";
                amountColor = "text-cyan-400";
              }

              return (
                <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all hover:translate-x-1 group">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border transition-colors", colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">{activity.title}</p>
                      <p className="text-xs text-zinc-500">
                        {activity.createdAt?.seconds
                          ? new Date(activity.createdAt.seconds * 1000).toLocaleDateString()
                          : "Processing..."}
                      </p>
                    </div>
                  </div>
                  <div className={cn("text-lg font-black", amountColor)}>
                    {isGain ? "+" : isLoss ? "-" : ""}{activity.amount}
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-zinc-500">No activity yet. Start earning!</div>
            )}
          </div>
        </motion.div>

        {/* Live Games & Bonus */}
        <motion.div variants={item} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Live Action
            </h2>
            <span className="text-xs font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-full animate-pulse">{activeGames.length} ONLINE</span>
          </div>

          <div className="space-y-3">
            {activeGames.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-zinc-500">
                No active games.
              </div>
            ) : (
              activeGames.slice(0, 2).map(game => <DashboardGameCard key={game.id} game={game} />)
            )}
          </div>

          <ReferralCard
            code={userData?.referralCode || "INVITE"}
            isPremium={userData?.isPremium}
          />
        </motion.div>
      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
    </motion.div>
  );
}

function StatsCard({ title, value, sub, icon: Icon, color, action }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 p-6 group transition-all duration-500 hover:border-amber-500/30 hover:-translate-y-1">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon className="h-24 w-24 -mr-4 -mt-4 transform rotate-12" />
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{title}</h3>
          {action && (
            <button onClick={action} className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-black transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div>
          <div className={cn("text-3xl font-black tracking-tight", color)}>{value}</div>
          <p className="text-xs text-zinc-400 mt-1 font-medium">{sub}</p>
        </div>
      </div>
    </div>
  )
}

function DashboardGameCard({ game }: { game: any }) {
  const [dashTime, setDashTime] = useState(0);

  useEffect(() => {
    if (!game.startTime) return;
    const updateTimer = () => {
      const start = game.startTime.seconds;
      const now = Math.floor(Date.now() / 1000);
      const remains = Math.max(0, game.duration - (now - start));
      setDashTime(remains);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [game.startTime, game.duration]);

  return (
    <Link href={`/dashboard/cards/${game.id}`}>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-900 to-black border border-white/5 p-4 group transition-all hover:border-amber-500/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors line-clamp-1">{game.question}</span>
          {dashTime > 0 && <span className="text-[10px] font-mono text-red-500 animate-pulse flex items-center gap-1"><Timer className="h-3 w-3" /> {dashTime}s</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><Coins className="h-3 w-3" /> {game.price}</span>
            {game.isPremium && (
              <span className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0.5 rounded border border-amber-500/20 font-black tracking-tighter uppercase italic">Premium</span>
            )}
          </div>
          <div className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">PLAY</div>
        </div>
      </div>
    </Link>
  )
}
