"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Gamepad2,
  User,
  Crown,
  LogOut,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },

  { name: "Cards Game", href: "/dashboard/cards", icon: Gamepad2 },
  { name: "Earn Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Premium", href: "/dashboard/premium", icon: Crown },
  { name: "Profile", href: "/profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-2xl border-r border-white/5 w-72 hidden md:flex shadow-2xl relative z-50">
      {/* Background Noise/Gradient hint */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />

      <div className="p-8 border-b border-white/5 flex items-center justify-center relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all duration-500">
            <Home className="h-6 w-6 text-black" />
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-white transition-all">
            EarnFlow
          </span>
        </Link>
      </div>

      <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto relative z-10">
        {sidebarItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || (item.href !== "/wallet" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 group relative overflow-hidden",
                isActive
                  ? "bg-amber-500/10 text-amber-500 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]"
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full shadow-[0_0_10px_2px_rgba(245,158,11,0.5)]" />}
              <item.icon className={cn("mr-3 h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive && "animate-pulse")} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 relative z-10">
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors h-12 font-bold"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
