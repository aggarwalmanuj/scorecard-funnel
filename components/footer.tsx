import Link from "next/link"
import Image from "next/image"
import { Linkedin } from "lucide-react"

const footerLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#paths", label: "Paths" },
  { href: "#faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
]

const socialLinks = [
  { icon: Linkedin, href: "https://www.linkedin.com/company/tetranoodle", label: "LinkedIn" },
]

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground/10 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-14 md:py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Logo & Description */}
            <div className="max-w-sm">
              <Link href="/" className="flex items-center group">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Colored%20%28Transparent%29-i3BIGX38o1jOu8WEN9AsCy09XzplWy.png"
                  alt="Your Unfair Advantage"
                  width={130}
                  height={32}
                  className="dark:hidden transition-transform duration-200 group-hover:scale-105"
                  style={{ height: 32, width: 'auto' }}
                  unoptimized
                />
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/White%20%28Transparent%29-ch7lxVfW4eNHZNaDbk70Bpfil2XuOt.png"
                  alt="Your Unfair Advantage"
                  width={130}
                  height={32}
                  className="hidden dark:block transition-transform duration-200 group-hover:scale-105"
                  style={{ height: 32, width: 'auto' }}
                  unoptimized
                />
              </Link>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed font-medium">
                Your Unfair Advantage Score. A 10-minute diagnostic across 7 dimensions —
                identifying the hidden pattern quietly limiting your performance.
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground/80 font-medium">
                Reviewed and published — Mensa Research Journal · Individual · Team · Organization
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t-2 border-foreground/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground font-medium">
            &copy; {new Date().getFullYear()} Your Unfair Advantage. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground/10 text-muted-foreground hover:text-primary hover:border-primary hover:neu-shadow-primary-xs transition-all duration-200"
                aria-label={link.label}
              >
                <link.icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
