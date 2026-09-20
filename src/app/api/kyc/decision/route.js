import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/kyc/decision { userId, decision: "approve" | "reject", reason? }
//   -> web app POST /api/admin/kyc/decision
//
// Manual KYC decisions must run in the web app: only its server can set
// users.isVerified, award the KYC credit and badge, enforce one-matric-one-
// account, and count the referral for a CRSA. Writing kycRequests.status from
// the browser (what this app used to do) did none of that.
export async function POST(request) {
  return relayToWebApp(request, "/api/admin/kyc/decision", "POST");
}
