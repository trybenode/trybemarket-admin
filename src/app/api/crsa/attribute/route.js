import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/crsa/attribute { email, code, reason } -> web app POST /api/admin/crsa/attribute
export async function POST(request) {
  return relayToWebApp(request, "/api/admin/crsa/attribute", "POST");
}
