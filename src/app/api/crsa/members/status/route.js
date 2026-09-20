import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/crsa/members/status { uid, active } -> web app POST /api/admin/crsa/members/status
export async function POST(request) {
  return relayToWebApp(request, "/api/admin/crsa/members/status", "POST");
}
