import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Droplets, 
  Zap, 
  Radio, 
  Box, 
  Building2, 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  ArrowRight,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { 
  CadastralParcel, 
  UndergroundAsset, 
  UndergroundVisibilityFilter, 
  UndergroundUtilityType 
} from '../types/cadastre';

interface UndergroundUtilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  parcels: CadastralParcel[];
  filter: UndergroundVisibilityFilter;
  onFilterChange: (newFilter: UndergroundVisibilityFilter) => void;
  onSelectUndergroundAsset: (assetId: string) => void;
  onNavigateToConflict: (assetId: string) => void;
}

export const UndergroundUtilityPanel: React.FC<UndergroundUtilityPanelProps> = ({
  isOpen,
  onClose,
  parcels,
  filter,
  onFilterChange,
  onSelectUndergroundAsset,
  onNavigateToConflict,
}) => {
  const [selectedParcelId, setSelectedParcelId] = useState<string>(parcels[0]?.id || 'P001');

  if (!isOpen) return null;

  const currentParcel = parcels.find(p => p.id === selectedParcelId) || parcels[0];
  const assets: UndergroundAsset[] = currentParcel?.undergroundAssets || [];

  const toggleLayer = (key: keyof UndergroundVisibilityFilter) => {
    onFilterChange({
      ...filter,
      [key]: !filter[key],
    });
  };

  const getLayerIcon = (type: UndergroundUtilityType) => {
    switch (type) {
      case 'Water Pipeline':
        return <Droplets className="w-4 h-4 text-cyan-400" />;
      case 'Sewage Pipeline':
        return <Droplets className="w-4 h-4 text-lime-400" />;
      case 'Electrical Cable':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Fiber Optic Cable':
        return <Radio className="w-4 h-4 text-pink-400" />;
      case 'Underground Parking':
        return <Box className="w-4 h-4 text-blue-400" />;
      case 'Utility Tunnel':
        return <Layers className="w-4 h-4 text-purple-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Sub-Surface Infrastructure & 3D Utility Cadastre
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full font-mono">
                  GPR / Municipal Easement
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage 3D spatial boundaries for subterranean water, sewage, electrical conduits, parking vaults, and transit tunnels.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Multi-Layer Visibility Controls Grid */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                3D Volumetric Layer Visibility Toggles (6 Underground + 2 Surface)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Real-time Scene Synchronization</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* Surface & Ground */}
              <button
                onClick={() => toggleLayer('showSurfaceBuilding')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showSurfaceBuilding
                    ? 'bg-blue-500/15 border-blue-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-medium">Surface Building</span>
                </div>
                {filter.showSurfaceBuilding ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              <button
                onClick={() => toggleLayer('showGroundLayer')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showGroundLayer
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-medium">Ground Layer (0m)</span>
                </div>
                {filter.showGroundLayer ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              {/* Underground Layers */}
              <button
                onClick={() => toggleLayer('showUndergroundParking')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showUndergroundParking
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-medium">Basement Parking</span>
                </div>
                {filter.showUndergroundParking ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              <button
                onClick={() => toggleLayer('showWaterPipeline')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showWaterPipeline
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-medium">Water Pipeline</span>
                </div>
                {filter.showWaterPipeline ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              <button
                onClick={() => toggleLayer('showSewagePipeline')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showSewagePipeline
                    ? 'bg-lime-500/15 border-lime-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-lime-400" />
                  <span className="text-[11px] font-medium">Sewage Pipeline</span>
                </div>
                {filter.showSewagePipeline ? <Eye className="w-3.5 h-3.5 text-lime-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              <button
                onClick={() => toggleLayer('showElectricalCable')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showElectricalCable
                    ? 'bg-amber-500/15 border-amber-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium">Electrical Cable</span>
                </div>
                {filter.showElectricalCable ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              <button
                onClick={() => toggleLayer('showFiberOptic')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showFiberOptic
                    ? 'bg-pink-500/15 border-pink-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[11px] font-medium">Fiber Optic</span>
                </div>
                {filter.showFiberOptic ? <Eye className="w-3.5 h-3.5 text-pink-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              <button
                onClick={() => toggleLayer('showUtilityTunnel')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  filter.showUtilityTunnel
                    ? 'bg-purple-500/15 border-purple-500/40 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-medium">Utility Tunnel</span>
                </div>
                {filter.showUtilityTunnel ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
              </button>
            </div>
          </div>

          {/* Parcel Selector & Asset Registry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">Selected Parcel:</span>
                <select
                  value={selectedParcelId}
                  onChange={(e) => setSelectedParcelId(e.target.value)}
                  className="bg-slate-950 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  {parcels.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.surveyNumber} ({p.undergroundAssets?.length || 0} Assets)
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {assets.length} Underground Assets Registered
              </span>
            </div>

            {/* Asset Cards List */}
            <div className="space-y-2.5">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`p-3.5 rounded-xl border text-xs transition-all space-y-2 ${
                    asset.hasTopologyCollision
                      ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {getLayerIcon(asset.type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white flex items-center gap-2">
                          {asset.name}
                          {asset.hasTopologyCollision && (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-semibold rounded-full border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Collision Warning
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Owner: <span className="text-slate-200">{asset.owner}</span> • Type: <span className="text-slate-300">{asset.type}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px]">
                      <span className="px-2 py-0.5 bg-slate-900 text-cyan-300 rounded border border-slate-700">
                        Depth: {asset.depthM}m
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/90 rounded-lg flex items-center justify-between text-[11px] font-mono">
                    <div className="text-slate-300">
                      <span className="text-slate-400">3D ULPIN:</span> <span className="text-cyan-400 font-bold">{asset.prototypeUlpin3D}</span>
                    </div>
                    <div className="text-slate-400">
                      Diameter/Size: <span className="text-slate-200">{asset.diameterM}m</span>
                    </div>
                  </div>

                  {asset.hasTopologyCollision && (
                    <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-lg text-[11px] text-rose-200 flex items-center justify-between">
                      <span>⚠ {asset.collisionReason}</span>
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToConflict(asset.id);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold shrink-0 transition-colors"
                      >
                        View in 3D →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Apply & Close
          </button>
        </div>

      </div>
    </div>
  );
};
