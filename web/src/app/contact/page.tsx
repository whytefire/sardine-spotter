"use client";

import { useState } from "react";
import { Mail, User, MessageSquare, CheckCircle, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { api } from "@/lib/api";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.sendContactMessage(name, email, message);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-deep-950 flex flex-col">
      <Navbar />

      <main className="flex-1 py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-12">
              <Link href="/" className="inline-flex items-center gap-3 mb-6">
                <Logo size="lg" />
              </Link>
              <h1 className="text-4xl font-display font-bold text-deep-900 dark:text-white">
                Contact Us
              </h1>
              <p className="mt-3 text-lg text-deep-500 dark:text-deep-400">
                Got a question, found a bug, or want to get in touch? We&apos;d love to hear from you.
              </p>
              <a
                href="mailto:support@sardinewatch.co.za"
                className="inline-flex items-center gap-2 mt-3 text-ocean-600 dark:text-ocean-400 hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                support@sardinewatch.co.za
              </a>
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-deep-850 rounded-3xl shadow-xl border border-deep-200/60 dark:border-deep-700 p-8 sm:p-10">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-sea-green-100 dark:bg-sea-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-sea-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-deep-900 dark:text-white mb-2">
                    Message sent!
                  </h2>
                  <p className="text-deep-500 dark:text-deep-400 mb-6">
                    Thanks for reaching out. We&apos;ll get back to you at <span className="font-semibold text-deep-700 dark:text-deep-200">{email}</span> as soon as possible.
                  </p>
                  <Link href="/">
                    <Button variant="outline" className="rounded-xl">
                      Back to Home
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 flex items-center gap-2 p-3.5 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600 dark:text-coral-400 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-deep-700 dark:text-deep-300 mb-1.5">
                        Your name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-400" />
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-deep-200 dark:border-deep-700 bg-surface-50 dark:bg-deep-800 text-deep-900 dark:text-white placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent transition-all"
                          placeholder="John Smith"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-deep-700 dark:text-deep-300 mb-1.5">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-400" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-deep-200 dark:border-deep-700 bg-surface-50 dark:bg-deep-800 text-deep-900 dark:text-white placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent transition-all"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-deep-700 dark:text-deep-300 mb-1.5">
                        Message
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3.5 top-3.5 w-5 h-5 text-deep-400" />
                        <textarea
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={5}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-deep-200 dark:border-deep-700 bg-surface-50 dark:bg-deep-800 text-deep-900 dark:text-white placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent transition-all resize-none"
                          placeholder="How can we help you?"
                          required
                          minLength={10}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-xl text-base"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
