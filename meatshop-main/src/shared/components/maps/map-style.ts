import type { StyleSpecification } from 'maplibre-gl';
export const mapStyle: string | StyleSpecification = process.env.NEXT_PUBLIC_MAP_STYLE_URL || {
  version:8, sources:{osm:{type:'raster', tiles:[
    process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize:256,maxzoom:19,attribution:process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '© OpenStreetMap contributors'}},
  layers:[{id:'osm',type:'raster',source:'osm'}],
};
export function validPoint(lat: unknown, lng: unknown): boolean {
  return typeof lat==='number' && Number.isFinite(lat) && Math.abs(lat)<=90 &&
    typeof lng==='number' && Number.isFinite(lng) && Math.abs(lng)<=180;
}
