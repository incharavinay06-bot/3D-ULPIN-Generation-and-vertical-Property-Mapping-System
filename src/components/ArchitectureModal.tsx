/**
 * System Architecture & Extensibility Specification Modal
 * SIH26011 - 3D ULPIN & Vertical Property Mapping
 */

import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Database, 
  Layers, 
  ShieldCheck, 
  FileCode, 
  Globe2, 
  Plane, 
  Sparkles, 
  BookOpen,
  Boxes
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'ladm' | 'database' | 'future_ai' | 'google_3d'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Technical Architecture & Standards Specification
              </h2>
              <p className="text-xs text-slate-400">
                SIH26011 • ISO 19152 (LADM) • 3D ULPIN Generation Pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>End-to-End Pipeline</span>
          </button>
          <button
            onClick={() => setActiveTab('ladm')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ladm'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>ISO 19152 (LADM) Model</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>PostGIS & Spatial Schema</span>
          </button>
          <button
            onClick={() => setActiveTab('future_ai')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'future_ai'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>Future LiDAR, Drone & AI</span>
          </button>
          <button
            onClick={() => setActiveTab('google_3d')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'google_3d'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>Google 3D Tiles Strategy</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
          
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">2D-to-3D Cadastral Transformation Pipeline</h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-blue-300 space-y-1.5 overflow-x-auto">
                <div>2D Ground Parcel (Bhu-Aadhaar Polygon, EPSG:4326)</div>
                <div>  ↓ [Height / Elevation Datum Integration (DEM/DSM / Permitted Building Plan)]</div>
                <div>3D Building Envelope Geometry (LoD 1 / LoD 2 Prism)</div>
                <div>  ↓ [Vertical Stratification & Level Segmentation]</div>
                <div>Floor & Sub-surface Level Slices (Basements -B2, -B1, Ground G0, Floors 1..N)</div>
                <div>  ↓ [Architectural Partitioning & Property Boundary Definition]</div>
                <div>3D Property Units (Flats, Offices, Utility Boxes, Easements)</div>
                <div>  ↓ [Algorithmic Systematic Encoding]</div>
                <div>Unique Prototype 3D-ULPIN Identifier (IN-KA-BLR-P001-B01-F05-U501)</div>
                <div>  ↓ [Geometric Intersection & Setback Raycasting]</div>
                <div>3D Topology & Boundary Overhang Validation Engine</div>
                <div>  ↓ [WebGL / CesiumJS Visualization]</div>
                <div>Interactive 3D WebGIS Dashboard with Vertical Exploder</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-slate-100 mb-1">Volumetric Integrity Rule</h4>
                  <p className="text-slate-400">
                    A floor is simply a structural vertical partition; it does <strong>not</strong> automatically receive a ULPIN. Only discrete, legally recognized property units (spatial volumes with defined title rights) receive a unique 3D ULPIN.
                  </p>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-slate-100 mb-1">Sub-Surface Rights</h4>
                  <p className="text-slate-400">
                    The schema models negative vertical elevations relative to ground datum, assigning distinct 3D identifiers for underground parking, utility vaults, and metro transit easements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ladm' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">ISO 19152 Land Administration Domain Model (LADM)</h3>
              <p>
                Our 3D data architecture implements standard international LADM classes for volumetric cadastres:
              </p>
              <div className="space-y-2">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-mono font-bold text-blue-400">LA_SpatialUnit:</span>
                  <p className="text-slate-400 mt-0.5">
                    Represents both 2D land parcels and 3D individual property volumes with 3D bounded face strings.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-mono font-bold text-emerald-400">LA_LegalSpaceBuildingUnit:</span>
                  <p className="text-slate-400 mt-0.5">
                    Defines the legal volume of an individual flat, office suite, or parking space independently from physical walls.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-mono font-bold text-purple-400">LA_BAUnit (Basic Administrative Unit):</span>
                  <p className="text-slate-400 mt-0.5">
                    Associates ownership rights, restrictions, and responsibilities (RRR) to the 3D ULPIN identifier.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">PostgreSQL / PostGIS Schema for Production (Version 2)</h3>
              <p>
                In Version 1, state is handled via in-memory JSON/GeoJSON for instant hackathon execution. In Version 2, PostgreSQL + PostGIS will store full 3D geometries using native spatial primitives:
              </p>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-emerald-400">-- Production 3D PostGIS DDL snippet</div>
                <div>CREATE TABLE cadastral_parcels (</div>
                <div>  parcel_id VARCHAR(50) PRIMARY KEY,</div>
                <div>  ulpin_2d VARCHAR(14) UNIQUE NOT NULL,</div>
                <div>  geom_2d GEOMETRY(Polygon, 4326),</div>
                <div>  ground_elevation_msl NUMERIC(8,2)</div>
                <div>);</div>
                <div className="pt-2">CREATE TABLE property_units_3d (</div>
                <div>  unit_id VARCHAR(50) PRIMARY KEY,</div>
                <div>  ulpin_3d VARCHAR(64) UNIQUE NOT NULL,</div>
                <div>  parcel_id VARCHAR(50) REFERENCES cadastral_parcels(parcel_id),</div>
                <div>  floor_number INT,</div>
                <div>  z_min NUMERIC(8,2),</div>
                <div>  z_max NUMERIC(8,2),</div>
                <div>  geom_3d_volume GEOMETRY(PolyhedralSurfaceZ, 4326),</div>
                <div>  owner_name VARCHAR(255)</div>
                <div>);</div>
                <div className="pt-2 text-amber-300">-- Native 3D Collision Detection Query:</div>
                <div className="text-blue-300">SELECT a.ulpin_3d, b.ulpin_3d FROM property_units_3d a, property_units_3d b WHERE a.unit_id != b.unit_id AND ST_3DIntersects(a.geom_3d_volume, b.geom_3d_volume);</div>
              </div>
            </div>
          )}

          {activeTab === 'future_ai' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Future Hardware & AI Pipeline Extensibility</h3>
              <p>
                The modular architecture is designed to integrate high-density spatial survey inputs:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-slate-200">Drone / UAV Photogrammetry</h4>
                  <p className="text-slate-400 mt-1">
                    Direct ingestion of High-Res Orthomosaics and Digital Surface Models (DSM) to extract rooftop contours.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-slate-200">Aerial / Terrestrial LiDAR</h4>
                  <p className="text-slate-400 mt-1">
                    LAS/LAZ point cloud processing to classify building facades, floor heights, and cantilever balconies.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-slate-200">Computer Vision AI Models</h4>
                  <p className="text-slate-400 mt-1">
                    Automated building footprint segmentation (SAM / Mask R-CNN) and floor line detection from street-view imagery.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-slate-200">BIM / IFC Ingestion</h4>
                  <p className="text-slate-400 mt-1">
                    Automated conversion of approved architectural IFC files into legal 3D spatial units and 3D ULPIN registry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'google_3d' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Google Photorealistic 3D Tiles Strategy</h3>
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-200 space-y-1.5">
                <h4 className="font-bold flex items-center gap-1.5 text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                  Decoupled Contextual Architecture
                </h4>
                <p className="text-xs leading-relaxed">
                  Google Maps / Google 3D Tiles is treated strictly as an optional <strong>visual context backdrop</strong> layer, not the authoritative legal cadastre.
                </p>
              </div>
              <p className="text-slate-400">
                Cadastral ownership, parcel boundaries, survey numbers, 3D ULPIN codes, and topology collision engines operate on an independent sovereign coordinate space (WGS84 / EPSG:4326). When Google 3D Tiles is connected via Cesium 3D Tiles API, it acts solely as aesthetic visual texture behind the authoritative cadastral geometry.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs">
          <span className="text-slate-500">Ministry of Rural Development • SIH26011 Technical Document</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
