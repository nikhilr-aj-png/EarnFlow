"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Loader2, CheckCircle, Clock, Mail, User as UserIcon, CreditCard, ArrowDownLeft, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


export default function AdminPaymentsPage() {
  const [razorpayTransactions, setRazorpayTransactions] = useState<any[]>([]);
  const [manualRequests, setManualRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'razorpay' | 'manual'>('razorpay');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Safety Timeout: Force stop loading after 5 seconds if Firestore hangs
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // 1. Listen to Razorpay Transactions
    const qTrans = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRazorpayTransactions(docs);
      setLoading(false);
      clearTimeout(safetyTimer);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast.error("Error loading transactions. Check console.");
      setLoading(false);
    });

    // 2. Listen to Legacy Manual Requests
    const qManual = query(collection(db, "paymentRequests"), orderBy("createdAt", "desc"));
    const unsubManual = onSnapshot(qManual, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManualRequests(docs);
    }, (error) => {
      console.error("Manual requests error:", error);
    });

    return () => {
      unsubTrans();
      unsubManual();
      clearTimeout(safetyTimer);
    };
  }, []);


  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Oversight</h1>
        <p className="text-muted-foreground">Monitor automated Razorpay transactions and manage legacy requests.</p>
      </div>

      <div className="space-y-6">
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('razorpay')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'razorpay'
              ? "bg-amber-500 text-black shadow-lg"
              : "text-muted-foreground hover:text-white"
              }`}
          >
            Razorpay Logs (Automated)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'manual'
              ? "bg-red-500 text-white shadow-lg"
              : "text-muted-foreground hover:text-white"
              }`}
          >
            Manual Requests (Legacy)
          </button>
        </div>

        {activeTab === 'razorpay' ? (
          <div className="bg-card border border-white/10 rounded-xl overflow-x-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {razorpayTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No Razorpay transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  razorpayTransactions.map((tr) => (
                    <TableRow key={tr.id} className="hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-[10px]">{tr.userId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tr.type === 'upgrade' ? "text-amber-500 border-amber-500/20" : "text-blue-500 border-blue-500/20"}>
                          {tr.type === 'upgrade' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ArrowDownLeft className="h-3 w-3 mr-1" />}
                          {tr.type === 'upgrade' ? "Membership" : "Deposit"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">₹{tr.amount}</TableCell>
                      <TableCell className="text-amber-500">+{tr.coins?.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{tr.paymentId}</TableCell>
                      <TableCell className="text-xs">
                        {mounted && tr.createdAt?.seconds ? new Date(tr.createdAt.seconds * 1000).toLocaleString() : "..."}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="bg-card border border-white/10 rounded-xl overflow-x-auto opacity-80 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No legacy requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  manualRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-bold">{req.userName}</p>
                          <p className="text-muted-foreground">{req.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{req.plan}</Badge></TableCell>
                      <TableCell>₹{req.amount}</TableCell>
                      <TableCell>
                        <Badge className={req.status === 'approved' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {mounted && req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : "..."}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
