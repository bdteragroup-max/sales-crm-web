"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Numbered icon generator
const getNumberedIcon = (number: number, color: string = '#dc2626') => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

interface Checkin {
  id: string;
  lat: number | null;
  lon: number | null;
  employeeName: string;
  branch_name: string;
  project_name: string | null;
  timestamp: string;
  photo_url: string | null;
  color?: string;
  displayNumber?: number;
}

interface MapComponentProps {
  checkins: Checkin[];
}

function MapUpdater({ checkins }: { checkins: Checkin[] }) {
  const map = useMap();
  useEffect(() => {
    const validCheckins = checkins.filter((c) => c.lat !== null && c.lon !== null);
    if (validCheckins.length > 0) {
      const bounds = L.latLngBounds(
        validCheckins.map((c) => [c.lat as number, c.lon as number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [checkins, map]);
  return null;
}

export default function MapComponent({ checkins }: MapComponentProps) {
  const validCheckins = checkins.filter((c) => c.lat !== null && c.lon !== null);

  if (validCheckins.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-500 font-medium">ไม่พบข้อมูลพิกัดในรายการนี้ (No GPS data available)</p>
      </div>
    );
  }

  // Default to first valid checkin or Bangkok
  const defaultCenter: [number, number] = validCheckins.length > 0 
    ? [validCheckins[0].lat as number, validCheckins[0].lon as number] 
    : [13.7563, 100.5018];

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-gray-200 z-0 relative">
      <MapContainer
        center={defaultCenter}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", minHeight: "400px", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validCheckins.map((c) => (
          <Marker key={c.id} position={[c.lat as number, c.lon as number]} icon={getNumberedIcon(c.displayNumber || 0, c.color)}>
            <Popup>
              <div className="flex flex-col gap-1 p-1 min-w-[200px]">
                <strong className="text-sm">{c.employeeName}</strong>
                <span className="text-xs text-gray-600">
                  {new Date(c.timestamp).toLocaleString("th-TH")}
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  {c.branch_name || c.project_name || "ไม่ระบุสถานที่"}
                </span>
                {c.photo_url && (
                  <img
                    src={c.photo_url}
                    alt="Check-in Photo"
                    className="w-full h-24 object-cover mt-2 rounded-lg border border-gray-200"
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        <MapUpdater checkins={validCheckins} />
      </MapContainer>
    </div>
  );
}
