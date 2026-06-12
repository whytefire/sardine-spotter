"use client";

import { motion } from "framer-motion";
import { Fish, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 bg-white dark:bg-deep-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl hero-gradient-animated p-12 sm:p-16 text-center"
        >
          {/* Floating animated elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-xl" />
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white/5 rounded-full blur-xl" />
            <motion.div
              animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-20 text-white/10"
            >
              <Fish className="w-16 h-16" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-10 left-16 text-white/10"
            >
              <Fish className="w-12 h-12 rotate-12" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute top-1/2 left-[10%]"
            >
              <div className="w-3 h-3 rounded-full bg-ocean-300/20" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute top-[30%] right-[15%]"
            >
              <div className="w-4 h-4 rounded-full bg-ocean-300/15" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -12, 0], x: [0, 5, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
              className="absolute bottom-[25%] right-[30%]"
            >
              <div className="w-2 h-2 rounded-full bg-white/20" />
            </motion.div>
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
              Ready to spot{" "}
              <span className="gradient-text">sardines</span>?
            </h2>
            <p className="mt-5 text-lg text-ocean-200/80 max-w-xl mx-auto">
              Join the Sardine Spotter community today. It&apos;s completely free
              and always will be. No upgrades, no catches.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="text-lg rounded-2xl px-8 bg-gradient-to-r from-coral-500 to-sunset-500 hover:from-coral-400 hover:to-sunset-400 text-white shadow-xl shadow-coral-500/25 btn-glow"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg rounded-2xl px-8 border-white/30 text-white hover:bg-white/10 hover:border-white/50"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
