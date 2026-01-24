"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminMobileNav } from "@/components/layout/AdminMobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      console.log("Admin Check - User:", user?.email, "Data:", userData);

      if (!user) {
        router.push("/login");
      } else if (!userData || userData.isAdmin !== true) {
        // If data doesn't exist yet or isAdmin is not true, redirect
        console.warn("Access Denied: Not an admin");
        router.push("/dashboard");
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
      <AdminSidebar />
      <AdminMobileNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/20 pt-6 sm:pt-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
