"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, addDoc, deleteDoc, serverTimestamp, query, onSnapshot, where, deleteField, getDocs, writeBatch } from "firebase/firestore";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Image as ImageIcon, Timer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const DURATIONS = ["24h", "12h", "6h", "3h", "2h", "1h", "30m", "5m", "1m"];

  // Stats State
  const [stats, setStats] = useState<Record<string, number[]>>({});

  const [formData, setFormData] = useState({
    question: "Which card is the winner?",
    price: 10,
    duration: "1h",
    winnerIndex: 0,
    winnerSelection: 'manual', // 'manual' | 'auto'
    status: "active",
    isPremium: false,
    cardImages: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop"
    ]
  });

  useEffect(() => {
    // 1. Listen to Games
    const q = query(collection(db, "cardGames"));
    const unsubGames = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setGames(data);
      setLoading(false);
    });

    return () => unsubGames();
  }, []);

  // Separate Effect for Stats Listeners to avoid re-subscribing to *games* constantly
  const activeIds = games.filter(g => g.status === 'active').map(g => g.id).sort().join(',');
  useEffect(() => {
    const activeGames = games.filter(g => g.status === 'active' && g.startTime?.seconds);
    const unsubs: (() => void)[] = [];

    activeGames.forEach(game => {
      const q = query(collection(db, "cardGameEntries"), where("gameId", "==", game.id), where("gameStartTime", "==", game.startTime.seconds));
      const unsub = onSnapshot(q, (snap) => {
        const counts = [0, 0, 0, 0];
        snap.forEach(doc => {
          const selected = doc.data().selectedCards || [];
          selected.forEach((idx: number) => { if (idx >= 0 && idx < 4) counts[idx]++; });
        });
        setStats(prev => ({ ...prev, [game.id]: counts }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [activeIds]); // Only re-sub if active list changes.

  const handleOpenModal = (game?: any) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        question: game.question,
        price: game.price,
        duration: game.duration || "1h",
        winnerIndex: game.winnerIndex,
        winnerSelection: game.winnerSelection || 'manual',
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
        winnerSelection: 'manual',
        status: "active",
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
    "30m": 1800,
    "5m": 300,
    "1m": 60
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const durationSeconds = DURATIONS_MAP[formData.duration] || 3600;

      const payload = {
        ...formData,
        duration: durationSeconds,
        updatedAt: serverTimestamp()
      };

      // CRITICAL FIX: If Auto Mode, reset winnerIndex to -1 so backend calculates it.
      if (formData.winnerSelection === 'auto') {
        payload.winnerIndex = -1;
      }

      if (editingGame) {
        // Detect "Convert to Manual" Action
        const isConvertingFromAuto = editingGame.winnerSelection === 'auto' && formData.winnerSelection === 'manual';

        if (isConvertingFromAuto) {
          // 1. Update Old Game: Make Manual, Remove 'expiryLabel' (detaches from slot)
          const updateData: any = {
            ...payload,
            expiryLabel: deleteField(),
            winnerSelection: 'manual',
            generatedBy: 'admin_override'
          };
          if (formData.status === 'active' && !editingGame.startTime) {
            updateData.startTime = serverTimestamp();
          }
          await setDoc(doc(db, "cardGames", editingGame.id), updateData, { merge: true });

          // 2. Refill Slot: Create New Auto Game
          const imgs = Array.from({ length: 24 }, (_, i) => `/images/cards/${i + 1}.png`);
          const shuffled = imgs.sort(() => 0.5 - Math.random()).slice(0, 4);

          const refillPayload = {
            ...formData,
            question: "Which card is the winner?",
            winnerIndex: -1,
            winnerSelection: 'auto',
            cardImages: shuffled,
            startTime: serverTimestamp(),
            createdAt: serverTimestamp(),
            duration: durationSeconds,
            expiryLabel: formData.duration, // Restore label for new game
            status: 'active'
          };
          await addDoc(collection(db, "cardGames"), refillPayload);

          toast.success("Converted to Manual & Refilled Slot!");

        } else {
          // Standard Update
          const updateData: any = { ...payload, expiryLabel: formData.duration };
          if (formData.status === 'active' && !editingGame.startTime) {
            updateData.startTime = serverTimestamp();
          }
          await setDoc(doc(db, "cardGames", editingGame.id), updateData, { merge: true });
          toast.success("Game updated!");

          // NEW: If manual and winner is set, trigger payouts via API
          if (formData.winnerSelection === 'manual' && formData.winnerIndex !== -1) {
            fetch("/api/admin/games/card/award", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gameId: editingGame.id,
                winnerIndex: formData.winnerIndex,
                startTime: editingGame.startTime?.seconds || Math.floor(Date.now() / 1000)
              })
            }).then(r => r.json()).then(data => {
              if (data.winners > 0) toast.success(`Paid ${data.winners} winners!`);
            }).catch(console.error);
          }
        }

      } else {
        // Create New
        await addDoc(collection(db, "cardGames"), {
          ...payload,
          expiryLabel: formData.duration,
          startTime: serverTimestamp(),
          createdAt: serverTimestamp(),
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
    if (confirm("Permanently delete this game and all participant history?")) {
      try {
        // 1. Delete Game Document
        await deleteDoc(doc(db, "cardGames", id));

        // 2. Delete All Entries (for history cleanup)
        const q = query(collection(db, "cardGameEntries"), where("gameId", "==", id));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }

        toast.success("Game & History Deleted");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete fully");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white">Game Management</h1>
      </div>

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
              <TableHead className="text-muted-foreground font-bold text-center">Mode</TableHead>
              <TableHead className="text-muted-foreground font-bold text-center">Price</TableHead>
              <TableHead className="text-muted-foreground font-bold text-center">Status</TableHead>
              <TableHead className="text-muted-foreground font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game) => (
              <TableRow key={game.id} className="border-white/5 hover:bg-white/5">
                <TableCell>{game.question} {game.isPremium && <span className="text-amber-500 text-xs ml-2 border border-amber-500 px-1 rounded">PREMIUM</span>}</TableCell>
                <TableCell className="text-center font-mono text-xs uppercase text-blue-400">{game.winnerSelection === 'auto' ? 'Auto (Low)' : 'Manual'}</TableCell>
                <TableCell className="text-center text-amber-500 font-bold">{game.price}</TableCell>
                <TableCell className="text-center">
                  <span className={`text-[10px] px-2 py-1 rounded-full ${game.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {game.status === 'expired' ? 'INACTIVE' : game.status?.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="text-blue-500" onClick={() => handleOpenModal(game)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(game.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal - Updated for Winner Settings & Stats */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGame ? "Edit Game" : "New Game"}>
        <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className="text-sm font-bold text-amber-500">Question</label>
              <Input value={formData.question} onChange={e => setFormData({ ...formData, question: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-sm font-bold text-amber-500">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-10 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
            <label className="text-sm font-bold text-blue-400 block border-b border-white/10 pb-2 mb-2">Winner Selection Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="winMode" checked={formData.winnerSelection === 'manual'} onChange={() => setFormData({ ...formData, winnerSelection: 'manual' })} className="accent-amber-500" />
                <span className="text-sm">Manual (Pre-set)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="winMode" checked={formData.winnerSelection === 'auto'} onChange={() => setFormData({ ...formData, winnerSelection: 'auto' })} className="accent-amber-500" />
                <span className="text-sm">Auto (Least Users Wins)</span>
              </label>
            </div>

            {formData.winnerSelection === 'manual' && (
              <div className="mt-2">
                <label className="text-xs font-bold text-muted-foreground mr-2">Winning Card Index:</label>
                <select value={formData.winnerIndex} onChange={e => setFormData({ ...formData, winnerIndex: Number(e.target.value) })} className="h-8 rounded bg-black border border-white/10 text-white text-xs">
                  {formData.cardImages.map((_, i) => <option key={i} value={i}>Card {i + 1}</option>)}
                </select>
              </div>
            )}
            {formData.winnerSelection === 'auto' && (
              <div className="mt-2 text-xs text-green-400 italic">
                Winner will be calculated automatically when time expires based on LEAST purchases.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-bold text-amber-500">Entry Price</label><Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="bg-white/5 border-white/10" /></div>
            <div><label className="text-sm font-bold text-amber-500">Duration</label><select value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} className="w-full h-10 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500">{DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          </div>
          <div><label className="text-sm font-bold text-amber-500">Tier</label><select value={formData.isPremium ? 'premium' : 'free'} onChange={e => setFormData({ ...formData, isPremium: e.target.value === 'premium' })} className="w-full h-10 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"><option value="free">Free</option><option value="premium">Premium</option></select></div>

          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-amber-500 flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Card Visuals & Stats</label>
              <Button type="button" size="sm" variant="outline" onClick={() => {
                const imgs = Array.from({ length: 24 }, (_, i) => `/images/cards/${i + 1}.png`);
                const shuffled = imgs.sort(() => 0.5 - Math.random()).slice(0, 4);
                setFormData(prev => ({ ...prev, cardImages: shuffled }));
              }} className="h-7 text-xs border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
                <Sparkles className="mr-1 h-3 w-3" /> Randomize Cards
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {formData.cardImages.map((img, idx) => {
                const count = editingGame ? (stats[editingGame.id]?.[idx] || 0) : 0;
                // Calculate Prediction (Least Bought)
                const currentStats = editingGame ? (stats[editingGame.id] || [0, 0, 0, 0]) : [0, 0, 0, 0];
                // Filter out non-numbers if any
                const validStats = currentStats.map(n => Number(n) || 0);
                const minVal = Math.min(...validStats);
                const isPredicted = count === minVal && formData.winnerSelection === 'auto';

                return (
                  <div key={idx} className={`space-y-1 p-2 rounded bg-black/20 border transition-all ${isPredicted ? 'border-green-500/50 bg-green-500/10' : 'border-white/5'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Card {idx + 1}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-blue-400">{count} Buyers</span>
                        {isPredicted && <span className="text-[9px] font-black text-green-400 animate-pulse">PREDICTED WINNER</span>}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden border border-white/20">
                        <img src={img} alt={`Card ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <select
                        value={img}
                        onChange={e => {
                          const n = [...formData.cardImages]; n[idx] = e.target.value;
                          setFormData({ ...formData, cardImages: n });
                        }}
                        className="w-full text-xs bg-zinc-900 border border-white/10 rounded px-2 focus:ring-1 focus:ring-amber-500"
                      >
                        {Array.from({ length: 24 }, (_, i) => `/images/cards/${i + 1}.png`).map(opt => (
                          <option key={opt} value={opt}>
                            Image {opt.split('/').pop()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editingGame && (
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, count * 5)}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-amber-500 text-black font-bold mt-4">{saving ? "Saving..." : "Save Game"}</Button>
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
