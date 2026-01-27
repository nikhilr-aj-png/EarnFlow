"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Dynamic import to avoid SSR issues if any (though client-side is fine)
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const { toast } = await import("sonner");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (userData?.isAdmin === true) {
        toast.success("Welcome, Administrator!");
        router.push("/admin");
      } else {
        toast.success("Welcome Back!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-white relative overflow-hidden font-sans bg-black selection:bg-amber-500/30">

      {/* Left Visual Side */}
      <div className="hidden lg:flex flex-col justify-between w-[60%] relative p-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-black">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-900/40 via-black to-black opacity-80" />
          <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-black to-transparent z-10" />
          {/* Animated Blobs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], x: [0, -50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] bg-yellow-700/5 rounded-full blur-[80px]"
          />
        </div>

        {/* Content */}
        <div className="relative z-20">
          <Link href="/" className="flex items-center gap-3 w-fit group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">EarnFlow</span>
          </Link>
        </div>

        <div className="relative z-20 space-y-8 max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-black tracking-tight leading-tight"
          >
            Return to the <br />
            <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Golden Standard</span>
            <br /> of Earning.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-zinc-400 leading-relaxed"
          >
            Access your premium dashboard, track your live earnings, and withdraw instant rewards. The arena awaits.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-8 pt-8 border-t border-white/5"
          >
            <div>
              <div className="text-2xl font-bold text-white mb-1">24/7</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Support</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">Instant</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Withdrawals</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">100%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Secure</div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-20 text-xs text-zinc-600">
          © 2024 EarnFlow Inc. All rights reserved.
        </div>
      </div>

      {/* Right Form Side */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center p-8 lg:p-24 relative z-10 bg-black lg:bg-black/40 lg:backdrop-blur-3xl lg:border-l lg:border-white/5">

        {/* Mobile Background Hint */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-amber-900/20 to-black pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 max-w-sm mx-auto w-full space-y-8"
        >
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
            <p className="text-zinc-400">Please sign in to your verified account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-amber-500/50 focus:bg-white/10 transition-all font-medium text-white"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                  <Link href="/forgot-password" className="text-xs text-amber-500 hover:text-amber-400 transition-colors">Forgot?</Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-amber-500/50 focus:bg-white/10 transition-all font-medium text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-base rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In to Dashboard"}
            </Button>
          </form>

          <div className="text-center pt-4">
            <span className="text-zinc-500 text-sm">Don&apos;t have an account? </span>
            <Link href="/register" className="text-amber-500 font-bold hover:text-amber-400 transition-colors ml-1">
              Create one now
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
