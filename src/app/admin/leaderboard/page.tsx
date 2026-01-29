"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trophy, Medal, Star, Loader2, Play, Save, History, Settings2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export default function LeaderboardAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [awarding, setAwarding] = useState(false);

  const [settings, setSettings] = useState({
    rank1Reward: 1000,
    rank2Reward: 500,
    rank3Reward: 250,
    awardMode: "manual" as "auto" | "manual",
    lastAwardedAt: null as any,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "hallOfFame");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            rank1Reward: data.rank1Reward || 1000,
            rank2Reward: data.rank2Reward || 500,
            rank3Reward: data.rank3Reward || 250,
            awardMode: data.awardMode || "manual",
            lastAwardedAt: data.lastAwardedAt || null,
          });
        }
      } catch (e) {
        console.error("Failed to load settings", e);
        toast.error("Failed to load settings");
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
          setting: "hallOfFame",
          data: settings
        })
      });

      if (!response.ok) throw new Error("Failed to save");
      toast.success("Leaderboard Reward Settings Saved!");
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAwardNow = async () => {
    if (!confirm("Are you sure you want to distribute rewards to the current Top 3 users? This action will immediately add coins to their balances.")) return;

    setAwarding(true);
    try {
      const response = await fetch("/api/admin/leaderboard/award", {
        method: "POST"
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully awarded ${data.awarded.length} users!`);
        // Refresh local timestamp
        setSettings(prev => ({ ...prev, lastAwardedAt: { seconds: data.timestamp / 1000 } }));
      } else {
        throw new Error(data.message || "Award failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Awarding Failed: ${error.message}`);
    } finally {
      setAwarding(false);
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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
            <Trophy className="h-8 w-8 text-amber-500 fill-amber-500/20" />
            Hall of <span className="text-amber-500">Fame</span> Rewards
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight">Manage prize distribution for the weekly leaderboard elites.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-zinc-900 text-white border border-white/10 hover:bg-zinc-800 font-bold px-6"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Config
          </Button>
          <Button
            onClick={handleAwardNow}
            disabled={awarding}
            className="bg-amber-500 text-black hover:bg-amber-400 font-black px-6 shadow-[0_0_20px_rgba(245,158,11,0.3)] italic uppercase tracking-widest text-xs"
          >
            {awarding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Award Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reward Configuration */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle>Prize Pool Configuration</CardTitle>
                <CardDescription>Set coin rewards for the Top 3 earners.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-black">1</div>
                  <Label className="text-amber-500 font-bold text-lg uppercase italic">First Rank</Label>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={settings.rank1Reward}
                    onChange={(e) => setSettings({ ...settings, rank1Reward: parseInt(e.target.value) || 0 })}
                    className="bg-black/40 border-amber-500/30 font-mono text-center text-xl text-amber-500 font-black"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-400/5 border border-zinc-400/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-400 flex items-center justify-center text-black font-black">2</div>
                  <Label className="text-zinc-400 font-bold text-lg uppercase italic">Second Rank</Label>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={settings.rank2Reward}
                    onChange={(e) => setSettings({ ...settings, rank2Reward: parseInt(e.target.value) || 0 })}
                    className="bg-black/40 border-zinc-400/30 font-mono text-center text-xl text-zinc-300 font-black"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-800/10 border border-amber-800/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-800 flex items-center justify-center text-white font-black">3</div>
                  <Label className="text-amber-800 font-bold text-lg uppercase italic">Third Rank</Label>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={settings.rank3Reward}
                    onChange={(e) => setSettings({ ...settings, rank3Reward: parseInt(e.target.value) || 0 })}
                    className="bg-black/40 border-amber-800/30 font-mono text-center text-xl text-amber-600 font-black"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Settings */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl h-fit">
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>Choose how you want to distribute awards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="space-y-1">
                  <Label className="text-white font-bold block">Awarding Mode</Label>
                  <p className="text-xs text-zinc-500">Auto mode pays every Sunday at midnight.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] uppercase font-black tracking-widest", settings.awardMode === 'manual' ? "text-amber-500" : "text-zinc-600")}>Manual</span>
                  <Switch
                    checked={settings.awardMode === 'auto'}
                    onCheckedChange={(val) => setSettings({ ...settings, awardMode: val ? 'auto' : 'manual' })}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className={cn("text-[10px] uppercase font-black tracking-widest", settings.awardMode === 'auto' ? "text-green-500" : "text-zinc-600")}>Auto</span>
                </div>
              </div>

              {settings.awardMode === 'auto' && (
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center gap-3 text-xs text-green-500/80">
                  <Play className="h-4 w-4 fill-green-500/20" />
                  <p className="font-medium animate-pulse">Automatic system is ARMED. Weekly payouts will occur every Sunday at 23:55 PM.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl h-fit">
            <CardHeader>
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-blue-500" />
                <CardTitle>Last Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-blue-500 font-bold uppercase tracking-widest text-[10px] bg-blue-500/10 px-2 py-1 rounded">Succeeded</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Last Awarded</span>
                  <span className="text-white font-mono">
                    {settings.lastAwardedAt
                      ? new Date(settings.lastAwardedAt.seconds * 1000).toLocaleString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Star className="h-5 w-5 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-bold">Pro Tip: Manual Verification</h4>
            <p className="text-sm text-zinc-500">
              In manual mode, you have full control. You can check the <a href="/leaderboard" target="_blank" className="text-amber-500 hover:underline">live leaderboard</a> anytime and click <strong>"Award Now"</strong> to pay your top legends. All transactions are logged in their activity feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
