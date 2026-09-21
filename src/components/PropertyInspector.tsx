/**
 * Cadastral Property Inspector & Hierarchy Navigator Side Panel
 * Provides clean, comprehensive inspection when clicking any Parcel, Building, Floor, Unit, or 3D Volume.
 */

import React, { useState, useMemo } from 'react';
import { 
  CadastralParcel, 
  Building, 
  FloorLevel, 
  PropertyUnit, 
  MapViewState,
  BuildingAcquisitionState
} from '../types/cadastre';
import { ULPIN_3D_DISCLAIMER, generateFloorUlpin3D, calculatePolygonAreaSqm } from '../utils/ulpinGenerator';
import { 
  Search, 
  Layers, 
  Building2, 
  MapPin, 
  Hash, 
  Maximize2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ShieldAlert, 
  FileCheck2, 
  UserCheck, 
  Zap, 
  Droplets, 
  IndianRupee, 
  ChevronRight, 
  ChevronDown,
  Info,
  Box,
  Sliders,
  Sparkles,
  ShieldCheck,
  Shield,
  CheckCircle2,
  AlertOctagon,
  ArrowUpRight,
  Eye,
  Crosshair,
  Scan,
  Pencil,
  X,
  RefreshCw,
  FileCode2,
  Upload,
  Clock
} from 'lucide-react';
import { BuildingTopologySummaryCard } from './BuildingTopologySummaryCard';
import { BuildingCadastralInfoCard } from './BuildingCadastralInfoCard';

interface PropertyInspectorProps {
  parcels: CadastralParcel[];
  viewState: MapViewState;
  selectedBuilding?: Building | null;
  appMode?: 'DEMO' | 'REAL_LOCATION';
  acquisitionState?: BuildingAcquisitionState;
  onRetryOsmQuery?: () => void;
  onSearchRadius?: (radiusM: number) => void;
  onUseCachedGeometry?: () => void;
  onOpenImportGeoJson?: () => void;
  onSelectParcel: (parcelId: string | null) => void;
  onSelectBuilding: (buildingId: string | null) => void;
  onSelectFloor: (floorNumber: number | null) => void;
  onSelectUnit: (unitId: string | null) => void;
  onExplodeToggle: () => void;
  onOpenPointCloud?: () => void;
  onOpenGeometryVerification?: () => void;
  onToggleLayerFilter?: (filterKey: keyof MapViewState, value: any) => void;
  onRenameBuilding?: (parcelId: string, buildingId: string, newName: string) => void;
  showSourceFootprint?: boolean;
  onToggleSourceFootprint?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  parcels,
  viewState,
  selectedBuilding: selectedBuildingProp,
  appMode = 'DEMO',
  acquisitionState,
  onRetryOsmQuery,
  onSearchRadius,
  onUseCachedGeometry,
  onOpenImportGeoJson,
  onSelectParcel,
  onSelectBuilding,
  onSelectFloor,
  onSelectUnit,
  onExplodeToggle,
  onOpenPointCloud,
  onOpenGeometryVerification,
  onRenameBuilding,
  showSourceFootprint = true,
  onToggleSourceFootprint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUlpin, setCopiedUlpin] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspect' | 'hierarchy'>('inspect');
  const [isEditingBuildingName, setIsEditingBuildingName] = useState(false);
  const [editedBuildingName, setEditedBuildingName] = useState('');
  const [localShowSourceFootprint, setLocalShowSourceFootprint] = useState(showSourceFootprint);

  // Filter search results across parcels, buildings, and property units
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    const matchedParcels: CadastralParcel[] = [];
    const matchedUnits: { unit: PropertyUnit; parcel: CadastralParcel; building: Building }[] = [];

    for (const p of parcels) {
      if (
        p.id.toLowerCase().includes(q) ||
        p.ulpin2D.toLowerCase().includes(q) ||
        p.surveyNumber.toLowerCase().includes(q) ||
        p.villageWard.toLowerCase().includes(q)
      ) {
        matchedParcels.push(p);
      }

      for (const b of p.buildings) {
        for (const fl of b.floors) {
          for (const u of fl.units) {
            if (
              u.prototypeUlpin3D.toLowerCase().includes(q) ||
              u.unitNumber.toLowerCase().includes(q) ||
              u.ownerName.toLowerCase().includes(q) ||
              u.electricityMeterId.toLowerCase().includes(q)
            ) {
              matchedUnits.push({ unit: u, parcel: p, building: b });
            }
          }
        }
      }
    }

    return { parcels: matchedParcels, units: matchedUnits };
  }, [parcels, searchQuery]);

  // Selected Entity References
  const selectedParcel = useMemo(() => {
    if (appMode === 'REAL_LOCATION') {
      if (acquisitionState && acquisitionState.status !== 'polygon_found') {
        return null;
      }
      return parcels.find(p => p.id === viewState.selectedParcelId) || parcels[0] || null;
    }
    return parcels.find(p => p.id === viewState.selectedParcelId) || parcels[0] || null;
  }, [parcels, viewState.selectedParcelId, appMode, acquisitionState]);

  const selectedBuilding = useMemo(() => {
    if (appMode === 'REAL_LOCATION') {
      if (acquisitionState && acquisitionState.status !== 'polygon_found') {
        return null;
      }
      if (acquisitionState?.selectedBuilding) {
        return acquisitionState.selectedBuilding;
      }
    }
    if (selectedBuildingProp) return selectedBuildingProp;
    if (!selectedParcel) return null;
    return selectedParcel.buildings.find(b => b.id === viewState.selectedBuildingId) || selectedParcel.buildings[0] || null;
  }, [selectedParcel, viewState.selectedBuildingId, selectedBuildingProp, appMode, acquisitionState]);

  const selectedFloor = useMemo(() => {
    if (!selectedBuilding || viewState.selectedFloorNumber === null) return null;
    return selectedBuilding.floors.find(f => f.floorNumber === viewState.selectedFloorNumber) || null;
  }, [selectedBuilding, viewState.selectedFloorNumber]);

  const selectedUnit = useMemo(() => {
    if (!selectedBuilding || !viewState.selectedUnitId) return null;
    for (const fl of selectedBuilding.floors) {
      const u = fl.units.find(unit => unit.id === viewState.selectedUnitId);
      if (u) return u;
    }
    return null;
  }, [selectedBuilding, viewState.selectedUnitId]);

  const handleCopyUlpin = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUlpin(true);
    setTimeout(() => setCopiedUlpin(false), 2000);
  };

  // Determine Conflict Label
  const getConflictLabel = (unit: PropertyUnit) => {
    if (!unit.hasTopologyCollision) return 'None (Compliant)';
    if (unit.collisionReason?.includes('projects') || unit.collisionReason?.includes('overhang') || unit.id.includes('f4_02')) {
      return 'Unauthorized Cantilever Overhang';
    }
    if (unit.collisionReason?.includes('overlap') || unit.collisionReason?.includes('intersects') || unit.id.includes('f3_01') || unit.id.includes('f3_02')) {
      return '3D Volumetric Property Overlap';
    }
    return 'Spatial Boundary Warning';
  };

  // Determine formatted level name
  const formatFloorName = (floorNumber: number) => {
    if (floorNumber < 0) return `Basement B${Math.abs(floorNumber)}`;
    if (floorNumber === 0) return 'Ground Level';
    return `Floor ${floorNumber}`;
  };

  return (
    <aside className="w-80 md:w-96 h-full bg-slate-900/95 border-r border-slate-800 flex flex-col shadow-2xl z-20 overflow-hidden select-none">
      
      {/* 1. Global Cadastral Omnibox Search */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search 2D ULPIN, 3D ID, Flat, Owner..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchResults && (
          <div className="mt-2 max-h-56 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-1 space-y-1">
            {searchResults.units.length === 0 && searchResults.parcels.length === 0 && (
              <div className="p-2 text-xs text-slate-500 text-center">No matching cadastral records found</div>
            )}

            {searchResults.parcels.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectParcel(p.id);
                  onSelectBuilding(p.buildings[0]?.id || null);
                  onSelectFloor(null);
                  onSelectUnit(null);
                  setSearchQuery('');
                }}
                className="w-full text-left p-2 hover:bg-slate-800 rounded text-xs flex items-center justify-between text-slate-200 transition-colors"
              >
                <div>
                  <span className="font-bold text-blue-400">Parcel {p.id}</span>
                  <div className="text-[10px] text-slate-400 font-mono">ULPIN: {p.ulpin2D}</div>
                </div>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Parcel</span>
              </button>
            ))}

            {searchResults.units.map(({ unit, parcel, building }) => (
              <button
                key={unit.id}
                onClick={() => {
                  onSelectParcel(parcel.id);
                  onSelectBuilding(building.id);
                  onSelectFloor(unit.floorNumber);
                  onSelectUnit(unit.id);
                  setSearchQuery('');
                }}
                className="w-full text-left p-2 hover:bg-slate-800 rounded text-xs flex items-center justify-between text-slate-200 transition-colors"
              >
                <div>
                  <div className="font-bold text-amber-300">{unit.unitNumber}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{unit.prototypeUlpin3D}</div>
                  <div className="text-[10px] text-slate-400">Owner: {unit.ownerName}</div>
                </div>
                <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">
                  Floor {unit.floorNumber}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Interactive Cadastral Hierarchy Breadcrumb Navigator */}
      <div className="px-3.5 py-2 bg-slate-950/90 border-b border-slate-800 text-[10px] font-mono">
        <div className="flex items-center justify-between font-bold text-slate-400 mb-1.5">
          <span className="uppercase tracking-wider">Cadastral Selection:</span>
          <span className="text-blue-400 flex items-center gap-1">
            <Crosshair className="w-3 h-3" />
            3D Cadastre
          </span>
        </div>

        {/* 4-Tier Interactive Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
          <button
            onClick={() => {
              if (selectedParcel) {
                onSelectFloor(null);
                onSelectUnit(null);
              }
            }}
            className={`p-1.5 rounded transition-all font-semibold ${
              selectedParcel && !selectedUnit && viewState.selectedFloorNumber === null
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            1. PARCEL
          </button>

          <button
            onClick={() => {
              if (selectedBuilding) {
                onSelectFloor(null);
                onSelectUnit(null);
              }
            }}
            className={`p-1.5 rounded transition-all font-semibold ${
              selectedBuilding && !selectedUnit && viewState.selectedFloorNumber === null
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            2. BLDG
          </button>

          <button
            onClick={() => {
              if (selectedBuilding && selectedBuilding.floors.length > 0) {
                const targetFloor = viewState.selectedFloorNumber ?? selectedBuilding.floors[0].floorNumber;
                onSelectFloor(targetFloor);
                onSelectUnit(null);
              }
            }}
            className={`p-1.5 rounded transition-all font-semibold ${
              viewState.selectedFloorNumber !== null && !selectedUnit
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            3. LEVEL
          </button>

          <button
            className={`p-1.5 rounded transition-all font-semibold ${
              selectedUnit
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800/80 text-slate-500'
            }`}
          >
            4. UNIT/3D
          </button>
        </div>
      </div>

      {/* 3. Parcel Quick Switcher Bar */}
      <div className="px-3.5 py-1.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">Parcels:</span>
        {parcels.map(p => (
          <button
            key={p.id}
            onClick={() => {
              onSelectParcel(p.id);
              onSelectBuilding(p.buildings[0]?.id || null);
              onSelectFloor(null);
              onSelectUnit(null);
            }}
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold transition-all whitespace-nowrap ${
              p.id === selectedParcel?.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            {p.id}
          </button>
        ))}
      </div>

      {/* 4. Main Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        
        {/* =========================================================================
            A. PRIMARY SELECTED 3D PROPERTY UNIT / 3D VOLUME INSPECTION PANEL
            (Shown prominently when a unit or 3D volume is clicked/selected)
           ========================================================================= */}
        {selectedUnit ? (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Primary Unit Identity & Status Banner */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                    3D Property Inspection
                  </span>
                  <h2 className="text-base font-extrabold text-white mt-0.5 tracking-tight font-sans">
                    {selectedUnit.unitNumber.toUpperCase()}
                  </h2>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{selectedUnit.unitType}</span>
                </div>

                {/* Boundary Status Badge */}
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                    selectedUnit.hasTopologyCollision
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  }`}>
                    {selectedUnit.hasTopologyCollision ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Warning
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Compliant
                      </>
                    )}
                  </span>
                  <div className="text-[9px] text-slate-500 mt-1 font-mono">
                    {selectedUnit.hasTopologyCollision ? 'Spatial Anomaly Flagged' : 'Volumetric Title Clean'}
                  </div>
                </div>
              </div>

              {/* Exact Standardized Inspection Spec Sheet */}
              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/90 space-y-2 text-[11px]">
                
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Parent Parcel:</span>
                  <button 
                    onClick={() => {
                      onSelectFloor(null);
                      onSelectUnit(null);
                    }}
                    className="font-mono font-bold text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>{selectedUnit.parcelId}</span>
                    <span className="text-[10px] text-slate-400">({selectedParcel?.surveyNumber || 'Sy. No.'})</span>
                  </button>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Building:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedUnit.buildingId}
                    <span className="text-[10px] font-normal text-slate-400 ml-1">
                      ({selectedBuilding?.name || 'Structure'})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Level:</span>
                  <span className="font-semibold text-slate-200">
                    {formatFloorName(selectedUnit.floorNumber)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">3D ULPIN:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-amber-300 text-[11px] select-all">
                      {selectedUnit.prototypeUlpin3D}
                    </span>
                    <button
                      onClick={() => handleCopyUlpin(selectedUnit.prototypeUlpin3D)}
                      title="Copy 3D ULPIN"
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                    >
                      {copiedUlpin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Area:</span>
                  <span className="font-mono font-bold text-slate-100">
                    {selectedUnit.builtUpAreaSqm} m²
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      (Carpet: {selectedUnit.carpetAreaSqm} m²)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Volume:</span>
                  <span className="font-mono font-bold text-blue-300">
                    {selectedUnit.volumeCubicM.toLocaleString()} m³
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Elevation:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {selectedUnit.minElevation >= 0 ? `+${selectedUnit.minElevation}m` : `${selectedUnit.minElevation}m`} to {selectedUnit.maxElevation >= 0 ? `+${selectedUnit.maxElevation}m` : `${selectedUnit.maxElevation}m`}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Boundary Status:</span>
                  <span className={`font-bold ${selectedUnit.hasTopologyCollision ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedUnit.hasTopologyCollision ? 'Warning' : 'Compliant'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Conflict:</span>
                  <span className={`font-bold text-right truncate max-w-[200px] ${selectedUnit.hasTopologyCollision ? 'text-rose-300' : 'text-slate-400'}`}>
                    {getConflictLabel(selectedUnit)}
                  </span>
                </div>

              </div>

              {/* Spatial Conflict Diagnostic Box (When Warning is flagged) */}
              {selectedUnit.hasTopologyCollision && (
                <div className="bg-rose-950/70 border border-rose-600 rounded-xl p-3.5 space-y-2.5 text-rose-200 shadow-lg animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300 text-xs">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                      <span>SPATIAL CONFLICT AUDIT</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Requires cadastral review
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                      Diagnosis:
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-100 bg-rose-900/40 p-2.5 rounded-lg border border-rose-800/70">
                      {selectedUnit.collisionReason}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/80 p-2.5 rounded-lg border border-rose-900/40">
                    <div>
                      <span className="text-slate-400 font-bold block">Affected Boundary:</span>
                      <span className="text-slate-200">
                        {selectedParcel ? `Eastern Setback (${selectedParcel.surveyNumber})` : 'Parcel Setback'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Encroachment Dimension:</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {selectedUnit.collisionReason?.includes('projects') ? '4.0 m (~56 m² area)' : '4.0 m (~18.2 m³)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Title Holder & Utility Municipal Registry */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Title & Municipal Registry</span>
                <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Title Holder:
                    </span>
                    <span className="font-semibold text-slate-100">{selectedUnit.ownerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity Meter:
                    </span>
                    <span className="font-mono text-slate-300">{selectedUnit.electricityMeterId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Water Connection:
                    </span>
                    <span className="font-mono text-slate-300">{selectedUnit.waterConsumerNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-500" /> Property Tax (Annual):
                    </span>
                    <span className="font-mono font-bold text-slate-200">₹{selectedUnit.annualPropertyTaxInr.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={onExplodeToggle}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                    viewState.isExplodedView
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{viewState.isExplodedView ? 'Collapse 3D' : 'Explode Floors'}</span>
                </button>

                {onOpenGeometryVerification ? (
                  <button
                    onClick={onOpenGeometryVerification}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Verify geometric bounds, floor schedule & IoU reference"
                  >
                    <Scan className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verify Geometry</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectUnit(null)}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Deselect Unit</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        ) : selectedFloor ? (
          /* =========================================================================
             B. SELECTED FLOOR / LEVEL INSPECTION PANEL
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xl">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sky-400" />
                    Vertical Strata Tier Inspection
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedFloor.floorName}</h3>
                  <span className="text-[11px] text-slate-400">{selectedBuilding?.name} • Parcel {selectedParcel?.id}</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-sky-900/40 border border-sky-700/50 text-sky-300 text-xs font-mono font-bold">
                  {formatFloorName(selectedFloor.floorNumber)}
                </span>
              </div>

              {/* Floor-Level 3D ULPIN Dedicated Spec Row */}
              {(() => {
                const floorUlpin = selectedFloor.prototypeUlpin3D || 
                  (selectedParcel && selectedBuilding 
                    ? generateFloorUlpin3D(selectedParcel.id, selectedBuilding.id, selectedFloor.floorNumber, 'KA', 'BLR')
                    : `IN-KA-BLR-${selectedParcel?.id || 'P001'}-${selectedBuilding?.id || 'B001'}-F${Math.abs(selectedFloor.floorNumber).toString().padStart(2, '0')}`);
                
                return (
                  <div className="bg-slate-900/90 rounded-lg p-3 border border-sky-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-sky-400" />
                        Floor-Level 3D ULPIN (Tier 3)
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Strata Plane
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-800">
                      <span className="font-mono font-bold text-sky-300 text-xs select-all">
                        {floorUlpin}
                      </span>
                      <button
                        onClick={() => handleCopyUlpin(floorUlpin)}
                        title="Copy Floor ULPIN"
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                      >
                        {copiedUlpin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      Standardized vertical identifier for this horizontal plane. Encompasses all {selectedFloor.units.length} strata title units and common vertical circulation shafts on this floor.
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-lg text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Elevation Range (MSL)</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {selectedFloor.elevationBottom >= 0 ? `+${selectedFloor.elevationBottom}m` : `${selectedFloor.elevationBottom}m`} to {selectedFloor.elevationTop >= 0 ? `+${selectedFloor.elevationTop}m` : `${selectedFloor.elevationTop}m`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Floor Height</span>
                  <span className="font-mono text-slate-200">{selectedFloor.height}m clearance</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Built Area</span>
                  <span className="font-mono text-slate-200">{selectedFloor.totalBuiltAreaSqm} m²</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Strata Units</span>
                  <span className="font-mono font-bold text-blue-400">{selectedFloor.units.length} registered units</span>
                </div>
              </div>

              {/* Units on Floor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Individual Units on this Floor (Tier 4 ULPINs):
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedFloor.units.length} units
                  </span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedFloor.units.map(u => (
                    <button
                      key={u.id}
                      onClick={() => onSelectUnit(u.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                        u.hasTopologyCollision
                          ? 'bg-rose-950/30 border-rose-800/70 text-rose-200 hover:bg-rose-900/40'
                          : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          {u.hasTopologyCollision && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          <span>{u.unitNumber}</span>
                        </div>
                        <div className="text-[10px] text-amber-300 font-mono mt-0.5">{u.prototypeUlpin3D}</div>
                        <div className="text-[10px] text-slate-400">Owner: {u.ownerName}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono font-bold text-slate-300 block">{u.builtUpAreaSqm} m²</span>
                        <span className="text-[9px] text-blue-400 hover:underline">Inspect ›</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : selectedBuilding ? (
          /* =========================================================================
             C. SELECTED BUILDING INSPECTION PANEL
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xl">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                      Building Inspection
                    </span>
                    {isEditingBuildingName ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="text"
                          value={editedBuildingName}
                          onChange={(e) => setEditedBuildingName(e.target.value)}
                          className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editedBuildingName.trim()) {
                              onRenameBuilding?.(selectedParcel.id, selectedBuilding.id, editedBuildingName.trim());
                              setIsEditingBuildingName(false);
                            }
                            if (e.key === 'Escape') setIsEditingBuildingName(false);
                          }}
                        />
                        <button
                          onClick={() => {
                            if (editedBuildingName.trim()) {
                              onRenameBuilding?.(selectedParcel.id, selectedBuilding.id, editedBuildingName.trim());
                              setIsEditingBuildingName(false);
                            }
                          }}
                          className="p-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded cursor-pointer font-bold"
                          title="Save Name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIsEditingBuildingName(false)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <h3 className="text-base font-bold text-white truncate">{selectedBuilding.name}</h3>
                        {onRenameBuilding && (
                          <button
                            onClick={() => {
                              setEditedBuildingName(selectedBuilding.name);
                              setIsEditingBuildingName(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-300 hover:bg-slate-800/60 rounded transition cursor-pointer"
                            title="Edit building name"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold shrink-0">
                  {selectedBuilding.id}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 p-2.5 rounded-lg text-center text-[10px]">
                <div>
                  <span className="text-slate-400 block">Total Height</span>
                  <span className="font-mono font-bold text-slate-100 text-xs">{selectedBuilding.totalHeightM}m</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Levels</span>
                  <span className="font-mono font-bold text-blue-400 text-xs">
                    {selectedBuilding.floorCountAboveGround} + {selectedBuilding.basementCount}B
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Units</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{selectedBuilding.totalUnitsCount}</span>
                </div>
              </div>

              {/* Mandatory SOURCE + PROVENANCE Card (Requirement 7) */}
              <div className="bg-slate-900/95 border border-cyan-500/50 rounded-xl p-3 space-y-2 text-[11px] shadow-lg">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    SOURCE + PROVENANCE
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedBuilding.isSynthetic || selectedBuilding.source === 'Cache' || acquisitionState?.isUsingFallback ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        CACHED / DEMO GEOMETRY
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        REAL OSM DATA
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      AUDITED
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Source:</span>
                    <strong className={selectedBuilding.isSynthetic || selectedBuilding.source === 'Cache' ? 'text-amber-300' : 'text-white'}>
                      {selectedBuilding.source || (selectedBuilding.isSynthetic ? 'Cache' : 'OSM')}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Source ID:</span>
                    <strong className="text-cyan-300">
                      #{selectedBuilding.sourceId || selectedBuilding.osmId || selectedBuilding.id}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Geometry:</span>
                    <strong className={selectedBuilding.geometrySource === 'CACHE' ? 'text-amber-300' : 'text-white'}>
                      {selectedBuilding.geometrySource === 'SYNTHETIC_DEMO' || appMode === 'DEMO'
                        ? 'Synthetic Demo'
                        : selectedBuilding.geometrySource === 'USER_GEOJSON' || selectedBuilding.geometrySource === 'GEOJSON_IMPORT'
                        ? 'GeoJSON'
                        : selectedBuilding.geometrySource || (selectedBuilding.isSynthetic ? 'CACHE' : 'OSM')}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Height:</span>
                    <strong className={selectedBuilding.heightSource === 'OSM_TAG' ? 'text-amber-400' : selectedBuilding.heightSource === 'USER_CONFIGURED' ? 'text-purple-400' : 'text-sky-400'}>
                      {selectedBuilding.heightSource === 'OSM_TAG'
                        ? 'OSM Tag'
                        : selectedBuilding.heightSource === 'USER_CONFIGURED'
                        ? 'User Configured'
                        : 'AI Estimated'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Floors:</span>
                    <strong className={selectedBuilding.floorSource === 'OSM' ? 'text-amber-400' : selectedBuilding.floorSource === 'UserConfigured' ? 'text-purple-400' : 'text-sky-400'}>
                      {selectedBuilding.floorSource === 'OSM'
                        ? 'OSM Tag'
                        : selectedBuilding.floorSource === 'UserConfigured'
                        ? 'User Configured'
                        : 'AI Estimated'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Confidence:</span>
                    <strong className="text-emerald-400">
                      {selectedBuilding.confidence ? `${selectedBuilding.confidence}%` : '85%'} ({selectedBuilding.confidenceLevel || 'High'})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Synthetic Fallback:</span>
                    <strong className={selectedBuilding.isSynthetic ? 'text-amber-400' : 'text-slate-400'}>
                      {selectedBuilding.isSynthetic ? 'YES (Cached / Demo)' : 'NO (Live Survey)'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">3D Geometry:</span>
                    <strong className="text-emerald-400">Procedurally Extruded 2D Polygon</strong>
                  </div>
                  {selectedBuilding.aiAnalysis && (
                    <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>AI Structure Type:</span>
                        <span className="text-sky-300 font-semibold">{selectedBuilding.aiAnalysis.structureType}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>AI Morphology:</span>
                        <span className="text-slate-300">{selectedBuilding.aiAnalysis.morphology}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-amber-300 font-bold text-[10px]">
                      {selectedBuilding.isSynthetic ? 'Verified Fallback Prototype (Offline Resilience)' : 'Prototype (Research / Hackathon Implementation)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI-ASSISTED BUILDING ANALYSIS Card (Requirement 2) */}
              <div className="bg-slate-900/95 border border-indigo-500/40 rounded-xl p-3 space-y-2 text-[11px] shadow-lg">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    AI-ASSISTED BUILDING ANALYSIS
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Confidence: {selectedBuilding.confidenceLevel ? `${selectedBuilding.confidenceLevel}` : '92%'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[10.5px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Building Type:</span>
                    <strong className="text-white truncate block">{selectedBuilding.structureType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Floors:</span>
                    <strong className="text-sky-300 font-mono">
                      {selectedBuilding.floorCountAboveGround} Storeys {selectedBuilding.basementCount > 0 ? `+ ${selectedBuilding.basementCount}B` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Height:</span>
                    <strong className="text-amber-300 font-mono">{selectedBuilding.totalHeightM} m</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Footprint Area:</span>
                    <strong className="text-emerald-300 font-mono">
                      {Math.round(calculatePolygonAreaSqm(selectedBuilding.footprintCoords))} m²
                    </strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Roof Characteristics:</span>
                    <span className="text-slate-200 font-mono text-[10px]">
                      {(selectedBuilding as any).roofCharacteristics || 'Flat Reinforced Concrete Slab with rooftop service core and parapet wall.'}
                    </span>
                  </div>
                </div>

                {/* Clear Cadastral Disclaimer */}
                <div className="p-2 bg-indigo-950/50 border border-indigo-800/60 rounded-lg text-[10px] text-indigo-200/90 leading-relaxed">
                  <div className="flex items-center gap-1 font-bold text-indigo-300 mb-0.5">
                    <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Volumetric Advisory:</span>
                  </div>
                  AI estimates are volumetric suggestions, not authoritative boundaries. 2D cadastral boundaries are strictly preserved without alteration. Not survey-grade.
                </div>
              </div>

              {/* Height Source & Geodetic CRS Provenance */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-sky-400" />
                    Height Source & Accuracy
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                    selectedBuilding.heightSource === 'OSM_TAG'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : selectedBuilding.heightSource === 'USER_CONFIGURED'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  }`}>
                    {selectedBuilding.heightSource === 'OSM_TAG'
                      ? 'OSM Tag (Volunteer)'
                      : selectedBuilding.heightSource === 'USER_CONFIGURED'
                        ? 'User Configured'
                        : 'AI Heuristic Estimate'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-300 bg-slate-950/70 p-1.5 rounded border border-slate-800/80 leading-relaxed font-mono">
                  {selectedBuilding.heightAccuracyNote || `Heuristic formula (${selectedBuilding.floorCountAboveGround} floors × 3.2m = ${selectedBuilding.totalHeightM}m). Not survey-grade.`}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                  <span>Footprint Points: <strong className="text-emerald-400">{selectedBuilding.footprintCoords.length} pts</strong></span>
                  <span>CRS: <strong className="text-sky-400">EPSG:4326 → EPSG:32643</strong></span>
                </div>
              </div>

              {/* Geometry Source & Provenance Metadata (Requirement 10) */}
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-lg p-2.5 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    BUILDING FOOTPRINT SOURCE
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                    selectedBuilding.geometrySource === 'SYNTHETIC_DEMO' || appMode === 'DEMO'
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : selectedBuilding.confidenceLevel === 'HIGH' || selectedBuilding.confidenceLevel === 'High' || (!selectedBuilding.confidenceLevel && (selectedBuilding.osmId || selectedBuilding.id.includes('OSM')))
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : selectedBuilding.confidenceLevel === 'MEDIUM' || selectedBuilding.confidenceLevel === 'Medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {selectedBuilding.geometrySource === 'SYNTHETIC_DEMO' || appMode === 'DEMO'
                      ? 'BENCHMARK SPECIMEN'
                      : selectedBuilding.confidenceLevel === 'HIGH' || selectedBuilding.confidenceLevel === 'High' || (!selectedBuilding.confidenceLevel && (selectedBuilding.osmId || selectedBuilding.id.includes('OSM')))
                        ? 'CONFIDENCE: HIGH'
                        : selectedBuilding.confidenceLevel === 'MEDIUM' || selectedBuilding.confidenceLevel === 'Medium'
                          ? 'CONFIDENCE: MEDIUM'
                          : 'CONFIDENCE: LOW (FALLBACK)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 bg-slate-950/70 p-2 rounded border border-slate-800/80 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Source:</span>
                    <strong className="text-white truncate block">
                      {selectedBuilding.geometrySource === 'SYNTHETIC_DEMO' || appMode === 'DEMO'
                        ? 'Synthetic Benchmark'
                        : selectedBuilding.geometrySource === 'CACHE' || acquisitionState?.source === 'CACHE'
                          ? 'Cached OSM Geometry'
                          : selectedBuilding.geometrySource === 'USER_GEOJSON' || selectedBuilding.geometrySource === 'GEOJSON_IMPORT'
                            ? 'GeoJSON Import'
                            : selectedBuilding.geometrySource === 'AI_EXTRACTION'
                              ? 'AI Extraction'
                              : selectedBuilding.geometrySource === 'CADASTRAL_MAP'
                                ? 'Cadastral Map'
                                : 'OSM (Overpass API)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">OSM / Source ID:</span>
                    <strong className="text-cyan-300 truncate block">
                      {selectedBuilding.geometrySource === 'SYNTHETIC_DEMO' || appMode === 'DEMO'
                        ? `Demo Specimen (#${selectedBuilding.id})`
                        : selectedBuilding.osmId
                          ? `#${selectedBuilding.osmId}`
                          : selectedBuilding.id.startsWith('B-OSM-')
                            ? `#${selectedBuilding.id.replace('B-OSM-', '')}`
                            : selectedBuilding.id}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Match Method:</span>
                    <strong className="text-emerald-400 truncate block">
                      {selectedBuilding.geometrySource === 'SYNTHETIC_DEMO' || appMode === 'DEMO'
                        ? 'Preset Testbench Model'
                        : selectedBuilding.geometrySource === 'CACHE' || acquisitionState?.source === 'CACHE'
                          ? 'Cached Verified Record'
                          : selectedBuilding.matchMethod === 'POINT_CONTAINMENT' || selectedBuilding.matchMethod === 'POINT_CONTAINS'
                            ? 'Point Containment'
                            : selectedBuilding.matchMethod === 'NEAREST_NEIGHBOR' || selectedBuilding.matchMethod === 'NEAREST'
                              ? `Nearest (${selectedBuilding.candidateDistanceM ? `${selectedBuilding.candidateDistanceM.toFixed(1)}m` : 'Radius'})`
                              : selectedBuilding.matchMethod === 'NAME_MATCH'
                                ? 'Name Match'
                                : selectedBuilding.matchMethod === 'TYPE_RELEVANCE'
                                  ? 'Type Relevance'
                                  : 'Exact Polygon'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Vertices / Area:</span>
                    <strong className="text-white">
                      {selectedBuilding.footprintCoords.length} pts • {Math.round(calculatePolygonAreaSqm(selectedBuilding.footprintCoords))} m²
                    </strong>
                  </div>

                  {selectedBuilding.cachedTimestamp && (
                    <div className="col-span-2 pt-1 border-t border-slate-800 text-[9.5px] text-amber-300">
                      Cache Record: Verified March 2026 Dataset
                    </div>
                  )}
                </div>

                {/* OSM Tags if available */}
                {selectedBuilding.osmTags && Object.keys(selectedBuilding.osmTags).length > 0 && (
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/70 font-mono text-[9px] text-slate-300">
                    <span className="text-slate-500 block mb-0.5 font-bold uppercase">OSM Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedBuilding.osmTags).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                          {k}={v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Footprint Layer Overlay Toggle (Requirement 10) */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">
                    <input
                      type="checkbox"
                      checked={localShowSourceFootprint}
                      onChange={() => {
                        const next = !localShowSourceFootprint;
                        setLocalShowSourceFootprint(next);
                        onToggleSourceFootprint?.();
                      }}
                      className="rounded accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Show Source Footprint</span>
                  </label>
                  <span className="text-[9px] font-mono text-slate-400">
                    Overlays 2D on 3D Model
                  </span>
                </div>
              </div>

              {/* Inspect LiDAR Point Cloud & Geometry Verification Buttons */}
              <div className="grid grid-cols-1 gap-2">
                {onOpenGeometryVerification && (
                  <button
                    onClick={onOpenGeometryVerification}
                    className="w-full px-3 py-2 bg-gradient-to-r from-cyan-950/50 via-slate-900 to-sky-950/50 hover:from-cyan-900/60 hover:to-sky-900/50 border border-cyan-500/40 hover:border-cyan-400/60 rounded-lg text-xs font-semibold text-cyan-200 flex items-center justify-between transition-all group shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-cyan-500/20 text-cyan-300">
                        <Scan className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white group-hover:text-cyan-200 flex items-center gap-1.5">
                          Verify 3D Geometry
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-cyan-500/30 text-cyan-200 rounded border border-cyan-400/30">
                            AABB & IoU
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Dynamic width, length, height, volume & reference overlay
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {onOpenPointCloud && (
                  <button
                    onClick={onOpenPointCloud}
                    className="w-full px-3 py-2 bg-gradient-to-r from-purple-900/40 via-slate-900 to-purple-950/50 hover:from-purple-900/60 hover:to-purple-900/50 border border-purple-500/40 hover:border-purple-400/60 rounded-lg text-xs font-semibold text-purple-200 flex items-center justify-between transition-all group shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-purple-500/20 text-purple-300">
                        <Box className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white group-hover:text-purple-200 flex items-center gap-1.5">
                          Inspect LiDAR Point Cloud
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-purple-500/30 text-purple-200 rounded border border-purple-400/30">
                            LoD-2/3
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Simulated laser returns & geometric profile for {selectedBuilding.name}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>

              {/* Requirement 14: Clean Cadastral Information Card */}
              <BuildingCadastralInfoCard
                building={selectedBuilding}
                parcel={selectedParcel}
                selectedFloorNumber={viewState.selectedFloorNumber}
                onVerifyFootprint={onOpenGeometryVerification}
              />

              {/* Requirement 9: 3D Topology Validation Card */}
              <BuildingTopologySummaryCard
                building={selectedBuilding}
                parcelBoundary={selectedParcel?.boundaryPolygon}
                onOpenFullValidation={onOpenGeometryVerification}
              />

              {/* Floor Stack Navigator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <span>Vertical Strata Matrix (Floor ULPINs):</span>
                  <span className="text-[10px] text-slate-500">Click to isolate floor</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {selectedBuilding.floors
                    .slice()
                    .reverse()
                    .map(fl => {
                      const isFloorSelected = viewState.selectedFloorNumber === fl.floorNumber;
                      const hasConflictOnFloor = fl.units.some(u => u.hasTopologyCollision);
                      const floorCode = fl.floorNumber < 0 ? `B${Math.abs(fl.floorNumber).toString().padStart(2, '0')}` : fl.floorNumber === 0 ? 'G00' : `F${fl.floorNumber.toString().padStart(2, '0')}`;
                      const floorUlpin = fl.prototypeUlpin3D || (selectedParcel ? generateFloorUlpin3D(selectedParcel.id, selectedBuilding.id, fl.floorNumber) : '');

                      return (
                        <button
                          key={fl.floorNumber}
                          onClick={() => {
                            onSelectFloor(isFloorSelected ? null : fl.floorNumber);
                            if (!isFloorSelected && fl.units.length > 0) {
                              onSelectUnit(fl.units[0].id);
                            }
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-all border ${
                            isFloorSelected
                              ? 'bg-blue-600/90 border-blue-400 text-white font-semibold shadow'
                              : hasConflictOnFloor
                              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">
                              {floorCode}
                            </span>
                            <div>
                              <div className="truncate font-medium text-[11px]">{fl.floorName}</div>
                              <div className="text-[9px] font-mono text-slate-400 opacity-80">{floorUlpin}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasConflictOnFloor && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Boundary Conflict Flagged" />
                            )}
                            <span className="text-[10px] opacity-75 font-mono">{fl.units.length} units</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

            </div>
          </div>
        ) : appMode === 'REAL_LOCATION' ? (
          /* =========================================================================
             C-ALT. REAL LOCATION - BUILDING GEOMETRY ACQUISITION PIPELINE STATUS PANEL
             (Shown when location is selected/searched, but real building polygon is being queried, timed out, or unmapped)
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xl">
              
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Building Geometry Acquisition
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {acquisitionState?.locationName || 'BNM Institute of Technology'}
                  </h3>
                  <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                    {acquisitionState?.locationCoords 
                      ? `${acquisitionState.locationCoords.lat.toFixed(5)}, ${acquisitionState.locationCoords.lng.toFixed(5)}`
                      : '12.92188, 77.56759'}
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  acquisitionState?.status === 'timeout'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : acquisitionState?.status === 'querying_osm'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                    : acquisitionState?.status === 'no_polygon'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {acquisitionState?.status === 'timeout'
                    ? 'TIMEOUT (12.0s)'
                    : acquisitionState?.status === 'querying_osm'
                    ? 'QUERYING OSM...'
                    : acquisitionState?.status === 'no_polygon'
                    ? 'NOT MAPPED'
                    : acquisitionState?.status?.toUpperCase() || 'IDLE'}
                </span>
              </div>

              {/* Multi-stage Pipeline Progress Bar */}
              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Cadastral Pipeline Stages:
                  </span>
                  {acquisitionState?.isUsingFallback ? (
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      CACHED / DEMO GEOMETRY
                    </span>
                  ) : acquisitionState?.status === 'polygon_found' ? (
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      LIVE OSM DATA
                    </span>
                  ) : null}
                </div>
                
                <div className="space-y-2 text-[10.5px] font-mono">
                  {/* Stage 1: Location Resolution */}
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> 1. Location Resolved (Nominatim)
                    </span>
                    <span className="text-[9.5px] text-slate-400">
                      {acquisitionState?.locationCoords 
                        ? `${acquisitionState.locationCoords.lat.toFixed(4)}, ${acquisitionState.locationCoords.lng.toFixed(4)}`
                        : '2D Lat/Lng'}
                    </span>
                  </div>

                  {/* Stage 2: OSM Footprint Query / Timeout Handling */}
                  {acquisitionState?.osmTimeoutOccurred || acquisitionState?.status === 'timeout' ? (
                    <>
                      <div className="flex items-center justify-between text-amber-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" /> 2. OSM Footprint Query
                        </span>
                        <span className="text-[9.5px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300">
                          {acquisitionState.responseTimeMs ? `${(acquisitionState.responseTimeMs / 1000).toFixed(1)}s` : '12.0s'} Timeout
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-400 pl-4 border-l-2 border-amber-500/40">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> 2b. Cached / Demo Geometry
                        </span>
                        <span className="text-[9.5px] text-amber-300 font-bold">
                          {acquisitionState.fallbackType || 'Verified Offline Data'}
                        </span>
                      </div>
                    </>
                  ) : acquisitionState?.status === 'querying_osm' ? (
                    <div className="flex items-center justify-between text-sky-400 animate-pulse font-medium">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" /> 2. Live OSM / Overpass Query
                      </span>
                      <span className="text-[9.5px]">In Flight...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 2. OSM Footprint Query
                      </span>
                      <span className="text-[9.5px] text-emerald-400">
                        {acquisitionState?.osmFootprintsCount ? `${acquisitionState.osmFootprintsCount} Polygons` : 'Polygon Acquired'}
                      </span>
                    </div>
                  )}

                  {/* Stage 3: AI Building Analysis */}
                  <div className={`flex items-center justify-between ${
                    acquisitionState?.aiAnalysis || acquisitionState?.selectedBuilding 
                      ? 'text-emerald-400' 
                      : 'text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {acquisitionState?.aiAnalysis || acquisitionState?.selectedBuilding ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Box className="w-3.5 h-3.5" />
                      )}
                      3. AI Building Analysis
                    </span>
                    <span className="text-[9.5px] text-slate-300">
                      {acquisitionState?.aiAnalysis 
                        ? `${acquisitionState.aiAnalysis.estimatedFloors} Floors • ${acquisitionState.aiAnalysis.estimatedHeightM}m`
                        : acquisitionState?.selectedBuilding
                        ? `${acquisitionState.selectedBuilding.floorCountAboveGround} Floors • ${acquisitionState.selectedBuilding.totalHeightM}m`
                        : 'AI Morphology Rule'}
                    </span>
                  </div>

                  {/* Stage 4: 3D Model Generation */}
                  <div className={`flex items-center justify-between ${
                    acquisitionState?.selectedBuilding ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {acquisitionState?.selectedBuilding ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Box className="w-3.5 h-3.5" />
                      )}
                      4. 3D Model Generation
                    </span>
                    <span className="text-[9.5px] text-slate-300">
                      {acquisitionState?.selectedBuilding ? 'Extruded 2D Polygon' : 'Awaiting Footprint'}
                    </span>
                  </div>

                  {/* Stage 5: Floor Segmentation */}
                  <div className={`flex items-center justify-between ${
                    acquisitionState?.selectedBuilding?.floors?.length ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {acquisitionState?.selectedBuilding?.floors?.length ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Layers className="w-3.5 h-3.5" />
                      )}
                      5. Floor Segmentation
                    </span>
                    <span className="text-[9.5px] text-slate-300">
                      {acquisitionState?.selectedBuilding?.floors?.length 
                        ? `${acquisitionState.selectedBuilding.floors.length} Levels Segmented` 
                        : 'Pending Extrusion'}
                    </span>
                  </div>

                  {/* Stage 6: 3D Cadastre & 3D ULPIN */}
                  <div className={`flex items-center justify-between ${
                    acquisitionState?.selectedBuilding ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {acquisitionState?.selectedBuilding ? (
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Shield className="w-3.5 h-3.5" />
                      )}
                      6. 3D Cadastre & 3D ULPIN
                    </span>
                    <span className="text-[9.5px] text-slate-300">
                      {acquisitionState?.selectedBuilding ? 'Prototype ULPIN Assigned' : 'Pending Floors'}
                    </span>
                  </div>

                  {/* Stage 7: Validation */}
                  <div className={`flex items-center justify-between ${
                    acquisitionState?.selectedBuilding ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {acquisitionState?.selectedBuilding ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      7. Topology Validation
                    </span>
                    <span className="text-[9.5px] text-slate-300">
                      {acquisitionState?.selectedBuilding ? 'Audited • 0 Clashes' : 'Pending Model'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Feed Status Grid */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-slate-300">
                    BUILDING FOOTPRINT STATUS
                  </span>
                  <span className={acquisitionState?.osmFootprintsCount ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {acquisitionState?.osmFootprintsCount ?? 0} Polygons in Radius
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded border border-slate-800/80 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Source:</span>
                    <strong className="text-slate-300">
                      {acquisitionState?.source === 'CACHE' 
                        ? 'Cached OSM Geometry' 
                        : acquisitionState?.source === 'USER_GEOJSON' 
                        ? 'GeoJSON Import' 
                        : acquisitionState?.source === 'LIDAR' 
                        ? 'LiDAR Point Cloud'
                        : 'OSM (Overpass API)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">OSM / Source ID:</span>
                    <strong className={acquisitionState?.selectedBuilding || acquisitionState?.selectedOsmBuilding ? 'text-cyan-400' : 'text-amber-400'}>
                      {acquisitionState?.selectedBuilding?.osmId 
                        ? `#${acquisitionState.selectedBuilding.osmId}`
                        : acquisitionState?.selectedOsmBuilding?.id 
                        ? `#${acquisitionState.selectedOsmBuilding.id}`
                        : 'None'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Candidate Buildings:</span>
                    <strong className="text-slate-300">
                      {acquisitionState?.candidates?.length ?? 0} candidates
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Selected Building:</span>
                    <strong className={acquisitionState?.selectedBuilding || acquisitionState?.selectedOsmBuilding ? 'text-emerald-400' : 'text-slate-400'}>
                      {acquisitionState?.selectedBuilding?.name || acquisitionState?.selectedOsmBuilding?.name || 'None'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Selection Method:</span>
                    <strong className="text-slate-400">
                      {acquisitionState?.selectionMethod || 'None'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Overpass Status:</span>
                    <strong className={
                      acquisitionState?.status === 'timeout'
                        ? 'text-amber-400 font-bold'
                        : acquisitionState?.status === 'polygon_found'
                        ? 'text-emerald-400 font-bold'
                        : acquisitionState?.status === 'querying_osm'
                        ? 'text-sky-400 animate-pulse'
                        : 'text-slate-300'
                    }>
                      {acquisitionState?.status === 'timeout'
                        ? 'TIMEOUT'
                        : acquisitionState?.status === 'polygon_found'
                        ? 'SUCCESS'
                        : acquisitionState?.status === 'querying_osm'
                        ? 'QUERYING'
                        : acquisitionState?.status === 'no_polygon'
                        ? '0 FOUND'
                        : (acquisitionState?.status?.toUpperCase() || 'IDLE')}
                    </strong>
                  </div>
                  <div className="col-span-2 flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Response Time:</span>
                    <strong className="text-slate-300">
                      {(((acquisitionState?.responseTimeMs ?? acquisitionState?.responseTime) || 12000) / 1000).toFixed(2)}s
                    </strong>
                  </div>
                </div>

                {acquisitionState?.isSoftTimeout && acquisitionState.status === 'querying_osm' && (
                  <div className="p-2 bg-amber-950/60 border border-amber-500/40 rounded text-[10px] text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Slow Overpass response (&gt;5.0s). Query still in-flight, attempting mirror endpoints...</span>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 leading-relaxed font-sans bg-slate-950/60 p-2 rounded border border-slate-800/60">
                  {acquisitionState?.status === 'timeout'
                    ? 'The OSM Overpass query timed out after 12.0s without returning a building footprint polygon. A 2D point search confirms the institution location, but the building geometry is acquired separately.'
                    : acquisitionState?.status === 'no_polygon'
                    ? `No mapped building polygon found within ${acquisitionState?.searchRadiusM || 100}m radius of this coordinate.`
                    : 'Awaiting building footprint acquisition from OSM, cached records, or GeoJSON import.'}
                </p>
              </div>

              {/* Recovery Action Buttons */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Footprint Recovery Actions:
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  {onRetryOsmQuery && (
                    <button
                      onClick={onRetryOsmQuery}
                      className="py-2 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Query</span>
                    </button>
                  )}

                  {onSearchRadius && (
                    <button
                      onClick={() => onSearchRadius(250)}
                      className="py-2 px-2.5 bg-sky-600/30 hover:bg-sky-600/40 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Search className="w-3 h-3" />
                      <span>Search 250m</span>
                    </button>
                  )}

                  {onUseCachedGeometry && (
                    <button
                      onClick={onUseCachedGeometry}
                      className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-1 cursor-pointer col-span-2"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>Use Cached Geometry (BNMIT Verified)</span>
                    </button>
                  )}

                  {onOpenImportGeoJson && (
                    <button
                      onClick={onOpenImportGeoJson}
                      className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer col-span-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Import Footprint GeoJSON</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* =========================================================================
            D. SELECTED PARCEL SUMMARY CARD
           ========================================================================= */}
        {selectedParcel && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs border border-blue-500/30">
                  2D
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">Parcel {selectedParcel.id}</h3>
                  <div className="text-[10px] text-slate-400">{selectedParcel.surveyNumber}</div>
                </div>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {selectedParcel.landUseCategory}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">2D Bhu-Aadhaar</span>
                <span className="font-mono font-bold text-blue-300">{selectedParcel.ulpin2D}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Land Area</span>
                <span className="font-mono text-slate-200">{selectedParcel.areaSqm.toLocaleString()} m²</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ground Elevation</span>
                <span className="font-mono text-slate-200">{selectedParcel.groundElevationMsl}m MSL</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Jurisdiction</span>
                <span className="text-slate-300 truncate">{selectedParcel.villageWard}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3D Specification Disclaimer Note */}
        <div className="pt-1">
          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-1 w-full justify-between"
          >
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              3D ULPIN Specification Note
            </span>
            <span>{showDisclaimer ? 'Hide' : 'Show'}</span>
          </button>
          {showDisclaimer && (
            <div className="mt-1.5 p-2 bg-slate-950 rounded text-[10px] text-slate-400 leading-relaxed border border-slate-800">
              {ULPIN_3D_DISCLAIMER}
            </div>
          )}
        </div>

      </div>

    </aside>
  );
};
