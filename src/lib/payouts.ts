import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export async function requestWithdrawal(userId: string, userEmail: string, amount: number, method: string, details: string) {
  try {
    const response = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userEmail, amount, method, details }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Withdrawal request failed");
    }

    return data;
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    throw error;
  }
}

export async function getUserWithdrawals(userId: string) {
  const q = query(
    collection(db, "withdrawals"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Sort client-side to avoid needing a Firestore composite index
  return data.sort((a: any, b: any) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });
}
