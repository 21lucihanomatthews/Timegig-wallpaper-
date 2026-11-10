import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { LocationPoint } from '../types';
import { PRESET_CITIES } from '../data/presetCities';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationPoint) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=8`, {
      headers: {
        'Accept-Language': 'en',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          const mapped: LocationPoint[] = data.map((item: any, idx: number) => ({
            id: `nominatim-${item.place_id || idx}`,
            name: item.display_name.split(',')[0],
            country: item.display_name.split(',').slice(-1)[0]?.trim() || '',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            description: item.display_name,
            category: 'landmark',
          }));
          setResults(mapped);
        } else {
          setResults([]);
        }
      })
      .catch(() => {
        if (isMounted) setResults([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  if (!isOpen) return null;

  const handleSelect = (loc: LocationPoint) => {
    onSelectLocation(loc);
    onClose();
  };

  // Filter preset cities if query matches
  const filteredPresets = query.trim()
    ? PRESET_CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.country && c.country.toLowerCase().includes(query.toLowerCase()))
      )
    : PRESET_CITIES.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any city, country, or landmark worldwide..."
            className="flex-1 text-base text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          {results.length > 0 && (
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              OpenStreetMap Nominatim Results
            </div>
          )}
          {results.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/70 text-left transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    {loc.name}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{loc.description}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
            </button>
          ))}

          {results.length === 0 && !loading && query.trim() !== '' && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No matching locations found. Try a different search term.
            </div>
          )}

          {/* Quick Presets Section */}
          <div className="pt-3 mt-3 border-t border-slate-100">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {query.trim() ? 'Matching Hubs' : 'Popular Destinations'}
            </div>
            {filteredPresets.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelect(loc)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {loc.name} <span className="text-slate-400 font-normal">· {loc.country}</span>
                    </div>
                    <div className="text-xs text-slate-500">{loc.description}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
          Powered by OpenStreetMap Nominatim Search (Zero API Costs)
        </div>
      </div>
    </div>
  );
};
