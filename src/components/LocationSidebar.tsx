import React, { useState, useEffect } from 'react';
import { LocationPoint } from '../types';
import { formatCoordinates, calculateDistance, getWeatherCondition } from '../utils/geo';
import { X, Bookmark, BookmarkCheck, Navigation, ExternalLink, Copy, Check, Thermometer, Wind, Globe, Compass, Mountain, Clock } from 'lucide-react';

interface LocationSidebarProps {
  location: LocationPoint | null;
  userLocation: LocationPoint | null;
  isSaved: boolean;
  onToggleSave: (location: LocationPoint) => void;
  onClose: () => void;
}

export const LocationSidebar: React.FC<LocationSidebarProps> = ({
  location,
  userLocation,
  isSaved,
  onToggleSave,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; code: number; wind: number } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Fetch live weather from free Open-Meteo API when location changes
  useEffect(() => {
    if (!location) {
      setWeather(null);
      return;
    }

    let isMounted = true;
    setLoadingWeather(true);

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,weather_code,wind_speed_10m`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && data.current) {
          setWeather({
            temp: data.current.temperature_2m,
            code: data.current.weather_code,
            wind: data.current.wind_speed_10m,
          });
        }
      })
      .catch(() => {
        if (isMounted) setWeather(null);
      })
      .finally(() => {
        if (isMounted) setLoadingWeather(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location]);

  if (!location) return null;

  const distanceKm = userLocation
    ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
    : null;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${location.lat}, ${location.lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const weatherInfo = weather ? getWeatherCondition(weather.code) : null;

  return (
    <aside className="absolute right-4 top-20 bottom-6 w-96 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 z-20 flex flex-col overflow-hidden transition-all animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-br from-slate-50 to-blue-50/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
              {location.category || 'Location'}
            </span>
            {location.country && (
              <span className="text-xs text-slate-500 font-medium">· {location.country}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 leading-snug">{location.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-xl shadow-2xs hover:bg-slate-100 transition-colors"
          title="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Description */}
        {location.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{location.description}</p>
        )}

        {/* Coordinates Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coordinates</span>
            <button
              onClick={handleCopyCoords}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-sm font-semibold text-slate-800">
            {formatCoordinates(location.lat, location.lng)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
          </div>
        </div>

        {/* Distance from User */}
        {distanceKm !== null && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Distance from you</div>
              <div className="text-lg font-bold text-slate-900">{distanceKm.toLocaleString()} km</div>
            </div>
          </div>
        )}

        {/* Live Weather Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Weather (Open-Meteo)</span>
            <span className="text-xs text-slate-400">Live API</span>
          </div>
          {loadingWeather ? (
            <div className="text-sm text-slate-500 py-3 text-center animate-pulse">Loading weather data...</div>
          ) : weather && weatherInfo ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{weatherInfo.icon}</span>
                <div>
                  <div className="text-lg font-bold text-slate-900">{weather.temp}°C</div>
                  <div className="text-xs text-slate-600">{weatherInfo.label}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  <span>{weather.wind} km/h</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Wind speed</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 py-2">Weather unavailable for this coordinate</div>
          )}
        </div>

        {/* Quick External Links */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Open External Maps</span>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=14/${location.lat}/${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <span>OpenStreetMap</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
        <button
          onClick={() => onToggleSave(location)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all shadow-xs ${
            isSaved
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4 text-emerald-600" /> : <Bookmark className="w-4 h-4" />}
          <span>{isSaved ? 'Saved in Pins' : 'Save Location'}</span>
        </button>
      </div>
    </aside>
  );
};
