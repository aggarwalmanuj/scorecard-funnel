import { NextResponse } from "next/server"

export function GET() {
  const ok = Boolean(process.env.OPENROUTER_API_KEY?.trim())
  return NextResponse.json({ ok })
}
