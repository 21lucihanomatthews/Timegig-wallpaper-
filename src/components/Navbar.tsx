import React from 'react';
import { Compass, Bookmark, MapPin, Search, Globe2, HelpCircle } from 'lucide-react';

interface NavbarProps {
  onOpenBookmarks: () => void;
  onOpenSearch: () => void;
  onLocateMe: () => void;
  onOpenGuide: () => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBookmarks,
  onOpenSearch,
  onLocateMe,
  onOpenGuide,
  savedCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-950">GeoPulse</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            OpenStreetMap
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
        >
          <Search className="w-4 h-4" />
          <span>Search Place</span>
        </button>
        <button
          onClick={onOpenBookmarks}
          className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 relative"
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Pins</span>
          {savedCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
              {savedCount}
            </span>
          )}
        </button>
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          <span>About OSM</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenBookmarks}
          className="md:hidden relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
          title="Saved Pins"
        >
          <Bookmark className="w-4 h-4" />
          {savedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-semibold px-1 rounded-full">
              {savedCount}
            </span>
          )}
        </button>
        <button
          onClick={onLocateMe}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 whitespace-nowrap shrink-0 active:scale-95"
        >
          <Compass className="w-4 h-4" />
          <span>Locate Me</span>
        </button>
      </div>
    </header>
  );
};
