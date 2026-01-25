"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, MessageSquare, Trash2, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "resolved";
  createdAt: Timestamp;
}

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const q = query(collection(db, "contactMessages"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const msgs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactMessage[];
      setMessages(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "resolved" : "pending";
    try {
      await updateDoc(doc(db, "contactMessages", id), {
        status: newStatus
      });
      toast.success(`Message marked as ${newStatus}`);
      fetchMessages();
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, "contactMessages", id));
      toast.success("Message deleted");
      fetchMessages();
    } catch (error) {
      toast.error("Failed to delete message.");
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Messages</h1>
          <p className="text-muted-foreground">View and manage user inquiries.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {messages.length} Total Messages
        </Badge>
      </div>

      <div className="rounded-xl border border-white/5 bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 bg-white/5">
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                  No support messages found.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((msg) => (
                <TableRow key={msg.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{msg.name}</span>
                      <span className="text-xs text-muted-foreground">{msg.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm line-clamp-2 md:line-clamp-none">{msg.message}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {msg.createdAt?.toDate().toLocaleString() || "Recent"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={msg.status === "resolved" ? "default" : "secondary"}
                      className={msg.status === "resolved" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"}
                    >
                      {msg.status === "resolved" ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {msg.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(msg.id, msg.status)}
                        className="h-8 w-8 p-0 hover:bg-white/10"
                        title={msg.status === "pending" ? "Mark as Resolved" : "Mark as Pending"}
                      >
                        <CheckCircle className={`h-4 w-4 ${msg.status === "resolved" ? "text-green-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(msg.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <a
                        href={`mailto:${msg.email}?subject=Re: EarnFlow Support - ${msg.name}&body=%0A%0A%0A--- Original Message ---%0A${encodeURIComponent(msg.message)}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-white/10 transition-colors text-blue-400"
                        title="Reply via Email"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </div>
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
