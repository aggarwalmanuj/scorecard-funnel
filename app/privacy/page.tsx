import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | AIMerge",
  description: "AIMerge privacy policy — how we collect, use, and protect your data.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm mb-12">
          Last updated: April 10, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-foreground mb-3">1. Introduction</h2>
            <p>
              AIMerge (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the AIMerge platform, including The Inner Light Experience. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this policy carefully. By accessing or using our services, you agree to the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-bold text-foreground mb-2">Personal Information</h3>
            <p>We may collect personally identifiable information that you voluntarily provide, including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>First name</li>
              <li>Email address</li>
              <li>Responses to experience questions</li>
              <li>Feedback on AI-generated reflections</li>
            </ul>

            <h3 className="text-lg font-bold text-foreground mb-2 mt-4">Automatically Collected Information</h3>
            <p>When you access our website, we may automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages visited and time spent</li>
              <li>Referring website addresses</li>
              <li>IP address (anonymized where possible)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">To deliver the experience:</strong> Your responses are processed by AI to generate personalized reflections. This is the core purpose of our service.</li>
              <li><strong className="text-foreground">To improve our services:</strong> We analyze usage patterns to improve the quality and relevance of our platform.</li>
              <li><strong className="text-foreground">To communicate with you:</strong> If you have opted in, we may send you relevant follow-up communications about our services.</li>
              <li><strong className="text-foreground">To maintain security:</strong> We use technical information to protect against unauthorized access and ensure service integrity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Microsoft Azure Cosmos DB with encryption at rest and in transit. We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>TLS/SSL encryption for all data transmission</li>
              <li>Access controls and authentication for administrative functions</li>
              <li>Regular security reviews of our infrastructure</li>
              <li>Content Security Policy (CSP) headers to prevent cross-site scripting</li>
            </ul>
            <p className="mt-3">
              While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">5. AI-Generated Content</h2>
            <p>
              Our service uses artificial intelligence to generate personalized reflections based on your responses. Please note:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your answers are sent to a third-party AI provider (OpenRouter) for processing</li>
              <li>AI-generated reflections are unique to your responses and stored in our database</li>
              <li>We do not use your responses to train AI models</li>
              <li>AI outputs are for personal reflection purposes only and do not constitute professional advice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">6. Data Sharing and Disclosure</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">Service providers:</strong> We use third-party services (Azure, OpenRouter, Vercel) to operate our platform. These providers are bound by their own privacy policies.</li>
              <li><strong className="text-foreground">Legal requirements:</strong> We may disclose information if required by law, regulation, or legal process.</li>
              <li><strong className="text-foreground">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">7. Cookies and Tracking</h2>
            <p>
              Our website uses local storage to maintain your session state during the experience. We use Vercel Analytics for basic usage metrics. We do not use third-party advertising cookies or tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Rectification:</strong> Request correction of inaccurate personal data</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data</li>
              <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format</li>
              <li><strong className="text-foreground">Objection:</strong> Object to certain types of processing</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at the email address provided below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">9. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law. You may request deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">10. Children&apos;s Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">11. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from your jurisdiction. By using our services, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-3">13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
            </p>
            <p className="mt-2 font-bold text-foreground">
              AIMerge — a TetraNoodle Technologies product<br />
              Email: sales@tetranoodle.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
