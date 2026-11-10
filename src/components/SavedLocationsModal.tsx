import React from 'react';
import { LocationPoint } from '../types';
import { Bookmark, X, MapPin, Trash2, ArrowRight } from 'lucide-react';
import { formatCoordinates } from '../utils/geo';

interface SavedLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLocations: LocationPoint[];
  onSelectLocation: (loc: LocationPoint) => void;
  onRemoveLocation: (id: string) => void;
}

export const SavedLocationsModal: React.FC<SavedLocationsModalProps> = ({
  isOpen,
  onClose,
  savedLocations,
  onSelectLocation,
  onRemoveLocation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Saved Locations</h3>
              <p className="text-xs text-slate-500">{savedLocations.length} bookmarked places</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-xl shadow-2xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {savedLocations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-800 text-base mb-1">No saved pins yet</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Click anywhere on the map or search a location, then click "Save Location" to pin it here for quick access.
              </p>
            </div>
          ) : (
            savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition-all group"
              >
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer"
                  onClick={() => {
                    onSelectLocation(loc);
                    onClose();
                  }}
                >
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                      {loc.name} {loc.country && <span className="text-slate-400 font-normal">· {loc.country}</span>}
                    </h4>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">
                      {formatCoordinates(loc.lat, loc.lng)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="p-2 text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-lg shadow-2xs transition-colors"
                    title="View on Map"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveLocation(loc.id)}
                    className="p-2 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg shadow-2xs transition-colors"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Saved locally on your device</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
