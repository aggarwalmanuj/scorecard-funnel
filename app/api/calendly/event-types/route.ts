import { NextResponse } from "next/server"

/**
 * GET /api/calendly/event-types
 * Returns the Calendly scheduling URL from the CALENDLY_URL env variable.
 */
export async function GET() {
  const calendlyUrl = process.env.CALENDLY_URL
  if (!calendlyUrl) {
    return NextResponse.json(
      { error: "CALENDLY_URL not configured" },
      { status: 500 },
    )
  }

  return NextResponse.json({ schedulingUrl: calendlyUrl })
}
