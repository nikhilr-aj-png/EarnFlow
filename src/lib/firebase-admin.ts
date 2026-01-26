import * as admin from 'firebase-admin';

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(`Missing Firebase Admin Credentials: 
        ProjectID: ${!!projectId}
        ClientEmail: ${!!clientEmail}
        PrivateKey: ${!!privateKey}
      `);
    }

    // Sanitize Private Key
    let formattedKey = privateKey;

    // 1. Remove surrounding double quotes if accidentally included
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }

    // 2. Handle literal \n (Vercel specific)
    if (formattedKey.includes('\\n')) {
      formattedKey = formattedKey.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
    console.log('Firebase Admin Initialized successfully');
  }
  return admin;
}
