"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Timer, Coins, Trophy, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CardGameSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [rewardProcessed, setRewardProcessed] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    // Listen to user data for coins
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setUserData(doc.data());
    });

    // Listen to specific game session
    const unsubGame = onSnapshot(doc(db, "cardGames", id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGame(data);

        // Calculate remaining time relative to server startTime
        if (data.startTime?.seconds) {
          const startSeconds = data.startTime.seconds;
          const currentSeconds = Math.floor(Date.now() / 1000);
          const elapsed = currentSeconds - startSeconds;
          const remaining = Math.max(0, data.duration - elapsed);

          setTimeLeft(remaining);
        } else if (data.status === 'active') {
          // If active but no server time yet (local write), assume full duration
          setTimeLeft(data.duration);
        }
      } else {
        setGame(null);
      }
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubGame();
    };
  }, [user, id]);

  // Check for Hard Expiration (e.g. 10 minutes after game ends)
  const isHardExpired = timeLeft < -600; // 600 seconds = 10 minutes

  // Persistent Selection Listener - Unique to this specific game ID
  useEffect(() => {
    if (!user || !game?.startTime?.seconds || !id) return;

    const gameSessionId = `${user.uid}_${id}_${game.startTime.seconds}`;
    const entryRef = doc(db, "cardGameEntries", gameSessionId);

    const unsubEntry = onSnapshot(entryRef, (doc) => {
      if (doc.exists()) {
        const entryData = doc.data();
        setSelectedCards(entryData.selectedCards || []);
        if (entryData.rewardProcessed) {
          setRewardProcessed(true);
        }
      } else {
        setSelectedCards([]);
        setRewardProcessed(false);
      }
    });

    return () => unsubEntry();
  }, [user, game?.startTime, id]);

  // Handle Game States based on Time
  useEffect(() => {
    if (timeLeft > 0) {
      setIsPlaying(true);
      setReveal(false);
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0) {
      setIsPlaying(false);
      setReveal(true);

      // Process result automatically if time is 0 and user had selected at least one card
      if (selectedCards.length > 0 && !rewardProcessed && game) {
        processResult();
      }
    }
  }, [timeLeft, selectedCards.length, rewardProcessed, game]);

  const processResult = async () => {
    if (rewardProcessed || !user || !game?.startTime?.seconds || !id) return;

    setRewardProcessed(true); // Optimistic update to prevent double triggers

    const gameSessionId = `${user.uid}_${id}_${game.startTime.seconds}`;
    const entryRef = doc(db, "cardGameEntries", gameSessionId);

    try {
      if (selectedCards.includes(game.winnerIndex)) {
        const reward = game.price * 2;
        await updateDoc(doc(db, "users", user.uid), {
          coins: increment(reward),
          totalEarned: increment(reward)
        });
        toast.success(`🎊 Congratulations! One of your cards was the winner. You earned ${reward} coins!`);
      } else {
        toast.error("None of your chosen cards were the winner. Better luck next time!");
      }

      await updateDoc(entryRef, {
        rewardProcessed: true
      });
    } catch (err) {
      console.error("Reward error:", err);
    }
  };

  const selectCard = async (index: number) => {
    if (!isPlaying || selectedCards.includes(index) || reveal || isProcessingSelection) return;

    if ((userData?.coins || 0) < game.price) {
      toast.error("Insufficient coins to buy this card!");
      return;
    }

    // STRICT Premium Check
    if (game.isPremium && !userData?.isPremium) {
      toast.error("This is a Premium Game! Upgrade to play.");
      return;
    }

    setIsProcessingSelection(true);

    try {
      if (!game?.startTime?.seconds) {
        toast.error("Game session not started yet.");
        setIsProcessingSelection(false);
        return;
      }
      const gameSessionId = `${user!.uid}_${id}_${game.startTime.seconds}`;
      const entryRef = doc(db, "cardGameEntries", gameSessionId);

      const entrySnap = await getDoc(entryRef);
      const currentSelected = entrySnap.exists() ? entrySnap.data().selectedCards || [] : [];

      if (currentSelected.includes(index)) {
        toast.error("Card already purchased!");
        setIsProcessingSelection(false);
        return;
      }

      await updateDoc(doc(db, "users", user!.uid), {
        coins: increment(-game.price)
      });

      const newSelected = [...currentSelected, index];
      await setDoc(entryRef, {
        userId: user!.uid,
        gameId: id,
        selectedCards: newSelected,
        gameStartTime: game.startTime.seconds,
        rewardProcessed: false,
        updatedAt: new Date()
      }, { merge: true });

      toast.success("Card purchased! You can buy more cards to increase your chances.");
    } catch (err) {
      toast.error("Purchase failed.");
      console.error(err);
    } finally {
      setIsProcessingSelection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Allow 'active' games anytime. Allow 'expired' games ONLY if they are not 'Hard Expired' (10 mins passed).
  const isGameVisible = game && (
    game.status === 'active' ||
    (game.status === 'expired' && !isHardExpired)
  );

  if (!isGameVisible) {
    const isNotStarted = game?.status === 'active' && !game?.startTime;

    return (
      <div className="text-center py-20 bg-card/20 rounded-2xl border border-dashed border-white/10 space-y-4">
        <div className="relative inline-block">
          {isNotStarted ? (
            <Timer className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
          ) : (
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          )}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"
          />
        </div>
        <h2 className="text-xl font-bold">{isNotStarted ? "Preparing Session" : "Waiting for New Session"}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isNotStarted
            ? "The admin is getting this game session ready. It will start shortly!"
            : isHardExpired || game?.status !== 'active'
              ? "This game session has ended or is currently inactive. Please check the dashboard for other active games."
              : "No active game session at the moment. Please wait for the admin to start a new one."}
        </p>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="mt-4 rounded-full"
        >
          Go Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-3 w-3" />
            Timed Card Reveal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{game.question}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            All cards are visible. Buy your lucky cards now. Winner revealed at 0s!
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-amber-500">
              <Coins className="h-5 w-5 sm:h-6 sm:w-6" />
              {game.price}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-white">Per Card</span>
          </div>
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-2 text-xl sm:text-2xl font-bold ${timeLeft < 10 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              <Timer className="h-5 w-5 sm:h-6 sm:w-6" />
              {timeLeft > 0 ? `${timeLeft}s` : "RESULT"}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-white">Countdown</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {game.cardImages.map((img: string, idx: number) => {
          const isWinner = reveal && idx === game.winnerIndex;
          const isSelected = selectedCards.includes(idx);

          return (
            <div key={idx} className="space-y-4">
              <motion.div
                whileHover={isPlaying && !isSelected ? { scale: 1.02 } : {}}
                className={cn(
                  "relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700",
                  isWinner ? "ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]" : "border border-white/5",
                  reveal && !isWinner ? "grayscale opacity-20" : ""
                )}
              >
                <img src={img} alt="Card" className="w-full h-full object-cover" />

                <AnimatePresence>
                  {isWinner && (
                    <motion.div
                      key="winner"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                    >
                      <Trophy className="h-16 w-16 text-amber-500 drop-shadow-2xl mb-2" />
                      <span className="text-xl font-black text-amber-500 drop-shadow-lg">WINNER</span>
                    </motion.div>
                  )}

                  {isSelected && (
                    <motion.div
                      key="selected"
                      className={cn(
                        "absolute top-2 right-2 px-2 py-1 rounded bg-amber-500 text-black text-[10px] font-bold flex items-center gap-1 shadow-xl",
                        reveal && idx !== game.winnerIndex && "bg-red-500 text-white"
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {reveal && idx !== game.winnerIndex ? "WRONG CHOICE" : "SELECTED"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <Button
                disabled={!isPlaying || isSelected || reveal || isProcessingSelection}
                onClick={() => selectCard(idx)}
                className={cn(
                  "w-full h-12 font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg border-b-4 active:border-b-0 transition-all",
                  isSelected
                    ? "bg-green-600 border-green-800 text-white cursor-default"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                )}
              >
                {isSelected ? (reveal ? (idx === game.winnerIndex ? "WON!" : "LOST") : "OWNED") : "BUY CARD"}
              </Button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center p-8 bg-card/40 rounded-3xl border border-white/5 backdrop-blur-md"
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Session Finished</h2>
            <p className="text-muted-foreground mb-6">Results are out! Please check other games or wait for a new session.</p>
            <Button variant="premium" onClick={() => window.location.reload()} className="rounded-full px-12 h-12">
              Refresh Current Game
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
