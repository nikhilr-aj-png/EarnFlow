"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, BrainCircuit, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  questions: Question[];
}

export function QuizModal({ isOpen, onClose, onComplete, questions = [] }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // If no questions, just complete
  if (questions.length === 0 && isOpen) {
    onComplete();
    return null;
  }

  const handleNext = () => {
    if (selectedOption === questions[currentIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setShowResult(false);
  };

  const passed = score >= 3; // Pass if 3 or more correct

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !showResult && onClose()}
      title={showResult ? "Quiz Results" : `Question ${currentIndex + 1} of ${questions.length}`}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-medium leading-relaxed">{questions[currentIndex]?.text}</p>
              </div>

              <div className="grid gap-3">
                {questions[currentIndex]?.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all text-sm font-medium",
                      selectedOption === idx
                        ? "bg-amber-500 border-amber-600 text-black"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:border-amber-500/50 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center text-[10px]",
                        selectedOption === idx ? "border-black/20 bg-black/10" : "border-white/10 bg-white/5"
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                className="w-full h-12 bg-amber-500 text-black font-bold hover:bg-amber-600"
                disabled={selectedOption === null}
                onClick={handleNext}
              >
                {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              <div className="flex flex-col items-center gap-4">
                {passed ? (
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <XCircle className="h-10 w-10 text-red-500" />
                  </div>
                )}

                <div>
                  <h3 className={cn("text-2xl font-black uppercase tracking-tighter", passed ? "text-green-500" : "text-red-500")}>
                    {passed ? "QUALIFIED!" : "FAILED"}
                  </h3>
                  <p className="text-sm text-muted-foreground">You got {score} out of {questions.length} correct.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed text-muted-foreground italic">
                {passed
                  ? "Congratulations! You've passed the knowledge check and earned your coins."
                  : "You need at least 3 correct answers to claim the reward. Please try the quiz again."}
              </div>

              {passed ? (
                <Button
                  className="w-full h-12 bg-green-500 text-black font-bold hover:bg-green-600"
                  onClick={() => {
                    onComplete();
                    onClose();
                  }}
                >
                  Claim My Coins <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-12 border-white/10 hover:bg-white/5 font-bold"
                  onClick={handleReset}
                >
                  Retry Quiz
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
