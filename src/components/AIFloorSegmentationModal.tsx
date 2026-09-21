import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  Building2, 
  ArrowRight, 
  TrendingUp, 
  Box, 
  Info,
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { AIFloorSegmentationResult, CadastralParcel } from '../types/cadastre';
import { DynamicSelectedBuilding } from '../utils/osmService';
import { generateFloorUlpin3D } from '../utils/ulpinGenerator';

interface AIFloorSegmentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcels: CadastralParcel[];
  selectedBuilding?: DynamicSelectedBuilding | null;
  onApplyFloorsToCadastre: (parcelId: string, floorData: any) => void;
  onProceedTo3DView: () => void;
}

export const AIFloorSegmentationModal: React.FC<AIFloorSegmentationModalProps> = ({
  isOpen,
  onClose,
  parcels,
  selectedBuilding,
  onApplyFloorsToCadastre,
  onProceedTo3DView,
}) => {
  const [selectedParcelId, setSelectedParcelId] = useState<string>(
    selectedBuilding?.parcelId || parcels[0]?.id || 'P001'
  );
  const [buildingHeight, setBuildingHeight] = useState<number>(selectedBuilding?.height || (selectedBuilding as any)?.totalHeightM || 36.0);
  const [floorCount, setFloorCount] = useState<number>(selectedBuilding?.levels || (selectedBuilding as any)?.floorCountAboveGround || 12);
  const [basementCount, setBasementCount] = useState<number>(selectedBuilding?.undergroundLevels ?? (selectedBuilding as any)?.basementCount ?? 1);
  const [confidenceScore, setConfidenceScore] = useState<number>(selectedBuilding?.confidence || 91.4);

  // Sync state whenever selectedBuilding changes
  useEffect(() => {
    if (selectedBuilding) {
      if (selectedBuilding.parcelId) setSelectedParcelId(selectedBuilding.parcelId);
      setBuildingHeight(selectedBuilding.height || (selectedBuilding as any).totalHeightM || 36.0);
      setFloorCount(Math.max(1, selectedBuilding.levels || (selectedBuilding as any).floorCountAboveGround || 12));
      const effectiveLevels = selectedBuilding.levels || (selectedBuilding as any).floorCountAboveGround || 0;
      setBasementCount(selectedBuilding.undergroundLevels ?? (selectedBuilding as any).basementCount ?? (effectiveLevels >= 5 ? 1 : 0));
      setConfidenceScore(selectedBuilding.confidence || 92.0);
    }
  }, [selectedBuilding]);

  // Compute active footprint area
  const footprintAreaSqm = useMemo(() => {
    if (selectedBuilding?.footprintArea) return selectedBuilding.footprintArea;
    const parcel = parcels.find(p => p.id === selectedParcelId) || parcels[0];
    return parcel?.areaSqm ? Math.round(parcel.areaSqm * 0.45) : 850;
  }, [selectedBuilding, parcels, selectedParcelId]);

  // Dynamic unit calculation based on footprint area:
  // area < 150 m² → 1 unit
  // 150-300 m² → 2 units
  // 300-600 m² → 4 units
  // 600-1000 m² → 6 units
  // >1000 m² → 8 units
  const unitsPerStandardFloor = useMemo(() => {
    if (footprintAreaSqm < 150) return 1;
    if (footprintAreaSqm <= 300) return 2;
    if (footprintAreaSqm <= 600) return 4;
    if (footprintAreaSqm <= 1000) return 6;
    return 8;
  }, [footprintAreaSqm]);

  if (!isOpen) return null;

  const averageFloorHeight = Number((buildingHeight / Math.max(1, floorCount)).toFixed(2));

  // Generate dynamic vertical floor slots
  const floorItems = [];
  for (let f = floorCount; f >= 1; f--) {
    const topZ = Number((f * averageFloorHeight).toFixed(1));
    const bottomZ = Number(((f - 1) * averageFloorHeight).toFixed(1));
    const isPenthouse = f === floorCount && floorCount >= 3;
    const unitCount = isPenthouse ? Math.max(1, Math.round(unitsPerStandardFloor / 2)) : unitsPerStandardFloor;

    floorItems.push({
      floorNumber: f,
      name: isPenthouse 
        ? `Floor ${f} (Penthouse / Terrace Rights)` 
        : `Floor ${f} (Strata Property Volume)`,
      bottomZ,
      topZ,
      height: averageFloorHeight,
      unitCount,
      isBasement: false,
    });
  }

  // Add Basements
  for (let b = 1; b <= basementCount; b++) {
    const bottomZ = Number((-b * 3.2).toFixed(1));
    const topZ = Number((-(b - 1) * 3.2).toFixed(1));
    floorItems.push({
      floorNumber: -b,
      name: `Basement Level -${b} (Sub-surface Parking & Utility Bay)`,
      bottomZ,
      topZ,
      height: 3.2,
      unitCount: Math.max(1, Math.round(unitsPerStandardFloor / 2)),
      isBasement: true,
    });
  }

  const totalEstimatedUnits = floorItems.reduce((sum, item) => sum + item.unitCount, 0);

  const handleApply = () => {
    onApplyFloorsToCadastre(selectedParcelId, {
      buildingHeight,
      floorCount,
      basementCount,
      floorItems,
      confidenceScore,
      footprintAreaSqm,
      unitsPerStandardFloor,
      selectedBuilding,
    });
    onClose();
    onProceedTo3DView();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Vertical Floor Segmentation & Elevation Estimator
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                  ISO 19152 LADM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Segment vertical building volumes into standardized strata floor levels and assign 3D spatial boundaries.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Active Target Banner */}
          {selectedBuilding && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">{selectedBuilding.name}</span>
                  <span className="text-[11px] text-indigo-300/80 font-mono">
                    Footprint: <strong className="text-emerald-400">{footprintAreaSqm} m²</strong> • Source: {selectedBuilding.source}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {unitsPerStandardFloor} Units/Floor (Area Heuristic)
                </span>
                <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded font-bold">
                  {selectedBuilding.isLevelsEstimated ? 'AI Estimated Storeys' : 'Verified Levels'}
                </span>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Parcel</label>
              <select
                value={selectedParcelId}
                onChange={(e) => setSelectedParcelId(e.target.value)}
                className="w-full bg-slate-900 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
              >
                {parcels.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id} - {p.surveyNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Building Height (m)</label>
              <input
                type="number"
                value={buildingHeight}
                onChange={(e) => setBuildingHeight(Math.max(3, parseFloat(e.target.value) || 3))}
                step="0.5"
                className="w-full bg-slate-900 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Above-Ground Floors</label>
              <input
                type="number"
                value={floorCount}
                onChange={(e) => setFloorCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Basements (-Z)</label>
              <input
                type="number"
                value={basementCount}
                onChange={(e) => setBasementCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* AI Metrics Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Confidence Score</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{confidenceScore}%</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Avg Floor Height</span>
              <span className="text-sm font-bold text-sky-400 font-mono">{averageFloorHeight}m</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Total Vertical Span</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{(buildingHeight + basementCount * 3.2).toFixed(1)}m</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Estimated Units</span>
              <span className="text-sm font-bold text-purple-400 font-mono">{totalEstimatedUnits} Units</span>
            </div>
          </div>

          {/* Vertical Segmentation Visualizer Diagram */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Vertical Strata Elevation Stack (+{buildingHeight}m Roof → 0.0m Ground → {basementCount > 0 ? `-${(basementCount * 3.2).toFixed(1)}m` : '0.0m'} Sub-surface)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Datum: MSL 920.0m</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {floorItems.map((item) => {
                const floorUlpin = generateFloorUlpin3D(
                  selectedParcelId || 'P001',
                  selectedBuilding?.id ? selectedBuilding.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) : 'B001',
                  item.floorNumber,
                  'KA',
                  'BLR'
                );

                return (
                  <div
                    key={item.floorNumber}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      item.isBasement
                        ? 'bg-slate-900/60 border-purple-500/30 text-purple-200'
                        : item.floorNumber === floorCount
                          ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        item.isBasement ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {item.floorNumber < 0 ? `B${Math.abs(item.floorNumber)}` : `F${item.floorNumber.toString().padStart(2, '0')}`}
                      </span>
                      <div>
                        <div className="font-medium text-xs">{item.name}</div>
                        <div className="text-[10px] font-mono text-sky-400/90">{floorUlpin}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                      <span className="text-purple-300 font-semibold">{item.unitCount} {item.unitCount === 1 ? 'Unit' : 'Units'}</span>
                      <span className="text-slate-300">
                        {item.bottomZ >= 0 ? `+${item.bottomZ.toFixed(1)}m` : `${item.bottomZ.toFixed(1)}m`} → {item.topZ >= 0 ? `+${item.topZ.toFixed(1)}m` : `${item.topZ.toFixed(1)}m`}
                      </span>
                      <span className="text-xs text-blue-400">({item.height.toFixed(1)}m)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Apply Floors to 3D Cadastre & View in 3D</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

