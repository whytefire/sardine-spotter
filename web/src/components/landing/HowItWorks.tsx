"use client";

import { motion } from "framer-motion";
import { UserPlus, MapPin, Camera, Bell } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Sign Up",
    description:
      "Create your account in seconds. No credit card, no catch. Just an email and you're in.",
  },
  {
    icon: MapPin,
    number: "02",
    title: "Enable Location",
    description:
      "Allow the app to know where you are so we can show you sightings nearby. We never track you.",
  },
  {
    icon: Camera,
    number: "03",
    title: "Spot & Report",
    description:
      "See sardines? Open the app, snap a photo, and report the sighting. Your GPS coordinates are captured automatically.",
  },
  {
    icon: Bell,
    number: "04",
    title: "Get Alerted",
    description:
      "Receive instant notifications when someone spots sardines along the KZN coast. Never miss the action.",
  },
];

export default function HowItWorks() {
  return (
    <section
      className="py-24 bg-deep-50/50 dark:bg-deep-950/50"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-ocean-500 font-semibold tracking-wide uppercase text-sm"
          >
            Simple as 1-2-3-4
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-4xl sm:text-5xl font-display font-bold text-deep-950 dark:text-white tracking-tight"
          >
            How it <span className="gradient-text">works</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
          {/* Connecting line — horizontal on desktop */}
          <div className="hidden lg:block absolute top-14 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-ocean-300/0 via-ocean-400/50 to-ocean-300/0 dark:from-ocean-600/0 dark:via-ocean-500/40 dark:to-ocean-600/0" />

          {/* Connecting line — vertical on mobile */}
          <div className="block lg:hidden absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-ocean-300/0 via-ocean-400/30 to-ocean-300/0 dark:from-ocean-600/0 dark:via-ocean-500/30 dark:to-ocean-600/0" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="relative text-center"
            >
              {/* Number badge */}
              <div className="relative inline-flex flex-col items-center">
                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 text-white text-xs font-bold flex items-center justify-center z-20 shadow-lg shadow-ocean-500/30">
                  {step.number}
                </span>
                <div className="card-elevated w-20 h-20 rounded-2xl bg-white dark:bg-white/5 border border-ocean-100/50 dark:border-white/10 flex items-center justify-center relative z-10 shadow-xl shadow-ocean-100/30 dark:shadow-ocean-950/50">
                  <step.icon className="w-8 h-8 text-ocean-600 dark:text-ocean-400" />
                </div>
              </div>

              <h3 className="mt-6 text-xl font-display font-bold text-deep-950 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-deep-950/60 dark:text-ocean-200/60 leading-relaxed text-sm">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
