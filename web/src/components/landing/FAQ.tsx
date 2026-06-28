"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What is SardineWatch?",
    a: "SardineWatch is a free community-powered app for tracking South Africa's famous KwaZulu-Natal sardine run in real time. Spotters on the ground report sightings with GPS and photos, and you get instant push notifications so you always know where the sardines are.",
  },
  {
    q: "Is SardineWatch free?",
    a: "Yes — completely free. No subscription, no ads, no catch. Just sign up with your email and you're in.",
  },
  {
    q: "Is the app available on iPhone?",
    a: "Yes! Open Safari on your iPhone, go to sardinewatch.co.za, tap the Share button (the box with an arrow at the bottom of the screen), then tap \"Add to Home Screen\". The app icon will appear on your home screen and works just like a native app — including push notifications.",
  },
  {
    q: "Is the app available on Android?",
    a: "Yes! Search for \"SardineWatch\" on the Google Play Store or visit sardinewatch.co.za and tap the install prompt. It's free.",
  },
  {
    q: "How does the live feed work?",
    a: "When someone spots sardines, they open the app and tap \"Report Sighting\". They add a description, optional photo, and their GPS location is captured automatically. The sighting instantly appears on the live feed and map for everyone to see.",
  },
  {
    q: "How do push notifications work?",
    a: "Once you enable notifications in the app, you'll get an alert any time a sardine sighting is reported along the KZN coast. You can turn notifications on or off at any time in Settings.",
  },
  {
    q: "How accurate are the sightings?",
    a: "Sightings are GPS-tagged and submitted by real people in the field. They include photos where possible and are visible on the map with exact coordinates. Sightings older than 48 hours are automatically removed from the feed to keep information current.",
  },
  {
    q: "Who can report a sighting?",
    a: "Anyone with a free SardineWatch account can report a sighting. The more people report, the more accurate and useful the app becomes for the whole community — so please share it!",
  },
  {
    q: "Where does the sardine run happen?",
    a: "The sardine run travels up the KwaZulu-Natal coast of South Africa, typically between Port Edward in the south and Durban in the north. It usually occurs between May and July each year.",
  },
  {
    q: "I have a question not answered here — how do I get in touch?",
    a: "Use the Contact Us page on this site and we'll get back to you as soon as we can.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-deep-200 dark:border-deep-700 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-semibold text-deep-900 dark:text-white text-[15px] leading-snug">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-deep-400 dark:text-deep-500 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-deep-600 dark:text-deep-300 text-sm leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <section className="py-24 bg-deep-50/50 dark:bg-deep-950/50" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-ocean-500 font-semibold tracking-wide uppercase text-sm"
          >
            Got questions?
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-4xl sm:text-5xl font-display font-bold text-deep-950 dark:text-white tracking-tight"
          >
            Frequently asked <span className="gradient-text">questions</span>
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl border border-deep-200/80 dark:border-deep-700/60 bg-white dark:bg-deep-800/50 px-6 sm:px-8 divide-y divide-deep-200 dark:divide-deep-700"
        >
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
