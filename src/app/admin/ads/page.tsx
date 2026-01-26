"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adConfig, setAdConfig] = useState({
    monetagDirectLink: "",
    monetagZoneTag: '<script src="..."></script>',
    bannerAdCode: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "ads");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setAdConfig(snap.data() as any);
        }
      } catch (e) {
        console.error("Failed to load ad settings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setting: "ads",
          data: adConfig
        })
      });

      if (!response.ok) throw new Error("Failed to save");
      toast.success("Ad Settings Saved!");
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Settings...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ad Management</h1>
        <p className="text-muted-foreground">Configure Monetag and other ad networks.</p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-amber-500">Monetag Configuration</CardTitle>
          <CardDescription>Enter your zone IDs and direct links from Monetag Dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Direct Link URL (for "Watch Ad" Tasks)</label>
            <Input
              placeholder="https://..."
              value={adConfig.monetagDirectLink}
              onChange={(e) => setAdConfig({ ...adConfig, monetagDirectLink: e.target.value })}
              className="bg-black/20 border-white/10"
            />
            <p className="text-[10px] text-muted-foreground">Used in AdModal task buttons.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Zone Tag / Header Script (Vignette/Push)</label>
            <textarea
              placeholder='<script src="https://alwingulla.com/..."></script>'
              value={adConfig.monetagZoneTag}
              onChange={(e) => setAdConfig({ ...adConfig, monetagZoneTag: e.target.value })}
              className="w-full min-h-[100px] rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[10px] text-muted-foreground">This script will be injected into the website header.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-amber-500 text-black font-bold">
        {saving ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
