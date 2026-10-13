import type { MetadataRoute } from "next"

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.example.com"
).replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin console (/polaris) is deliberately NOT listed: robots.txt is
        // public and would advertise the path. It opts out via noindex instead.
        disallow: ["/api/", "/challenge/*/processing"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
