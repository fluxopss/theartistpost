import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Trust lock: refuse disk writes until approved artists can upload. */
export async function POST() {
  return NextResponse.json(
    { error: "Uploads are closed until an artist is approved." },
    { status: 403 },
  );
}
