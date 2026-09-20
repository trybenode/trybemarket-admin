import { relayToWebApp } from "@/lib/webAppProxy";

// GET /api/crsa/leaderboard -> web app GET /api/crsa/leaderboard
export async function GET(request) {
  return relayToWebApp(request, "/api/crsa/leaderboard", "GET");
}
