import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/crsa/members { email } -> web app POST /api/admin/crsa/members
export async function POST(request) {
  return relayToWebApp(request, "/api/admin/crsa/members", "POST");
}
