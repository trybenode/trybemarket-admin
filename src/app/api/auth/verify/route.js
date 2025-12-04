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

    // 1. Verify Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // 2. Check if user has admin claims
    const isAdmin = decoded.isAdmin === true;  
    const role = decoded.role;

    if (!isAdmin) {
      return Response.json(
        { error: 'Not authorized — missing admin claims' },
        { status: 403 }
      );
    }

    // Pull Firestore admin profile
    const adminSnap = await adminDb.collection('admins').doc(uid).get();

    if (!adminSnap.exists) {
      return Response.json(
        { error: 'Admin profile missing in Firestore' },
        { status: 404 }
      );
    }

    return Response.json(
      {
        valid: true,
        uid,
        claims: decoded,       
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
