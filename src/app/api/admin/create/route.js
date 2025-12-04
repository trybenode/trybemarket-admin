import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/create
 * 
 * Creates a new admin user with authentication and Firestore record.
 * This endpoint is protected and requires an existing admin to call it.
 * Only super-admins and admins can create new admins.
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   displayName: string,
 *   role: 'admin' | 'super-admin' (optional, defaults to 'admin')
 * }
 * 
 * Request headers:
 * {
 *   Authorization: 'Bearer <idToken>' (from authenticated admin)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   uid: string (on success),
 *   message: string,
 *   error: string (on failure)
 * }
 */
export async function POST(request) {
  try {
    // Verify authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid authorization header'
        },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer ', '');

    // Verify token and get user
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token'
        },
        { status: 401 }
      );
    }

    // Check if requesting user is an admin
    const requesterAdminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!requesterAdminDoc.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to create admins (not an admin)'
        },
        { status: 403 }
      );
    }

    const requesterRole = requesterAdminDoc.data().role;
    if (requesterRole !== 'admin' && requesterRole !== 'super-admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to create admins'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const { email, password, displayName, role = 'admin' } = await request.json();

    // Validate required fields
    if (!email || !password || !displayName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: email, password, displayName'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format'
        },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 6 characters'
        },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });

    // Create admin document in Firestore
    const adminDocData = {
      uid: userRecord.uid,
      email,
      displayName,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
      lastLogin: null
    };

    await adminDb.collection('admins').doc(userRecord.uid).set(adminDocData);

    // Optional: Set custom claims (for advanced role-based access)
    if (role === 'super-admin') {
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        admin: true,
        superAdmin: true
      });
    } else {
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        admin: true
      });
    }

    return NextResponse.json(
      {
        success: true,
        uid: userRecord.uid,
        message: `Admin user '${email}' created successfully`,
        admin: {
          uid: userRecord.uid,
          email,
          displayName,
          role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin:', error);

    // Handle specific Firebase errors
    let errorMessage = error.message;

    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'An admin with this email already exists';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak (minimum 6 characters)';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/password accounts are not enabled in Firebase';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: error.code
      },
      { status: 500 }
    );
  }
}
