import { db } from "./firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore";

export async function completeTask(userId: string, taskId: string, reward: number) {
  try {
    console.log("Calling secure API for task completion...");
    const response = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, taskId, reward }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to complete task");
    }

    return data;
  } catch (error) {
    console.error("Error completing task:", error);
    throw error;
  }
}

export async function getUserStats(userId: string) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}
