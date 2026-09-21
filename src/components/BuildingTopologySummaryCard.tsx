import React from 'react';
import { Building, SpatialCoordinates2D } from '../types/cadastre';
import { validateBuildingTopology, BuildingTopologyStatus } from '../utils/topologyEngine';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Layers, Box } from 'lucide-react';

interface BuildingTopologySummaryCardProps {
  building?: Building | null;
  parcelBoundary?: SpatialCoordinates2D[];
  onOpenFullValidation?: () => void;
  className?: string;
}

export const BuildingTopologySummaryCard: React.FC<BuildingTopologySummaryCardProps> = ({
  building,
  parcelBoundary,
  onOpenFullValidation,
  className = '',
}) => {
  if (!building) return null;

  const status: BuildingTopologyStatus = validateBuildingTopology(building, parcelBoundary);
  const isCompliant = status.overall === 'COMPLIANT';

  return (
    <div 
      id="building-3d-topology-card"
      className={`bg-slate-900/90 backdrop-blur-md rounded-2xl border ${
        isCompliant ? 'border-emerald-500/40' : 'border-rose-500/60'
      } p-4 shadow-xl text-left space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          {isCompliant ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            3D Topology Validation
          </span>
        </div>
        <span 
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
            isCompliant
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
          }`}
        >
          {status.overall}
        </span>
      </div>

      {/* Grid of Standard 3D Checks */}
      <div className="grid grid-cols-3 gap-2">
        {/* Check 1: Boundary Check */}
        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-medium truncate">Boundary Check</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {status.boundaryCheck === 'PASS' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">PASS</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">FAIL</span>
              </>
            )}
          </div>
        </div>

        {/* Check 2: Vertical Gaps */}
        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-medium truncate">Vertical Gaps</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {status.verticalGaps === 'NONE' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">NONE</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">DETECTED</span>
              </>
            )}
          </div>
        </div>

        {/* Check 3: Unit Overlaps */}
        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-medium truncate">Unit Overlaps</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {status.unitOverlaps === 'NONE' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">NONE</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">DETECTED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Plain English Issue Explanations */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] uppercase font-semibold text-slate-400">
          Spatial Relationship Assessment:
        </div>
        <div className="space-y-1">
          {status.explanations.map((exp, i) => (
            <div 
              key={i} 
              className={`text-[11px] leading-relaxed p-2 rounded-lg border ${
                isCompliant 
                  ? 'bg-emerald-950/30 text-emerald-200 border-emerald-800/40' 
                  : 'bg-rose-950/40 text-rose-200 border-rose-800/60'
              }`}
            >
              • {exp}
            </div>
          ))}
        </div>
      </div>

      {/* Full Validation Report link if handler passed */}
      {onOpenFullValidation && (
        <button
          onClick={onOpenFullValidation}
          className="w-full mt-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Open Full 3D Topology Audit Report</span>
        </button>
      )}
    </div>
  );
};
