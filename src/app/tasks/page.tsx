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

    setActiveTask(task);
    handleFinishTask(task);
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
    </div>
  );
}
