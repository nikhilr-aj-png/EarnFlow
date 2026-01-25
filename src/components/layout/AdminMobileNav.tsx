"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, ListTodo, Gamepad2, ArrowUpRight, Users, CreditCard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const adminSidebarItems = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Global Games", href: "/admin/games", icon: Gamepad2 },
  { name: "Manage Tasks", href: "/admin/tasks", icon: ListTodo },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpRight },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Support", href: "/admin/support", icon: MessageSquare },
];

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="md:hidden">
      <header className="flex h-16 items-center justify-between px-4 border-b border-red-500/20 bg-background/60 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/admin" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-red-500">
            Admin Panel
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
                <span className="font-bold text-lg text-red-500">Admin Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {adminSidebarItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-4 text-base font-medium rounded-xl transition-all active:scale-95",
                      pathname === item.href
                        ? "bg-red-500/10 text-red-500"
                        : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                ))}
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
