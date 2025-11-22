import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return Response.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user has admin role
    const adminRef = adminDb.collection('admins').doc(uid);
    const adminSnap = await adminRef.get();

    if (!adminSnap.exists) {
      return Response.json(
        { error: 'User does not have admin privileges' },
        { status: 403 }
      );
    }

    return Response.json(
      {
        valid: true,
        uid,
        adminData: adminSnap.data(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return Response.json(
      { error: 'Invalid token or server error' },
      { status: 401 }
    );
  }
}
