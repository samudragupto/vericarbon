"use client";

import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

if (typeof window !== "undefined" && typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  badge?: string;
  onClick?: () => void;
}

interface MapViewProps {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  selectedPinId?: string | null;
  className?: string;
}

const CARTO_DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function MapView({
  pins,
  center = [-54.8437, -2.8125], // Default Tapajós National Forest, Brazil
  zoom = 12,
  interactive = true,
  onMapClick,
  selectedPinId,
  className = "h-[450px] w-full",
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_DARK_STYLE,
      center: center,
      zoom: zoom,
      interactive: interactive,
      attributionControl: {},
    });

    mapRef.current = map;

    map.on("click", (e) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center if explicitly changed
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ center, zoom });
  }, [center[0], center[1], zoom]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pins.forEach((pin) => {
      const isSelected = pin.id === selectedPinId;
      const el = document.createElement("div");
      el.className = `cursor-pointer transition-transform duration-200 ${
        isSelected ? "scale-125 z-20" : "hover:scale-110 z-10"
      }`;

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-1 rounded-full ${
            isSelected ? "bg-emerald-400 opacity-60 animate-ping" : "bg-emerald-500 opacity-30"
          }"></div>
          <div class="relative h-6 w-6 rounded-full border-2 ${
            isSelected ? "border-white bg-emerald-400 text-zinc-950" : "border-emerald-400 bg-zinc-950 text-emerald-400"
          } flex items-center justify-center font-bold text-xs shadow-lg">
            🌲
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 bg-zinc-950 text-zinc-100 rounded border border-zinc-800 text-xs font-sans">
          <div class="font-bold text-emerald-400 mb-0.5">${pin.title}</div>
          ${pin.badge ? `<span class="inline-block px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-300 font-mono mb-1">${pin.badge}</span>` : ""}
          ${pin.description ? `<div class="text-[11px] text-zinc-400">${pin.description}</div>` : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      el.addEventListener("click", () => {
        if (pin.onClick) {
          pin.onClick();
        }
      });

      markersRef.current.push(marker);
    });
  }, [pins, selectedPinId]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
      <div ref={mapContainerRef} className={className} />
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md bg-zinc-950/80 px-2.5 py-1 text-[11px] text-zinc-400 backdrop-blur-md border border-zinc-800/80 font-mono pointer-events-none">
        <span>Carto Dark Matter Basemap</span>
        <span>•</span>
        <span>Tapajós AOI</span>
      </div>
    </div>
  );
}

