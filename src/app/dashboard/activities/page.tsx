"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trophy,
  Coins,
  Minus,
  Plus,
  ArrowDownToLine,
  Gem,
  CheckCircle2,
  Loader2,
  History,
  TrendingUp,
  Filter,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ActivityHistoryPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "activities"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Client-side sorting to fix Firebase index error
      const sorted = data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setActivities(sorted);
      setLoading(false);
    }, (err) => {
      console.error("History Page Error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filteredActivities = activities.filter(a => {
    if (filter === "all") return true;
    if (filter === "earnings") return ['game_win', 'task', 'deposit', 'referral_commission', 'referral_bonus'].includes(a.type);
    if (filter === "expenses") return ['bet', 'withdrawal'].includes(a.type);
    return a.type === filter;
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
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest w-fit">
            <History className="h-3 w-3" /> Ledger Store
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white italic uppercase">Activity History</h1>
          <p className="text-zinc-400">Your complete financial timeline and performance metrics.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center bg-black/40 backdrop-blur-xl border border-white/5 p-1 rounded-xl gap-1">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="ALL" />
          <FilterButton active={filter === "earnings"} onClick={() => setFilter("earnings")} label="EARNINGS" color="bg-green-500" />
          <FilterButton active={filter === "expenses"} onClick={() => setFilter("expenses")} label="SPENT" color="bg-red-500" />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat label="TOTAL EVENTS" value={activities.length} icon={TrendingUp} />
        <MiniStat label="WINS" value={activities.filter(a => a.type === 'game_win').length} icon={Trophy} color="text-amber-500" />
        <MiniStat label="TASKS" value={activities.filter(a => a.type === 'task').length} icon={CheckCircle2} color="text-green-500" />
      </div>

      {/* Main List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3 bg-[#0c1015]/50 p-4 rounded-3xl border border-white/5"
      >
        <AnimatePresence mode="popLayout">
          {filteredActivities.length > 0 ? filteredActivities.map((activity) => (
            <motion.div
              key={activity.id}
              variants={item}
              layout
              className="flex items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/5 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <ActivityIcon type={activity.type} />
                <div>
                  <p className="font-black text-white italic uppercase tracking-tighter group-hover:text-amber-500 transition-colors">
                    {activity.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">
                      {activity.createdAt?.seconds
                        ? new Date(activity.createdAt.seconds * 1000).toLocaleString()
                        : "Processing..."}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-zinc-800" />
                    <span className="text-[10px] text-zinc-600 font-mono">ID: {activity.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className={cn(
                  "text-xl font-black italic",
                  ['game_win', 'task', 'deposit', 'referral_commission', 'referral_bonus'].includes(activity.type) ? "text-green-500" : "text-red-500"
                )}>
                  {['game_win', 'task', 'deposit', 'referral_commission', 'referral_bonus'].includes(activity.type) ? "+" : "-"}{activity.amount}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600">COINS</div>
              </div>
            </motion.div>
          )) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center flex flex-col items-center gap-4">
              <History className="h-12 w-12 text-zinc-800" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm italic">No activities found in this category.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}

function FilterButton({ active, onClick, label, color = "bg-amber-500" }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
        active ? `${color} text-black shadow-lg scale-105` : "text-zinc-500 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function MiniStat({ label, value, icon: Icon, color = "text-zinc-400" }: any) {
  return (
    <div className="bg-black/20 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
        <p className={cn("text-2xl font-black italic", color)}>{value}</p>
      </div>
      <Icon className={cn("h-6 w-6 opacity-20", color)} />
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  let Icon = Coins;
  let colorClass = "bg-zinc-500/10 border-zinc-500/20 text-zinc-500";

  if (type === 'game_win') {
    Icon = Trophy;
    colorClass = "bg-amber-500/10 border-amber-500/20 text-amber-500";
  } else if (type === 'task') {
    Icon = CheckCircle2;
    colorClass = "bg-green-500/10 border-green-500/20 text-green-500";
  } else if (type === 'bet') {
    Icon = Minus;
    colorClass = "bg-red-500/10 border-red-500/20 text-red-500";
  } else if (type === 'deposit') {
    Icon = Plus;
    colorClass = "bg-blue-500/10 border-blue-500/20 text-blue-500";
  } else if (type === 'withdrawal') {
    Icon = ArrowDownToLine;
    colorClass = "bg-purple-500/10 border-purple-500/20 text-purple-500";
  } else if (type === 'upgrade') {
    Icon = Gem;
    colorClass = "bg-cyan-500/10 border-cyan-500/20 text-cyan-500";
  } else if (type === 'referral_bonus') {
    Icon = Users;
    colorClass = "bg-indigo-500/10 border-indigo-500/20 text-indigo-500";
  } else if (type === 'referral_commission') {
    Icon = Coins;
    colorClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
  }

  return (
    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110", colorClass)}>
      <Icon className="h-6 w-6" />
    </div>
  );
}
