"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Database,
  Trash2,
  AlertTriangle,
  History,
  FileCheck,
  Activity,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DatabaseCleanupPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    collection: string;
    title: string;
    description: string;
  }>({
    open: false,
    collection: "",
    title: "",
    description: ""
  });

  const collections = [
    {
      id: "activities",
      name: "Recent Activities",
      description: "Deletes all global activity logs (Dashboard feed). Does NOT affect user balances.",
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      id: "cardGameHistory",
      name: "Card Game History",
      description: "Deletes the visual result strip (Aviator style) and old round results. Does NOT affect coins.",
      icon: History,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      id: "taskSubmissions",
      name: "Task Submissions",
      description: "Deletes task completion records. Note: Users will be able to re-complete tasks if cleared.",
      icon: FileCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ];

  const handleCleanup = async (collectionName: string) => {
    setLoading(collectionName);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionName })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Cleanup failed");

      toast.success(`${collectionName} cleared successfully!`);
      setConfirmModal({ ...confirmModal, open: false });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
          <Database className="h-8 w-8 text-red-500" />
          DATABASE MANAGEMENT
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Clean up legacy logs and history data to optimize database performance.
          <span className="text-red-500 font-bold ml-1">Sensitive data (Coins, Wallets, Accounts) is NEVER touched.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {collections.map((col) => (
          <Card key={col.id} className="bg-zinc-900/50 border-white/5 hover:border-white/10 transition-all overflow-hidden relative group">
            <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
              <col.icon size={120} />
            </div>

            <CardHeader>
              <div className={`w-12 h-12 rounded-xl ${col.bgColor} flex items-center justify-center mb-4`}>
                <col.icon className={`h-6 w-6 ${col.color}`} />
              </div>
              <CardTitle className="text-xl font-bold">{col.name}</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-zinc-400">
                {col.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 border-t border-white/5">
              <Button
                variant="destructive"
                className="w-full font-bold h-11 gap-2"
                onClick={() => setConfirmModal({
                  open: true,
                  collection: col.id,
                  title: `Clear ${col.name}?`,
                  description: `This will permanently delete all ${col.name.toLowerCase()} records. This action cannot be undone, but user coins and accounts are safe.`
                })}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Safety Notice Card */}
      <Card className="bg-red-500/5 border-red-500/20 max-w-4xl">
        <CardContent className="p-6 flex gap-4">
          <div className="h-10 w-10 shrink-0 bg-red-500/20 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-red-500 italic uppercase tracking-wider text-sm text-shadow-sm">System Safety Protocols Enabled</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              These cleanup operations are limited to non-essential log collections.
              The <strong>users</strong>, <strong>wallets</strong>, and <strong>settings</strong> collections are protected from these tools.
              Once started, large deletions may take a few moments to sync across all dashboard views.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => !loading && setConfirmModal({ ...confirmModal, open: false })}
        title={confirmModal.title}
      >
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-red-500">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium leading-relaxed">
              {confirmModal.description}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              disabled={!!loading}
              variant="destructive"
              className="w-full font-black py-6 text-lg hover:scale-105 transition-transform"
              onClick={() => handleCleanup(confirmModal.collection)}
            >
              {loading === confirmModal.collection ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  CLEANING DATABASE...
                </>
              ) : (
                "YES, CLEAR PERMANENTLY"
              )}
            </Button>
            <Button
              disabled={!!loading}
              variant="ghost"
              className="w-full text-zinc-500"
              onClick={() => setConfirmModal({ ...confirmModal, open: false })}
            >
              Cancel Operation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
