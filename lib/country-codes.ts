/**
 * Curated country dial codes for the phone field. Not exhaustive — a focused
 * global spread covering the funnel's primary markets, with the highest-volume
 * ones pinned to the top so most users don't have to scroll.
 */
export type CountryCode = {
  /** ISO 3166-1 alpha-2 */
  code: string
  /** E.164 dial prefix incl. "+" */
  dial: string
  flag: string
  name: string
}

/** Dial prefix for an ISO code (falls back to "+1"). */
export function dialFor(code: string): string {
  return COUNTRY_CODES.find((c) => c.code === code)?.dial ?? "+1"
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
  // ── rest, alphabetical by name ──
  { code: "AR", dial: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "AT", dial: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "CL", dial: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "CN", dial: "+86", flag: "🇨🇳", name: "China" },
  { code: "CO", dial: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "DK", dial: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "EG", dial: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "FI", dial: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "HK", dial: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "ID", dial: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "IE", dial: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "IL", dial: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "MY", dial: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "MX", dial: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "NZ", dial: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "NO", dial: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "PK", dial: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "PH", dial: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "PL", dial: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "QA", dial: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "KR", dial: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "SE", dial: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "TH", dial: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "TR", dial: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "VN", dial: "+84", flag: "🇻🇳", name: "Vietnam" },
]
