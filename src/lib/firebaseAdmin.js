// // Firebase Admin SDK configuration for server-side operations
// import admin from 'firebase-admin';

// // Initialize Firebase Admin SDK
// if (!admin.apps.length) {
//   try {
//     // Parse the service account from environment variable
//     const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT || '{}');
    
//     // Fix the private key formatting - replace escaped newlines with actual newlines
//     if (serviceAccount.private_key) {
//       serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
//     }
    
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//       projectId: serviceAccount.project_id,
//     });
    
//     console.log('Firebase Admin initialized successfully');
//   } catch (error) {
//     console.error('Error initializing Firebase Admin:', error);
//     throw error;
//   }
// }

// export const adminAuth = admin.auth();
// export const adminDb = admin.firestore();

// export default admin;



// Firebase Admin SDK configuration for server-side operations
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Prefer the server-side env var; fall back to the public one if set for convenience
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !rawPrivateKey) {
      console.warn('Firebase Admin SDK environment variables are not fully set: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    }

    const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log('Firebase Admin initialized successfully ✔');
  } catch (error) {
    console.error('Firebase Admin init error ❌:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

export default admin;
