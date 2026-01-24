import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      type, // 'upgrade' or 'deposit'
      amount // optional, for deposit coin calculation
    } = await req.json();

    // Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Payment is valid, update user in Firestore
    const userRef = doc(db, "users", userId);

    if (type === 'upgrade') {
      await updateDoc(userRef, {
        isPremium: true
      });
    } else if (type === 'deposit') {
      const coinsToAdd = Math.floor(amount * 100); // ₹1 = 100 Coins
      await updateDoc(userRef, {
        coins: increment(coinsToAdd),
        totalEarned: increment(coinsToAdd)
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Razorpay Verification Error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
