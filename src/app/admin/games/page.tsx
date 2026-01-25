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
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    question: "Which card is the winner?",
    price: 10,
    duration: 60,
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
      const sorted = data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setGames(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenModal = (game?: any) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        question: game.question,
        price: game.price,
        duration: game.duration,
        winnerIndex: game.winnerIndex,
        status: game.status || "inactive",
        isPremium: game.isPremium || false, // Load tier
        cardImages: game.cardImages || formData.cardImages
      });
    } else {
      setEditingGame(null);
      setFormData({
        question: "Which card is the winner?",
        price: 10,
        duration: 60,
        winnerIndex: 0,
        status: "inactive",
        isPremium: false, // Default to free
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingGame) {
        await setDoc(doc(db, "cardGames", editingGame.id), {
          ...formData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success("Game updated!");
      } else {
        await addDoc(collection(db, "cardGames"), {
          ...formData,
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
    if (!confirm("Are you sure you want to delete this game?")) return;
    try {
      await deleteDoc(doc(db, "cardGames", id));
      toast.success("Game deleted!");

    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const handleStartSession = async (game: any) => {
    try {
      await setDoc(doc(db, "cardGames", game.id), {
        status: "active",
        startTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success(`Session started for: ${game.question}`);

    } catch (err) {
      toast.error("Failed to start session.");
    }
  };

  const toggleGameStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await setDoc(doc(db, "cardGames", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success(`Game marked as ${newStatus}!`);
    } catch (err) {
      toast.error("Status update failed.");
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
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Game Management</h1>
          <p className="text-muted-foreground text-sm">Create and manage multiple card reveal games.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-amber-600 hover:bg-amber-700 text-black font-bold">
          <Plus className="mr-2 h-4 w-4" /> Add New Game
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold">Question</TableHead>
              <TableHead className="text-muted-foreground font-bold text-center">Price</TableHead>
              <TableHead className="text-muted-foreground font-bold text-center">Status</TableHead>
              <TableHead className="text-muted-foreground font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No games found. Click "Add New Game" to start.
                </TableCell>
              </TableRow>
            ) : (
              games.map((game) => (
                <TableRow key={game.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium text-white py-4">
                    {game.question}
                    {game.isPremium && <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">PREMIUM</span>}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-500 font-bold">
                      <Plus className="h-3 w-3 rotate-45" /> {game.price}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGameStatus(game.id, game.status)}
                      className={game.status === 'active' ? 'text-green-500 hover:text-green-400' : 'text-muted-foreground'}
                    >
                      {game.status?.toUpperCase() || "INACTIVE"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-amber-500 hover:bg-amber-500/10"
                        title="Start Timer (New Session)"
                        onClick={() => handleStartSession(game)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-500/10"
                        onClick={() => handleOpenModal(game)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleDelete(game.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGame ? "Edit Game" : "Create New Game"}>
        <form onSubmit={handleSave} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Highlight Question</label>
              <Input
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g., Choose the lucky winner!"
                className="bg-white/5 border-white/10 h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Entry Price (Coins)</label>
                <Input
                  required
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Timer (Seconds)</label>
                <Input
                  required
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Winner Card Index (0-3)</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-md h-12 px-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.winnerIndex}
                onChange={(e) => setFormData({ ...formData, winnerIndex: parseInt(e.target.value) })}
              >
                <option value={0} className="bg-zinc-900">Card 1</option>
                <option value={1} className="bg-zinc-900">Card 2</option>
                <option value={2} className="bg-zinc-900">Card 3</option>
                <option value={3} className="bg-zinc-900">Card 4</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Game Tier</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-md h-12 px-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.isPremium ? "premium" : "free"}
                onChange={(e) => setFormData({ ...formData, isPremium: e.target.value === "premium" })}
              >
                <option value="free" className="bg-zinc-900">Free User Game</option>
                <option value="premium" className="bg-zinc-900 text-amber-500 font-bold">Premium User Game</option>
              </select>
            </div>


            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Card Visuals
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {formData.cardImages.map((img, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Card {idx + 1}</label>
                      {formData.winnerIndex === idx && <div className="h-2 w-2 bg-green-500 rounded-full" title="Winner" />}
                    </div>
                    <Input
                      required
                      className="text-[10px] h-10 bg-white/5 border-white/5"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...formData.cardImages];
                        newImages[idx] = e.target.value;
                        setFormData({ ...formData, cardImages: newImages });
                      }}
                      placeholder="Image URL"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" /> : null}
            {editingGame ? "Update Game Details" : "Create and Save Game"}
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
