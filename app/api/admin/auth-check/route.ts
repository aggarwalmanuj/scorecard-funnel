import { NextResponse } from "next/server"
import { corsHeaders, isAdminAuthorized, isTechAuthorized } from "@/lib/server/admin-auth"

/** CORS preflight */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

/**
 * GET /api/admin/auth-check?scope=admin|tech
 *
 * Cheap credential validator the consoles call at login. `scope=tech` requires
 * the dedicated tech password (so /techadmin can't be unlocked with the
 * regular admin password); `scope=admin` accepts either. No DB work — this
 * exists purely so the login form can verify the right password per route.
 */
export async function GET(request: Request) {
  const headers = corsHeaders(request)
  const scope = new URL(request.url).searchParams.get("scope")
  const ok = scope === "tech" ? isTechAuthorized(request) : isAdminAuthorized(request)
  return NextResponse.json({ ok }, { status: ok ? 200 : 401, headers })
}
