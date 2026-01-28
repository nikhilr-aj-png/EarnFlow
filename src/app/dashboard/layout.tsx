"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userData && userData.isAdmin === true) {
        // Redirect admin away from user dashboard to keep them separate
        router.push("/admin");
      } else if (userData && userData.isVerified === false) {
        // Redirect unverified users to verification page
        router.push(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
      }
    }
  }, [user, userData, loading, router]);

  // Image Preloader for Card Game (KING & QUEEN)
  useEffect(() => {
    if (user) {
      const imagesToPreload = ["/images/cards/1.jpg", "/images/cards/2.jpg"];
      imagesToPreload.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
      <Sidebar />
      <MobileNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 sm:pt-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
