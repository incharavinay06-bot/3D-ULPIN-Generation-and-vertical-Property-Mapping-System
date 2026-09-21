import React from 'react';
import { 
  X, 
  TrendingUp, 
  Layers, 
  Mountain, 
  Compass, 
  Info, 
  CheckCircle2,
  Box
} from 'lucide-react';
import { DemElevationData } from '../types/cadastre';

interface DemElevationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  elevationData?: DemElevationData;
}

const DEFAULT_DEM_DATA: DemElevationData = {
  groundElevationMsl: 920.0,
  buildingBaseMsl: 920.0,
  buildingTopMsl: 956.0,
  verticalPropertyRangeMsl: {
    min: 929.6,
    max: 932.8,
    label: 'Floor 3 Strata Unit (Flat 302)',
  },
  dsmResolution: '0.5m High-Resolution Digital Surface Model (CartoDEM)',
  terrainProfile: [
    { distanceM: 0, elevationM: 919.2, label: 'West Boundary' },
    { distanceM: 20, elevationM: 919.8, label: 'Road Setback' },
    { distanceM: 40, elevationM: 920.0, label: 'Building Base' },
    { distanceM: 60, elevationM: 956.0, label: 'Building Roof' },
    { distanceM: 80, elevationM: 920.4, label: 'East Boundary' },
    { distanceM: 100, elevationM: 921.0, label: 'Drainage Culvert' },
  ],
};

export const DemElevationPanel: React.FC<DemElevationPanelProps> = ({
  isOpen,
  onClose,
  elevationData = DEFAULT_DEM_DATA,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                DEM & DSM Elevation Model
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-mono">
                  Mean Sea Level (MSL)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ground elevation datum, building heights, and vertical property bounds relative to Mean Sea Level.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Elevation Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Ground Datum</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{elevationData.groundElevationMsl} m MSL</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Building Base</span>
              <span className="text-sm font-bold text-white font-mono">{elevationData.buildingBaseMsl} m MSL</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Building Roof Top</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{elevationData.buildingTopMsl} m MSL</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Height Above Ground</span>
              <span className="text-sm font-bold text-sky-400 font-mono">
                {(elevationData.buildingTopMsl - elevationData.buildingBaseMsl).toFixed(1)} m
              </span>
            </div>
          </div>

          {/* Vertical Strata Slice Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Vertical Property Elevation Range:</span>
              <span className="text-blue-400 font-semibold">{elevationData.verticalPropertyRangeMsl.label}</span>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400">Min Z: {elevationData.verticalPropertyRangeMsl.min} m MSL</span>
              <span className="text-slate-400">⟷</span>
              <span className="text-emerald-400">Max Z: {elevationData.verticalPropertyRangeMsl.max} m MSL</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[11px]">
                Span: {(elevationData.verticalPropertyRangeMsl.max - elevationData.verticalPropertyRangeMsl.min).toFixed(1)}m
              </span>
            </div>
          </div>

          {/* SVG Terrain Cross-Section Visualization */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-amber-400" />
              Terrain Surface & Building Cross-Section Profile (DSM)
            </h4>

            <div className="h-32 w-full bg-slate-900/80 rounded-lg p-2 flex items-end justify-between relative border border-slate-800">
              {/* Ground baseline */}
              <div className="absolute bottom-6 left-0 right-0 h-0.5 bg-emerald-500/50 border-t border-dashed border-emerald-400" />
              
              {/* Building Extrusion Bar */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-24 h-20 bg-blue-500/30 border-2 border-blue-400 rounded-t flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-blue-200">Building Envelope</span>
                <span className="text-[8px] font-mono text-amber-300">36.0m Extrusion</span>
              </div>

              {/* Terrain Data Points */}
              {elevationData.terrainProfile.map((pt, idx) => (
                <div key={idx} className="flex flex-col items-center z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[9px] font-mono text-slate-400 mt-1">{pt.distanceM}m</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Sensor: {elevationData.dsmResolution}</span>
              <span>Vertical Accuracy: ±0.5m</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
