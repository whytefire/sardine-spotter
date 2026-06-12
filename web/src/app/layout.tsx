import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

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
    default: "Sardine Spotter — Track the KZN Sardine Run Live",
    template: "%s | Sardine Spotter",
  },
  description:
    "Free community app for tracking South Africa's KwaZulu-Natal sardine run. Report sightings, view the live map, and get instant alerts when sardines are spotted near you.",
  keywords: [
    "sardine run",
    "sardine spotter",
    "KwaZulu-Natal",
    "South Africa",
    "sardine sighting",
    "sardine migration",
    "KZN coast",
    "sardine tracking",
    "community alerts",
  ],
  authors: [{ name: "Sardine Spotter" }],
  creator: "Sardine Spotter",
  metadataBase: new URL("https://sardinespotter.com"),
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: "https://sardinespotter.com",
    siteName: "Sardine Spotter",
    title: "Sardine Spotter — Track the KZN Sardine Run Live",
    description:
      "Free community app for tracking South Africa's annual sardine run. Real-time sightings, GPS reports, and instant alerts.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sardine Spotter - Track the sardine run",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sardine Spotter — Track the KZN Sardine Run Live",
    description:
      "Free community app for real-time sardine run tracking along South Africa's east coast.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0891b2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
