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
import { Loader2, MessageSquare, Trash2, CheckCircle, Clock, Eye, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

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
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

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

      <div className="rounded-xl border border-white/5 bg-card/50 overflow-x-auto">
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
                        onClick={() => {
                          setSelectedMessage(msg);
                          setIsViewOpen(true);
                        }}
                        className="h-8 w-8 p-0 hover:bg-white/10 text-amber-500"
                        title="View Message"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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

      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Support Message Details"
      >
        {selectedMessage && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">From</p>
                <p className="text-white font-medium">{selectedMessage.name}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Email</p>
                <p className="text-blue-400 font-medium">{selectedMessage.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Message</p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {selectedMessage.message}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={() => {
                  window.location.href = `mailto:${selectedMessage.email}?subject=Re: EarnFlow Support - ${selectedMessage.name}&body=%0A%0A%0A--- Original Message ---%0A${encodeURIComponent(selectedMessage.message)}`;
                }}
              >
                <Mail className="mr-2 h-4 w-4" /> Reply Now
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-white border-white/10 hover:bg-white/5"
                onClick={() => handleToggleStatus(selectedMessage.id, selectedMessage.status)}
              >
                {selectedMessage.status === "pending" ? "Mark Resolved" : "Mark Pending"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
