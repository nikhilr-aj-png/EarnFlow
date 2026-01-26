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
  onComplete: (score: number) => void;
  questions: Question[];
  totalReward: number;
}

export function QuizModal({ isOpen, onClose, onComplete, questions = [], totalReward }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // If no questions, just complete with 0
  if (questions.length === 0 && isOpen) {
    onComplete(0);
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

  // Calculate Reward
  const earnedCoins = Math.round((score / questions.length) * totalReward);
  const coinsPerQuestion = Math.round(totalReward / questions.length);

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
              <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                <span>Value: <span className="text-amber-500 font-bold">{coinsPerQuestion}</span> coins/question</span>
                <span>Potential: <span className="text-amber-500 font-bold">{totalReward}</span> coins</span>
              </div>
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
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <span className="text-3xl font-bold text-amber-500">+{earnedCoins}</span>
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-amber-500">
                    QUIZ COMPLETED!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    You got <span className="text-white font-bold">{score}</span> out of {questions.length} correct.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed text-muted-foreground italic">
                You earned coins for every correct answer. Keep improving to earn the maximum reward next time!
              </div>

              <Button
                className="w-full h-12 bg-green-500 text-black font-bold hover:bg-green-600"
                onClick={() => {
                  onComplete(score);
                  onClose();
                }}
              // Always allow completion, even with 0 score
              >
                {earnedCoins > 0 ? `Claim ${earnedCoins} Coins` : "Complete Task (0 Coins)"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>


              {score < questions.length && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-white"
                  onClick={handleReset}
                >
                  Retry for Higher Score
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

