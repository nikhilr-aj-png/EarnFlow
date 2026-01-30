"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubDoc: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        setLoading(true);
        const { doc, onSnapshot, updateDoc, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        // Track user presence: Update lastSeen on session start + Heartbeat
        const updatePresence = async () => {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              lastSeen: serverTimestamp()
            });
            console.log("[PRESENCE] lastSeen updated.");
          } catch (e) {
            console.error("Error updating presence:", e);
          }
        };

        updatePresence();
        const presenceInterval = setInterval(updatePresence, 120000); // Pulse every 2 mins

        unsubDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          setUserData(docSnap.data() || null);
          setLoading(false);
        }, (err) => {
          setUserData(null);
          setLoading(false);
        });

        return () => {
          clearInterval(presenceInterval);
          if (unsubDoc) unsubDoc();
        };

      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // 2. Global Automation Heartbeat (DISABLED to prevent Quota Exceeded errors)
  // Background tasks are now handled exclusively by Vercel Crons server-side.
  /*
  useEffect(() => {
    if (!user) return;
    const runCrons = async () => {
      const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!key) return;
      try {
        fetch(`/api/cron/daily-game?key=${key}`).catch(() => { });
        const now = new Date();
        if (now.getMinutes() % 5 === 0) {
          fetch(`/api/cron/daily-quiz?key=${key}`).catch(() => { });
        }
        if (now.getMinutes() % 15 === 0) {
          fetch(`/api/cron/leaderboard-award?key=${key}`).catch(() => { });
        }
      } catch (e) { }
    };

    runCrons();
    const interval = setInterval(runCrons, 15000); // 15s Pulse (V3)
    return () => clearInterval(interval);
  }, [user]);
  */

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
