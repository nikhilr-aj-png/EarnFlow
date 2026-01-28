"use client";

import { useState, useEffect } from "react";
import { TaskCard, Task } from "@/components/features/TaskCard";
import { completeTask } from "@/lib/tasks";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { UpgradeModal } from "@/components/features/UpgradeModal";
import { QuizModal } from "@/components/features/QuizModal";
import { VisitTimerModal } from "@/components/features/VisitTimerModal";
import { AppDownloadModal } from "@/components/features/AppDownloadModal";

export default function TasksPage() {
  const { user, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'premium' | 'free'>('all');


  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [isAppOpen, setIsAppOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Ad-Lock States
  const [isAdLockOpen, setIsAdLockOpen] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adBlocked, setAdBlocked] = useState(false);

  // Fetch tasks and user submissions from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch all tasks (No order to avoid index issues)
        const q = query(collection(db, "tasks"));
        const querySnapshot = await getDocs(q);
        const tasksData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) as any;

        // 2. Fetch user's completed submissions
        const submissionsQuery = query(
          collection(db, "taskSubmissions"),
          where("userId", "==", user.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const completedIds = new Set(submissionsSnapshot.docs.map(doc => doc.data().taskId));

        setCompletedTaskIds(completedIds);
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredTasks = tasks.filter(task => {
    // 0. Completion Check
    const isCompleted = completedTaskIds.has(task.id);
    if (showCompleted) {
      if (!isCompleted) return false;
    } else {
      if (isCompleted) return false;
    }

    // 1. Expiry Check (Auto-delete for non-completed)
    if (!showCompleted && task.expiresAt) {
      const now = new Date();
      const expiry = new Date((task.expiresAt as any).seconds * 1000);
      if (now > expiry) return false;
    }

    // 2. Category Check
    if (filter === 'all') return true;
    if (filter === 'premium') return task.isPremium;
    if (filter === 'free') return !task.isPremium;
    return true;
  });

  const handleStartTask = (task: Task) => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (task.isPremium && !userData?.isPremium) {
      setIsUpgradeOpen(true);
      return;
    }

    // MONETAG AD TRIGGER (For Free Tasks)
    const isFreeEarningTask = !task.isPremium && ['quiz', 'visit', 'app'].includes(task.type);

    if (isFreeEarningTask) {
      setActiveTask(task);
      setIsAdLockOpen(true);
      setAdCountdown(5);

      // Check AdBlock
      if ((window as any).__isMonetagBlocked) {
        setAdBlocked(true);
      } else {
        setAdBlocked(false);
      }

      // Start Countdown
      const interval = setInterval(() => {
        setAdCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setActiveTask(task);
      handleFinishTask(task);
    }
  };

  const handleFinishTask = (task: Task) => {
    if (task.type === 'quiz') {
      setIsQuizOpen(true);
    } else if (task.type === 'visit') {
      setIsVisitOpen(true);
    } else if (task.type === 'app') {
      setIsAppOpen(true);
    } else {
      handleFinalClaim(task);
    }
  };

  const handleFinalClaim = async (task: Task, customReward?: number) => {
    if (!user || isCompleting) return;

    const finalReward = customReward !== undefined ? customReward : task.reward;

    setIsCompleting(true);
    try {
      await completeTask(user.uid, task.id, finalReward);
      toast.success(`Success! You earned ${finalReward} coins.`);

      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
      });
    } catch (error: any) {

      if (error.message === "Task already completed") {
        toast.info("Task was already completed!");
        setCompletedTaskIds(prev => {
          const next = new Set(prev);
          next.add(task.id);
          return next;
        });
      } else {
        console.error(error);
        toast.error("Failed to complete task.");
      }
    } finally {
      setIsCompleting(false);
      setActiveTask(null);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Earn Coins</h1>
          <p className="text-muted-foreground">Complete tasks from our partners to fill your wallet.</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setShowCompleted(false)}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
              !showCompleted ? "bg-amber-500 text-black shadow-lg" : "text-muted-foreground hover:text-white"
            )}
          >
            Available
          </button>
          <button
            onClick={() => setShowCompleted(true)}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
              showCompleted ? "bg-amber-500 text-black shadow-lg" : "text-muted-foreground hover:text-white"
            )}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex space-x-2 border-b border-white/5 pb-1">
        {(['all', 'free', 'premium'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-1.5 ${filter === f
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground bg-card/20 rounded-xl border border-dashed border-white/10">
          {showCompleted
            ? "You haven't completed any tasks in this category yet."
            : "No active tasks available in this category. Check back later!"}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={{
                ...task,
                status: completedTaskIds.has(task.id) ? 'completed' : task.status
              }}
              onStart={handleStartTask}
              loading={isCompleting && activeTask?.id === task.id}
            />
          ))}
        </div>
      )}

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />

      {activeTask && (
        <QuizModal
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          questions={activeTask.questions || []}
          totalReward={activeTask.reward}
          onComplete={(score) => {
            const earned = Math.round((score / (activeTask.questions?.length || 1)) * activeTask.reward);
            handleFinalClaim(activeTask, earned);
          }}
        />
      )}


      {activeTask && (
        <VisitTimerModal
          isOpen={isVisitOpen}
          onClose={() => setIsVisitOpen(false)}
          targetUrl={activeTask.targetUrl}
          onComplete={() => handleFinalClaim(activeTask)}
        />
      )}

      {activeTask && (
        <AppDownloadModal
          isOpen={isAppOpen}
          onClose={() => setIsAppOpen(false)}
          targetUrl={activeTask.targetUrl}
          reward={activeTask.reward}
          onComplete={() => handleFinalClaim(activeTask)}
        />
      )}


      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />

      {/* 🛡️ AD-LOCK OVERLAY */}
      {isAdLockOpen && activeTask && (
        <div className="fixed inset-0 z-[40] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1c1d24] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative z-50">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-3xl animate-pulse rounded-full" />
              <div className="h-20 w-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto relative z-10 border border-amber-500/20">
                <Loader2 className={cn("h-10 w-10 text-amber-500", adCountdown > 0 && "animate-spin")} />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Preparing Task</h2>
              <p className="text-zinc-500 text-sm font-medium">Please wait while we secure your reward...</p>
            </div>

            {adBlocked ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-500 text-xs font-black uppercase tracking-widest">AdBlock Detected! 🚫</p>
                <p className="text-zinc-400 text-[10px] mt-1">Please disable AdBlock to earn coins from free tasks.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-[10px] font-black underline text-white hover:text-amber-500"
                >
                  REFRESH PAGE
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {adCountdown > 0 ? (
                  <div className="text-5xl font-black text-amber-500 font-mono tracking-tighter animate-pulse">
                    0:{adCountdown.toString().padStart(2, '0')}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsAdLockOpen(false);
                      handleFinishTask(activeTask);
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-2xl uppercase italic tracking-tighter transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                  >
                    START TASK NOW 🚀
                  </button>
                )}
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Viewing ads helps us keep rewards high!</p>
              </div>
            )}

            <button
              onClick={() => {
                setIsAdLockOpen(false);
                setActiveTask(null);
              }}
              className="text-zinc-600 hover:text-zinc-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel and Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
