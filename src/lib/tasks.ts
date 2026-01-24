import { db } from "./firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore";

export async function completeTask(userId: string, taskId: string, reward: number) {
  try {
    // 1. Check if task is already completed (Safety check)
    const q = query(
      collection(db, "taskSubmissions"),
      where("userId", "==", userId),
      where("taskId", "==", taskId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error("Task already completed");
    }

    // 2. Update User Coins
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      coins: increment(reward),
      // Update balance as well? 100 coins = 1 unit.
      // Let's keep logic simple: Coins are primary, balance is derived or updated periodically.
      // Or update available balance immediately.
      // 100 coins = ₹1.
      // So reward 50 coins = 0.5.
      // But floating point issues. Let's store availableBalance in coins too or handle safely.
      // Let's just track coins for now and "totalEarned".
    });

    // 3. Record Submission
    await addDoc(collection(db, "taskSubmissions"), {
      userId,
      taskId,
      earnedCoins: reward,
      status: "approved", // or 'pending' if manual
      completedAt: serverTimestamp(),
    });

    return { success: true, newCoins: reward };
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
