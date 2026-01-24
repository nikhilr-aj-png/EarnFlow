"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  timeEstimate: string;
  type: "visit" | "quiz" | "app" | "premium";
  isPremium: boolean;
  status?: "pending" | "completed";
  expiresAt?: any;
}

interface TaskCardProps {
  task: Task;
  onStart: (task: Task) => void;
  loading?: boolean;
}

export function TaskCard({ task, onStart, loading = false }: TaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="flex flex-col h-full justify-between border-white/5 bg-card/50 backdrop-blur-sm transition-all hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-500/10">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <Badge className={cn(
              "mb-2 w-fit px-2 py-0.5 text-xs font-semibold rounded-full border",
              task.isPremium
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}>
              {task.isPremium ? "Premium" : "Free"}
            </Badge>
            <div className="flex items-center space-x-1 text-amber-400 font-bold">
              <Coins className="w-4 h-4" />
              <span>{task.reward}</span>
            </div>
          </div>
          <CardTitle className="text-lg">{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-2 flex-grow">
          <CardDescription className="line-clamp-2">
            {task.description}
          </CardDescription>
          <div className="mt-4 flex items-center text-xs text-muted-foreground space-x-3">
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" /> {task.timeEstimate}
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 border-0 hover:from-amber-600 hover:to-yellow-700 text-white font-bold"
            onClick={() => onStart(task)}
            disabled={loading || task.status === 'completed'}
          >
            {task.status === 'completed' ? "Completed" : "Start Task"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
  return <span className={className}>{children}</span>;
}
