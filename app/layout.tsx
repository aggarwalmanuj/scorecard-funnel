import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ChallengeProvider } from "@/context/challenge-context"
import FacebookPixelTracker from "@/components/facebook-pixel"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
})

const RAW_FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
// Hard-validate format to prevent template injection via inline script.
// Facebook Pixel IDs are numeric strings.
const FB_PIXEL_ID =
  RAW_FB_PIXEL_ID && /^\d{6,20}$/.test(RAW_FB_PIXEL_ID) ? RAW_FB_PIXEL_ID : null

export const metadata: Metadata = {
  title: "Your Unfair Advantage Score | Find what's quietly limiting you",
  description:
    "Discover what's quietly limiting your performance. A 10-minute diagnostic across 7 dimensions, built on the AI Merge framework — peer-reviewed in the Mensa Research Journal.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Your Unfair Advantage Score",
    description:
      "Find the hidden pattern quietly limiting your performance — across 7 dimensions of life and work.",
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
    <html lang="en" suppressHydrationWarning>
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
        <Analytics />
      </body>
    </html>
  )
}
