import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { CookieNotice } from "@/components/pwa/CookieNotice";
import { IOSInstallPrompt } from "@/components/pwa/IOSInstallPrompt";
import { BadgeClearer } from "@/components/pwa/BadgeClearer";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Brand colour used as the theme-color across the manifest, the viewport
 * meta, and iOS' status bar. Keep this single constant in sync with anywhere
 * else we hand the OS a colour to use as our chrome background — mismatch
 * causes a visible flash between the splash screen and first paint on
 * Android, and a wrong-coloured status bar on iOS.
 */
const BRAND_THEME_COLOR = "#0e4271";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "SardineWatch — Track the KZN Sardine Run Live",
    template: "%s | SardineWatch",
  },
  description:
    "Free community app for tracking South Africa's KwaZulu-Natal sardine run. Report sightings, view the live map, and get instant alerts when sardines are spotted near you.",
  keywords: [
    "sardine run",
    "sardinewatch",
    "sardine run tracker",
    "KwaZulu-Natal",
    "KZN sardine run",
    "South Africa",
    "sardine sighting",
    "sardine migration",
    "KZN coast",
    "sardine tracking",
    "community alerts",
    "sardine run app",
    "sardine run 2026",
  ],
  authors: [{ name: "SardineWatch" }],
  creator: "SardineWatch",
  metadataBase: new URL("https://sardinewatch.co.za"),
  alternates: {
    canonical: "https://sardinewatch.co.za",
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: "https://sardinewatch.co.za",
    siteName: "SardineWatch",
    title: "SardineWatch — Track the KZN Sardine Run Live",
    description:
      "Free community app for tracking South Africa's annual sardine run. Real-time sightings, GPS reports, and instant push alerts.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SardineWatch — Track the KZN Sardine Run Live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SardineWatch — Track the KZN Sardine Run Live",
    description:
      "Free community app for real-time sardine run tracking along South Africa's east coast.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  /**
   * iOS PWA hints — these only take effect when the user has "Add to Home
   * Screen" installed the page. Without them, iOS opens the app as a regular
   * Safari tab instead of a full-screen standalone window.
   */
  appleWebApp: {
    capable: true,
    title: "SardineWatch",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // edge-to-edge on notched devices when installed as PWA
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Microsoft Tile colour for pinned-to-Start sites on Windows */}
        <meta name="msapplication-TileColor" content={BRAND_THEME_COLOR} />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        {/* JSON-LD structured data — helps Google understand the app */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "SardineWatch",
              url: "https://sardinewatch.co.za",
              description:
                "Free community app for tracking South Africa's KwaZulu-Natal sardine run. Report sightings, view the live map, and get push alerts.",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web, Android, iOS",
              offers: { "@type": "Offer", price: "0", priceCurrency: "ZAR" },
              author: {
                "@type": "Person",
                name: "William Addison",
              },
              inLanguage: "en-ZA",
              keywords:
                "sardine run, KwaZulu-Natal, sardine sighting, KZN coast, sardine migration",
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            {children}
            <CookieNotice />
            <IOSInstallPrompt />
          </AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
        <BadgeClearer />
        <Analytics />
      </body>
    </html>
  );
}
