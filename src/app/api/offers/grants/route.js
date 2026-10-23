import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/offers/grants -> web app POST /api/admin/offers/grants
export async function POST(request) {
  return relayToWebApp(request, "/api/admin/offers/grants", "POST");
}
