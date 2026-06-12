"use client";

import { useState, useEffect, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Fish, MapPin, Layers, Navigation, Clock, Loader2 } from "lucide-react";
import { cn, timeAgo, formatDistance } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SightingDetailModal } from "@/components/app/SightingDetailModal";
import type { Sighting } from "@/lib/types";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

const DEFAULT_CENTER = { lat: -30.15, lng: 30.82 };
const DEFAULT_ZOOM = 11;

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
    <AdvancedMarker
      position={{ lat: sighting.latitude, lng: sighting.longitude }}
      onClick={onClick}
      zIndex={isSelected ? 100 : 1}
    >
      <div className="relative cursor-pointer group">
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30 bg-ocean-400"
          style={{ animationDuration: "2s" }}
        />
        <div
          className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 bg-ocean-600",
            isSelected && "scale-110 ring-3 ring-white",
          )}
        >
          <Fish className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-ocean-600" />
      </div>
    </AdvancedMarker>
  );
}

function UserLocationMarker({
  position,
}: {
  position: { lat: number; lng: number };
}) {
  return (
    <AdvancedMarker position={position} zIndex={50}>
      <div className="relative">
        <div
          className="absolute -inset-4 rounded-full bg-ocean-500/20 animate-ping"
          style={{ animationDuration: "3s" }}
        />
        <div className="absolute -inset-3 rounded-full bg-ocean-500/10" />
        <div className="w-4 h-4 rounded-full bg-ocean-500 border-3 border-white shadow-lg relative z-10" />
      </div>
    </AdvancedMarker>
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
        >
          <div className="p-1 min-w-[240px] max-w-[300px]">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="avatar-ring">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-ocean-500 to-ocean-600">
                  {selectedSighting.nickname[0].toUpperCase()}
                </div>
              </div>
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
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="sardine-spotter-map"
          gestureHandling="greedy"
          disableDefaultUI={true}
          clickableIcons={false}
          className="w-full h-full"
          colorScheme="LIGHT"
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
