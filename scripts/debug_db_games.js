
const admin = require("firebase-admin");
const serviceAccount = require("../../service-account.json"); // Adjust path if needed

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkGames() {
  console.log("Checking Card Games...");
  const snap = await db.collection("cardGames").get();
  console.log(`Total Games Found: ${snap.size}`);

  snap.forEach(doc => {
    const d = doc.data();
    console.log(`[${doc.id}] Status: '${d.status}' | Premium: ${d.isPremium} | Created: ${d.createdAt?.toDate()} | ExpiryLabel: ${d.expiryLabel}`);
  });
}

checkGames();
