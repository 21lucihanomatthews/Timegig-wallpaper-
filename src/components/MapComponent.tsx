import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocationPoint, MapTileStyle, ActiveGig } from '../types';
import { Plus, Minus, Globe, Crosshair } from 'lucide-react';

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  userLocation: LocationPoint | null;
  selectedLocation: LocationPoint | null;
  savedLocations: LocationPoint[];
  onMarkerClick: (location: LocationPoint) => void;
  onRecenter: () => void;
  activeGig?: ActiveGig | null;
}

const TILE_URLS: Record<MapTileStyle, { url: string; attribution: string }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  darkmatter: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

export const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom,
  userLocation,
  selectedLocation,
  savedLocations,
  onMarkerClick,
  onRecenter,
  activeGig,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<MapTileStyle>('osm');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Add tile layer
      const currentTile = TILE_URLS[mapStyle];
      const tileLayer = L.tileLayer(currentTile.url, {
        maxZoom: 19,
        attribution: currentTile.attribution,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Add layer group for markers
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map view when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(center, zoom, {
        duration: 1.2,
      });
    }
  }, [center, zoom]);

  // Update tile layer when mapStyle changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const currentTile = TILE_URLS[mapStyle];
    tileLayerRef.current.setUrl(currentTile.url);
  }, [mapStyle]);

  // Update Markers
  useEffect(() => {
    if (!markersGroupRef.current || !mapRef.current) return;

    const group = markersGroupRef.current;
    group.clearLayers();

    // 1. User Location Marker
    if (userLocation) {
      const userHtml = `
        <div style="
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'custom-user-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindPopup(`<b>Your Location</b><br>${userLocation.name}`);
      userMarker.on('click', () => onMarkerClick(userLocation));
      group.addLayer(userMarker);

      // Accuracy pulse circle
      const circle = L.circle([userLocation.lat, userLocation.lng], {
        radius: 1500,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      });
      group.addLayer(circle);
    }

    // 2. Saved Locations
    savedLocations.forEach((loc) => {
      if (userLocation && Math.abs(loc.lat - userLocation.lat) < 0.0001 && Math.abs(loc.lng - userLocation.lng) < 0.0001) {
        return;
      }

      const isSelected = selectedLocation && selectedLocation.id === loc.id;
      const bg = isSelected ? '#ef4444' : '#8b5cf6';

      const html = `
        <div style="
          width: 28px;
          height: 28px;
          background: ${bg};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 11px;
        ">📍</div>
      `;
      const icon = L.divIcon({
        html,
        className: 'custom-saved-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon });
      marker.bindPopup(`<b>${loc.name}</b><br>${loc.country || ''}`);
      marker.on('click', () => onMarkerClick(loc));
      group.addLayer(marker);
    });

    // 3. Selected Location
    if (
      selectedLocation &&
      (!userLocation || Math.abs(selectedLocation.lat - userLocation.lat) > 0.0001 || Math.abs(selectedLocation.lng - userLocation.lng) > 0.0001) &&
      !savedLocations.some(s => Math.abs(s.lat - selectedLocation.lat) < 0.0001 && Math.abs(s.lng - selectedLocation.lng) < 0.0001)
    ) {
      const html = `
        <div style="
          width: 32px;
          height: 32px;
          background: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
        ">📍</div>
      `;
      const icon = L.divIcon({
        html,
        className: 'custom-selected-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], { icon });
      marker.bindPopup(`<b>${selectedLocation.name}</b><br>${selectedLocation.description || ''}`);
      marker.on('click', () => onMarkerClick(selectedLocation));
      group.addLayer(marker);
    }

    // 4. Active GiG Navigation Layer
    if (activeGig && activeGig.status === 'in_progress' && activeGig.routePoints.length > 0) {
      // Glow polyline
      const glowLine = L.polyline(activeGig.routePoints, {
        color: '#1d4ed8',
        weight: 9,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      });
      group.addLayer(glowLine);

      // Main driving road polyline
      const routeLine = L.polyline(activeGig.routePoints, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      group.addLayer(routeLine);

      // Directional dashed animated pattern
      const dashLine = L.polyline(activeGig.routePoints, {
        color: '#93c5fd',
        weight: 2,
        dashArray: '6, 12',
        opacity: 0.9,
      });
      group.addLayer(dashLine);

      // Seeker Marker with live selfie & pulsing beacon
      const seekerHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 38px; height: 38px; border-radius: 50%; border: 3px solid #2563eb; overflow: hidden; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative; z-index: 2;">
            <img src="${activeGig.seekerSelfieUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #10b981; border: 2px solid white; border-radius: 50%; z-index: 3;"></div>
        </div>
      `;
      const seekerIcon = L.divIcon({
        html: seekerHtml,
        className: 'custom-seeker-gig-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const seekerMarker = L.marker(activeGig.seekerLocation, { icon: seekerIcon });
      seekerMarker.bindPopup(`<b>${activeGig.seekerName} (En Route)</b><br>${activeGig.seekerService}<br>ETA: ~${activeGig.etaMinutes} mins`);
      group.addLayer(seekerMarker);

      // Destination Marker
      const destHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 34px; height: 34px; border-radius: 50%; background: #0f172a; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
            🏁
          </div>
        </div>
      `;
      const destIcon = L.divIcon({
        html: destHtml,
        className: 'custom-dest-gig-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const destMarker = L.marker(activeGig.destinationLocation, { icon: destIcon });
      destMarker.bindPopup(`<b>${activeGig.destinationName}</b><br>GiG Destination`);
      group.addLayer(destMarker);

      // Auto fit bounds to navigation route
      try {
        const bounds = L.latLngBounds(activeGig.routePoints);
        mapRef.current.fitBounds(bounds, { padding: [90, 90], maxZoom: 15 });
      } catch (e) {
        // ignore
      }
    }
  }, [userLocation, selectedLocation, savedLocations, activeGig]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleToggleSatellite = () => {
    setMapStyle((prev) => (prev === 'satellite' ? 'osm' : 'satellite'));
  };

  return (
    <div className="w-full h-full relative z-10 outline-none">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Zoom, Recenter, & Satellite Bubbles at Bottom-Right */}
      <div className="absolute bottom-24 right-6 z-[999] flex flex-col gap-3.5 pointer-events-auto">
        <button
          onClick={onRecenter}
          className="w-14 h-14 rounded-full bg-white shadow-2xl border-2 border-slate-200 flex items-center justify-center text-slate-800 hover:text-blue-600 hover:scale-105 transition-all active:scale-95 cursor-pointer"
          title="Back to Location"
        >
          <Crosshair className="w-6 h-6 stroke-[2.5]" />
        </button>
        <button
          onClick={handleZoomIn}
          className="w-14 h-14 rounded-full bg-white shadow-2xl border-2 border-slate-200 flex items-center justify-center text-slate-800 hover:text-blue-600 hover:scale-105 transition-all active:scale-95 cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-14 h-14 rounded-full bg-white shadow-2xl border-2 border-slate-200 flex items-center justify-center text-slate-800 hover:text-blue-600 hover:scale-105 transition-all active:scale-95 cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-6 h-6 stroke-[2.5]" />
        </button>
        <button
          onClick={handleToggleSatellite}
          className={`w-14 h-14 rounded-full shadow-2xl border-2 flex items-center justify-center transition-all active:scale-95 cursor-pointer hover:scale-105 ${
            mapStyle === 'satellite'
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/40'
              : 'bg-white text-slate-800 border-slate-200 hover:text-blue-600'
          }`}
          title="Toggle Satellite View"
        >
          <Globe className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
