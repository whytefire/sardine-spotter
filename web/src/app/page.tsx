import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";

export const metadata: Metadata = {
  title: "SardineWatch — Track the KZN Sardine Run Live",
  description:
    "SardineWatch is a free community app for South Africa's KwaZulu-Natal sardine run. Report sightings with GPS, see the live map, and get instant push alerts when sardines are spotted near you.",
  alternates: { canonical: "https://sardinewatch.co.za" },
  openGraph: {
    title: "SardineWatch — Track the KZN Sardine Run Live",
    description:
      "Free community app for real-time sardine run tracking on the KZN coast. GPS sightings, live map & push alerts.",
    url: "https://sardinewatch.co.za",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
};
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Download from "@/components/landing/Download";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Download />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
