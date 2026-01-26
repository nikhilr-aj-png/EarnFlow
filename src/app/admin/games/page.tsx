"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy, Timestamp, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Play, Image as ImageIcon, Search, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";

export default function AdminGamesPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'automation'>('active');
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Automation State
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoSettings, setAutoSettings] = useState<{
    free: Record<string, number>,
    premium: Record<string, number>
  }>({
    free: { "24h": 100, "12h": 80, "6h": 60, "3h": 40, "2h": 30, "1h": 20, "30m": 10 },
    premium: { "24h": 200, "12h": 160, "6h": 120, "3h": 80, "2h": 60, "1h": 40, "30m": 20 }
  });

  const DURATIONS = ["24h", "12h", "6h", "3h", "2h", "1h", "30m"];

  const [formData, setFormData] = useState({
    question: "Which card is the winner?",
    price: 10,
    duration: "1h", // Default string enum
    winnerIndex: 0,
    status: "inactive",
    isPremium: false,
    cardImages: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop"
    ]
  });

  useEffect(() => {
    const q = query(collection(db, "cardGames"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setGames(data);
      setLoading(false);
    });

    // Load Automation Settings
    const loadSettings = async () => {
      try {
        const docSnap = await getDocs(query(collection(db, "settings")));
        // Ideally fetching specific doc 'gameAutomation'
        // const s = await getDoc(doc(db, "settings", "gameAutomation"));
        // keeping it simple with onSnapshot for games, but fetch once for settings
      } catch (e) {
        console.error(e);
      }
    };
    loadSettings();

    return () => unsub();
  }, []);

  const handleOpenModal = (game?: any) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        question: game.question,
        price: game.price,
        duration: game.duration || "1h",
        winnerIndex: game.winnerIndex,
        status: game.status || "inactive",
        isPremium: game.isPremium || false,
        cardImages: game.cardImages || formData.cardImages
      });
    } else {
      setEditingGame(null);
      setFormData({
        question: "Which card is the winner?",
        price: 10,
        duration: "1h",
        winnerIndex: 0,
        status: "inactive",
        isPremium: false,
        cardImages: [
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop"
        ]
      });
    }
    setIsModalOpen(true);
  };

  const DURATIONS_MAP: Record<string, number> = {
    "24h": 24 * 3600,
    "12h": 12 * 3600,
    "6h": 6 * 3600,
    "3h": 3 * 3600,
    "2h": 2 * 3600,
    "1h": 3600,
    "30m": 1800
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const durationSeconds = DURATIONS_MAP[formData.duration] || 3600;

      if (editingGame) {
        await setDoc(doc(db, "cardGames", editingGame.id), {
          ...formData,
          duration: durationSeconds,
          expiryLabel: formData.duration, // Store label for UI
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success("Game updated!");
      } else {
        await addDoc(collection(db, "cardGames"), {
          ...formData,
          duration: durationSeconds,
          expiryLabel: formData.duration,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("New game added!");
      }
      setIsModalOpen(false);
    } catch (err) {

      console.error(err);
      toast.error("Process failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this game?")) {
      await deleteDoc(doc(db, "cardGames", id));
      toast.success("Deleted");
    }
  };

  const handleSaveAutomation = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "gameAutomation"), {
        isEnabled: autoEnabled,
        settings: autoSettings,
        updatedAt: serverTimestamp()
      });
      toast.success("Automation Settings Saved!");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Helper to update setting
  const updateSetting = (type: 'free' | 'premium', duration: string, val: number) => {
    setAutoSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [duration]: val
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white">Game Management</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'active' ? 'default' : 'outline'}
            onClick={() => setActiveTab('active')}
            className={activeTab === 'active' ? "bg-amber-500 text-black" : "border-white/10"}
          >
            Active Games
          </Button>
          <Button
            variant={activeTab === 'automation' ? 'default' : 'outline'}
            onClick={() => setActiveTab('automation')}
            className={activeTab === 'automation' ? "bg-amber-500 text-black" : "border-white/10"}
          >
            Automation
          </Button>
        </div>
      </div>

      {activeTab === 'active' ? (
        <>
          <div className="flex justify-end">
            <Button onClick={() => handleOpenModal()} className="bg-amber-600 hover:bg-amber-700 text-black font-bold">
              <Plus className="mr-2 h-4 w-4" /> Add New Game
            </Button>
          </div>
          <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold">Question</TableHead>
                  <TableHead className="text-muted-foreground font-bold text-center">Duration</TableHead>
                  <TableHead className="text-muted-foreground font-bold text-center">Price</TableHead>
                  <TableHead className="text-muted-foreground font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>{game.question} {game.isPremium && <span className="text-amber-500 text-xs ml-2 border border-amber-500 px-1 rounded">PREMIUM</span>}</TableCell>
                    <TableCell className="text-center">{game.duration}</TableCell>
                    <TableCell className="text-center text-amber-500 font-bold">{game.price}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-blue-500" onClick={() => handleOpenModal(game)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(game.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-amber-500">Automation Configuration</CardTitle>
              <CardDescription>Set automatic coin rewards for expiring games per timeframe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-black/20 border border-white/5">
                <label className="font-bold">Enable Automation</label>
                <input
                  type="checkbox"
                  checked={autoEnabled}
                  onChange={(e) => setAutoEnabled(e.target.checked)}
                  className="w-6 h-6 accent-amber-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Free Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold text-green-400 border-b border-white/10 pb-2">Free User Rewards</h3>
                  {DURATIONS.map(d => (
                    <div key={d} className="flex items-center justify-between">
                      <span className="text-sm font-medium w-16">{d}</span>
                      <Input
                        type="number"
                        value={autoSettings.free[d]}
                        onChange={(e) => updateSetting('free', d, Number(e.target.value))}
                        className="h-8 w-32 bg-white/5 border-white/10"
                      />
                    </div>
                  ))}
                </div>

                {/* Premium Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold text-amber-400 border-b border-white/10 pb-2">Premium User Rewards</h3>
                  {DURATIONS.map(d => (
                    <div key={d} className="flex items-center justify-between">
                      <span className="text-sm font-medium w-16">{d}</span>
                      <Input
                        type="number"
                        value={autoSettings.premium[d]}
                        onChange={(e) => updateSetting('premium', d, Number(e.target.value))}
                        className="h-8 w-32 bg-white/5 border-white/10"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveAutomation} disabled={saving} className="w-full bg-amber-500 text-black font-bold">
                {saving ? "Saving..." : "Save Automation Settings"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Reused - Updated for Duration Dropdown */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGame ? "Edit Game" : "New Game"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-amber-500">Question</label>
            <Input value={formData.question} onChange={e => setFormData({ ...formData, question: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-amber-500">Entry Price</label>
              <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-sm font-bold text-amber-500">Duration</label>
              <select
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                className="w-full h-10 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-amber-500">Tier</label>
            <select
              value={formData.isPremium ? 'premium' : 'free'}
              onChange={e => setFormData({ ...formData, isPremium: e.target.value === 'premium' })}
              className="w-full h-10 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* ... keeping card inputs simplified or reusing ... */}
          <div className="space-y-2 pt-4">
            <label className="text-sm font-bold text-amber-500 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Card Visuals
            </label>
            <div className="grid grid-cols-2 gap-4">
              {formData.cardImages.map((img, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Card {idx + 1}</span>
                  <Input
                    value={img}
                    onChange={e => {
                      const n = [...formData.cardImages]; n[idx] = e.target.value;
                      setFormData({ ...formData, cardImages: n });
                    }}
                    className="h-8 text-[10px] bg-white/5 border-white/5"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full bg-amber-500 text-black font-bold mt-4">
            {saving ? "Saving..." : "Save Game"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}


function AdminTimer({ game }: { game: any }) {
  const [remains, setRemains] = useState(0);

  useEffect(() => {
    const tick = () => {
      const start = game.startTime.seconds;
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, game.duration - (now - start));
      setRemains(diff);
    };
    tick();
    const itv = setInterval(tick, 1000);
    return () => clearInterval(itv);
  }, [game.startTime, game.duration]);

  if (remains <= 0) return null;

  return (
    <div className="text-[10px] font-mono text-amber-500 flex items-center gap-1 animate-pulse">
      <Timer className="h-2.5 w-2.5" /> {remains}s
    </div>
  );
}
