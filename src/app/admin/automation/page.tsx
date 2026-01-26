
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Zap, Save, Clock } from "lucide-react";

export default function AutomationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // Settings State
  const [isEnabled, setIsEnabled] = useState(false);
  const [freeDailyCount, setFreeDailyCount] = useState(2);
  const [premiumDailyCount, setPremiumDailyCount] = useState(2);
  const [topics, setTopics] = useState("History, Science, Technology, Geography, General Knowledge");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, "settings", "quizAutomation");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsEnabled(data.isEnabled ?? false);
        setFreeDailyCount(data.freeDailyCount ?? 2);
        setPremiumDailyCount(data.premiumDailyCount ?? 2);
        setTopics(data.topics ? data.topics.join(", ") : "");
      }
    } catch (error) {
      console.error("Error fetching automation settings:", error);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const topicsList = topics.split(",").map(t => t.trim()).filter(t => t.length > 0);

      // Use API to save to ensure security if rules are strict, 
      // OR use client SDK if we allow admin writes to this specific setting.
      // Since we hardened rules, we must use the API or allowed admin write.
      // Let's assume we use client SDK for now as we are Admin. 
      // WAIT! We locked down /settings writes. We need to use the API we made or a new one.
      // Actually, for this task, I will revert to using the API for saving settings to be consistent.

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setting: "quizAutomation",
          data: {
            isEnabled,
            freeDailyCount: Number(freeDailyCount),
            premiumDailyCount: Number(premiumDailyCount),
            topics: topicsList
          }
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Server Error: ${response.status}`);

      toast.success("Automation settings saved!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(`Save Failed: ${error.message}`);
    } finally {

      setSaving(false);
    }
  };

  const handleManualRun = async () => {
    if (!confirm("Run automation now? This will generate tasks immediately.")) return;

    setRunning(true);
    try {
      // Trigger the Cron API manually
      const response = await fetch("/api/cron/daily-quiz?key=" + process.env.NEXT_PUBLIC_FIREBASE_API_KEY, { // Simple protection or just call logic
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'manual_run'}`
        }
      });

      const result = await response.json();

      if (result.skipped) {
        toast.info(`Automation Skipped: ${result.reason}`);
        return;
      }

      if (result.success) {
        toast.success(`Success! Generated ${result.count} tasks.`);
      } else {
        throw new Error(result.error || "Unknown error");
      }

    } catch (error: any) {
      console.error("Manual Run Error:", error);
      toast.error("Failed to run automation: " + error.message);
    } finally {
      setRunning(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quiz Automation (AI)</h1>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isEnabled ? "text-green-500" : "text-muted-foreground"}`}>
            {isEnabled ? "ACTIVE" : "DISABLED"}
          </span>
          {/* Toggle Switch */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`w-12 h-6 rounded-full relative transition-colors ${isEnabled ? "bg-green-500" : "bg-zinc-700"}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? "left-7" : "left-1"}`} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-6 border border-white/10 rounded-lg bg-card">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Daily Schedule (12:00 AM)
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure how many tasks to generate automatically every night.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Free Tasks per Day</label>
              <Input
                type="number"
                min="0"
                value={freeDailyCount}
                onChange={(e) => setFreeDailyCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Premium Tasks per Day</label>
              <Input
                type="number"
                min="0"
                value={premiumDailyCount}
                onChange={(e) => setPremiumDailyCount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Topics (Comma separated)</label>
            <Input
              placeholder="History, Science, Math, General Knowledge..."
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">AI will adjust questions based on these topics randomly.</p>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-white/10">
          <Button
            variant="outline"
            onClick={handleManualRun}
            disabled={running}
            className="border-amber-500/50 hover:bg-amber-500/10 text-amber-500"
          >

            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Run Now (Test)
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
