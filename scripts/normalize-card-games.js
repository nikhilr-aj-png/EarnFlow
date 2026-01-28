const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin credentials in .env.local');
  process.exit(1);
}

// Sanitize Private Key (handles \n and quotes)
privateKey = privateKey.trim().replace(/\\n/g, '\n');
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
});

const db = admin.firestore();

async function normalizeGames() {
  console.log('--- Starting THOROUGH Card Game Normalization ---');

  const gamesSnap = await db.collection('cardGames').get();
  console.log(`Auditing ${gamesSnap.size} games...`);

  const batch = db.batch();
  let count = 0;

  gamesSnap.docs.forEach(doc => {
    const data = doc.data();
    let needsUpdate = false;
    const updatePayload = {};

    // Force ALL games to use the new 1.png and 2.png assets
    // This ensures local images are used instead of legacy Unsplash/external URLs
    const correctPaths = ["/images/cards/1.jpg", "/images/cards/2.jpg"];

    if (JSON.stringify(data.cardImages) !== JSON.stringify(correctPaths)) {
      console.log(`- fixing image paths for ${doc.id}`);
      updatePayload.cardImages = correctPaths;
      needsUpdate = true;
    }

    // 2. Ensure winnerIndex is within [0, 1] if set
    if (data.winnerIndex !== undefined && data.winnerIndex > 1) {
      console.log(`- resetting winnerIndex for ${doc.id}: ${data.winnerIndex} -> 0`);
      updatePayload.winnerIndex = 0;
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, {
        ...updatePayload,
        updatedAt: admin.firestore.Timestamp.now(),
        normalized_v4: true
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully purified ${count} games.`);
  } else {
    console.log('All games are already purified.');
  }
}

normalizeGames().catch(console.error);
