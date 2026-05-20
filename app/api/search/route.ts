// GET /api/search?q=Bergen
// Returns up to 6 candidate locations as JSON for the disambiguation picker.

import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/geocode";

export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
  const results = await searchLocations(q, { limit: 6 });
  return NextResponse.json(
    { results },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
