import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

async function deleteCollection(db: FirebaseFirestore.Firestore, collectionPath: string, batchSize: number) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db: FirebaseFirestore.Firestore, query: FirebaseFirestore.Query, resolve: any) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

export async function POST(req: Request) {
  try {
    const { collectionName } = await req.json();

    const allowedCollections = ["activities", "cardGameHistory", "taskSubmissions"];

    if (!allowedCollections.includes(collectionName)) {
      return NextResponse.json({ error: "Invalid collection name" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    console.log(`[CLEANUP] Starting cleanup for collection: ${collectionName}`);

    await deleteCollection(db, collectionName, 500);

    console.log(`[CLEANUP] Completed cleanup for collection: ${collectionName}`);

    return NextResponse.json({
      success: true,
      message: `Collection ${collectionName} cleared successfully.`
    });

  } catch (error: any) {
    console.error("Cleanup API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
