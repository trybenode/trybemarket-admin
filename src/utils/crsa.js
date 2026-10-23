import { auth } from "@/lib/firebaseConfig";

/**
 * Client helpers for the CRSA (Course Rep Student Ambassador) program.
 * Every call goes through this app's own /api/crsa/* relay, which forwards the
 * admin's Firebase ID token to the TrybeMarket web app — the single home of
 * all CRSA logic (see src/lib/webAppProxy.js).
 */

async function crsaFetch(path, { method = "GET", body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");

  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : data.error?.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return data;
}

/** Every member (active or not) with rank, code, and counts — admins only. */
export const getCrsaLeaderboard = async () => {
  const data = await crsaFetch("/api/crsa/leaderboard");
  return data.leaderboard;
};

/** Adds a member by their TrybeMarket account email (or reactivates one). */
export const addCrsaMember = (email) =>
  crsaFetch("/api/crsa/members", { method: "POST", body: { email } });

export const setCrsaMemberActive = (uid, active) =>
  crsaFetch("/api/crsa/members/status", { method: "POST", body: { uid, active } });

/** The shareable link an ambassador hands out. Needs the web app's public URL. */
export const buildReferralLink = (code) => {
  const base = process.env.NEXT_PUBLIC_WEB_APP_URL;
  return base ? `${base.replace(/\/$/, "")}/signup?ref=${code}` : null;
};

/**
 * Credits an existing student to an ambassador (onboarded without their
 * link). Counts their KYC straight away if they're already verified.
 */
export const attributeReferral = (email, code, reason) =>
  crsaFetch("/api/crsa/attribute", { method: "POST", body: { email, code, reason } });
