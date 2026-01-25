"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function TasksManagementPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [timeEstimate, setTimeEstimate] = useState("");
  const [type, setType] = useState("visit");
  const [isPremium, setIsPremium] = useState(false);
  const [expiryHours, setExpiryHours] = useState("24");
  const [targetUrl, setTargetUrl] = useState("");
  const [questions, setQuestions] = useState<any[]>(Array(5).fill({
    text: "",
    options: ["", "", "", ""],
    correctAnswer: 0
  }));

  // Fetch tasks from Firestore
  const fetchTasks = async () => {
    try {
      const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const tasksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setReward("");
    setTimeEstimate("");
    setType("visit");
    setIsPremium(false);
    setExpiryHours("24");
    setTargetUrl("");
    setQuestions(Array(2).fill({
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0
    }));
    setEditingTask(null);
  };


  const openEditModal = (task: any) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setReward(task.reward.toString());
    setTimeEstimate(task.timeEstimate);
    setType(task.type);
    setIsPremium(task.isPremium);
    setTargetUrl(task.targetUrl || "");
    const defaultCount = task.isPremium ? 5 : 2;
    setQuestions(task.questions || Array(defaultCount).fill({
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0
    }));


    setExpiryHours("24");
    setIsOpen(true);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const now = Timestamp.now();
      const expiresAt = new Timestamp(now.seconds + (Number(expiryHours) * 3600), 0);

      const taskData = {
        title,
        description,
        reward: Number(reward),
        timeEstimate,
        type,
        isPremium,
        questions,
        targetUrl: (type === 'visit' || type === 'app') ? targetUrl : "",
        expiresAt: expiresAt,
      };

      if (editingTask) {
        await updateDoc(doc(db, "tasks", editingTask.id), {
          ...taskData,
          updatedAt: serverTimestamp(),
        });
        toast.success("Task updated successfully!");
      } else {
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          createdAt: now,
        });
        toast.success("Task added successfully!");
      }

      setIsOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteDoc(doc(db, "tasks", taskId));
      toast.success("Task deleted successfully!");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Tasks</h1>
        <Button onClick={() => { resetForm(); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add New Task
        </Button>
      </div>

      <div className="rounded-md border border-white/10 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Expires At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No tasks found in database.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const isExpired = task.expiresAt && task.expiresAt.toDate() < new Date();
                return (
                  <TableRow key={task.id} className={isExpired ? "opacity-30" : ""}>
                    <TableCell className="font-medium">
                      {task.title}
                      {task.isPremium && <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">PREMIUM</span>}
                    </TableCell>
                    <TableCell className="capitalize">{task.type}</TableCell>
                    <TableCell className="text-amber-500 font-bold">{task.reward}</TableCell>
                    <TableCell className="text-xs">
                      {task.expiresAt ? new Date(task.expiresAt.seconds * 1000).toLocaleString() : "Permanent"}
                      {isExpired && <span className="ml-1 text-red-500 font-bold">(EXPIRED)</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(task)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400" onClick={() => handleDeleteTask(task.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Task Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editingTask ? "Edit Task" : "Create New Task"}>
        <form onSubmit={handleAddTask} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Title</label>
            <Input placeholder="e.g. Visit our sponsor" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe what user needs to do..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reward (Coins)</label>
              <Input type="number" placeholder="50" value={reward} onChange={e => setReward(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time (e.g. 30 sec)</label>
              <Input placeholder="30 sec" value={timeEstimate} onChange={e => setTimeEstimate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="visit">Visit</option>
                <option value="quiz">Quiz</option>
                <option value="app">App Download</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Tier</label>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={isPremium ? "premium" : "free"}
                onChange={(e) => {
                  const isPrem = e.target.value === "premium";
                  setIsPremium(isPrem);

                  // Reset questions based on tier
                  const count = isPrem ? 5 : 2;
                  // Preserve existing questions if possible, otherwise fill
                  const newQs = [...questions].slice(0, count);
                  while (newQs.length < count) {
                    newQs.push({ text: "", options: ["", "", "", ""], correctAnswer: 0 });
                  }
                  setQuestions(newQs);
                }}
              >
                <option value="free">Free User Task</option>
                <option value="premium">Premium User Task</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry Hours (from now)</label>
              <Input type="number" value={expiryHours} onChange={e => setExpiryHours(e.target.value)} required />
            </div>
          </div>

          {(type === 'visit' || type === 'app') && (
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                Target Link ({type === 'visit' ? '60s Timer' : 'Direct Link'})
              </label>
              <Input
                placeholder="https://example.com"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
              <p className="text-[10px] text-muted-foreground italic">
                {type === 'visit'
                  ? "Users will be required to stay on this page for 60 seconds."
                  : "Users will be redirected to download/login to this app."}
              </p>
            </div>
          )}

          {type === 'quiz' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                Quiz Questions (Exactly {isPremium ? 5 : 2})
              </h3>
              <div className="space-y-6">

                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Question {qIdx + 1}</span>
                    </div>
                    <Input
                      placeholder={`Question ${qIdx + 1} text...`}
                      value={q.text}
                      onChange={(e) => {
                        const newQs = [...questions];
                        newQs[qIdx] = { ...q, text: e.target.value };
                        setQuestions(newQs);
                      }}
                      required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className="flex gap-2">
                          <input
                            type="radio"
                            name={`q-${qIdx}-correct`}
                            checked={q.correctAnswer === oIdx}
                            onChange={() => {
                              const newQs = [...questions];
                              newQs[qIdx] = { ...q, correctAnswer: oIdx };
                              setQuestions(newQs);
                            }}
                          />
                          <Input
                            placeholder={`Option ${oIdx + 1}`}
                            className="h-8 text-xs"
                            value={opt}
                            onChange={(e) => {
                              const newQs = [...questions];
                              const newOpts = [...q.options];
                              newOpts[oIdx] = e.target.value;
                              newQs[qIdx] = { ...q, options: newOpts };
                              setQuestions(newQs);
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Saving..." : (editingTask ? "Update Task" : "Confirm & Create Task")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
