// Firebase Admin SDK configuration for server-side operations
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Parse the service account from environment variable
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT || '{}');
    
    // Fix the private key formatting - replace escaped newlines with actual newlines
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

export default admin;
