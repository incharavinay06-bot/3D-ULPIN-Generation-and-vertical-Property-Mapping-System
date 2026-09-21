import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Database, 
  Satellite, 
  MapPin, 
  FileText, 
  Zap, 
  Layers, 
  TrendingUp, 
  Box, 
  Droplets,
  CheckCircle2,
  Info
} from 'lucide-react';
import { DataProvenanceRecord } from '../types/cadastre';

interface DataProvenancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVENANCE_RECORDS: DataProvenanceRecord[] = [
  {
    id: 'prov_osm',
    category: 'BASE MAP',
    name: 'OpenStreetMap Global Vector & Raster Tiles',
    source: 'OpenStreetMap Foundation (WGS84 EPSG:4326 Datum)',
    confidence: 100,
    status: 'Validated',
    description: 'High-precision georeferenced road network, building footprints, and geographic land parcel context.',
  },
  {
    id: 'prov_geojson',
    category: 'PARCEL GEOMETRY',
    name: 'Revenue Cadastral Land Boundary Polygons',
    source: 'Bhoomi Karnataka Land Records / Survey of India Vector Format',
    confidence: 98,
    status: 'Authoritative',
    description: '14-digit 2D Bhu-Aadhaar ULPIN boundaries with official survey numbers (Sy. No. 44/2, 44/3, 44/4).',
  },
  {
    id: 'prov_ai_bldg',
    category: 'BUILDING FOOTPRINT',
    name: 'AI Extracted 3D Building Envelopes',
    source: 'Deep Learning U-Net 3D / SAM-Geo on 0.3m Cartosat-3 Imagery',
    confidence: 94,
    status: 'Validated',
    description: 'Automated extraction of multi-storey structural footprints and LoD-1 extruded boundaries.',
  },
  {
    id: 'prov_ai_floor',
    category: 'FLOOR SEGMENTATION',
    name: 'AI Strata Floor Level Slicing',
    source: 'Vertical Segmentation Engine & Architectural Permit Rules',
    confidence: 91,
    status: 'Validated',
    description: 'Calculates vertical bounds from 36m roof to 0m ground datum and negative basement levels.',
  },
  {
    id: 'prov_dem',
    category: 'ELEVATION',
    name: 'Digital Elevation & Surface Model (DEM / DSM)',
    source: 'CartoDEM / SRTM 0.5m High-Resolution Elevation Matrix',
    confidence: 96,
    status: 'Calibrated',
    description: 'Hydro-enforced 920.0m MSL ground datum and terrain cross-section profiles.',
  },
  {
    id: 'prov_gnss',
    category: 'COORDINATES',
    name: 'Survey of India CORS Network Geodetic Reference',
    source: 'Station BLR-URB-01 (Multi-frequency NavIC + GPS RTK)',
    confidence: 99,
    status: 'Calibrated',
    description: 'Centimeter-precision horizontal (±0.5m) and vertical (±0.8m) geodetic control points.',
  },
  {
    id: 'prov_lidar',
    category: 'POINT CLOUD',
    name: 'Classified Terrestrial & Aerial LiDAR Scatter',
    source: '125,000 Point Cloud Dataset (LoD-2 / LoD-3 Calibrated)',
    confidence: 95,
    status: 'Validated',
    description: 'Laser reflection returns categorizing roof geometry, structural columns, and ground terrain.',
  },
  {
    id: 'prov_utility',
    category: 'UNDERGROUND UTILITIES',
    name: 'Municipal Sub-Surface GPR Utility Registry',
    source: 'BWSSB Water / BESCOM Power / BMRCL Metro Spatial Database',
    confidence: 92,
    status: 'Registered',
    description: 'Ground penetrating radar mappings for potable water pipelines, high-tension conduits, and parking vaults.',
  },
];

export const DataProvenancePanel: React.FC<DataProvenancePanelProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Data Provenance & Sensor Confidence Registry
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                  ISO 19115 Metadata
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Authoritative source tracking, sensor accuracy calibration, and confidence indices for all 8 spatial streams.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Average Confidence Strip */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-mono">System-Wide Data Integrity</span>
              <span className="text-xl font-black text-emerald-400 font-mono">95.8% Overall Confidence</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
              <span>8 Active Streams</span>
              <span>•</span>
              <span className="text-emerald-400">8 Validated / Registered</span>
              <span>•</span>
              <span className="text-blue-400">0 Missing Datums</span>
            </div>
          </div>

          {/* Provenance Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROVENANCE_RECORDS.map((rec) => (
              <div
                key={rec.id}
                className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider font-mono">
                      {rec.category}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1.5">{rec.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-emerald-400">{rec.confidence}%</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Confidence</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900/90 rounded-lg text-[11px] space-y-1 text-slate-300">
                  <p className="text-slate-400">
                    <span className="text-slate-500">Source:</span> {rec.source}
                  </p>
                  <p className="text-slate-300">{rec.description}</p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Status: {rec.status}
                  </span>
                  <span className="font-mono">SIH26011 Compliant</span>
                </div>
              </div>
            ))}
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
