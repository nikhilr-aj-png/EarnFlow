"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, Timestamp, getDoc, increment } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    try {
      const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(data);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: "successful" | "rejected") => {
    setActionLoading(id);
    try {
      // 1. Get request details
      const reqRef = doc(db, "withdrawals", id);
      const reqSnap = await getDoc(reqRef);
      const reqData = reqSnap.data();

      if (!reqData) throw new Error("Request not found");

      // 2. If rejected, refund coins to user
      if (newStatus === "rejected") {
        const userRef = doc(db, "users", reqData.userId);
        await updateDoc(userRef, {
          coins: increment(reqData.amount * 100)
        });
      }

      // 3. Update request status
      await updateDoc(reqRef, {
        status: newStatus,
        processedAt: Timestamp.now(),
      });

      toast.success(`Request marked as ${newStatus}!`);
      fetchWithdrawals();
    } catch (error) {
      console.error(error);
      toast.error("Process failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Withdrawal Requests</h1>
      </div>

      <div className="rounded-md border border-white/10 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No withdrawal requests found.
                </TableCell>
              </TableRow>
            ) : (
              withdrawals.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium text-xs">{req.userEmail || req.userId.slice(0, 10)}</TableCell>
                  <TableCell className="font-bold text-green-500">₹{req.amount}</TableCell>
                  <TableCell className="uppercase text-xs font-bold">{req.method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{req.details}</TableCell>
                  <TableCell>
                    <Badge variant={req.status === 'successful' || req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {req.status === 'approved' ? 'successful' : req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-8 px-2"
                          disabled={actionLoading === req.id}
                          onClick={() => handleStatusUpdate(req.id, 'successful')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Success
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-2"
                          disabled={actionLoading === req.id}
                          onClick={() => handleStatusUpdate(req.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {req.status !== 'pending' && (
                      <span className="text-xs text-muted-foreground">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
