import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How SardineWatch collects, uses and protects your personal information under South Africa's Protection of Personal Information Act (POPIA).",
  alternates: { canonical: "https://sardinewatch.co.za/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white dark:bg-deep-950 pt-24 pb-16">
        <article className="max-w-3xl mx-auto px-4 sm:px-6">
          <header className="mb-10">
            <p className="text-sm font-semibold text-ocean-600 dark:text-ocean-400 uppercase tracking-wider">
              Legal
            </p>
            <h1 className="text-4xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight mt-2">
              Privacy Policy
            </h1>
            <p className="text-deep-500 dark:text-deep-400 mt-3">
              Last updated: {LEGAL.lastUpdated}
            </p>
            <p className="text-deep-700 dark:text-deep-200 mt-6 leading-relaxed">
              This policy explains what personal information Sardine Spotter
              collects, why we collect it, how long we keep it, and what
              choices you have. It is written to comply with the{" "}
              <strong>Protection of Personal Information Act, 2013 (POPIA)</strong>{" "}
              of the Republic of South Africa.
            </p>
          </header>

          <nav className="mb-10 p-5 rounded-2xl bg-surface-50 dark:bg-deep-900 border border-deep-200 dark:border-deep-700">
            <h2 className="text-sm font-bold text-deep-900 dark:text-white mb-3 uppercase tracking-wider">
              On this page
            </h2>
            <ol className="space-y-1.5 text-sm text-ocean-700 dark:text-ocean-300">
              <li><a href="#responsible-party" className="hover:underline">1. Who we are</a></li>
              <li><a href="#information-officer" className="hover:underline">2. Information Officer</a></li>
              <li><a href="#what-we-collect" className="hover:underline">3. Personal information we collect</a></li>
              <li><a href="#why-we-collect" className="hover:underline">4. Why we collect it (purpose)</a></li>
              <li><a href="#lawful-basis" className="hover:underline">5. Lawful basis for processing</a></li>
              <li><a href="#sharing" className="hover:underline">6. Who we share information with</a></li>
              <li><a href="#cross-border" className="hover:underline">7. Cross-border transfers</a></li>
              <li><a href="#retention" className="hover:underline">8. How long we keep your information</a></li>
              <li><a href="#security" className="hover:underline">9. Security safeguards</a></li>
              <li><a href="#your-rights" className="hover:underline">10. Your rights as a data subject</a></li>
              <li><a href="#children" className="hover:underline">11. Children</a></li>
              <li><a href="#cookies" className="hover:underline">12. Cookies and similar storage</a></li>
              <li><a href="#changes" className="hover:underline">13. Changes to this policy</a></li>
              <li><a href="#contact" className="hover:underline">14. Contact &amp; complaints</a></li>
            </ol>
          </nav>

          <div className="prose-legal space-y-10 text-deep-800 dark:text-deep-200 leading-relaxed">
            <Section id="responsible-party" title="1. Who we are">
              <p>
                Sardine Spotter is operated by{" "}
                <strong>{LEGAL.operator}</strong> (&ldquo;we&rdquo;,
                &ldquo;us&rdquo;, &ldquo;our&rdquo;), a sole proprietor in the
                Republic of South Africa. We are the &ldquo;responsible
                party&rdquo; under POPIA in respect of the personal information
                we process about you.
              </p>
              <p className="mt-3">
                Postal address: <strong>{LEGAL.address}</strong>
              </p>
            </Section>

            <Section id="information-officer" title="2. Information Officer">
              <p>
                Our Information Officer (the person responsible for our POPIA
                compliance and the point of contact for any privacy-related
                request) can be contacted at{" "}
                <a
                  href={`mailto:${LEGAL.infoOfficerEmail}`}
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  {LEGAL.infoOfficerEmail}
                </a>.
              </p>
            </Section>

            <Section id="what-we-collect" title="3. Personal information we collect">
              <p>We collect the following categories of personal information:</p>
              <h3 className="font-bold text-deep-950 dark:text-white mt-5 mb-1">3.1 Information you give us</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account details:</strong> email address, chosen nickname, password (stored only as a one-way bcrypt hash — never in plaintext).</li>
                <li><strong>Profile:</strong> optional profile picture you upload.</li>
                <li><strong>Sighting reports:</strong> GPS coordinates of the sighting, the description text you write, and any photo you upload.</li>
                <li><strong>Comments &amp; likes:</strong> the text of any comment you post and a record of which sightings you have liked.</li>
              </ul>

              <h3 className="font-bold text-deep-950 dark:text-white mt-5 mb-1">3.2 Information we generate automatically</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Technical &amp; device data:</strong> your browser user-agent string, IP address (used only to deliver responses and detect abuse — not stored long-term), and the timestamps of requests.</li>
                <li><strong>Push notification subscription:</strong> if you opt in to push notifications, your browser&apos;s push endpoint and the per-device cryptographic keys needed to deliver them.</li>
                <li><strong>Activity:</strong> the time you last logged in, sightings you reported and notifications you received.</li>
              </ul>

              <h3 className="font-bold text-deep-950 dark:text-white mt-5 mb-1">3.3 Information we DO NOT collect</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>We do not use Google Analytics, Facebook Pixel, advertising trackers, or any third-party analytics tool.</li>
                <li>We do not sell, rent or trade your personal information. Ever.</li>
                <li>We do not track you across other websites.</li>
              </ul>
            </Section>

            <Section id="why-we-collect" title="4. Why we collect it (purpose)">
              <p>We process your personal information for these specific, explicitly defined purposes:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Operate the service:</strong> create your account, authenticate logins, let you report sightings and view those of others.</li>
                <li><strong>Communicate with you:</strong> deliver in-app and push notifications about sightings, comments and likes — only if you have opted in.</li>
                <li><strong>Keep the service safe:</strong> detect abuse, prevent fraud, and enforce our Terms of Service.</li>
                <li><strong>Improve the service:</strong> understand which features are being used (in aggregate; we do not look at individual user behaviour).</li>
                <li><strong>Comply with law:</strong> respond to lawful requests from the South African Information Regulator, courts, or other competent authorities.</li>
              </ul>
              <p className="mt-3">
                Supplying your information is <strong>voluntary</strong>. If
                you choose not to provide it you will not be able to create an
                account or use features that require sign-in.
              </p>
            </Section>

            <Section id="lawful-basis" title="5. Lawful basis for processing">
              <p>POPIA requires a lawful basis to process personal information. We rely on:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Your consent</strong> — when you register an account, opt in to push notifications, or upload a sighting / photo.</li>
                <li><strong>Performance of a contract</strong> — to deliver the service you signed up for (s. 11(1)(b)).</li>
                <li><strong>Our legitimate interests</strong> — to keep the service secure, detect abuse, and prevent misuse (s. 11(1)(f)).</li>
                <li><strong>Legal obligation</strong> — where we are required to retain or disclose information by South African law.</li>
              </ul>
            </Section>

            <Section id="sharing" title="6. Who we share information with">
              <p>
                We share personal information only with the operators and
                service providers we genuinely need to run the service:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Hosting and database provider</strong> — to store your data (operator-controlled, located in South Africa unless stated otherwise on the &ldquo;cross-border&rdquo; section below).</li>
                <li><strong>Google Maps</strong> — when you load the map, your approximate location (if you grant permission) is sent to Google to render map tiles. Google&apos;s use of this data is governed by{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-ocean-600 dark:text-ocean-400 underline">
                    Google&apos;s Privacy Policy
                  </a>.
                </li>
                <li><strong>Browser push services</strong> (Mozilla autopush, Apple APNs, Google FCM) — only if you have opted in to push notifications. We send these services an encrypted payload addressed to your browser; they cannot read the message contents.</li>
              </ul>
              <p className="mt-3">
                <strong>We do not sell your data to third parties.</strong> We
                will disclose personal information when compelled by a valid
                legal order from a South African court or the Information
                Regulator.
              </p>
            </Section>

            <Section id="cross-border" title="7. Cross-border transfers">
              <p>
                Some of the technical services we rely on (Google Maps, browser
                push gateways) are operated from outside South Africa. POPIA
                section 72 permits these transfers because:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>those providers are subject to laws / contracts that uphold an adequate level of protection, OR</li>
                <li>the transfer is necessary for the performance of the contract between you and us.</li>
              </ul>
            </Section>

            <Section id="retention" title="8. How long we keep your information">
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account data</strong> — for as long as your account exists. When you delete your account, your profile and email are removed within 30 days.</li>
                <li><strong>Sightings &amp; comments you posted</strong> — anonymised (your name replaced with &ldquo;[deleted user]&rdquo;) and retained as part of the community record, unless you specifically request their removal.</li>
                <li><strong>Push subscriptions</strong> — removed immediately when you toggle off notifications on that device or delete your account.</li>
                <li><strong>Server access logs</strong> — kept for up to 90 days for security and abuse detection, then permanently deleted.</li>
              </ul>
            </Section>

            <Section id="security" title="9. Security safeguards">
              <p>We implement appropriate, reasonable technical and organisational measures, including:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Passwords stored only as bcrypt one-way hashes — we cannot recover your password and neither can anyone else.</li>
                <li>HTTPS / TLS encryption for all data in transit between your device and our servers.</li>
                <li>Push notification payloads encrypted with Web Push&apos;s end-to-end VAPID scheme.</li>
                <li>Authentication via signed, expiring JSON Web Tokens.</li>
                <li>Database access restricted to the application server with rotated credentials.</li>
                <li>Server-side input validation on all user-supplied data.</li>
              </ul>
              <p className="mt-3">
                If we become aware of a security compromise that creates a real risk
                to your rights, we will notify you and the Information Regulator
                as required by POPIA section 22 — and explain what happened, what
                we are doing about it, and what you can do to protect yourself.
              </p>
            </Section>

            <Section id="your-rights" title="10. Your rights as a data subject">
              <p>Under POPIA you have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Be notified</strong> of what we collect (this policy).</li>
                <li><strong>Access</strong> the personal information we hold about you — available in-app via Settings → Account → &ldquo;Download my data&rdquo;.</li>
                <li><strong>Correct</strong> inaccurate information — edit your nickname, email and avatar in Settings → Account.</li>
                <li><strong>Delete</strong> your account and the personal information attached to it — Settings → Account → &ldquo;Delete my account&rdquo;.</li>
                <li><strong>Object</strong> to processing under section 11(3) of POPIA.</li>
                <li><strong>Withdraw consent</strong> at any time, without affecting the lawfulness of processing before withdrawal.</li>
                <li><strong>Lodge a complaint</strong> with the Information Regulator (see section 14).</li>
              </ul>
            </Section>

            <Section id="children" title="11. Children">
              <p>
                Sardine Spotter is not directed at children under the age of 18.
                If we become aware that we have collected personal information
                from a child without the consent of a competent person, we will
                delete it. If you believe this has happened, please contact us
                at{" "}
                <a
                  href={`mailto:${LEGAL.infoOfficerEmail}`}
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  {LEGAL.infoOfficerEmail}
                </a>.
              </p>
            </Section>

            <Section id="cookies" title="12. Cookies and similar storage">
              <p>
                See our separate{" "}
                <Link href="/cookies" className="text-ocean-600 dark:text-ocean-400 underline">
                  Cookie Policy
                </Link>{" "}
                for a full breakdown of what we store on your device, why, and
                how to clear it.
              </p>
            </Section>

            <Section id="changes" title="13. Changes to this policy">
              <p>
                We may update this policy from time to time — for example, when
                we add new features or when the law changes. The date at the
                top of this page always shows when it was last updated.
                Material changes will be announced in-app before they take
                effect.
              </p>
            </Section>

            <Section id="contact" title="14. Contact & complaints">
              <p>
                For any privacy question or to exercise a right above, contact
                our Information Officer at{" "}
                <a
                  href={`mailto:${LEGAL.infoOfficerEmail}`}
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  {LEGAL.infoOfficerEmail}
                </a>. We aim to respond within 30 days.
              </p>
              <p className="mt-3">
                If you are not satisfied with our response, you have the right
                to lodge a complaint with the South African{" "}
                <strong>Information Regulator</strong>:
              </p>
              <address className="mt-2 not-italic">
                JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001<br />
                Email:{" "}
                <a
                  href="mailto:enquiries@inforegulator.org.za"
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  enquiries@inforegulator.org.za
                </a>
                <br />
                Complaints:{" "}
                <a
                  href="mailto:POPIAComplaints@inforegulator.org.za"
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  POPIAComplaints@inforegulator.org.za
                </a>
                <br />
                Web:{" "}
                <a
                  href="https://inforegulator.org.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  inforegulator.org.za
                </a>
              </address>
            </Section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-display font-bold text-deep-950 dark:text-white mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
