
const admin = require("firebase-admin");
require("dotenv").config({ path: ".env.local" });

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkSettings() {
  console.log("Reading settings/quizAutomation...");
  try {
    const doc = await db.collection("settings").doc("quizAutomation").get();
    if (!doc.exists) {
      console.log("❌ Document does NOT exist.");
    } else {
      console.log("✅ Document Data:", JSON.stringify(doc.data(), null, 2));
    }
  } catch (error) {
    console.error("Error reading settings:", error);
  }
}

checkSettings();
