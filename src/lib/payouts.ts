import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment
} from "firebase/firestore";

export async function requestWithdrawal(userId: string, userEmail: string, amount: number, method: string, details: string) {
  try {
    // 1. Double check balance
    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.data();

    if (!userData || (userData.coins < (amount * 100))) {
      throw new Error("Insufficient balance");
    }

    // 2. Deduct coins from user
    const userRef = doc(db, "users", userId);

    // Save UPI if not already saved (Locking Logic)
    const updateData: any = {
      coins: increment(-(amount * 100))
    };
    if (!userData.savedUpi && method === 'UPI') {
      updateData.savedUpi = details;
    }
    await updateDoc(userRef, updateData);

    // 3. Create the request
    const docRef = await addDoc(collection(db, "withdrawals"), {
      userId,
      userEmail,
      amount,
      method,
      details,
      status: "pending", // Always pending (Manual Approval)
      createdAt: serverTimestamp(),
    });





    return { success: true, id: docRef.id };
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
