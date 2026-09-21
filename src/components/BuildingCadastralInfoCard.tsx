import React from 'react';
import { Building, CadastralParcel } from '../types/cadastre';
import { getProvenanceBadge, ProvenanceBadgeType } from '../utils/buildingResolutionPipeline';
import { validateBuildingTopology } from '../utils/topologyEngine';
import { Building2, Layers, CheckCircle2, AlertTriangle, Shield, Compass, FileCheck } from 'lucide-react';

interface BuildingCadastralInfoCardProps {
  building: Building;
  parcel?: CadastralParcel | null;
  selectedFloorNumber?: number | null;
  onVerifyFootprint?: () => void;
  className?: string;
}

export const BuildingCadastralInfoCard: React.FC<BuildingCadastralInfoCardProps> = ({
  building,
  parcel,
  selectedFloorNumber,
  onVerifyFootprint,
  className = '',
}) => {
  if (!building) return null;

  const topology = validateBuildingTopology(building, parcel?.boundaryPolygon);
  const isCompliant = topology.overall === 'COMPLIANT';

  // Determine provenance badge
  const isOverride = building.heightSource === 'USER_CONFIGURED';
  const isCached = building.source === 'Cache' || building.matchMethod === 'CACHED_RECORD';
  const isSynthetic = building.isSynthetic || building.source === 'Demo';
  const hasLevels = !!building.osmTags?.['building:levels'];
  const badgeInfo = getProvenanceBadge(building.source, isSynthetic, isOverride, hasLevels);

  // Determine 3D Property ID
  const activeFloorNumber = selectedFloorNumber ?? (building.floors[0]?.floorNumber ?? 1);
  const activeFloor = building.floors.find(f => f.floorNumber === activeFloorNumber) || building.floors[0];
  const activeUnit = activeFloor?.units?.[0];
  const prototype3DUlpin = activeUnit?.prototypeUlpin3D || activeFloor?.prototypeUlpin3D || `IN-KA-BLR-${building.parcelId || 'P001'}-${building.id}-F01-U01`;
  const parent2DUlpin = parcel?.ulpin2D || `ULPIN-2D-${building.parcelId || 'KA-BLR-001'}`;

  // Floor source text
  let floorSourceText = 'OSM building:levels';
  if (building.heightSource === 'USER_CONFIGURED') {
    floorSourceText = 'User Overridden';
  } else if (building.osmTags?.height) {
    floorSourceText = 'OSM Height Estimate';
  } else if (building.aiAnalysis) {
    floorSourceText = 'AI Morphology Rule';
  } else if (building.source === 'Cache') {
    floorSourceText = 'Cached Cadastral Record';
  } else if (isSynthetic) {
    floorSourceText = 'Synthetic Prototype Cadastre';
  }

  // Confidence text
  const confidence = building.confidenceLevel || (building.confidence && building.confidence > 85 ? 'HIGH' : 'MEDIUM') || 'MEDIUM';

  return (
    <div 
      id="professional-cadastral-info-card"
      className={`bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-2xl space-y-3.5 text-left ${className}`}
    >
      {/* Header with Title and Provenance Badge */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">
            BUILDING
          </div>
          <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate max-w-[210px]">{building.name}</span>
          </div>
        </div>
        <div 
          title={badgeInfo.tooltip}
          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold tracking-wider uppercase border ${badgeInfo.color}`}
        >
          {badgeInfo.badge}
        </div>
      </div>

      {/* 2x2 Primary Cadastral Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">SOURCE</div>
          <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
            {building.source === 'OSM' ? 'OpenStreetMap' : building.source === 'Cache' ? 'Cached OSM' : building.source === 'GeoJSON' ? 'GeoJSON Import' : 'Synthetic Demo'}
          </div>
        </div>

        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">FLOOR SOURCE</div>
          <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
            {floorSourceText}
          </div>
        </div>

        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">FLOORS</div>
          <div className="text-base font-bold text-sky-300 mt-0.5 flex items-baseline gap-1">
            <span>{building.floorCountAboveGround}</span>
            {building.basementCount > 0 && (
              <span className="text-[11px] text-amber-400 font-medium">+{building.basementCount}B</span>
            )}
          </div>
        </div>

        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">HEIGHT</div>
          <div className="text-base font-bold text-emerald-300 mt-0.5">
            {building.totalHeightM.toFixed(1)} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
        </div>
      </div>

      {/* 3D Property ID & 2D ULPIN */}
      <div className="bg-slate-950/80 rounded-xl p-2.5 border border-sky-900/60 space-y-1.5">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-sky-400">3D PROPERTY ID</span>
            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-800 rounded">PROTOTYPE</span>
          </div>
          <div className="text-xs font-mono font-bold text-white mt-0.5 tracking-wide break-all select-all">
            {prototype3DUlpin}
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10.5px]">
          <span className="text-slate-400">Parent 2D ULPIN:</span>
          <span className="font-mono text-slate-300 font-medium select-all">{parent2DUlpin}</span>
        </div>
      </div>

      {/* Confidence & Topology Bottom Status Row */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <div className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">CONFIDENCE</span>
          <span className={`text-xs font-bold ${
            confidence === 'HIGH' ? 'text-emerald-400' : confidence === 'MEDIUM' ? 'text-sky-400' : 'text-amber-400'
          }`}>
            {confidence}
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
          <span className="text-[10px] uppercase text-slate-400 font-semibold">TOPOLOGY</span>
          <span className={`text-xs font-bold flex items-center gap-1 ${
            isCompliant ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isCompliant ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PASS</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>FAIL</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Verify Footprint Action */}
      {onVerifyFootprint && (
        <button
          onClick={onVerifyFootprint}
          className="w-full py-2 px-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Verify Footprint & Geometry</span>
        </button>
      )}

      {/* Disclaimer */}
      <div className="text-[9.5px] text-slate-500 leading-tight text-center">
        3D Cadastral research prototype. Not an official government survey certificate.
      </div>
    </div>
  );
};
