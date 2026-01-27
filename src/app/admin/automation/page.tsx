"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Zap, Loader2, Play, Plus, Trash2, Save, Wand2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AutomationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCron, setRunningCron] = useState(false);

  const [settings, setSettings] = useState({
    isEnabled: false,
    freeDailyCount: 2,
    premiumDailyCount: 5,
    freeReward: 50,
    premiumReward: 150,
    topics: ["General Knowledge", "Technology", "History", "Science"],
  });

  const [newTopic, setNewTopic] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "quizAutomation");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data() as any);
        }
      } catch (e) {
        console.error("Failed to load automation settings", e);
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
          setting: "quizAutomation",
          data: settings
        })
      });

      if (!response.ok) throw new Error("Failed to save");
      toast.success("Automation Settings Saved!");
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    if (settings.topics.includes(newTopic.trim())) return;
    setSettings({ ...settings, topics: [...settings.topics, newTopic.trim()] });
    setNewTopic("");
  };

  const handleRemoveTopic = (topic: string) => {
    setSettings({
      ...settings,
      topics: settings.topics.filter((t) => t !== topic),
    });
  };

  const triggerCron = async () => {
    if (!confirm("Are you sure you want to trigger the AI Quiz generation now?")) return;

    setRunningCron(true);
    try {
      const response = await fetch("/api/cron/daily-quiz");
      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully generated ${data.count} quizzes!`);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Cron Failed: ${error.message}`);
    } finally {
      setRunningCron(false);
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
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Zap className="h-8 w-8 text-amber-500 fill-amber-500/20" />
            Automation Command Center
          </h1>
          <p className="text-zinc-500 font-medium">Configure AI-driven task generation and system maintenance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={triggerCron}
            disabled={runningCron}
            className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-all font-bold"
          >
            {runningCron ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2 text-green-500" />}
            Run Daily Quiz Cron
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 text-black hover:bg-amber-400 font-black px-6 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main AI Toggle */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl md:col-span-2 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wand2 className="h-32 w-32 text-amber-500" />
          </div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">AI Quiz Generation</CardTitle>
                <CardDescription>Automatically create daily quizzes using Google Gemini AI.</CardDescription>
              </div>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(val) => setSettings({ ...settings, isEnabled: val })}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Counts & Rewards */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Generation Limits</CardTitle>
            <CardDescription>How many tasks to generate each day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Free Daily Tasks</Label>
                <Input
                  type="number"
                  value={isNaN(settings.freeDailyCount) ? "" : settings.freeDailyCount}
                  onChange={(e) => setSettings({ ...settings, freeDailyCount: parseInt(e.target.value) })}
                  className="bg-black/20 border-white/5 font-mono text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Premium Daily Tasks</Label>
                <Input
                  type="number"
                  value={isNaN(settings.premiumDailyCount) ? "" : settings.premiumDailyCount}
                  onChange={(e) => setSettings({ ...settings, premiumDailyCount: parseInt(e.target.value) })}
                  className="bg-black/20 border-white/5 font-mono text-lg text-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Free Reward</Label>
                <Input
                  type="number"
                  value={isNaN(settings.freeReward) ? "" : settings.freeReward}
                  onChange={(e) => setSettings({ ...settings, freeReward: parseInt(e.target.value) })}
                  className="bg-black/20 border-white/5 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Premium Reward</Label>
                <Input
                  type="number"
                  value={isNaN(settings.premiumReward) ? "" : settings.premiumReward}
                  onChange={(e) => setSettings({ ...settings, premiumReward: parseInt(e.target.value) })}
                  className="bg-black/20 border-white/5 font-mono text-amber-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl flex flex-col">
          <CardHeader>
            <CardTitle>AI Topics</CardTitle>
            <CardDescription>Gemini will rotate through these topics for quiz generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="flex flex-wrap gap-2">
              {settings.topics.map((topic) => (
                <div key={topic} className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/20 text-sm font-bold">
                  {topic}
                  <button onClick={() => handleRemoveTopic(topic)} className="hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 flex gap-2">
              <Input
                placeholder="New Topic (e.g. Space Exploration)"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="bg-black/20 border-white/5"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
              />
              <Button onClick={handleAddTopic} variant="secondary" className="bg-white/5 hover:bg-white/10 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-amber-500/5 border-amber-500/10">
        <CardContent className="p-4 flex items-center gap-4 text-sm text-amber-500/80">
          <Zap className="h-5 w-5 shrink-0" />
          <p>
            The <strong>AI Cron</strong> is scheduled to run daily at midnight. You can also trigger it manually using the button above.
            Make sure your <strong>GEMINI_API_KEY</strong> is set in your environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
