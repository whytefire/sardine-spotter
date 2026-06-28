"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Smartphone, Apple, ChevronRight } from "lucide-react";

const androidSteps = [
  "Open the Google Play Store on your Android phone",
  'Search for "SardineWatch" or tap the button below',
  "Tap Install — it's free",
  "Open the app, sign up, and you're live",
];

const iosSteps = [
  "Open Safari on your iPhone (must be Safari, not Chrome)",
  "Go to sardinewatch.co.za",
  "Tap the Share button (the box with an arrow at the bottom of the screen)",
  'Scroll down and tap "Add to Home Screen"',
  "Tap Add — the app icon appears on your home screen",
];

export default function Download() {
  return (
    <section className="py-24 bg-white dark:bg-deep-900" id="download">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-ocean-500 font-semibold tracking-wide uppercase text-sm"
          >
            Free on all devices
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-4xl sm:text-5xl font-display font-bold text-deep-950 dark:text-white tracking-tight"
          >
            Get the <span className="gradient-text">app</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-deep-600 dark:text-deep-300 max-w-2xl mx-auto"
          >
            Available on Android via Google Play, and on iPhone via Safari — no App Store needed.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Android */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-deep-200/80 dark:border-deep-700/60 bg-deep-50 dark:bg-deep-800/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sea-green-500 to-ocean-500 flex items-center justify-center shadow-lg shadow-sea-green-500/20">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-deep-950 dark:text-white">Android</h3>
                <p className="text-sm text-deep-500 dark:text-deep-400">Google Play Store</p>
              </div>
            </div>
            <ol className="space-y-3 mb-8">
              {androidSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-ocean-100 dark:bg-ocean-900/40 text-ocean-600 dark:text-ocean-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-deep-700 dark:text-deep-300 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://play.google.com/store/apps/details?id=za.co.sardinewatch.twa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-ocean-600 to-ocean-500 text-white font-semibold text-sm shadow-lg shadow-ocean-600/20 hover:shadow-ocean-600/40 transition-all"
            >
              Download on Google Play
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* iOS */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-deep-200/80 dark:border-deep-700/60 bg-deep-50 dark:bg-deep-800/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-deep-700 to-deep-900 flex items-center justify-center shadow-lg shadow-deep-900/20">
                <Apple className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-deep-950 dark:text-white">iPhone</h3>
                <p className="text-sm text-deep-500 dark:text-deep-400">Add to Home Screen via Safari</p>
              </div>
            </div>
            <ol className="space-y-3 mb-8">
              {iosSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-ocean-100 dark:bg-ocean-900/40 text-ocean-600 dark:text-ocean-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-deep-700 dark:text-deep-300 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <Link
              href="/app"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-deep-800 to-deep-700 text-white font-semibold text-sm shadow-lg shadow-deep-900/20 hover:shadow-deep-900/40 transition-all"
            >
              Open in Safari now
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
