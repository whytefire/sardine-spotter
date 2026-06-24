import { Heart } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function Footer() {
  return (
    <footer className="bg-deep-950 dark:bg-deep-950/95 text-white relative">
      {/* Subtle top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ocean-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Logo size="lg" className="w-10 h-10" />
              <span className="text-xl font-display font-bold">
                SardineWatch
              </span>
            </div>
            <p className="mt-4 text-ocean-200/50 max-w-md leading-relaxed">
              A free community app helping South Africa&apos;s KwaZulu-Natal coast
              track the annual sardine run migration. Built by sardine enthusiasts,
              for sardine enthusiasts.
            </p>
          </div>

          {/* App links */}
          <div>
            <h3 className="font-display font-semibold text-ocean-100 mb-4">
              App
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Live Map", href: "/app/map" },
                { label: "Sign Up", href: "/register" },
                { label: "Log In", href: "/login" },
                { label: "How It Works", href: "/#how-it-works" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ocean-200/50 hover:text-ocean-300 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <a
                href="https://play.google.com/store/apps/details?id=za.co.sardinewatch.twa"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
              >
                <img
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                  alt="Get it on Google Play"
                  className="h-10 w-auto opacity-80 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          </div>

          {/* Info links */}
          <div>
            <h3 className="font-display font-semibold text-ocean-100 mb-4">
              Info
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Use", href: "/terms" },
                { label: "Cookie Policy", href: "/cookies" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ocean-200/50 hover:text-ocean-300 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-ocean-200/40 text-sm">
            &copy; {new Date().getFullYear()} SardineWatch. All rights reserved.
          </p>
          <p className="text-ocean-200/40 text-sm flex items-center gap-1.5">
            Made with{" "}
            <Heart className="w-3.5 h-3.5 text-coral-500 fill-coral-500" />{" "}
            on the KZN Coast
          </p>
        </div>
      </div>
    </footer>
  );
}
