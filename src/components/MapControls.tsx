import React from 'react';
import { MapTileStyle } from '../types';
import { Layers, Compass } from 'lucide-react';

interface MapControlsProps {
  currentStyle: MapTileStyle;
  onChangeStyle: (style: MapTileStyle) => void;
  onResetView: () => void;
  onLocateMe: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  currentStyle,
  onChangeStyle,
  onResetView,
  onLocateMe,
}) => {
  const [showStyles, setShowStyles] = React.useState(false);

  const styles: { id: MapTileStyle; label: string; desc: string }[] = [
    { id: 'osm', label: 'OpenStreetMap', desc: 'Standard street map' },
    { id: 'positron', label: 'Carto Light', desc: 'Clean minimalist light' },
    { id: 'darkmatter', label: 'Carto Dark', desc: 'Sleek dark mode map' },
    { id: 'topo', label: 'OpenTopoMap', desc: 'Topographic terrain' },
  ];

  return (
    <div className="absolute left-4 top-20 z-20 flex flex-col gap-2">
      {/* Tile Style Selector Button */}
      <div className="relative">
        <button
          onClick={() => setShowStyles(!showStyles)}
          className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all hover:bg-white"
          title="Change map style"
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Layers</span>
        </button>

        {showStyles && (
          <div className="absolute left-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Map Style (Zero Cost)
            </div>
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onChangeStyle(s.id);
                  setShowStyles(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                  currentStyle === s.id
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div>{s.label}</div>
                <div className="text-[10px] text-slate-400 font-normal">{s.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reset View / Center on World */}
      <button
        onClick={onResetView}
        className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all hover:bg-white"
        title="Reset to global view"
      >
        <Compass className="w-4 h-4 text-blue-600" />
      </button>
    </div>
  );
};
