
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const auth = admin.auth();

    console.log(`[Admin Delete] Deleting user: ${userId}`);

    // 1. Delete from Firebase Authentication (Revokes access immediately)
    await auth.deleteUser(userId);

    // 2. Delete User Document from Firestore
    await db.collection("users").doc(userId).delete();

    // 3. (Optional) Delete related withdrawals/transactions if strict cleanup needed
    // For now, keeping financial records is usually better for audit, 
    // but the user's personal access is gone.

    return NextResponse.json({
      success: true,
      message: `User ${userId} deleted from Auth and Database.`
    });

  } catch (error: any) {
    console.error("[Admin Delete] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
