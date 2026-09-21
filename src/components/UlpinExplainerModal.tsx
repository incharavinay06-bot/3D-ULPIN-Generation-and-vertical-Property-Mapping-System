import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Layers, 
  CheckCircle2, 
  Building2, 
  Box, 
  Droplets, 
  Sparkles, 
  Copy, 
  Info, 
  Search,
  ShieldCheck
} from 'lucide-react';
import { parse3DUlpin, generateTierUlpin, ULPIN_3D_DISCLAIMER } from '../utils/ulpinGenerator';

interface UlpinExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

const TIER_EXAMPLES = [
  {
    tier: 'Surface Parcel',
    code: 'IN-KA-BLR-P001',
    description: 'Ground Cadastral 2D Land Parcel (Sy. No. 44/2)',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    tier: 'Building Structure',
    code: 'IN-KA-BLR-P001-B001',
    description: 'Surya Heights Tower A Extruded Envelope',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    tier: 'Vertical Floor Level',
    code: 'IN-KA-BLR-P001-B001-F03',
    description: 'Floor Level 3 Horizontal Strata Plane (+9.6m to +12.8m)',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    tier: 'Volumetric Property Unit',
    code: 'IN-KA-BLR-P001-B001-F03-U302',
    description: 'Flat 302 Residential Strata Title (240 m² • 768 m³)',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    tier: 'Underground Parking',
    code: 'IN-KA-BLR-P001-B001-UG-P01',
    description: 'Basement Parking Vault Level 2 (Depth: -6.4m to 0m)',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    tier: 'Sub-surface Water Pipeline',
    code: 'IN-KA-BLR-P001-B001-UG-WP01',
    description: 'BWSSB 1200mm Potable Water Main (Depth: -8.0m)',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    tier: 'Air Rights Envelope',
    code: 'IN-KA-BLR-P001-B001-AR-01',
    description: 'Over-roof Solar / Telecom Transmission Volume (+36m to +48m)',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
];

export const UlpinExplainerModal: React.FC<UlpinExplainerModalProps> = ({
  isOpen,
  onClose,
  initialCode = 'IN-KA-BLR-P001-B001-F03-U302',
}) => {
  const [activeCode, setActiveCode] = useState<string>(initialCode);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const parsed = parse3DUlpin(activeCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                3D ULPIN / Bhu-Aadhaar Spatial Identifier Architecture
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                  ISO 19152 LADM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hierarchical alphanumeric notation encoding country, state, parcel, building, elevation, and 3D strata rights.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Live Interactive Decoder Bar */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Active 3D ULPIN Code:</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-mono"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl font-mono text-base font-bold text-white tracking-wide flex items-center justify-between overflow-x-auto">
              <span>{activeCode}</span>
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-normal shrink-0">
                {parsed?.tier || '3D Cadastre Code'}
              </span>
            </div>

            {/* Tokenized Breakdown Chips */}
            {parsed && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-center">
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-mono">Country</span>
                  <span className="text-xs font-bold text-blue-400 font-mono">{parsed.countryCode}</span>
                  <span className="text-[8px] text-slate-500 block">India</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-mono">State/UT</span>
                  <span className="text-xs font-bold text-blue-400 font-mono">{parsed.stateCode}</span>
                  <span className="text-[8px] text-slate-500 block">Karnataka</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-mono">District</span>
                  <span className="text-xs font-bold text-blue-400 font-mono">{parsed.districtCode}</span>
                  <span className="text-[8px] text-slate-500 block">Bengaluru</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-mono">Parcel ID</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{parsed.parcelId}</span>
                  <span className="text-[8px] text-slate-500 block">Ground 2D</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-mono">Building</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">{parsed.buildingSeq || 'B001'}</span>
                  <span className="text-[8px] text-slate-500 block">LoD-1/2</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-mono">Level / Unit</span>
                  <span className="text-xs font-bold text-purple-400 font-mono">{parsed.levelCode || 'F03'}-{parsed.unitCode || 'U302'}</span>
                  <span className="text-[8px] text-slate-500 block">3D Strata</span>
                </div>
              </div>
            )}
          </div>

          {/* Preset Hierarchy Tiers Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Standardized 3D ULPIN Hierarchy Tiers
            </h4>

            <div className="space-y-2">
              {TIER_EXAMPLES.map((item) => (
                <div
                  key={item.tier}
                  onClick={() => setActiveCode(item.code)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    activeCode === item.code
                      ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${item.badgeColor}`}>
                        {item.tier}
                      </span>
                      <span className="font-mono font-bold text-white text-xs">{item.code}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{item.description}</p>
                  </div>

                  <button className="px-3 py-1 bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors border border-slate-700">
                    Decode
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer Box */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p className="leading-relaxed">
              {ULPIN_3D_DISCLAIMER}
            </p>
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
