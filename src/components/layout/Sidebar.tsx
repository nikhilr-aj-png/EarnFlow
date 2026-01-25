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
    <div className="flex flex-col h-full bg-card/50 border-r border-white/5 backdrop-blur-xl w-64 hidden md:flex">
      <div className="p-6 border-b border-white/5">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            EarnFlow
          </span>
        </Link>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || (item.href !== "/wallet" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
