import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import { Inter, Fraunces } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ChallengeProvider } from "@/context/challenge-context"
import FacebookPixelTracker from "@/components/facebook-pixel"
import { CookieConsent } from "@/components/cookie-consent"
import "./globals.css"

// Only the two families the design actually renders are declared here.
// Geist and Geist_Mono used to be declared alongside them and never applied
// to a single element - next/font still self-hosted and <link rel=preload>ed
// both, spending ~52 KB of critical-path bandwidth on fonts nothing used.
//
// Inter - clean modern sans for body copy on the minimal landing.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

// Fraunces - variable serif for editorial display + italic emphasis.
// Loaded with optical sizing for tighter headlines.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
})

const RAW_FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
// Hard-validate format to prevent template injection via inline script.
// Facebook Pixel IDs are numeric strings.
const FB_PIXEL_ID =
  RAW_FB_PIXEL_ID && /^\d{6,20}$/.test(RAW_FB_PIXEL_ID) ? RAW_FB_PIXEL_ID : null

// Google Analytics 4 measurement ID. Env-overridable for non-prod
// properties; defaults to the production tag. Format-validated (G-XXXX…)
// for the same template-injection reason as the FB pixel above - the value
// is interpolated into an inline <script>.
const RAW_GA_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-J4575YSZQH"
const GA_MEASUREMENT_ID = /^G-[A-Z0-9]{4,15}$/i.test(RAW_GA_ID)
  ? RAW_GA_ID
  : null

// Canonical site origin. Set NEXT_PUBLIC_SITE_URL in production env so absolute
// URLs in metadata, OG tags, and JSON-LD all resolve correctly. The fallback is
// a placeholder - replace before shipping if the env var isn't wired up.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.example.com"
).replace(/\/$/, "")

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Your Belief Score | Find what's quietly limiting you",
    template: "%s | Belief Score",
  },
  description:
    "Discover what's quietly limiting your performance. A 10-minute diagnostic across 7 dimensions, built on the AI Merge framework - peer-reviewed in the Mensa Research Journal. By Manuj Aggarwal, founder of TetraNoodle Technologies.",
  applicationName: "Belief Score",
  generator: "Next.js",
  keywords: [
    "Belief Score",
    "Belief Scorecard",
    "AI Merge",
    "Belief Score assessment",
    "Manuj Aggarwal",
    "TetraNoodle Technologies",
    "Fractional CTO",
    "AI strategy",
    "decision diagnostic",
    "founder clarity",
    "human-AI decision systems",
    "Mensa Research Journal",
    "executive coaching",
    "leadership diagnostic",
  ],
  authors: [
    { name: "Manuj Aggarwal", url: "https://www.linkedin.com/in/manujaggarwal/" },
  ],
  creator: "Manuj Aggarwal",
  publisher: "TetraNoodle Technologies",
  category: "Business Strategy",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    // White-on-transparent favicon. Browsers render it on their own toolbar
    // background, which is universally light or dark - the white mark stays
    // legible on either, so no separate dark/light variant is shipped.
    icon: "/newui/favicon.png",
    apple: "/newui/favicon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Belief Score",
    title: "Your Belief Score",
    description:
      "Find the hidden pattern quietly limiting your performance - across 7 dimensions of life and work. Built on the AI Merge framework.",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        // TODO: replace with a dedicated 1200×630 social share image at
        // /public/og/share.png. Falling back to the brand mark for now.
        url: "/newui/favicon.png",
        width: 1200,
        height: 630,
        alt: "Belief Score - built on the AI Merge framework",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Belief Score",
    description:
      "A 10-minute diagnostic that names the specific pattern quietly limiting you. Built on AI Merge - peer-reviewed in the Mensa Research Journal.",
    images: ["/newui/favicon.png"],
    creator: "@manujaggarwal",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximum-scale / user-scalable lock: pinch-zoom stays available for
  // readability (important for our older executive audience and an a11y
  // requirement). The iOS focus-zoom annoyance is handled by the 16px
  // form-control floor in globals.css, not by disabling zoom.
  themeColor: "#0a0718",
}
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL}/#manuj`,
  name: "Manuj Aggarwal",
  jobTitle: "Founder & Fractional CTO",
  worksFor: { "@id": `${SITE_URL}/#tetranoodle` },
  description:
    "Founder of TetraNoodle Technologies. Creator of the AI Merge framework - a human–AI decision system peer-reviewed in the Mensa Research Journal and protected by four patents.",
  image: `${SITE_URL}/manuj/1762108515290.jpg`,
  url: SITE_URL,
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Fractional CTO Services",
    "AI Strategy",
    "Human-AI Decision Systems",
    "Enterprise AI Adoption",
  ],
  award: [
    "Four U.S. patents in human–AI decision systems",
    "Published in the Mensa Research Journal",
    "United Nations keynote speaker",
    "$500M+ documented business impact",
  ],
  sameAs: [
    // TODO: replace with real profile URLs
    "https://www.linkedin.com/in/manujaggarwal/",
    "https://tetranoodle.com",
  ],
}

const professionalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#tetranoodle`,
  name: "TetraNoodle Technologies",
  founder: { "@id": `${SITE_URL}/#manuj` },
  url: SITE_URL,
  image: `${SITE_URL}/newui/favicon.png`,
  description:
    "AI strategy and Fractional CTO services for founders and operators. Powered by AI Merge - a peer-reviewed human–AI decision system.",
  areaServed: ["United States", "Canada", "Worldwide"],
  serviceType: [
    "Fractional CTO",
    "AI Strategy Consulting",
    "Enterprise AI Adoption",
    "Human–AI Decision Systems",
  ],
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "CTO Services",
    "AI Merge Framework",
  ],
  award: [
    "Four U.S. patents in human–AI decision systems",
    "Featured in the Mensa Research Journal",
  ],
  sameAs: [
    // TODO: replace with real profile URLs
    "https://tetranoodle.com",
    "https://www.linkedin.com/company/tetranoodle/",
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable}`}
    >
      <head>
        {/*
          Use plain <script> with suppressHydrationWarning rather than
          next/script for these CSP-nonced inline blocks. Browsers strip
          the `nonce` attribute from the live DOM after parsing (security
          behavior, see https://html.spec.whatwg.org/#nonce-attributes),
          so React's hydration diff sees the server-rendered nonce vs an
          empty client value and warns. Suppressing the warning here is
          the correct call because the mismatch is intentional and
          unavoidable. strategy="beforeInteractive" on next/script is
          functionally equivalent to a plain <head> script anyway.
        */}
        <script
          id="strip-bitdefender-attrs"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){function s(n){n&&n.removeAttribute&&n.removeAttribute('bis_skin_checked')}new MutationObserver(function(ms){ms.forEach(function(m){if(m.attributeName==='bis_skin_checked')s(m.target);m.addedNodes&&m.addedNodes.forEach(function(n){s(n);n.querySelectorAll&&n.querySelectorAll('[bis_skin_checked]').forEach(s)})})}).observe(document.documentElement,{attributes:true,subtree:true,childList:true,attributeFilter:['bis_skin_checked']})})();`,
          }}
        />
        {/*
          Google Analytics (gtag.js). The external loader carries the CSP
          nonce so 'strict-dynamic' trusts it and the scripts it injects;
          the inline config block is nonce'd + suppressHydrationWarning for
          the same reason as the other inline <head> scripts above.
        */}
        {GA_MEASUREMENT_ID ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              nonce={nonce}
            />
            <script
              id="ga-gtag"
              nonce={nonce}
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
              }}
            />
          </>
        ) : null}
        <script
          id="ld-person"
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <script
          id="ld-professional-service"
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(professionalServiceSchema),
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        {FB_PIXEL_ID ? (
          <>
            <script
              id="fb-pixel"
              nonce={nonce}
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${FB_PIXEL_ID}');
fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                hidden
                alt=""
                src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              />
            </noscript>
            <Suspense fallback={null}>
              <FacebookPixelTracker />
            </Suspense>
          </>
        ) : null}
        <ChallengeProvider>{children}</ChallengeProvider>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  )
}
