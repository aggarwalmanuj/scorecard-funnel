import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import Script from "next/script"
import { Geist, Geist_Mono, Inter, Fraunces } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ChallengeProvider } from "@/context/challenge-context"
import FacebookPixelTracker from "@/components/facebook-pixel"
import ClarityInit from "@/components/clarity-init"
import { CookieConsent } from "@/components/cookie-consent"
import "./globals.css"

// Server-only env read - the project ID is threaded down as a prop so it
// never appears in the bundle as a NEXT_PUBLIC_* variable. The ID itself
// isn't strictly secret (Clarity's loader script exposes it client-side
// once init runs), but server-only reads stay consistent with our other
// funnels and avoid leaking the variable name to bundle inspectors.
const CLARITY_ID = process.env.MICROSOFT_CLARITY_ID ?? ""

const geist = Geist({
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
})

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

export const metadata: Metadata = {
  title: "Your Unfair Advantage Score | Find what's quietly limiting you",
  description:
    "Discover what's quietly limiting your performance. A 10-minute diagnostic across 7 dimensions, built on the AI Merge framework - peer-reviewed in the Mensa Research Journal.",
  icons: {
    // White-on-transparent favicon. Browsers render it on their own toolbar
    // background, which is universally light or dark - the white mark stays
    // legible on either, so no separate dark/light variant is shipped.
    icon: "/newui/favicon.png",
    apple: "/newui/favicon.png",
  },
  openGraph: {
    title: "Your Unfair Advantage Score",
    description:
      "Find the hidden pattern quietly limiting your performance - across 7 dimensions of life and work.",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0718",
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
        <Script
          id="strip-bitdefender-attrs"
          nonce={nonce}
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){function s(n){n&&n.removeAttribute&&n.removeAttribute('bis_skin_checked')}new MutationObserver(function(ms){ms.forEach(function(m){if(m.attributeName==='bis_skin_checked')s(m.target);m.addedNodes&&m.addedNodes.forEach(function(n){s(n);n.querySelectorAll&&n.querySelectorAll('[bis_skin_checked]').forEach(s)})})}).observe(document.documentElement,{attributes:true,subtree:true,childList:true,attributeFilter:['bis_skin_checked']})})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        {CLARITY_ID ? <ClarityInit projectId={CLARITY_ID} /> : null}
        {FB_PIXEL_ID ? (
          <>
            <Script
              id="fb-pixel"
              nonce={nonce}
              strategy="afterInteractive"
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
