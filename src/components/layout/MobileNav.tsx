"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, CheckSquare, Wallet, Gamepad2, Crown, User } from "lucide-react";
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
      <header className="flex h-16 items-center justify-between px-4 border-b border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            EarnFlow
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[280px] bg-background border-l border-white/10 z-50 p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-lg">Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
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
                        "flex items-center px-4 py-4 text-base font-medium rounded-xl transition-all active:scale-95",
                        isActive ? "bg-amber-500/10 text-amber-500" : "text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      <item.icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto pt-6 border-t border-white/5">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-destructive h-12 rounded-xl"
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="mr-4 h-6 w-6" />
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
