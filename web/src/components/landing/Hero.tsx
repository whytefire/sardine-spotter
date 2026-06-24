"use client";

import { motion } from "framer-motion";
import { MapPin, Bell, Camera, Fish, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function FloatingDot({
  delay,
  x,
  y,
  size,
}: {
  delay: number;
  x: string;
  y: string;
  size: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full bg-ocean-300/30"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        x: [0, Math.random() * 40 - 20, Math.random() * -30 + 15, 0],
        y: [0, Math.random() * -30 + 15, Math.random() * 40 - 20, 0],
        opacity: [0.3, 0.6, 0.4, 0.3],
      }}
      transition={{
        duration: 6 + Math.random() * 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

const fishDots = [
  { delay: 0, x: "15%", y: "20%", size: 6 },
  { delay: 0.5, x: "75%", y: "30%", size: 8 },
  { delay: 1, x: "25%", y: "60%", size: 5 },
  { delay: 1.5, x: "80%", y: "55%", size: 7 },
  { delay: 2, x: "45%", y: "25%", size: 6 },
  { delay: 2.5, x: "60%", y: "70%", size: 5 },
  { delay: 3, x: "35%", y: "45%", size: 8 },
  { delay: 3.5, x: "90%", y: "40%", size: 6 },
  { delay: 4, x: "10%", y: "75%", size: 7 },
  { delay: 4.5, x: "55%", y: "15%", size: 5 },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden hero-gradient-animated">
      {/* Animated fish dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {fishDots.map((dot, i) => (
          <FloatingDot key={i} {...dot} />
        ))}
      </div>

      {/* Layered wave shapes at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg
          viewBox="0 0 1440 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full translate-y-1"
          preserveAspectRatio="none"
        >
          <path
            d="M0 100C200 140 400 60 600 100C800 140 1000 60 1200 100C1300 120 1380 110 1440 100V180H0V100Z"
            fill="white"
            fillOpacity="0.05"
          />
        </svg>
        <svg
          viewBox="0 0 1440 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full absolute bottom-0 translate-y-1"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80C240 120 480 40 720 80C960 120 1200 40 1440 80V140H0V80Z"
            fill="white"
            fillOpacity="0.08"
          />
        </svg>
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full absolute bottom-0 translate-y-1"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60C240 120 480 0 720 60C960 120 1200 0 1440 60V120H0V60Z"
            className="fill-white dark:fill-deep-950"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-48">
        <div className="text-center">
          {/* Season status badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sea-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sea-green-400" />
            </span>
            <span className="text-white/90 text-sm font-medium">
              Sardine season is active — May to July
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-display font-bold text-white tracking-tight leading-[1.05]"
          >
            Spot the{" "}
            <span className="gradient-text">Sardine Run</span>
            <br />
            <span className="text-ocean-200">Before it Passes You By</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 text-lg sm:text-xl lg:text-2xl text-ocean-200 max-w-3xl mx-auto leading-relaxed tracking-wide"
          >
            The free community app for KwaZulu-Natal&apos;s sardine run. See real-time
            sightings, report what you spot, and never miss the action again.
          </motion.p>

          {/* Social proof */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-4 text-sm text-ocean-300/70 font-medium"
          >
            Join sardine spotters along the KZN coast
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="text-lg rounded-2xl px-8 bg-gradient-to-r from-coral-500 to-sunset-500 hover:from-coral-400 hover:to-sunset-400 text-white shadow-xl shadow-coral-500/25 btn-glow"
              >
                <Fish className="w-5 h-5" />
                Get Started — It&apos;s Free
              </Button>
            </Link>
            <Link href="/app/map">
              <Button
                size="lg"
                variant="outline"
                className="text-lg rounded-2xl px-8 border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              >
                <MapPin className="w-5 h-5" />
                View Live Map
              </Button>
            </Link>
          </motion.div>

          {/* Store badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex items-center justify-center gap-3 flex-wrap"
          >
            <a
              href="https://play.google.com/store/apps/details?id=za.co.sardinewatch.twa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get it on Google Play"
            >
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                className="h-14 w-auto hover:opacity-90 transition-opacity drop-shadow-lg"
              />
            </a>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 inline-flex items-center gap-4 sm:gap-6 glass rounded-full px-6 sm:px-8 py-3.5"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-ocean-300" />
              <span className="text-sm font-semibold text-white">2,400+</span>
              <span className="text-sm text-white/60">Sightings</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ocean-300" />
              <span className="text-sm font-semibold text-white">850+</span>
              <span className="text-sm text-white/60">Spotters</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sea-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sea-green-400" />
              </span>
              <span className="text-sm font-semibold text-white">Season:</span>
              <span className="text-sm text-sea-green-400">Active</span>
            </div>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { icon: MapPin, label: "GPS Sightings" },
              { icon: Bell, label: "Instant Alerts" },
              { icon: Camera, label: "Photo Reports" },
              { icon: Fish, label: "100% Free" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 glass rounded-full px-4 py-2.5"
              >
                <item.icon className="w-4 h-4 text-ocean-300" />
                <span className="text-sm text-white/80 font-medium">
                  {item.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
