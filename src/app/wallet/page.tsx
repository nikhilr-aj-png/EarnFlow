"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, query, collection, where, getDocs } from "firebase/firestore";
import { requestWithdrawal, getUserWithdrawals } from "@/lib/payouts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, IndianRupee, History, Loader2, CreditCard, Plus, ArrowDownLeft, ArrowUpRight, Wallet, Landmark, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DepositModal } from "@/components/features/DepositModal";
import { ChangeUpiModal } from "@/components/features/ChangeUpiModal";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function WalletPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isChangeUpiOpen, setIsChangeUpiOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) setDataLoading(false);
  }, [authLoading]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const withdrawalData = await getUserWithdrawals(user.uid);
      setHistory(withdrawalData);

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
    if (!amount || amount < 100) return toast.error("Minimum withdrawal amount is ₹100");
    if (amount > balance) return toast.error("Insufficient balance");
    const finalUpi = userData?.savedUpi || upiId;
    if (!finalUpi) return toast.error("Please enter your UPI ID");

    setLoading(true);
    try {
      await requestWithdrawal(user.uid, user.email || "", amount, "UPI", finalUpi);
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      setUpiId("");
      const data = await getUserWithdrawals(user.uid);
      setHistory(data);
    } catch (err) {
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;
  }

  const allTransactions = [...history.map(h => ({ ...h, category: 'withdrawal' })), ...transactions.map(t => ({ ...t, category: 'deposit' }))]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Financial Hub</h1>
          <p className="text-zinc-400">Manage your earnings, deposits, and withdrawal requests.</p>
        </div>
        <Button onClick={() => setIsDepositOpen(true)} className="bg-amber-500 text-black hover:bg-amber-400 font-bold px-6 h-12 rounded-xl shadow-lg shadow-amber-500/20">
          <Plus className="mr-2 h-5 w-5" /> Add Funds
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Coin Card (Black Card Style) */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-zinc-900 border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col justify-between min-h-[180px] sm:h-[220px] group">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-black pointer-events-none" />
              <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />

              <div className="relative z-10 flex justify-between items-start">
                <div className="p-2 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                  <Coins className="h-5 v-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="font-mono text-zinc-500 tracking-widest text-[10px]">COINS</span>
              </div>

              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">{coins.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-zinc-400 font-medium uppercase tracking-widest">Total Balance</div>
              </div>
            </div>

            {/* Cash Card (Gold Card Style) */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-amber-500 border border-amber-400 p-6 sm:p-8 shadow-2xl shadow-amber-500/20 flex flex-col justify-between min-h-[180px] sm:h-[220px] group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 pointer-events-none" />
              <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />

              <div className="relative z-10 flex justify-between items-start">
                <div className="p-2 sm:p-3 bg-black/10 rounded-xl sm:rounded-2xl border border-black/5">
                  <Wallet className="h-5 v-5 sm:h-6 sm:w-6 text-black" />
                </div>
                <span className="font-mono text-amber-900/60 font-black tracking-widest text-[10px]">CASH VALUE</span>
              </div>

              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl font-black text-black tracking-tight mb-1 flex items-baseline">
                  <span className="text-xl sm:text-2xl mr-1">₹</span>{balance.toFixed(2)}
                </div>
                <div className="text-xs sm:text-sm text-amber-900/70 font-bold uppercase tracking-widest">Available Cash</div>
              </div>
            </div>
          </div>

          {/* Withdrawal Section */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><Landmark className="h-5 w-5" /></div>
              <h3 className="text-xl font-bold text-white">Request Withdrawal</h3>
            </div>

            <form onSubmit={handleWithdraw} className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-lg">₹</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-8 h-12 bg-white/5 border-white/10 text-lg font-bold text-white focus:border-amber-500/50 transition-all rounded-xl"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Min: ₹100 • Processing: 24h</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider h-12 rounded-xl text-sm transition-all shadow-[0_4px_20px_-5px_rgba(245,158,11,0.4)] hover:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)] active:translate-y-0.5">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="flex items-center">Withdraw Funds <ChevronRight className="ml-2 h-4 w-4" /></div>}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Payment Method (UPI)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="example@upi"
                        value={userData?.savedUpi || upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        disabled={!!userData?.savedUpi}
                        className={cn("h-12 bg-white/5 border-white/10 rounded-xl", userData?.savedUpi && "pl-11 border-amber-500/20 text-amber-500 font-mono font-bold")}
                      />
                      {userData?.savedUpi && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 p-1 bg-amber-500/10 rounded"><CreditCard className="h-3 w-3" /></div>}
                    </div>
                    {userData?.savedUpi && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRequestUpiChange()}
                        className="h-12 px-4 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl"
                        disabled={userData?.upiChangeRequest?.status === 'pending'}
                      >
                        {userData?.upiChangeRequest?.status === 'pending' ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : "edit"}
                      </Button>
                    )}
                  </div>
                  {userData?.upiChangeRequest && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 flex items-center justify-between">
                      <span>Change Pending: <span className="font-mono text-white ml-2">{userData.upiChangeRequest.newUpiId}</span></span>
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Transaction Sidebar */}
        <div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl h-[600px] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <History className="text-zinc-500 h-5 w-5" /> Recent Activity
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {allTransactions.length === 0 ? (
                <div className="py-20 text-center space-y-3 opacity-50">
                  <History className="h-10 w-10 mx-auto text-zinc-600" />
                  <p className="text-sm text-zinc-500">No transactions yet</p>
                </div>
              ) : (
                allTransactions.map((item, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={item.id}
                    className="p-4 rounded-2xl bg-black border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border",
                        item.category === 'deposit' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                      )}>
                        {item.category === 'deposit' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">
                          {item.category === 'deposit' ? "Deposit" : "Withdrawal"}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                          {item.category === 'deposit' ? item.type : item.method}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-black text-sm", item.category === 'deposit' ? "text-green-500" : "text-white")}>
                        {item.category === 'deposit' ? "+" : "-"}₹{item.amount}
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] h-4 px-1.5 border-0",
                        (item.status === 'successful' || item.status === 'approved' || item.status === 'completed') ? "bg-green-500/20 text-green-500" :
                          item.status === 'rejected' ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"
                      )}>
                        {item.status === 'approved' ? 'success' : item.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <ChangeUpiModal isOpen={isChangeUpiOpen} onClose={() => setIsChangeUpiOpen(false)} currentUpi={userData?.savedUpi || upiId} />
    </div>
  );
}
