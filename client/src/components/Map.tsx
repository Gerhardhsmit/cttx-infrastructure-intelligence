declare global {
  interface Window {
    maplibregl?: any;
  }
}

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function getMapUnavailableCopy(loadError: string) {
  return `${loadError}. The coordinate list and infrastructure summary below remain available for planning.`;
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
    if (!containerRef.current || mapInstanceRef.current) return;

    const ml = window.maplibregl;
    if (!ml) {
      const err = new Error("MapLibre GL JS not loaded — check CDN in index.html");
      setLoadError(err.message);
      onMapError?.(err);
      return;
    }

    try {
      const map = new ml.Map({
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
        mapInstanceRef.current = map;
        onMapReady?.(map);
      });

      map.on("error", (e: any) => {
        const err = new Error(e.error?.message ?? "Map rendering error");
        setLoadError(err.message);
        onMapError?.(err);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unable to initialise map");
      setLoadError(err.message);
      onMapError?.(err);
    }

    return () => {
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
