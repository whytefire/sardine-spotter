"use client";

import { useState, useRef } from "react";
import {
  Camera,
  MapPin,
  Send,
  X,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type LocationStatus = "idle" | "requesting" | "ready" | "denied" | "error";

export default function ReportPage() {
  const { token } = useAuth();
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setError("Geolocation is not supported in this browser");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
        setError("");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("denied");
          setError(
            "Location permission was denied. Please enable it in your browser settings."
          );
        } else {
          setLocationStatus("error");
          setError("Could not determine your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be smaller than 5MB");
      return;
    }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setError("Photo must be a JPEG, PNG, or WebP image");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError("");
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("You must be logged in to report a sighting");
      return;
    }
    if (!coords) {
      setError("We need your location to post a sighting");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const uploadRes = await api.uploadPhoto(token, photoFile);
        photoUrl = uploadRes.data.photoUrl;
      }

      await api.createSighting(token, {
        description: description.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        category: "sardine_sighting",
        photoUrl,
      });

      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit sighting";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setDescription("");
    clearPhoto();
    setError("");
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 12 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-sea-green-500 to-ocean-500 mx-auto flex items-center justify-center mb-6 shadow-lg shadow-sea-green-500/30"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-display font-bold text-deep-950 dark:text-white">
            Sighting Reported!
          </h1>
          <p className="mt-3 text-deep-600 dark:text-deep-300">
            Thank you for helping the community. Your sighting is now live and
            other users in the area will be notified.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={resetForm}
              className="btn-glow w-full py-3 px-6 rounded-xl bg-gradient-to-r from-ocean-600 to-ocean-500 text-white font-semibold shadow-lg shadow-ocean-600/20 hover:shadow-ocean-600/40 transition-all"
            >
              Report Another Sighting
            </button>
            <Link
              href="/app"
              className="w-full py-3 px-6 rounded-xl bg-deep-100 dark:bg-deep-800 text-deep-700 dark:text-white font-semibold hover:bg-deep-200 dark:hover:bg-deep-700 transition-all text-center"
            >
              Back to Feed
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
          Report a Sighting
        </h1>
        <p className="text-deep-500 dark:text-deep-400 text-sm mt-1.5">
          Help the community by reporting what you see
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mb-5 flex items-center gap-2 p-3.5 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-700 dark:text-coral-300 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-deep-700 dark:text-deep-200 mb-1.5"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 text-deep-950 dark:text-white placeholder:text-deep-400 dark:placeholder:text-deep-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500 transition-all resize-none"
            placeholder="Describe what you see... Where exactly? How many? What else is happening?"
            required
            minLength={10}
          />
          <p
            className={cn(
              "mt-1.5 text-xs",
              description.length < 10
                ? "text-deep-500 dark:text-deep-400"
                : "text-sea-green-600 dark:text-sea-green-400"
            )}
          >
            {description.length}/10 characters minimum
          </p>
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-semibold text-deep-700 dark:text-deep-200 mb-1.5">
            Photo (optional)
          </label>
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-deep-200 dark:border-deep-700">
              <img
                src={photoPreview}
                alt="Upload preview"
                className="w-full h-56 object-cover"
              />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Remove photo"
                className="absolute top-2 right-2 w-8 h-8 bg-deep-950/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-deep-950/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-800/50 hover:bg-deep-100 dark:hover:bg-deep-800 cursor-pointer transition-colors group">
              <div className="w-12 h-12 rounded-full bg-ocean-100 dark:bg-ocean-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-ocean-500" />
              </div>
              <p className="text-sm font-semibold text-deep-700 dark:text-deep-100">
                Tap to upload or drag and drop
              </p>
              <p className="text-xs text-deep-500 dark:text-deep-400 mt-1">
                JPG, PNG, WebP up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-deep-700 dark:text-deep-200 mb-3">
            Location
          </label>
          <button
            type="button"
            onClick={requestLocation}
            disabled={locationStatus === "requesting"}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
              coords
                ? "border-ocean-500 bg-ocean-50 dark:bg-ocean-900/20"
                : "border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 hover:border-ocean-300 dark:hover:border-ocean-600"
            )}
          >
            {locationStatus === "requesting" ? (
              <Loader2 className="w-5 h-5 text-ocean-500 animate-spin shrink-0" />
            ) : coords ? (
              <CheckCircle2 className="w-5 h-5 text-sea-green-500 shrink-0" />
            ) : (
              <Navigation className="w-5 h-5 text-deep-500 dark:text-deep-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-semibold text-sm",
                  coords
                    ? "text-deep-950 dark:text-white"
                    : "text-deep-700 dark:text-deep-200"
                )}
              >
                {locationStatus === "requesting"
                  ? "Getting your location…"
                  : coords
                    ? "Location captured"
                    : "Use my current location"}
              </p>
              <p className="text-xs text-deep-500 dark:text-deep-400 mt-0.5 truncate">
                {coords
                  ? `${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`
                  : "Tap to share your GPS coordinates"}
              </p>
            </div>
            {coords && (
              <MapPin className="w-4 h-4 text-ocean-500 shrink-0" aria-hidden="true" />
            )}
          </button>
          {locationStatus === "denied" && (
            <p className="mt-2 text-xs text-coral-600 dark:text-coral-400">
              Please enable location access in your browser settings and try again.
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || description.length < 10 || !coords}
          className={cn(
            "btn-glow w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-coral-500 to-sunset-500 text-white font-semibold text-base shadow-lg shadow-coral-500/20 hover:shadow-coral-500/40 transition-all flex items-center justify-center gap-2",
            (submitting || description.length < 10 || !coords) &&
              "opacity-50 cursor-not-allowed shadow-none"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Report
            </>
          )}
        </button>
      </form>
    </div>
  );
}
