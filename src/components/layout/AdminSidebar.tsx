"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Gamepad2,
  ArrowUpRight,
  Users,
  LogOut,
  CreditCard,
  MessageSquare,
  Zap,
  Database,
  Megaphone,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const adminSidebarItems = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Global Games", href: "/admin/games", icon: Gamepad2 },
  { name: "Manage Tasks", href: "/admin/tasks", icon: ListTodo },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpRight },
  { name: "Automation (AI)", href: "/admin/automation", icon: Zap },
  { name: "Database Cleanup", href: "/admin/cleanup", icon: Database },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Hall of Fame", href: "/admin/leaderboard", icon: Trophy },
  { name: "Support", href: "/admin/support", icon: MessageSquare },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-card border-r border-white/10 w-64 hidden md:flex">
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-red-500">
            Admin Panel
          </span>
        </Link>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        {adminSidebarItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
              pathname === item.href
                ? "bg-red-500/10 text-red-500"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
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
