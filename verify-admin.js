require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialization Logic (Copied/Adapted from src/lib/firebase-admin.ts)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Env Vars');
    process.exit(1);
  }

  // Handle key formatting
  let formattedKey = privateKey.trim();
  if (formattedKey.includes('\\n')) {
    formattedKey = formattedKey.replace(/\\n/g, '\n');
  }
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
    console.log('Firebase Admin Initialized.');
  } catch (e) {
    console.error('Init Error:', e);
    process.exit(1);
  }
}

// Verification: List Users
async function testConnection() {
  try {
    const listUsersResult = await admin.auth().listUsers(1);
    console.log('Connection Successful! Found', listUsersResult.users.length, 'users.');
    if (listUsersResult.users.length > 0) {
      console.log('First User email:', listUsersResult.users[0].email);
    }

    // Test Link Generation (Optional - if we have a user)
    if (listUsersResult.users.length > 0) {
      const testEmail = listUsersResult.users[0].email;
      if (testEmail) {
        console.log(`Generating reset link for ${testEmail}...`);
        const link = await admin.auth().generatePasswordResetLink(testEmail);
        console.log('Link Generated:', link);
      }
    }

  } catch (error) {
    console.error('Error verifying connection:', error);
  }
}

testConnection();
