"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient-animated flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[8%] w-[500px] h-[500px] bg-ocean-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] right-[8%] w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Logo size="lg" className="group-hover:shadow-ocean-500/50 transition-shadow" />
            <span className="text-2xl font-display font-bold text-white tracking-tight">
              SardineWatch
            </span>
          </Link>
        </div>

        <div className="bg-white dark:bg-deep-850 rounded-3xl shadow-2xl shadow-black/25 p-8 sm:p-10 border border-white/10 dark:border-deep-700">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-sea-green-100 dark:bg-sea-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-sea-green-500" />
              </div>
              <h1 className="text-2xl font-display font-bold text-deep-900 dark:text-white mb-2">
                Check your email
              </h1>
              <p className="text-deep-500 dark:text-deep-400 mb-6">
                If <span className="font-semibold text-deep-700 dark:text-deep-200">{email}</span> is registered, you&apos;ll receive a reset link shortly. Check your spam folder if it doesn&apos;t arrive.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-deep-900 dark:text-white">
                  Forgot your password?
                </h1>
                <p className="mt-2 text-deep-500 dark:text-deep-400">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-center gap-2 p-3.5 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-600 dark:text-coral-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
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

                <Button type="submit" size="lg" className="w-full rounded-xl text-base" disabled={loading}>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-deep-500 dark:text-deep-400">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-ocean-600 dark:text-ocean-400 hover:text-ocean-700 font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
