import { relayImageFromWebApp } from "@/lib/webAppProxy";

const PHOTO_SLOTS = new Set(["front", "back", "selfie"]);

// GET /api/kyc/photo?userId=…&photo=front|back|selfie
//   -> web app GET /api/admin/kyc/photo (admin-only; logs every view)
//
// KYC photos are private on Cloudinary, so the browser can't load them by URL.
// The web app checks the forwarded admin token, records the view in
// kycAccessLog, and streams the image; this relays the bytes.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "";
  const photo = searchParams.get("photo") || "";
  if (!userId || !PHOTO_SLOTS.has(photo)) {
    return Response.json({ error: "userId and photo (front, back or selfie) are required" }, { status: 400 });
  }
  const query = new URLSearchParams({ userId, photo });
  return relayImageFromWebApp(request, `/api/admin/kyc/photo?${query}`);
}
