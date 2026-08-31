"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import type { LiveDelivery, LiveDeliveriesSnapshot } from "../types";

const DEFAULT_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "openStreetMap",
      type: "raster",
      source: "openStreetMap",
    },
  ],
};

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
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    let timeoutId: number | undefined;

    async function createMap() {
      if (!containerRef.current || mapRef.current) return;
      setReady(false);
      setError(null);

      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        libraryRef.current = maplibre;
        const center: [number, number] =
          unit.latitude !== null && unit.longitude !== null
            ? [unit.longitude, unit.latitude]
            : [-46.6333, -23.5505];
        const initialZoom = unit.latitude !== null ? 13 : 11;
        const map = new maplibre.Map({
          container: containerRef.current,
          style:
            process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
            DEFAULT_MAP_STYLE,
          center,
          zoom: initialZoom,
          attributionControl: {},
        });
        const markReady = () => {
          if (cancelled) return;
          if (!initialized) {
            // Alguns estilos públicos incluem uma câmera mundial própria.
            // Reaplica a câmera da operação depois que o estilo é carregado.
            map.jumpTo({ center, zoom: initialZoom });
          }
          initialized = true;
          setReady(true);
          setError(null);
        };

        map.addControl(new maplibre.NavigationControl(), "top-right");
        // O estilo fica utilizável antes de tiles e fontes terminarem de baixar.
        map.once("styledata", markReady);
        map.once("load", markReady);
        mapRef.current = map;

        timeoutId = window.setTimeout(() => {
          if (!cancelled && !initialized) {
            setError(
              "Não foi possível carregar o provedor do mapa. Verifique sua conexão e tente novamente.",
            );
          }
        }, 12_000);
      } catch (cause) {
        console.error("Falha ao inicializar o mapa de entregas", cause);
        if (!cancelled) {
          setError(
            "O mapa não pôde ser iniciado neste navegador. Verifique se o WebGL está habilitado.",
          );
        }
      }
    }

    void createMap();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [retry, unit.latitude, unit.longitude]);

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
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-500">
          Carregando mapa...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 p-8 text-center">
          <p className="max-w-md text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {ready && (unit.latitude === null || unit.longitude === null) && (
        <div className="absolute bottom-8 left-3 max-w-xs rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-md">
          Exibindo São Paulo como referência. Cadastre as coordenadas da unidade
          para centralizar o mapa no açougue.
        </div>
      )}
    </div>
  );
}
