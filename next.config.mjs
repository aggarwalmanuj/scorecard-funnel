/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // The optimizer must stay ON. It was disabled (`unoptimized: true`) by the
    // original scaffold, which made <Image> serve raw source files and turned
    // every `sizes` prop into decoration: /take/audience.png shipped as a
    // 1.13 MB 1880x932 PNG into a 350px-wide mobile slot and dominated the
    // landing page's critical path (13s load on 3G). Resized to 640w and
    // re-encoded it is 6.9 KB. Only re-disable this if the whole app moves to
    // a host without an image optimizer, and shrink every source file first.
    formats: ["image/avif", "image/webp"],
    // Photos and product screenshots are content, not chrome - they never
    // change without a new filename, so transforms cache for a year rather
    // than being re-billed and re-encoded every 60s (the default).
    minimumCacheTTL: 31536000,
    // The blob hosts serving the brand marks - the same two origins the CSP
    // `img-src` list already trusts. Today's only <Image> srcs pointing there
    // pass `unoptimized` per-image, so nothing needs this yet; it's here so
    // that dropping that prop optimizes the mark instead of hard-failing the
    // build with an un-allowlisted-host error.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "bfyvfetxtgsgzjci.public.blob.vercel-storage.com",
      },
    ],
  },
  // PostHog requires trailing slashes on its API endpoints (/e/, /flags/,
  // /decide/). Next.js's default trailing-slash redirect would break them,
  // so we opt out. No other route in this app depends on trailing-slash
  // behavior, so this is safe.
  skipTrailingSlashRedirect: true,
  // Reverse proxy for PostHog. Routes browser requests through our own
  // origin so ad blockers (uBlock, Brave Shields, etc.) can't drop them
  // based on the `us.i.posthog.com` hostname.
  //   /ingest/static/* → asset host  (must come first — more specific)
  //   /ingest/*        → ingestion host
  // The asset rewrite covers session-recorder.js, surveys.js, web-vitals.js,
  // and other lazy-loaded chunks. The general rewrite covers /e/, /flags/,
  // /decide/, /s/ (session recording payloads), and exception capture.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ]
  },
}
//patch 6.0
export default nextConfig
