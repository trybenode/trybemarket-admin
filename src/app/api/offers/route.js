import { relayToWebApp } from "@/lib/webAppProxy";

// GET /api/offers -> web app GET /api/admin/offers (plans, promotions, recent gifts)
export async function GET(request) {
  return relayToWebApp(request, "/api/admin/offers", "GET");
}
