declare global {
  interface Window {
    maplibregl?: any;
  }
}

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAPLIBRE_CSS = "https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.css";
const MAPLIBRE_JS  = "https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.js";

let _mlPromise: Promise<void> | null = null;

function loadMapLibre(): Promise<void> {
  if (window.maplibregl) return Promise.resolve();
  if (_mlPromise) return _mlPromise;

  _mlPromise = new Promise<void>((resolve, reject) => {
    // Inject CSS if not present
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }

    // Inject JS
    const script = document.createElement("script");
    script.src = MAPLIBRE_JS;
    script.onload = () => resolve();
    script.onerror = () => {
      _mlPromise = null;
      reject(new Error("MapLibre GL failed to load from CDN"));
    };
    document.head.appendChild(script);
  });

  return _mlPromise;
}

export function getMapUnavailableCopy(loadError: string) {
  return `${loadError}. The coordinate list and infrastructure summary below remain available for planning.`;
}

// Kept for backward-compat with any callers that import it
export function shouldReplaceExistingMapScript(_status: string | undefined, _hasGoogle: boolean) {
  return false;
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: any) => void;
  onMapError?: (error: Error) => void;
}

export function MapView({
  className,
  initialCenter = { lat: -33.482, lng: 26.633 },
  initialZoom = 12,
  onMapReady,
  onMapError,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadMapLibre()
      .then(() => {
        if (cancelled || !containerRef.current || mapInstanceRef.current) return;

        try {
          const map = new window.maplibregl.Map({
            container: containerRef.current,
            style: {
              version: 8,
              sources: {
                satellite: {
                  type: "raster",
                  tiles: [
                    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                  ],
                  tileSize: 256,
                  attribution: "Esri, Maxar, Earthstar Geographics",
                  maxzoom: 19,
                },
              },
              layers: [{ id: "satellite", type: "raster", source: "satellite" }],
            },
            center: [initialCenter.lng, initialCenter.lat],
            zoom: initialZoom,
          });

          map.on("load", () => {
            if (cancelled) return;
            mapInstanceRef.current = map;
            onMapReady?.(map);
          });

          map.on("error", (e: any) => {
            if (cancelled) return;
            const err = new Error(e.error?.message ?? "Map rendering error");
            setLoadError(err.message);
            onMapError?.(err);
          });
        } catch (error) {
          if (cancelled) return;
          const err = error instanceof Error ? error : new Error("Unable to initialise map");
          setLoadError(err.message);
          onMapError?.(err);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error("Map library failed to load");
        setLoadError(err.message);
        onMapError?.(err);
      });

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative w-full h-[500px]", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-6 text-center">
          <div
            className="max-w-md rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-muted-foreground"
            role="alert"
          >
            <p className="font-semibold text-yellow-400">Map temporarily unavailable</p>
            <p className="mt-2">{getMapUnavailableCopy(loadError)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
