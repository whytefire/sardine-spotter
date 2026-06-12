"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Fish, Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="backdrop-blur-xl bg-white/70 dark:bg-deep-950/70 border-b border-ocean-100/20 dark:border-white/10 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center group-hover:from-ocean-400 group-hover:to-ocean-600 transition-all shadow-lg shadow-ocean-500/25">
                <Fish className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-display font-bold text-deep-950 dark:text-white tracking-tight">
                Sardine Spotter
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium text-deep-950/70 dark:text-white/70 hover:text-ocean-600 dark:hover:text-white rounded-lg transition-colors group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-ocean-500 rounded-full transition-all duration-300 group-hover:w-2/3" />
                </Link>
              ))}
            </div>

            {/* Desktop auth + theme toggle */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 rounded-lg text-deep-950/60 dark:text-white/60 hover:text-ocean-600 dark:hover:text-white hover:bg-ocean-50 dark:hover:bg-white/10 transition-all"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-deep-950/80 dark:text-white/80 hover:text-ocean-600 dark:hover:text-white hover:bg-ocean-50 dark:hover:bg-white/10"
                >
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-ocean-500 to-ocean-600 hover:from-ocean-400 hover:to-ocean-500 text-white btn-glow shadow-lg shadow-ocean-500/25"
                >
                  Sign Up Free
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 rounded-lg text-deep-950/60 dark:text-white/60 hover:text-ocean-600 dark:hover:text-white transition-all"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 text-deep-950/70 dark:text-white/70 hover:text-ocean-600 dark:hover:text-white rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden backdrop-blur-xl bg-white/90 dark:bg-deep-950/90 border-b border-ocean-100/20 dark:border-white/10"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-deep-950/80 dark:text-white/80 hover:text-ocean-600 dark:hover:text-white rounded-lg hover:bg-ocean-50 dark:hover:bg-white/10 transition-all font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-ocean-100/20 dark:border-white/10 space-y-2">
                <Link href="/login" className="block">
                  <Button
                    variant="ghost"
                    className="w-full text-deep-950/80 dark:text-white/80 hover:text-ocean-600 dark:hover:text-white"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/register" className="block">
                  <Button className="w-full rounded-xl bg-gradient-to-r from-ocean-500 to-ocean-600 text-white btn-glow">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
