import { NextResponse } from "next/server";
import { relayToWebApp } from "@/lib/webAppProxy";

// POST /api/offers/grants/[id]/revoke -> web app POST /api/admin/offers/grants/[id]/revoke
export async function POST(request, { params }) {
  const { id } = await params;
  // A plain Firestore id only — never let the id change the web path.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  return relayToWebApp(request, `/api/admin/offers/grants/${id}/revoke`, "POST");
}
