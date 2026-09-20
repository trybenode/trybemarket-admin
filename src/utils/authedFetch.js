import { auth } from "@/lib/firebaseConfig";

/**
 * fetch() that attaches the signed-in admin's Firebase ID token. Every API
 * route in this app is admin-only and verifies it server-side
 * (src/lib/requireAdmin.js) — without the header they answer 401.
 */
export async function authedFetch(input, init = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");

  const idToken = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${idToken}` },
  });
}
