import type { Metadata } from "next"

// noindex here rather than a robots.txt Disallow, which would publish the path.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PolarisLayout({ children }: { children: React.ReactNode }) {
  return children
}
