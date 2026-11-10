import React from 'react';
import { X, Globe2, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-slate-50 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">About OpenStreetMap Template</h3>
              <p className="text-xs text-slate-500">Zero API costs & open-source mapping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-xl shadow-2xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-600 text-sm leading-relaxed">
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-base">Why OpenStreetMap & Leaflet?</h4>
            <p>
              OpenStreetMap (OSM) is a collaborative project to create a free editable map of the world, built by a community of mappers. Combined with Leaflet.js, it offers a fully open-source, high-performance mapping solution with <strong className="text-slate-900 font-semibold">zero API subscription fees or billing surprises</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Free & Open</span>
              </div>
              <p className="text-xs text-slate-500">
                No Google Maps API keys, credit cards, or usage quotas required. Free tile rendering and geocoding.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Live Weather & Data</span>
              </div>
              <p className="text-xs text-slate-500">
                Integrated with free Open-Meteo weather forecast and Nominatim search for worldwide coordinate lookups.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-base">Key Template Capabilities</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Interactive world map with multiple tile styles (OSM, Carto Light/Dark, Topo).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>HTML5 Geolocation tracking with user accuracy circle and distance calculator.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Click-to-inspect any coordinate point worldwide for weather, elevation, and notes.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Local storage bookmarking to save and organize favorite places.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-xs"
          >
            Got it, explore map
          </button>
        </div>
      </div>
    </div>
  );
};
