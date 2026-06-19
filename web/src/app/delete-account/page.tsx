import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "How to delete your SardineWatch account and associated data.",
  alternates: { canonical: "https://sardinewatch.co.za/delete-account" },
  robots: { index: true, follow: true },
};

export default function DeleteAccountPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white dark:bg-deep-950 pt-24 pb-16">
        <article className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-display font-extrabold text-deep-950 dark:text-white mb-2">
            Delete Your Account
          </h1>
          <p className="text-deep-500 dark:text-deep-400 mb-10">
            SardineWatch — KZN Sardine Run Tracker
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-deep-900 dark:text-white mb-3">
              How to delete your account
            </h2>
            <p className="text-deep-700 dark:text-deep-300 mb-4">
              You can delete your SardineWatch account at any time by following these steps:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-deep-700 dark:text-deep-300">
              <li>Log in to your account at <a href="https://sardinewatch.co.za/login" className="text-ocean-600 dark:text-ocean-400 underline">sardinewatch.co.za</a></li>
              <li>Go to <strong>Settings → Account</strong></li>
              <li>Scroll to the bottom and click <strong>"Delete Account"</strong></li>
              <li>Confirm the deletion when prompted</li>
            </ol>
            <p className="text-deep-700 dark:text-deep-300 mt-4">
              Alternatively, you can email us at{" "}
              <a href={`mailto:${LEGAL.infoOfficerEmail}`} className="text-ocean-600 dark:text-ocean-400 underline">
                {LEGAL.infoOfficerEmail}
              </a>{" "}
              with the subject line <strong>"Account Deletion Request"</strong> and we will delete your account within 7 business days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-deep-900 dark:text-white mb-3">
              What data is deleted
            </h2>
            <p className="text-deep-700 dark:text-deep-300 mb-3">
              When you delete your account, the following data is <strong>permanently deleted</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 text-deep-700 dark:text-deep-300">
              <li>Your email address and password</li>
              <li>Your profile information (nickname, avatar)</li>
              <li>Your push notification subscriptions</li>
              <li>Your sighting reports and associated photos</li>
              <li>Your comments</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-deep-900 dark:text-white mb-3">
              Data retention
            </h2>
            <p className="text-deep-700 dark:text-deep-300">
              All personal data is deleted immediately upon account deletion. We do not retain any personal information after deletion. Anonymous, aggregated usage statistics (if any) that cannot be linked back to you may be retained for service improvement purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-deep-900 dark:text-white mb-3">
              Contact us
            </h2>
            <p className="text-deep-700 dark:text-deep-300">
              If you have any questions about account deletion, please contact us at{" "}
              <a href={`mailto:${LEGAL.infoOfficerEmail}`} className="text-ocean-600 dark:text-ocean-400 underline">
                {LEGAL.infoOfficerEmail}
              </a>.
            </p>
          </section>

          <div className="mt-10 pt-6 border-t border-deep-200 dark:border-deep-700">
            <Link href="/privacy" className="text-ocean-600 dark:text-ocean-400 underline text-sm">
              ← Back to Privacy Policy
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
