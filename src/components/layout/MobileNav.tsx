"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, CheckSquare, Wallet, Gamepad2, Crown, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },

  { name: "Cards Game", href: "/dashboard/cards", icon: Gamepad2 },
  { name: "Earn Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Premium", href: "/dashboard/premium", icon: Crown },
  { name: "Profile", href: "/profile", icon: User },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="md:hidden">
      <header className="flex h-16 items-center justify-between px-4 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Home className="h-4 w-4 text-black" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            EarnFlow
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-[300px] bg-black border-l border-white/10 z-50 p-6 flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Background Gradient */}
              <div className="absolute top-0 right-0 w-full h-1/2 bg-amber-500/5 blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <span className="font-bold text-lg tracking-tight text-white">Navigation</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2 relative z-10">
                {sidebarItems.map((item) => {
                  const isActive = item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || (item.href !== "/wallet" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-4 text-sm font-bold rounded-xl transition-all active:scale-95",
                        isActive
                          ? "bg-amber-500/10 text-amber-500 border-l-2 border-amber-500"
                          : "text-zinc-500 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className={cn("mr-4 h-5 w-5", isActive && "text-amber-500")} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto pt-6 border-t border-white/5 relative z-10">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-zinc-500 hover:text-red-400 hover:bg-red-500/5 h-12 rounded-xl font-bold"
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="mr-4 h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
