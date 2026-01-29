"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, DollarSign, Users, ShieldCheck, Zap, Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-amber-500/30">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
          </div>

          <div className="container relative z-10 px-4 mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs sm:text-sm font-medium mb-6 sm:mb-8"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>The Next Generation of Earning</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl px-2 leading-[1.1]"
            >
              Maximize Your <br />
              <span className="relative inline-block mt-2">
                <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Digital Worth
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-2 sm:h-3 text-amber-500/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-6 sm:mt-10 text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4"
            >
              EarnFlow is the premier platform where your small actions lead to massive rewards.
              Complete verified tasks and withdraw real cash instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-10 sm:mt-14 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 px-6"
            >
              <Link href={user ? "/dashboard" : "/register"}>
                <Button size="lg" variant="premium" className="w-full sm:w-auto h-14 px-10 text-lg shadow-2xl shadow-amber-500/20 group">
                  {user ? "Go to Dashboard" : "Start Earning"} <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/how-to-earn">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-10 text-lg border-white/10 hover:bg-white/5">
                  Earnings Guide
                </Button>
              </Link>
            </motion.div>

            {/* Live Stats Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="mt-16 sm:mt-32 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 py-8 sm:py-12 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-2xl mx-2 sm:mx-0"
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">10K+</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">Active Earner</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">₹5L+</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">Total Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">45K+</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">Tasks Done</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">4.9/5</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">User Rating</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Dynamic Features Section */}
        <section className="py-32 relative">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-bold mb-4">Why Professional Earners Choose Us</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                We've built a robust ecosystem designed for transparency and speed.
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <motion.div variants={fadeInUp}>
                <Card className="h-full bg-gradient-to-b from-white/[0.05] to-transparent border-white/5 p-8 hover:border-amber-500/30 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Instant Payouts</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    No more waiting for weeks. Request your coins and get paid via UPI or Bank within 24 hours of approval.
                  </p>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="h-full bg-gradient-to-b from-white/[0.05] to-transparent border-white/5 p-8 hover:border-blue-500/30 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Verified Tasks</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Every task on our platform is hand-picked and verified. No spam, no scams—only legitimate opportunities.
                  </p>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="h-full bg-gradient-to-b from-white/[0.05] to-transparent border-white/5 p-8 hover:border-purple-500/30 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Premium Growth</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Become a premium member to unlock high-ticket tasks and exclusive daily bonuses tailored for you.
                  </p>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-4 mx-auto">
            <div className="bg-gradient-to-r from-amber-600 to-yellow-700 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-32 -mb-32" />

              <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 relative z-10">
                Ready to start your <br /> earning journey?
              </h2>
              <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto relative z-10">
                Join EarnFlow today and experience the most rewarding task platform in the market.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
                <Link href={user ? "/dashboard" : "/register"}>
                  <Button size="lg" className="h-16 px-12 text-lg bg-black text-white hover:bg-black/80 rounded-full">
                    {user ? "Go to Dashboard" : "Create Free Account"}
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="h-16 px-12 text-lg border-white/30 text-white hover:bg-white/10 rounded-full">
                    Talk to Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
