"use client";

import { useState, useEffect, useCallback } from "react";
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from "@vis.gl/react-google-maps";
import { Fish, MapPin, Layers, Navigation, Clock, Loader2, AlertTriangle, X } from "lucide-react";
import { cn, timeAgo, formatDistance } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SightingDetailModal } from "@/components/app/SightingDetailModal";
import { Avatar } from "@/components/ui/avatar";
import type { Sighting } from "@/lib/types";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

const DEFAULT_CENTER = { lat: -30.15, lng: 30.82 };
const DEFAULT_ZOOM = 11;

/**
 * Returns a data-URL SVG of a stylised sardine — body, tail, dorsal + pectoral
 * fins, and a friendly eye. Encoded as `data:image/svg+xml;utf8,` so the
 * browser doesn't need an extra HTTP roundtrip.
 *
 * `selected = true` swaps to a brighter coral palette + scales 30% larger so
 * the active marker pops out of the cluster.
 */
function fishIconUrl(selected: boolean): string {
  const scale = selected ? 1.3 : 1;
  const w = Math.round(40 * scale);
  const h = Math.round(28 * scale);

  // Ocean blue palette (default) vs sunset/coral palette (selected)
  const body = selected ? "#fb7185" : "#2287d6"; // coral-400 / ocean-500
  const accent = selected ? "#e11d48" : "#1c64bf"; // coral-600 / ocean-700
  const dark = selected ? "#7f1d1d" : "#0c3a6e";

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 28' width='${w}' height='${h}'>
    <!-- soft drop shadow so it pops off the map tiles -->
    <ellipse cx='18' cy='25' rx='13' ry='2' fill='black' opacity='0.25'/>
    <!-- tail fin -->
    <path d='M 26 14 L 38 4 L 36 14 L 38 24 Z' fill='${accent}' stroke='white' stroke-width='1.5' stroke-linejoin='round'/>
    <!-- main body -->
    <ellipse cx='15' cy='14' rx='14' ry='9' fill='${body}' stroke='white' stroke-width='1.5'/>
    <!-- dorsal fin (top) -->
    <path d='M 12 6 L 17 1 L 22 6 Z' fill='${accent}' stroke='white' stroke-width='1.5' stroke-linejoin='round'/>
    <!-- pectoral fin (side) -->
    <path d='M 10 17 L 18 19 L 13 24 Z' fill='${accent}' stroke='white' stroke-width='1.2' stroke-linejoin='round'/>
    <!-- gill stripe -->
    <path d='M 9 9 Q 7 14 9 19' fill='none' stroke='${dark}' stroke-width='1' opacity='0.5'/>
    <!-- eye -->
    <circle cx='5' cy='12' r='2.2' fill='white'/>
    <circle cx='5' cy='12' r='1.1' fill='${dark}'/>
  </svg>`.replace(/\s+/g, " ");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function SightingMarker({
  sighting,
  isSelected,
  onClick,
}: {
  sighting: Sighting;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Marker
      position={{ lat: sighting.latitude, lng: sighting.longitude }}
      onClick={onClick}
      zIndex={isSelected ? 100 : 1}
      icon={fishIconUrl(isSelected)}
      title={`Sighting by ${sighting.nickname}`}
    />
  );
}

function UserLocationMarker({
  position,
}: {
  position: { lat: number; lng: number };
}) {
  return (
    <Marker
      position={position}
      zIndex={50}
      icon={{
        path: 0, // google.maps.SymbolPath.CIRCLE — using literal 0 so we don't have to wait for the API to load
        scale: 8,
        fillColor: "#0ea5e9", // ocean-500
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      }}
    />
  );
}

function MapControls({ onLocateMe }: { onLocateMe: () => void }) {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <button
        onClick={() => map?.setZoom((map.getZoom() || DEFAULT_ZOOM) + 1)}
        aria-label="Zoom in"
        className="w-10 h-10 glass-light rounded-xl shadow-lg flex items-center justify-center text-deep-600 dark:text-deep-200 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors text-xl font-bold"
      >
        +
      </button>
      <button
        onClick={() => map?.setZoom((map.getZoom() || DEFAULT_ZOOM) - 1)}
        aria-label="Zoom out"
        className="w-10 h-10 glass-light rounded-xl shadow-lg flex items-center justify-center text-deep-600 dark:text-deep-200 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors text-xl font-bold"
      >
        -
      </button>
      <button
        onClick={onLocateMe}
        aria-label="Centre on my location"
        title="Centre on my location"
        className="w-10 h-10 glass-light rounded-xl shadow-lg flex items-center justify-center text-deep-600 dark:text-deep-200 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors"
      >
        <Navigation className="w-5 h-5" />
      </button>
      <button
        onClick={() =>
          map?.setMapTypeId(
            map.getMapTypeId() === "roadmap" ? "satellite" : "roadmap",
          )
        }
        aria-label="Toggle satellite view"
        title="Toggle satellite view"
        className="w-10 h-10 glass-light rounded-xl shadow-lg flex items-center justify-center text-deep-600 dark:text-deep-200 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors"
      >
        <Layers className="w-5 h-5" />
      </button>
    </div>
  );
}

function MapContent({
  sightings,
  loading,
  onOpenDetail,
}: {
  sightings: Sighting[];
  loading: boolean;
  onOpenDetail: (s: Sighting) => void;
}) {
  const map = useMap();
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        map?.panTo(loc);
        map?.setZoom(13);
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [map]);

  useEffect(() => {
    locateMe();
  }, [locateMe]);

  return (
    <>
      {sightings.map((s) => (
        <SightingMarker
          key={s.id}
          sighting={s}
          isSelected={selectedSighting?.id === s.id}
          onClick={() => setSelectedSighting(s)}
        />
      ))}

      {userLocation && <UserLocationMarker position={userLocation} />}

      <MapControls onLocateMe={locateMe} />

      {/* Sighting count badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="glass-light rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Fish className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-deep-950 dark:text-white">
              {loading
                ? "Loading…"
                : `${sightings.length} Active Sighting${sightings.length === 1 ? "" : "s"}`}
            </p>
            <p className="text-xs text-deep-500 dark:text-deep-400">
              {locationLoading
                ? "Getting your location…"
                : "Within 50km radius"}
            </p>
          </div>
        </div>
      </div>

      {selectedSighting && (
        <InfoWindow
          position={{
            lat: selectedSighting.latitude,
            lng: selectedSighting.longitude,
          }}
          onCloseClick={() => setSelectedSighting(null)}
          pixelOffset={[0, -45]}
          headerDisabled
        >
          <div className="relative p-1 pr-6 min-w-[240px] max-w-[300px]">
            <button
              onClick={() => setSelectedSighting(null)}
              aria-label="Close"
              className="absolute top-0 right-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar
                nickname={selectedSighting.nickname}
                avatarUrl={selectedSighting.avatarUrl}
                size="sm"
                ring
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">
                  {selectedSighting.nickname}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600 font-medium">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(selectedSighting.createdAt)}
                  </span>
                  {selectedSighting.distanceKm != null && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600 font-medium">
                      <MapPin className="w-2.5 h-2.5" />
                      {formatDistance(selectedSighting.distanceKm)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-2 line-clamp-3">
              {selectedSighting.description}
            </p>
            <div className="flex items-center justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  onOpenDetail(selectedSighting);
                  setSelectedSighting(null);
                }}
                className="text-xs font-semibold text-ocean-600 hover:text-ocean-700"
              >
                View Details
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [detailSighting, setDetailSighting] = useState<Sighting | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Ignore — map still works without GPS
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    );
  }, []);

  const loadSightings = useCallback(async () => {
    setLoading(true);
    try {
      const params: { lat?: number; lng?: number; radius?: number } = {};
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = user?.radius ?? 50;
      }
      const res = await api.getSightings(params);
      setSightings(res.data || []);
    } catch (err) {
      console.error("Failed to load sightings:", err);
    } finally {
      setLoading(false);
    }
  }, [coords, user?.radius]);

  useEffect(() => {
    loadSightings();
  }, [loadSightings]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex items-center justify-center bg-deep-100 dark:bg-deep-950">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-deep-200 dark:bg-deep-800 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-deep-500 dark:text-deep-400" />
          </div>
          <h2 className="text-lg font-semibold text-deep-700 dark:text-white">
            Google Maps API key not configured
          </h2>
          <p className="text-sm text-deep-500 dark:text-deep-400 mt-2">
            Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] lg:h-screen">
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <MapLoadingGate>
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI={true}
            clickableIcons={false}
            className="w-full h-full"
          >
            <MapContent
              sightings={sightings}
              loading={loading}
              onOpenDetail={(s) => {
                setDetailSighting(s);
                setModalOpen(true);
              }}
            />
          </Map>
        </MapLoadingGate>
      </APIProvider>

      <SightingDetailModal
        sighting={detailSighting}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDelete={(id) =>
          setSightings((prev) => prev.filter((s) => s.id !== id))
        }
      />
    </div>
  );
}

/**
 * Renders a meaningful loading screen and an actionable error screen instead
 * of letting the map silently spin forever when the Google Maps API fails to
 * authenticate (e.g. invalid key, referrer restriction, billing disabled).
 */
function MapLoadingGate({ children }: { children: React.ReactNode }) {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-deep-100 dark:bg-deep-950 z-10">
        <div className="max-w-md text-center p-8">
          <div className="w-16 h-16 rounded-full bg-coral-100 dark:bg-coral-900/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-coral-500 dark:text-coral-400" />
          </div>
          <h2 className="text-lg font-bold text-deep-900 dark:text-white">
            Google Maps failed to load
          </h2>
          <p className="text-sm text-deep-600 dark:text-deep-300 mt-2">
            Your API key was rejected by Google. Common causes:
          </p>
          <ul className="text-sm text-deep-600 dark:text-deep-300 mt-2 space-y-1 text-left list-disc list-inside">
            <li>HTTP referrer restrictions in GCP don&apos;t include <code className="text-xs bg-deep-200 dark:bg-deep-800 px-1 rounded">localhost:3000</code></li>
            <li>Maps JavaScript API isn&apos;t enabled for the project</li>
            <li>Billing isn&apos;t enabled on the project</li>
            <li>The key has been rotated or restricted</li>
          </ul>
          <p className="text-xs text-deep-500 dark:text-deep-400 mt-3">
            Open the browser console for the exact error from Google.
          </p>
        </div>
      </div>
    );
  }

  if (status === APILoadingStatus.LOADED) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-deep-100/80 dark:bg-deep-950/80 z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-2 text-deep-600 dark:text-deep-300">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    </>
  );
}
