import AdminConsole from "@/app/admin/page"

/**
 * /techadmin - the same admin console as /admin (same auth, same prompt &
 * response tooling) with the tech layer unlocked: a Funnel Analytics tab and,
 * on every response, the tester's journey, purchase record, and PostHog
 * session link. The console detects the route via usePathname, so this is a
 * thin wrapper around the shared component.
 */
export default function TechAdminPage() {
  return <AdminConsole />
}
