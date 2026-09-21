/**
 * Government-Grade Geospatial Portal Header
 * Ministry of Rural Development • SIH26011
 */

import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Download, 
  UploadCloud,
  Layers,
  MapPin,
  Database,
  Key,
  Radio,
  TrendingUp,
  Droplets,
  Zap,
  Box,
  Scan,
  Play
} from 'lucide-react';

interface NavbarProps {
  appMode: 'DEMO' | 'REAL_LOCATION';
  onToggleAppMode: (mode: 'DEMO' | 'REAL_LOCATION') => void;
  onOpenDemoTour: () => void;
  onOpenValidation: () => void;
  onOpenGeometryVerification?: () => void;
  onOpenArchitecture: () => void;
  onOpenImportGeoJSON: () => void;
  onExportGeoJSON: () => void;
  onOpenDataAcquisition: () => void;
  onOpenDataProvenance: () => void;
  onOpenUlpinExplainer: () => void;
  onOpenUnderground: () => void;
  totalParcels: number;
  totalUnits: number;
  conflictsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  appMode,
  onToggleAppMode,
  onOpenDemoTour,
  onOpenValidation,
  onOpenGeometryVerification,
  onOpenArchitecture,
  onOpenImportGeoJSON,
  onExportGeoJSON,
  onOpenDataAcquisition,
  onOpenDataProvenance,
  onOpenUlpinExplainer,
  onOpenUnderground,
  totalParcels,
  totalUnits,
  conflictsCount,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shadow-lg select-none">
      
      {/* Brand & National Cadastral Seal */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md border border-blue-400/30">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              3D ULPIN GENERATION
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-blue-500/30 uppercase">
                SIH26011 Prototype
              </span>
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              MoRD Approved
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Vertical Property Cadastre Mapping & 3D Spatial Identifier System
          </p>
        </div>
      </div>

      {/* Mode Switcher Pill */}
      <div className="hidden lg:flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800">
        <button
          onClick={() => onToggleAppMode('DEMO')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            appMode === 'DEMO'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Demo Parcels (P001-P004)</span>
        </button>
        <button
          onClick={() => onToggleAppMode('REAL_LOCATION')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            appMode === 'REAL_LOCATION'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
          <span>Real OSM Live Mode</span>
        </button>
      </div>

      {/* Cadastral Statistics & Live Badges */}
      <div className="hidden xl:flex items-center gap-4 text-xs text-slate-300 border-l border-r border-slate-800 px-4">
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">2D Land Parcels</span>
          <span className="font-mono font-bold text-slate-200">{totalParcels} Surveyed</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">3D Strata Units</span>
          <span className="font-mono font-bold text-blue-400">{totalUnits} Volumetric</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">Topology Audit</span>
          {conflictsCount > 0 ? (
            <span className="font-mono font-bold text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              {conflictsCount} Overhang / Clash
            </span>
          ) : (
            <span className="font-mono font-bold text-emerald-400">All Passed</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        
        {/* Multi-Sensor Data Acquisition */}
        <button
          onClick={onOpenDataAcquisition}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Data Acquisition: Satellite, Drone, LiDAR, GeoJSON, DEM/DSM"
        >
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Acquire Data</span>
        </button>

        {/* 3D ULPIN Decoder */}
        <button
          onClick={onOpenUlpinExplainer}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          title="3D ULPIN Architecture & Decoder"
        >
          <Key className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">3D ULPIN</span>
        </button>

        {/* Sub-Surface Utilities */}
        <button
          onClick={onOpenUnderground}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Underground Utility Mapping & Sub-surface Cadastre"
        >
          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Underground</span>
        </button>

        {/* Data Provenance & Sensor Confidence */}
        <button
          onClick={onOpenDataProvenance}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Data Provenance & Confidence Dashboard"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Data Sources</span>
        </button>

        {/* Demo Presentation Walkthrough */}
        <button
          onClick={onOpenDemoTour}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          title="Interactive 3D Cadastre Demo Tour"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
          <span>Demo</span>
        </button>

        {/* 3D Topology Validation Tool */}
        <button
          onClick={onOpenValidation}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
            conflictsCount > 0
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Validate 3D</span>
          <span className="sm:hidden">Audit</span>
        </button>

        {/* Geometry Verification Tool */}
        {onOpenGeometryVerification && (
          <button
            onClick={onOpenGeometryVerification}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold px-2.5 py-1.5 rounded-lg text-xs border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-cyan-400/60"
            title="Verify 3D Geometry: Dynamic Bounding Box, Floor Schedule, 2D/3D Match & Reference Overlay"
          >
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Verify Geometry</span>
            <span className="sm:hidden">Verify</span>
          </button>
        )}

        {/* Architecture & LADM Specs */}
        <button
          onClick={onOpenArchitecture}
          title="Architecture & Extensibility Specifications"
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center justify-center"
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Export GeoJSON */}
        <button
          onClick={onExportGeoJSON}
          title="Export 3D Cadastral GeoJSON"
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center justify-center"
        >
          <Download className="w-4 h-4" />
        </button>

      </div>

    </header>
  );
};
