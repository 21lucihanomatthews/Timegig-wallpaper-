import React from 'react';
import { PRESET_CITIES } from '../data/presetCities';
import { LocationPoint } from '../types';
import { MapPin } from 'lucide-react';

interface QuickCitiesBarProps {
  onSelectCity: (city: LocationPoint) => void;
  selectedCityId?: string;
}

export const QuickCitiesBar: React.FC<QuickCitiesBarProps> = ({ onSelectCity, selectedCityId }) => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2.5 overflow-x-auto scrollbar-none flex items-center gap-2 shadow-2xs">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-2">
        Global Hubs:
      </span>
      {PRESET_CITIES.map((city) => {
        const isSelected = selectedCityId === city.id;
        return (
          <button
            key={city.id}
            onClick={() => onSelectCity(city)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
            <span>{city.name}</span>
            <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
              {city.country}
            </span>
          </button>
        );
      })}
    </div>
  );
};
