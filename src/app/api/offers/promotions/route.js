import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/offers/promotions -> web app POST /api/admin/offers/promotions
export async function POST(request) {
  return relayToWebApp(request, "/api/admin/offers/promotions", "POST");
}
