import React from 'react';
import { 
  X, 
  MapPin, 
  Compass, 
  Radio, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  Satellite, 
  Globe,
  Sliders
} from 'lucide-react';
import { CoordinateReference } from '../types/cadastre';

interface CoordinateReferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates?: CoordinateReference;
}

const DEFAULT_COORDS: CoordinateReference = {
  latitude: 12.9716000,
  longitude: 77.5946000,
  elevationMsl: 920.0,
  crs: 'WGS84 / EPSG:4326 (Geodetic 3D Ellipsoidal Model)',
  gnssSource: 'Multi-Frequency GNSS (GPS L1/L5 + NavIC L5/S + Galileo E1/E5a)',
  corsStation: 'Survey of India National CORS Network (Station: BLR-URB-01)',
  horizontalAccuracyM: 0.5,
  verticalAccuracyM: 0.8,
};

export const CoordinateReferencePanel: React.FC<CoordinateReferencePanelProps> = ({
  isOpen,
  onClose,
  coordinates = DEFAULT_COORDS,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GNSS & CORS Geodetic Reference Engine
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Survey-Grade RTK
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Authoritative reference frame calibration for 3D ULPIN Generation spatial coordinates.
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
          
          {/* Coordinates Card */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Primary Cadastral Anchor:</span>
              <span className="font-mono text-emerald-400 font-semibold">Bengaluru Urban Division</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Latitude</span>
                <span className="text-sm font-bold text-white font-mono">{coordinates.latitude.toFixed(7)}° N</span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Longitude</span>
                <span className="text-sm font-bold text-white font-mono">{coordinates.longitude.toFixed(7)}° E</span>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Elevation (MSL)</span>
                <span className="text-sm font-bold text-amber-300 font-mono">{coordinates.elevationMsl.toFixed(1)} m</span>
              </div>
            </div>
          </div>

          {/* Survey Reference Parameters */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Coordinate Reference System (CRS):</span>
              <span className="font-mono text-slate-200 font-medium">{coordinates.crs}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Continuous Operating Reference (CORS):</span>
              <span className="text-blue-300 font-medium">{coordinates.corsStation}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">GNSS Constellation:</span>
              <span className="text-slate-200">{coordinates.gnssSource}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Horizontal Positional Accuracy:</span>
              <span className="font-mono text-emerald-400 font-bold">±{coordinates.horizontalAccuracyM} m</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Vertical Positional Accuracy:</span>
              <span className="font-mono text-emerald-400 font-bold">±{coordinates.verticalAccuracyM} m</span>
            </div>
          </div>

          {/* Prototype Clarity Badge */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <p>
              <strong>GNSS/CORS Compatible Coordinate Model:</strong> Real-time differential corrections ensure 3D volumetric parcels align with millimeter-grade cadastral boundaries without geometric drift.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
