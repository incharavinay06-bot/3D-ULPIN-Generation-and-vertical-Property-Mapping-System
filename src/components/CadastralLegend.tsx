/**
 * 3D Cadastral Map Legend & Symbology Reference
 */

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, ShieldAlert, CheckCircle2, Box } from 'lucide-react';

export const CadastralLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute bottom-6 right-4 z-20 max-w-xs select-none">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Cadastral Symbology Legend</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {/* Legend Content */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-800 space-y-2 text-[11px]">
            
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-slate-800 border-2 border-blue-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block">2D Land Parcel</span>
                <span className="text-[10px] text-slate-400">Ground Cadastral Polygon (Bhu-Aadhaar)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block">3D Building Envelope</span>
                <span className="text-[10px] text-slate-400">Total volumetric structure (LoD 1/2)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-sky-500/30 border border-sky-400 border-dotted shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block">Vertical Floor Level (Strata Tier)</span>
                <span className="text-[10px] text-slate-400">Horizontal strata plane with Floor ULPIN</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-emerald-500/40 border border-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block">3D Property Unit (Flat/Unit)</span>
                <span className="text-[10px] text-slate-400">Individual strata title spatial volume</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-purple-500/40 border border-purple-400 border-dashed shrink-0" />
              <div>
                <span className="font-semibold text-slate-200 block">Basement / Underground</span>
                <span className="text-[10px] text-slate-400">Sub-surface parking, HVAC & metro tunnel</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-rose-500 border border-rose-300 animate-pulse shrink-0" />
              <div>
                <span className="font-semibold text-rose-300 block">3D Boundary Conflict / Overhang</span>
                <span className="text-[10px] text-rose-400">Volume overlap or setback encroachment</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
