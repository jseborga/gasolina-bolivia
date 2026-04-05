"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
};

const defaultCenter: [number, number] = [-16.5, -68.15];

const markerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 18px;
      height: 18px;
      border-radius: 9999px;
      background: #111827;
      border: 3px solid white;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], 16, { animate: true });
    }
  }, [latitude, longitude, map]);

  return null;
}

function ClickHandler({
  onChange,
}: {
  onChange: (coords: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });

  return null;
}

export default function StationLocationPickerMap({
  latitude,
  longitude,
  onChange,
}: Props) {
  const center: [number, number] =
    latitude != null && longitude != null
      ? [latitude, longitude]
      : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <Recenter latitude={latitude} longitude={longitude} />
      <ClickHandler onChange={onChange} />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {latitude != null && longitude != null && (
        <Marker
          position={[latitude, longitude]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const pos = marker.getLatLng();
              onChange({
                latitude: pos.lat,
                longitude: pos.lng,
              });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
