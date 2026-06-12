"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fish, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/app");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient-animated flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[8%] w-[500px] h-[500px] bg-ocean-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] right-[8%] w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[100px]" />
        <motion.div
          className="absolute top-[20%] right-[15%] w-2 h-2 rounded-full bg-ocean-400/30"
          animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[30%] left-[20%] w-1.5 h-1.5 rounded-full bg-teal-400/25"
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ocean-500 to-teal-500 flex items-center justify-center shadow-lg shadow-ocean-500/30 group-hover:shadow-ocean-500/50 transition-shadow">
              <Fish className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">
              Sardine Spotter
            </span>
          </Link>
        </div>

        <div className="bg-white dark:bg-deep-850 rounded-3xl shadow-2xl shadow-black/25 p-8 sm:p-10 border border-white/10 dark:border-deep-700">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-deep-900 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-deep-500 dark:text-deep-400">
              Log in to check the latest sardine sightings
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-deep-700 dark:text-deep-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-ocean-600 dark:text-ocean-400 hover:text-ocean-700 dark:hover:text-ocean-300 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-deep-200 dark:border-deep-700 bg-surface-50 dark:bg-deep-800 text-deep-900 dark:text-white placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-deep-400 hover:text-deep-600 dark:hover:text-deep-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
                  Log In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-deep-500 dark:text-deep-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-ocean-600 dark:text-ocean-400 hover:text-ocean-700 dark:hover:text-ocean-300 font-semibold"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
