import { NextResponse } from "next/server";
import { requireAdminApp } from "@/lib/requireAdmin";
import { getCampaignAudience, getSchoolsInUse, NO_SCHOOL, SEGMENT_KEYS, SEGMENT_LABELS } from "@/lib/audience";

export const runtime = "nodejs";

// Most people one gift can go to (the page then sends them in small chunks).
const MAX_GIFT_AUDIENCE = 500;

/**
 * GET  /api/offers/audience → schools and segments for the gift picker
 * POST /api/offers/audience { audience } → the people a gift would go to:
 *      { count, userIds, sample, tooMany }. Same audience rules as Campaigns
 *      (src/lib/audience.js), so "Dormant Sellers at Lead City" is the same
 *      people on both pages.
 */
export async function GET(request) {
  const auth = await requireAdminApp(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const schools = await getSchoolsInUse();
  return NextResponse.json({
    schools: schools.map(s => ({ value: s.name ?? NO_SCHOOL, label: s.name ?? "No school set", users: s.users })),
    segments: SEGMENT_KEYS.map(key => ({ key, label: SEGMENT_LABELS[key] })),
  });
}

export async function POST(request) {
  const auth = await requireAdminApp(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { audience } = await request.json().catch(() => ({}));
    const people = await getCampaignAudience(audience || {});
    return NextResponse.json({
      count: people.length,
      tooMany: people.length > MAX_GIFT_AUDIENCE,
      userIds: people.slice(0, MAX_GIFT_AUDIENCE).map(p => p.uid),
      sample: people.slice(0, 8).map(p => ({ uid: p.uid, fullName: p.fullName, school: p.school, segment: p.segment })),
    });
  } catch (error) {
    console.error("Offers audience error:", error);
    return NextResponse.json({ error: "Couldn't work out who that is. Please try again." }, { status: 500 });
  }
}
