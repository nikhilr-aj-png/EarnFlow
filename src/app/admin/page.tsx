"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Coins, ArrowUpRight, AlertCircle, TrendingUp, Trophy } from "lucide-react";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    payouts: 0,
    pending: 0,
    tasks: 0,
    premiumRevenue: 0,
    upiRequests: 0,
    totalTaskEarnings: 0,
    totalGameEarnings: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const tasksSnap = await getDocs(collection(db, "tasks"));
        const pendingSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "pending")));
        const approvedSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "approved")));
        const successfulSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "successful")));

        let totalPayouts = 0;
        approvedSnap.forEach(doc => totalPayouts += doc.data().amount);
        successfulSnap.forEach(doc => totalPayouts += doc.data().amount);

        // Calculate Premium Revenue, UPI Requests, and Global Earnings
        let premiumCount = 0;
        let upiCount = 0;
        let totalTaskEarnings = 0;
        let totalGameEarnings = 0;

        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.isPremium) premiumCount++;
          if (data.upiChangeRequest?.status === 'pending') upiCount++;
          totalTaskEarnings += (data.taskEarnings || 0);
          totalGameEarnings += (data.gameEarnings || 0);
        });
        const premiumRevenue = premiumCount * 99;

        setStats({
          users: usersSnap.size,
          tasks: tasksSnap.size,
          pending: pendingSnap.size,
          payouts: totalPayouts,
          premiumRevenue,
          upiRequests: upiCount,
          totalTaskEarnings,
          totalGameEarnings,
        });


        // Recent Platform Activity (Bets, Wins, Tasks, Payments)
        const recentQ = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(15));
        const recentSnap = await getDocs(recentQ);
        setRecentRequests(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>;
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'game_win': return 'text-green-400';
      case 'bet': return 'text-zinc-400';
      case 'deposit': return 'text-blue-400';
      case 'withdrawal': return 'text-red-400';
      case 'upgrade': return 'text-amber-400';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">UPI Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upiRequests}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payout Breakdown</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Task Payouts:</span>
                <span className="font-bold text-white">₹{(stats.totalTaskEarnings || 0) / 100}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Game Wins:</span>
                <span className="font-bold text-amber-500">₹{(stats.totalGameEarnings || 0) / 100}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.payouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Approved withdrawals</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Action required</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks}</div>
            <p className="text-xs text-muted-foreground">Live in app</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-500">Premium Revenue</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">₹{stats.premiumRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From subscriptions</p>
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-4 grid-cols-1">
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                recentRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                      <div className={`h-2 w-2 rounded-full ${getActivityColor(req.type).replace('text', 'bg')}`} />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white capitalize">{req.title || req.type}</p>
                        <p className="text-xs text-muted-foreground">{req.userEmail || "System Event"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-black ${getActivityColor(req.type)}`}>
                        {req.type === 'bet' || req.type === 'withdrawal' ? '-' : '+'}{req.amount}
                      </span>
                      <p className="text-[10px] text-zinc-500 uppercase font-black">{req.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
