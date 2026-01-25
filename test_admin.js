
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

async function testAdmin() {
  console.log("Testing Firebase Admin...");

  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY;

  console.log("Project ID:", projectId);
  console.log("Client Email:", clientEmail);
  console.log("Private Key Length:", privateKey ? privateKey.length : "MISSING");

  if (!privateKey) {
    console.error("❌ Private Key is missing!");
    return;
  }

  // Handle newlines: The .env string likely has Literal "\n" characters
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
    }

    console.log("✅ Admin Initialized. Attempting to check user...");

    // Check if user exists
    const email = "earnflow.user@gmail.com";
    try {
      const user = await admin.auth().getUserByEmail(email);
      console.log("✅ User Found:", user.uid);

      const link = await admin.auth().generatePasswordResetLink(email);
      console.log("✅ Link Generated Successfully:", link);
    } catch (e) {
      console.log("⚠️ Auth Operation Error:");
      console.log(e.code + ": " + e.message);
    }

  } catch (error) {
    console.error("❌ Initialization/Connection Failed!");
    console.error(error);
  }
}

testAdmin();
