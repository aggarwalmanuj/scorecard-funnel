import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, and protect your data.",
}

/**
 * Editorial privacy doc - Marine palette is locked via the wrapper so the
 * page reads as part of the same family as the challenge funnel.
 */
export default function PrivacyPolicyPage() {
  return (
    <div
      data-palette="marine"
      className="min-h-screen bg-background font-sans text-foreground"
    >
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-foreground/65 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to home
        </Link>

        <p className="eyebrow mb-5 text-foreground/70">
          <span className="pulse-dot mr-3" aria-hidden />
          Quiet pages
        </p>

        <h1 className="font-serif text-[40px] leading-[1.05] text-ink sm:text-[48px]">
          Privacy
          <span className="block font-serif-italic text-foreground">policy.</span>
        </h1>

        <p className="mt-4 text-[12px] uppercase tracking-[0.22em] text-foreground/55">
          Last updated · April 10, 2026
        </p>

        <div className="hairline mt-12" />

        <article className="mt-12 space-y-12 text-[15.5px] leading-[1.85] text-foreground/85">
          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              1 · Introduction
            </h2>
            <p>
              AIMerge (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the AIMerge
              platform, including The Inner Light Experience. This Privacy
              Policy explains how we collect, use, disclose, and safeguard
              your information when you visit our website and use our
              services. Please read this policy carefully. By accessing or
              using our services, you agree to the terms below.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              2 · Information we collect
            </h2>
            <p className="eyebrow mb-2 text-foreground/65">Personal information</p>
            <p>
              We may collect personally identifiable information that you
              voluntarily provide:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 marker:text-foreground/40">
              <li>First name</li>
              <li>Email address</li>
              <li>Responses to experience questions</li>
              <li>Feedback on AI-generated reflections</li>
            </ul>

            <p className="eyebrow mb-2 mt-7 text-foreground/65">
              Automatically collected information
            </p>
            <p>When you access our website, we may automatically collect:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6 marker:text-foreground/40">
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages visited and time spent</li>
              <li>Referring website addresses</li>
              <li>IP address (anonymised where possible)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              3 · How we use your information
            </h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-foreground/40">
              <li>
                <span className="text-ink">To deliver the experience -</span>{" "}
                your responses are processed by AI to generate personalised
                reflections. This is the core purpose of our service.
              </li>
              <li>
                <span className="text-ink">To improve our services -</span>{" "}
                we analyse usage patterns to improve quality and relevance.
              </li>
              <li>
                <span className="text-ink">
                  Human review by the AIMerge team -
                </span>{" "}
                authorised members of the AIMerge team may read your responses
                and AI-generated reflections to enhance your experience,
                personalise follow-up, calibrate the diagnostic, and ensure
                quality and safety. Access is restricted to staff who need it,
                governed by confidentiality obligations, and never used to
                identify you publicly or shared with third parties for
                marketing.
              </li>
              <li>
                <span className="text-ink">To communicate with you -</span>{" "}
                if you have opted in, we may send you relevant follow-ups.
              </li>
              <li>
                <span className="text-ink">To maintain security -</span>{" "}
                we use technical information to protect against unauthorised
                access.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              4 · Data storage and security
            </h2>
            <p>
              Your data is stored securely using Microsoft Azure Cosmos DB
              with encryption at rest and in transit. We implement
              industry-standard security measures including:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 marker:text-foreground/40">
              <li>TLS/SSL encryption for all data transmission</li>
              <li>Access controls and authentication for administrative functions</li>
              <li>Regular security reviews of our infrastructure</li>
              <li>Content Security Policy (CSP) headers to prevent cross-site scripting</li>
            </ul>
            <p className="mt-4">
              While we strive to protect your personal information, no method
              of transmission over the Internet or electronic storage is 100%
              secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              5 · AI-generated content
            </h2>
            <p>
              Our service uses artificial intelligence to generate
              personalised reflections based on your responses. Please note:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 marker:text-foreground/40">
              <li>
                Your answers are sent to a third-party AI provider
                (OpenRouter) for processing
              </li>
              <li>
                AI-generated reflections are unique to your responses and
                stored in our database
              </li>
              <li>We do not use your responses to train AI models</li>
              <li>
                AI outputs are for personal reflection purposes only and do
                not constitute professional advice
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              6 · Data sharing and disclosure
            </h2>
            <p>
              We do not sell, trade, or rent your personal information to
              third parties. We may share your information only as follows:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-foreground/40">
              <li>
                <span className="text-ink">Service providers -</span> we use
                Azure, OpenRouter, and Vercel to operate our platform. These
                providers are bound by their own privacy policies.
              </li>
              <li>
                <span className="text-ink">Legal requirements -</span> we may
                disclose information if required by law, regulation, or
                legal process.
              </li>
              <li>
                <span className="text-ink">Business transfers -</span> in the
                event of a merger, acquisition, or sale of assets, your
                information may be transferred as part of that transaction.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              7 · Cookies and tracking
            </h2>
            <p>
              Our website uses local storage to maintain your session state
              during the experience. We use Vercel Analytics for basic usage
              metrics. We do not use third-party advertising cookies or
              tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              8 · Your rights
            </h2>
            <p>
              Depending on your jurisdiction, you may have the following
              rights regarding your personal data:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-foreground/40">
              <li>
                <span className="text-ink">Access -</span> request a copy of
                the personal data we hold about you
              </li>
              <li>
                <span className="text-ink">Rectification -</span> request
                correction of inaccurate personal data
              </li>
              <li>
                <span className="text-ink">Deletion -</span> request deletion
                of your personal data
              </li>
              <li>
                <span className="text-ink">Portability -</span> request your
                data in a structured, machine-readable format
              </li>
              <li>
                <span className="text-ink">Objection -</span> object to
                certain types of processing
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us at the email
              address below.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              9 · Data retention
            </h2>
            <p>
              We retain your personal data for as long as necessary to fulfil
              the purposes outlined in this policy, unless a longer retention
              period is required or permitted by law. You may request
              deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              10 · Children&apos;s privacy
            </h2>
            <p>
              Our services are not intended for individuals under the age of
              18. We do not knowingly collect personal information from
              children. If we become aware that we have collected data from a
              child under 18, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              11 · International data transfers
            </h2>
            <p>
              Your information may be transferred to and processed in
              countries other than your country of residence. These countries
              may have data protection laws that differ from your
              jurisdiction. By using our services, you consent to such
              transfers.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              12 · Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by updating the &quot;Last updated&quot;
              date at the top of this page. Continued use after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-[22px] leading-snug text-ink">
              13 · Contact us
            </h2>
            <p>
              If you have questions about this Privacy Policy or wish to
              exercise your data rights, please contact us at:
            </p>
            <p className="mt-3 font-serif text-ink">
              AIMerge - a TetraNoodle Technologies product
              <br />
              <span className="font-serif-italic text-foreground/85">
                sales@tetranoodle.com
              </span>
            </p>
          </section>
        </article>

        <div className="hairline mt-16" />
        <p className="mt-6 font-serif-italic text-[13px] text-foreground/55">
          Composed quietly. Read at your own pace.
        </p>
      </div>
    </div>
  )
}
