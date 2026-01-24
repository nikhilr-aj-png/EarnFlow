"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster theme="dark" position="top-center" richColors />
    </AuthProvider>
  );
}
