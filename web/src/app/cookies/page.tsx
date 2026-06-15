import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "What SardineWatch stores on your device, what it's used for, and how to clear it.",
  alternates: { canonical: "https://sardinewatch.co.za/cookies" },
  robots: { index: true, follow: true },
};

export default function CookiePolicyPage() {
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
              Cookie &amp; Storage Policy
            </h1>
            <p className="text-deep-500 dark:text-deep-400 mt-3">
              Last updated: {LEGAL.lastUpdated}
            </p>
            <p className="text-deep-700 dark:text-deep-200 mt-6 leading-relaxed">
              Sardine Spotter takes a minimalist approach: we use the smallest
              amount of browser storage needed to run the app, and we do not
              use third-party advertising or tracking cookies of any kind.
              This page lists everything we store on your device.
            </p>
          </header>

          <div className="space-y-10 text-deep-800 dark:text-deep-200 leading-relaxed">
            <Section title="What we store on your device">
              <p>
                We don&apos;t actually set traditional HTTP cookies. Instead
                we use <strong>localStorage</strong> and the{" "}
                <strong>Service Worker cache</strong> — both of which sit on
                your device and are never transmitted to third parties.
              </p>

              <div className="mt-4 overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-50 dark:bg-deep-900 text-left">
                      <th className="px-4 py-3 font-semibold border-b border-deep-200 dark:border-deep-700">Name</th>
                      <th className="px-4 py-3 font-semibold border-b border-deep-200 dark:border-deep-700">Purpose</th>
                      <th className="px-4 py-3 font-semibold border-b border-deep-200 dark:border-deep-700">Type</th>
                      <th className="px-4 py-3 font-semibold border-b border-deep-200 dark:border-deep-700">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row
                      name="ss_token"
                      purpose="Keeps you signed in across visits. JWT issued by our server."
                      type="Essential"
                      expires="On logout"
                    />
                    <Row
                      name="theme"
                      purpose="Remembers your light/dark mode preference."
                      type="Functional"
                      expires="Until cleared"
                    />
                    <Row
                      name="ss_cookies_ack"
                      purpose="Records that you've seen the cookie notice so we don't pester you on every page."
                      type="Functional"
                      expires="Until cleared"
                    />
                    <Row
                      name="Service Worker cache"
                      purpose="Stores the offline page, app icon, and previously visited pages so the app keeps working when your connection drops."
                      type="Essential"
                      expires="Until cleared or app uninstalled"
                    />
                    <Row
                      name="Push subscription"
                      purpose="If you opt in to push notifications, the browser stores your subscription endpoint to receive notifications. Removed automatically when you toggle off notifications."
                      type="Functional (opt-in)"
                      expires="On unsubscribe"
                    />
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Third-party storage">
              <p>
                When you load the map, Google Maps may set its own cookies in
                your browser to render map tiles. Those cookies are not under
                our control and are governed by{" "}
                <a
                  href="https://policies.google.com/technologies/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  Google&apos;s cookie policy
                </a>
                .
              </p>
              <p className="mt-3">
                <strong>
                  We do not use advertising, marketing, analytics, social-share
                  or any other third-party tracking cookies.
                </strong>{" "}
                No Google Analytics. No Facebook pixel. No retargeting.
              </p>
            </Section>

            <Section title="Why we don't ask for cookie consent">
              <p>
                Under POPIA and the ePrivacy norms, consent is required only
                for storage that is <strong>not strictly necessary</strong> to
                deliver the service the user requested. Everything we store is
                either:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Essential</strong> — without it the app simply doesn&apos;t work (you can&apos;t stay logged in, the app can&apos;t serve you offline), or</li>
                <li><strong>Functional and user-opted</strong> — you actively turn it on (dark mode, push notifications).</li>
              </ul>
              <p className="mt-3">
                We still show you a one-time notice so you know what&apos;s
                happening on your device — see the banner at the bottom of
                the screen the first time you visit.
              </p>
            </Section>

            <Section title="Clearing what we've stored">
              <p>You can clear all our local storage at any time:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>In the app:</strong> Settings → Log out (clears the auth token).</li>
                <li><strong>In your browser:</strong> open the site settings (the padlock icon next to the URL → &ldquo;Site settings&rdquo; / &ldquo;Permissions&rdquo;) and clear data for sardinespotter.com.</li>
                <li><strong>On your phone:</strong> if you&apos;ve added the app to your home screen, uninstalling it removes all stored data.</li>
              </ul>
            </Section>

            <Section title="Contact">
              <p>
                Questions about what we store?{" "}
                <Link
                  href="/privacy#contact"
                  className="text-ocean-600 dark:text-ocean-400 underline"
                >
                  Contact our Information Officer
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

function Row({
  name,
  purpose,
  type,
  expires,
}: {
  name: string;
  purpose: string;
  type: string;
  expires: string;
}) {
  return (
    <tr className="border-b border-deep-100 dark:border-deep-800">
      <td className="px-4 py-3 font-mono text-xs text-ocean-700 dark:text-ocean-300">
        {name}
      </td>
      <td className="px-4 py-3 text-sm">{purpose}</td>
      <td className="px-4 py-3 text-sm">{type}</td>
      <td className="px-4 py-3 text-sm">{expires}</td>
    </tr>
  );
}
