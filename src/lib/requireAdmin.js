import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * Server-side admin gate for this app's API routes.
 *
 * Every route here can do something only an admin should be able to do
 * (email/push/WhatsApp every user, read finance records, list every user's
 * email), and none of them checked who was calling — hiding the page behind
 * <ProtectedRoute> only hides the UI; anyone can POST to an API route
 * directly. This verifies the caller's Firebase ID token AND that they have a
 * doc in the `admins` collection (the same definition AuthContext and the
 * web app's firestore.rules use).
 *
 * The returned role and name come from the admin's own doc, never from the
 * request: the finance route used to authorize writes off a `role` the browser
 * put in the URL, which anyone could set to "super-admin".
 */
async function verifyAdminFromToken(authorizationHeader, { roles } = {}) {
  const header = authorizationHeader || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: "Unauthorized", status: 401 };

  let decoded;
  try {
    // checkRevoked: a stolen/old admin token stops working once revoked.
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch {
    return { error: "Unauthorized", status: 401 };
  }

  const adminSnap = await adminDb.collection("admins").doc(decoded.uid).get();
  if (!adminSnap.exists) return { error: "Forbidden", status: 403 };

  const data = adminSnap.data();
  if (data.active === false) return { error: "Forbidden", status: 403 };
  if (roles && !roles.includes(data.role)) {
    return { error: "You do not have permission to do this", status: 403 };
  }

  return {
    admin: {
      uid: decoded.uid,
      email: decoded.email || data.email || "",
      role: data.role || "",
      name: data.name || data.displayName || decoded.email || "Admin",
    },
  };
}

/**
 * Pages Router (req, res) routes. Returns the verified admin, or sends the
 * 401/403 itself and returns null — callers just `if (!admin) return;`.
 */
export async function requireAdminPages(req, res, options) {
  const result = await verifyAdminFromToken(req.headers.authorization, options);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return null;
  }
  return result.admin;
}

/** App Router (Request) routes. Returns { admin } or { error, status }. */
export async function requireAdminApp(request, options) {
  return verifyAdminFromToken(request.headers.get("authorization"), options);
}
