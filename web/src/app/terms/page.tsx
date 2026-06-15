import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules for using SardineWatch — what we promise, what we expect from you, and how we handle disputes.",
  alternates: { canonical: "https://sardinewatch.co.za/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-deep-500 dark:text-deep-400 mt-3">
              Last updated: {LEGAL.lastUpdated}
            </p>
            <p className="text-deep-700 dark:text-deep-200 mt-6 leading-relaxed">
              These terms (&ldquo;Terms&rdquo;) form a binding agreement
              between you and <strong>{LEGAL.operator}</strong> (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;), the operator of Sardine Spotter (the
              &ldquo;Service&rdquo;). By creating an account or using the
              Service you agree to these Terms. If you do not agree, do not
              use the Service.
            </p>
          </header>

          <div className="space-y-10 text-deep-800 dark:text-deep-200 leading-relaxed">
            <Section title="1. Eligibility">
              <p>
                You must be at least 18 years old to create an account. By
                signing up you confirm that you are. If you are creating an
                account on behalf of an organisation, you confirm that you
                have authority to bind it to these Terms.
              </p>
            </Section>

            <Section title="2. Your account">
              <ul className="list-disc pl-6 space-y-1">
                <li>You are responsible for keeping your password confidential.</li>
                <li>You are responsible for everything that happens under your account.</li>
                <li>You may only have one account; we may terminate duplicate or impersonating accounts.</li>
                <li>Notify us at <a href={`mailto:${LEGAL.infoOfficerEmail}`} className="text-ocean-600 dark:text-ocean-400 underline">{LEGAL.infoOfficerEmail}</a> if you suspect unauthorised use of your account.</li>
              </ul>
            </Section>

            <Section title="3. What you can post">
              <p>
                You can report sardine sightings (text, location, optional
                photo), comment on other people&apos;s sightings, and react to
                them with likes. You retain ownership of the content you
                submit, but you grant us a worldwide, royalty-free,
                non-exclusive licence to host, display and distribute it
                within the Service so other users can see it.
              </p>
              <p className="mt-3">
                You agree <strong>not</strong> to submit content that is:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>unlawful, defamatory, threatening, obscene, hateful or harassing;</li>
                <li>infringing on anyone else&apos;s copyright, trademark, or privacy;</li>
                <li>misleading — e.g. false sighting reports designed to send fellow users on a fool&apos;s errand;</li>
                <li>spam, advertising, or unsolicited promotion;</li>
                <li>containing personal information about identifiable people (other than yourself) without their consent;</li>
                <li>malware, scraping scripts or anything that interferes with the Service.</li>
              </ul>
              <p className="mt-3">
                We may remove any content that breaches these rules and may
                suspend or terminate accounts that repeatedly do so.
              </p>
            </Section>

            <Section title="4. Photo uploads">
              <p>
                When you upload a photo with a sighting, you confirm that you
                took the photo yourself (or have the rights to share it), and
                that no identifiable person in the photo objects to it being
                published in the Service.
              </p>
              <p className="mt-3">
                Note that GPS or other metadata embedded in your photo (EXIF)
                may be visible to other users when they download the image.
                Strip it beforehand if that is a concern.
              </p>
            </Section>

            <Section title="5. Accuracy of sightings">
              <p>
                Sardine Spotter is a community reporting tool. We do not
                verify individual sightings. We make no promises about the
                accuracy, timeliness or completeness of information on the
                Service. <strong>Do not rely on a sighting as your only basis
                for decisions involving safety, livelihood, or significant
                financial commitment.</strong> Always corroborate with
                lifeguards, the National Sea Rescue Institute, or local
                authorities before entering the water.
              </p>
            </Section>

            <Section title="6. Acceptable use">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>scrape, crawl, or bulk-download data from the Service without our prior written permission;</li>
                <li>attempt to access another user&apos;s account or any non-public part of the Service;</li>
                <li>probe for security vulnerabilities (responsible disclosure is welcome — email us first);</li>
                <li>use the Service to send unsolicited communications;</li>
                <li>resell or commercialise the Service in any form.</li>
              </ul>
            </Section>

            <Section title="7. Push notifications">
              <p>
                If you opt in, we will send push notifications to your browser
                or device for new sightings, comments and likes. You can opt
                out at any time in Settings → Push Notifications.
              </p>
            </Section>

            <Section title="8. Service availability">
              <p>
                We provide the Service &ldquo;as is&rdquo; and on a best-effort
                basis. We may add, change or remove features at any time
                without notice. We may interrupt the Service for maintenance,
                upgrades, or to address security issues.
              </p>
            </Section>

            <Section title="9. Termination">
              <p>
                You can delete your account at any time via Settings → Account →
                &ldquo;Delete my account&rdquo;. Your profile data is removed
                within 30 days. We may suspend or terminate your account if
                you materially breach these Terms, with notice if reasonably
                possible.
              </p>
            </Section>

            <Section title="10. Disclaimers and limitation of liability">
              <p>
                To the maximum extent permitted by South African law,{" "}
                <strong>
                  we exclude all implied warranties and conditions
                </strong>{" "}
                regarding the Service. We do not warrant that the Service will
                be uninterrupted, secure, or error-free.
              </p>
              <p className="mt-3">
                <strong>
                  Our total liability to you under these Terms, regardless of
                  the cause of action, is limited to ZAR 1,000 (one thousand
                  rand).
                </strong>{" "}
                In no event will we be liable for indirect, consequential,
                special or punitive damages, including lost profits, lost
                data, or loss of business. Nothing in these Terms limits any
                non-excludable rights you have under the Consumer Protection
                Act, 2008.
              </p>
            </Section>

            <Section title="11. Indemnity">
              <p>
                You agree to indemnify and hold us harmless from any claim
                brought by a third party arising out of (a) your breach of
                these Terms, (b) your content, or (c) your misuse of the
                Service.
              </p>
            </Section>

            <Section title="12. Governing law">
              <p>
                These Terms are governed by the laws of the Republic of South
                Africa. You and we submit to the non-exclusive jurisdiction
                of the South African courts.
              </p>
            </Section>

            <Section title="13. Changes to these Terms">
              <p>
                We may update these Terms from time to time. We will tell you
                about material changes by email or in-app at least 14 days
                before they take effect. Continued use of the Service after
                that means you accept the new Terms.
              </p>
            </Section>

            <Section title="14. Contact">
              <p>
                Questions about these Terms? Email us at{" "}
                <a
                  href={`mailto:${LEGAL.infoOfficerEmail}`}
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  {LEGAL.infoOfficerEmail}
                </a>
                .
              </p>
              <p className="mt-3 text-sm text-deep-500 dark:text-deep-400">
                Need a refresher on what data we collect?{" "}
                <Link
                  href="/privacy"
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  See our Privacy Policy
                </Link>
                .
              </p>
            </Section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-display font-bold text-deep-950 dark:text-white mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
