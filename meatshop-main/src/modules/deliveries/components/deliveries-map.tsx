"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { LiveDelivery, LiveDeliveriesSnapshot } from "../types";

type DeliveriesMapProps = {
  unit: LiveDeliveriesSnapshot["unit"];
  deliveries: LiveDelivery[];
  selectedOrderId: number | null;
  onSelect: (orderId: number) => void;
};

export function DeliveriesMap({
  unit,
  deliveries,
  selectedOrderId,
  onSelect,
}: DeliveriesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const libraryRef = useRef<typeof import("maplibre-gl") | null>(null);
  const hasFittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function createMap() {
      if (!containerRef.current || mapRef.current) return;
      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      libraryRef.current = maplibre;
      const center: [number, number] =
        unit.latitude !== null && unit.longitude !== null
          ? [unit.longitude, unit.latitude]
          : [-46.6333, -23.5505];
      const map = new maplibre.Map({
        container: containerRef.current,
        style:
          process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
          "https://demotiles.maplibre.org/style.json",
        center,
        zoom: unit.latitude !== null ? 13 : 10,
        attributionControl: {},
      });
      map.addControl(new maplibre.NavigationControl(), "top-right");
      map.on("load", () => setReady(true));
      mapRef.current = map;
    }

    void createMap();
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [unit.latitude, unit.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = libraryRef.current;
    if (!ready || !map || !maplibre) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const coordinates: [number, number][] = [];

    if (unit.latitude !== null && unit.longitude !== null) {
      const element = document.createElement("div");
      element.className =
        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-700 text-sm font-bold text-white shadow-lg";
      element.textContent = "A";
      markersRef.current.push(
        new maplibre.Marker({ element })
          .setLngLat([unit.longitude, unit.latitude])
          .setPopup(new maplibre.Popup({ offset: 18 }).setText(unit.name))
          .addTo(map),
      );
      coordinates.push([unit.longitude, unit.latitude]);
    }

    for (const delivery of deliveries) {
      if (!delivery.location) continue;
      const element = document.createElement("button");
      element.type = "button";
      element.className = [
        "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-xl transition-transform",
        selectedOrderId === delivery.orderId
          ? "scale-125 border-red-900 bg-red-600"
          : "border-white bg-slate-800 hover:scale-110",
      ].join(" ");
      element.textContent = String(delivery.orderId);
      element.title = `Pedido #${delivery.orderId}`;
      element.addEventListener("click", () => onSelect(delivery.orderId));

      markersRef.current.push(
        new maplibre.Marker({ element })
          .setLngLat([delivery.location.longitude, delivery.location.latitude])
          .addTo(map),
      );
      coordinates.push([
        delivery.location.longitude,
        delivery.location.latitude,
      ]);
    }

    if (!hasFittedRef.current && coordinates.length > 1) {
      const bounds = new maplibre.LngLatBounds(coordinates[0], coordinates[0]);
      coordinates.slice(1).forEach((coordinate) => bounds.extend(coordinate));
      map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 700 });
      hasFittedRef.current = true;
    }
  }, [deliveries, onSelect, ready, selectedOrderId, unit]);

  useEffect(() => {
    const selected = deliveries.find(
      (delivery) => delivery.orderId === selectedOrderId,
    );
    if (!selected?.location || !mapRef.current) return;
    mapRef.current.easeTo({
      center: [selected.location.longitude, selected.location.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 500,
    });
  }, [deliveries, selectedOrderId]);

  return (
    <div className="relative h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Mapa de entregas em tempo real"
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-500">
          Carregando mapa...
        </div>
      )}
    </div>
  );
}
