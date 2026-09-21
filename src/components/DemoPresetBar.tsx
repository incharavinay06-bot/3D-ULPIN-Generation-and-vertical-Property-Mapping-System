import React from 'react';
import { GraduationCap, Building, Home, Sparkles, Zap } from 'lucide-react';

export interface DemoPreset {
  id: string;
  name: string;
  type: 'Campus' | 'Residential' | 'Commercial';
  parcelId: string;
  buildingId: string;
  lat: number;
  lng: number;
  floors: number;
  heightM: number;
  description: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'bnmit-campus',
    name: 'BNMIT Campus',
    type: 'Campus',
    parcelId: 'P001',
    buildingId: 'B001',
    lat: 12.9238,
    lng: 77.5702,
    floors: 8,
    heightM: 25.6,
    description: 'Institutional academic complex (8 Floors, 25.6m height)',
    confidence: 'HIGH',
  },
  {
    id: 'residential-apt',
    name: 'Residential Apartment',
    type: 'Residential',
    parcelId: 'P001',
    buildingId: 'B001',
    lat: 12.9716,
    lng: 77.5946,
    floors: 10,
    heightM: 32.0,
    description: 'Surya Heights Tower (10 Floors + 2 Basements)',
    confidence: 'HIGH',
  },
  {
    id: 'commercial-office',
    name: 'Commercial Office',
    type: 'Commercial',
    parcelId: 'P002',
    buildingId: 'B002',
    lat: 12.9850,
    lng: 77.6050,
    floors: 6,
    heightM: 21.6,
    description: 'Brigade Software Tech Park (6 Storeys, High-density)',
    confidence: 'MEDIUM',
  },
];

interface DemoPresetBarProps {
  onSelectPreset: (preset: DemoPreset) => void;
  activePresetId?: string;
  className?: string;
}

export const DemoPresetBar: React.FC<DemoPresetBarProps> = ({
  onSelectPreset,
  activePresetId,
  className = '',
}) => {
  return (
    <div 
      id="quick-demo-presets-bar"
      className={`flex items-center gap-2 overflow-x-auto py-1 px-2 no-scrollbar ${className}`}
    >
      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider shrink-0 mr-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">1-Click Presets:</span>
      </div>

      {DEMO_PRESETS.map((preset) => {
        const isActive = activePresetId === preset.id;
        const Icon = preset.type === 'Campus' 
          ? GraduationCap 
          : preset.type === 'Residential' 
          ? Home 
          : Building;

        return (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            title={`${preset.name}: ${preset.description}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border shadow-sm ${
              isActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold ring-2 ring-amber-400/40'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>{preset.name}</span>
            <span className={`text-[10px] px-1 rounded ${
              isActive ? 'bg-amber-600/40 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {preset.floors}F
            </span>
          </button>
        );
      })}
    </div>
  );
};
