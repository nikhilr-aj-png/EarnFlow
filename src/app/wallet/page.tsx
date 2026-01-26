"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { requestWithdrawal, getUserWithdrawals } from "@/lib/payouts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, IndianRupee, History, Loader2, CreditCard, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DepositModal } from "@/components/features/DepositModal";
import { ChangeUpiModal } from "@/components/features/ChangeUpiModal";
import { query, collection, where, orderBy, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isChangeUpiOpen, setIsChangeUpiOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Sync user data and coins
  useEffect(() => {
    setMounted(true);
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setUserData(doc.data());
      setDataLoading(false);
    });

    const fetchData = async () => {
      // Fetch withdrawals
      const withdrawalData = await getUserWithdrawals(user.uid);
      setHistory(withdrawalData);

      // Fetch deposit transactions
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid)
      );
      const transSnap = await getDocs(q);
      const transData = transSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTransactions(transData);
    };
    fetchData();

    return () => unsub();
  }, [user]);


  const handleRequestUpiChange = async () => {
    if (userData?.upiChangeRequest && userData.upiChangeRequest.status === 'pending') {
      toast.error("You already have a pending change request.");
      return;
    }
    setIsChangeUpiOpen(true);
  };

  const coins = userData?.coins || 0;

  const balance = coins / 100;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = Number(withdrawAmount);
    if (!amount || amount < 100) {
      toast.error("Minimum withdrawal amount is ₹100");
      return;
    }

    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    const finalUpi = userData?.savedUpi || upiId;

    if (!finalUpi) {
      toast.error("Please enter your UPI ID");
      return;
    }

    setLoading(true);
    try {
      await requestWithdrawal(user.uid, user.email || "", amount, "UPI", finalUpi);
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      setUpiId("");

      // Manually refresh history (or use onSnapshot if needed)
      const data = await getUserWithdrawals(user.uid);
      setHistory(data);
    } catch (err) {
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return <div className="flex h-screen items-center justify-center font-bold text-amber-500">Loading Wallet...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
        <p className="text-muted-foreground">Manage your earnings and request withdrawals.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card to-card/50 border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
          <CardHeader>
            <CardTitle className="flex items-center justify-between relative z-10 w-full">
              <div className="flex items-center space-x-2">
                <Coins className="text-amber-500 h-5 w-5" />
                <span>Total Coins</span>
              </div>
              <Button
                size="sm"
                className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black h-8 px-3"
                onClick={() => setIsDepositOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Coins
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold">{coins.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">
              100 Coins = ₹1.00
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 relative z-10">
              <IndianRupee className="text-green-500 h-5 w-5" />
              <span>Available Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold">₹{balance.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/5 bg-card/50">
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>Minimum withdrawal amount is ₹100</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Enter amount (min 100)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UPI ID / Bank Details</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="9876543210@ybl"
                      value={userData?.savedUpi || upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={!!userData?.savedUpi}
                      className={userData?.savedUpi ? "bg-white/5 border-amber-500/30 text-amber-500 font-bold pl-9" : ""}
                    />
                    {userData?.savedUpi && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>}
                  </div>
                  {userData?.savedUpi && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRequestUpiChange()}
                      className="border-white/10 hover:bg-white/5"
                    >
                      Change
                    </Button>
                  )}
                </div>
                {userData?.upiChangeRequest && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-400">
                    Requesting change to: <span className="text-white font-mono">{userData.upiChangeRequest.newUpiId}</span><br />
                    <span className="font-bold">Auto-update after: {new Date(userData.upiChangeRequest.validAfter?.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                )}

              </div>
              <div className="p-3 bg-secondary/30 rounded-md text-[10px] text-muted-foreground">
                Withdrawals are processed within 24-48 hours. Please ensure your payment details are correct.
              </div>
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Withdraw Funds
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/50 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-4 w-4" /> Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
            <div className="space-y-4">
              {/* Combine and sort history locally for unified view */}
              {[...history.map(h => ({ ...h, category: 'withdrawal' })), ...transactions.map(t => ({ ...t, category: 'deposit' }))]
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-white/5 rounded-md">
                  No transaction history.
                </div>
              ) : (
                [...history.map(h => ({ ...h, category: 'withdrawal' })), ...transactions.map(t => ({ ...t, category: 'deposit' }))]
                  .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          item.category === 'deposit' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {item.category === 'deposit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {item.category === 'deposit' ? "+" : "-"}
                            ₹{item.amount}
                            {item.category === 'deposit' && (
                              <span className="text-[10px] text-amber-500 font-normal">
                                ({item.coins} Coins)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {item.category === 'deposit' ? `Deposit (${item.type})` : `Withdrawal (${item.method})`}
                          </div>
                        </div>
                      </div>
                      <Badge variant={
                        item.status === 'successful' || item.status === 'approved' || item.status === 'completed'
                          ? 'default'
                          : item.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                      }>
                        {item.status === 'approved' ? 'successful' : item.status}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />

      <ChangeUpiModal
        isOpen={isChangeUpiOpen}
        onClose={() => setIsChangeUpiOpen(false)}
        currentUpi={userData?.savedUpi || upiId}
      />
    </div>
  );
}
