
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

console.log('--- Config Check ---');
console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail);
console.log('Private Key Found:', !!privateKey);
if (privateKey) {
  console.log('Private Key Length:', privateKey.length);
  console.log('First 50 chars:', privateKey.substring(0, 50));
  console.log('Last 50 chars:', privateKey.substring(privateKey.length - 50));
}

try {
  console.log('\n--- Initializing Firebase Admin ---');
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  require('fs').writeFileSync('debug_key.txt', formattedKey);
  console.log('Key dumped to debug_key.txt');

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
    console.log('SUCCESS: Firebase Admin initialized.');
  }
} catch (error) {
  console.error('ERROR: Initialization Failed');
  console.error(error);
}
