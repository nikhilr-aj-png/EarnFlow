
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { setting, data } = await req.json();
    console.log(`[API] Admin Settings Update Request: Setting=${setting}`, data);

    if (!setting || !data) {
      console.error("[API] Error: Missing setting or data");
      return NextResponse.json({ error: "Missing setting key or data" }, { status: 400 });
    }

    console.log("[API] Initializing Firebase Admin...");
    let admin;
    try {
      admin = getFirebaseAdmin();
    } catch (initError: any) {
      console.error("[API] Firebase Admin Init Failed:", initError.message);
      return NextResponse.json({ error: "Server Configuration Error: " + initError.message }, { status: 500 });
    }

    const db = admin.firestore();
    console.log("[API] Writing to Firestore...");

    // Use set with merge true
    const docRef = db.collection("settings").doc(setting);
    await docRef.set({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Verify by reading back to ensure persistence
    const verifySnap = await docRef.get();
    const newData = verifySnap.data();
    console.log("[API] Write Verification:", newData);

    return NextResponse.json({ success: true, data: newData });
  } catch (error: any) {
    console.error("[API] Admin Settings Update Fatal Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
