"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, IndianRupee, Trophy, Users, ArrowUpRight, Loader2, Timer, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ReferralCard } from "@/components/features/ReferralCard";
import { DepositModal } from "@/components/features/DepositModal";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, query, collection, where, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // 1. Listen to user data
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setUserData(doc.data());
      setLoading(false);
    });

    // 2. Listen to recent task submissions
    const submissionsQuery = query(
      collection(db, "taskSubmissions"),
      where("userId", "==", user.uid),
      limit(20) // Fetch a few more to allow client-side sorting
    );
    const unsubSubmissions = onSnapshot(submissionsQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid needing a Firestore composite index
      const sorted = data
        .sort((a: any, b: any) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
        .slice(0, 4);
      setRecentTasks(sorted);
    });

    // 3. Listen to active games
    const gamesQuery = query(collection(db, "cardGames"), where("status", "==", "active"));
    const unsubGames = onSnapshot(gamesQuery, (snap) => {
      const allActive = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Filter out 'Ghost' games: Truly ended games that are still marked active
      // We show games if:
      // 1. Not started yet (startTime is null)
      // 2. OR Started but not yet 10 minutes past duration
      const now = Math.floor(Date.now() / 1000);
      const filtered = allActive.filter(game => {
        if (!game.startTime) return true; // Show preparing games
        const end = game.startTime.seconds + (game.duration || 60);
        return now < end + 600; // Show for 10 mins after end
      });

      setActiveGames(filtered);
    });

    return () => {
      unsubUser();
      unsubSubmissions();
      unsubGames();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const coins = userData?.coins || 0;
  const balance = coins / 100;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {userData?.name || "Earner"}!</p>
        </div>
        <Link href="/wallet" className="w-full sm:w-auto">
          <Button variant="premium" size="sm" className="w-full sm:w-auto">
            Withdraw Funds <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Coins
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black"
                onClick={() => setIsDepositOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Coins className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coins.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current balance
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wallet Balance
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Min. withdraw ₹100
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earned
            </CardTitle>
            <Trophy className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(userData?.totalEarned || 0) / 100}</div>
            <p className="text-xs text-muted-foreground">
              Life-time earnings
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold uppercase text-xs tracking-widest text-amber-500">
              {userData?.isPremium ? "Premium Member" : "Free Member"}
            </div>
            <p className="text-xs text-muted-foreground">
              {userData?.isPremium ? "Full access active" : "Upgrade for bonus"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium">Earned from Task</p>
                        <p className="text-xs text-muted-foreground">{new Date(task.completedAt?.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-amber-500">+{task.earnedCoins} Coins</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent activity. Start earning now!
              </div>
            )}
          </CardContent>
        </Card>
        <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Live Games ({activeGames.length})
          </h3>

          <div className="space-y-3">
            {activeGames.length === 0 ? (
              <Card className="bg-card/30 border-dashed border-white/10 p-6 text-center">
                <p className="text-xs text-muted-foreground">No active sessions right now.</p>
              </Card>
            ) : (
              activeGames.map((game) => (
                <DashboardGameCard key={game.id} game={game} />
              ))
            )}
          </div>

          <ReferralCard code={userData?.referralCode || "INVITE"} />

          <Card className="bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Daily Bonus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="text-4xl animate-bounce">🎁</div>
                <p className="text-center text-sm text-muted-foreground">
                  Get 20% commission on every friend's task earnings!
                </p>
                <Link href="/tasks" className="w-full">
                  <Button variant="outline" className="w-full">
                    Go to Tasks
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
    </div>
  );
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
    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/10 overflow-hidden relative group transition-all hover:border-amber-500/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold truncate pr-16 bg-gradient-to-r from-amber-200 to-white bg-clip-text text-transparent">
            {game.question}
          </CardTitle>
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-lg absolute top-3 right-3",
            dashTime > 0 ? "bg-red-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-500"
          )}>
            {dashTime > 0 ? "LIVE" : "ENDED"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
              <Coins className="h-3 w-3" /> {game.price}
            </div>
            {dashTime > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-400 font-mono">
                <Timer className="h-3 w-3" /> {dashTime}s
              </div>
            )}
          </div>
          <Link href={`/dashboard/cards/${game.id}`}>
            <Button variant="premium" size="sm" className="h-9 px-5 text-[10px] font-black uppercase transition-transform active:scale-95">
              {dashTime > 0 ? "Join Game" : "View Result"} <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
