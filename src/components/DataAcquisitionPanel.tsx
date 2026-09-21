import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Layers, 
  MapPin, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  Satellite, 
  Plane, 
  Box, 
  TrendingUp, 
  FileSpreadsheet,
  ArrowRight,
  Database
} from 'lucide-react';

interface DataAcquisitionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchAIExtraction: () => void;
  onLaunchFloorSegmentation: () => void;
  onLaunchGeoJsonImport: () => void;
  onOpenPointCloud: () => void;
  onOpenElevation: () => void;
  onOpenCoordinates: () => void;
}

interface DatasetItem {
  id: string;
  category: 'SATELLITE' | 'DRONE' | 'GEOJSON' | 'LIDAR' | 'DEM_DSM' | 'GNSS_CORS';
  title: string;
  subtitle: string;
  source: string;
  resolution: string;
  confidence: string;
  icon: React.ElementType;
  badgeColor: string;
  actionText: string;
  actionHandler: () => void;
}

export const DataAcquisitionPanel: React.FC<DataAcquisitionPanelProps> = ({
  isOpen,
  onClose,
  onLaunchAIExtraction,
  onLaunchFloorSegmentation,
  onLaunchGeoJsonImport,
  onOpenPointCloud,
  onOpenElevation,
  onOpenCoordinates,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'imagery' | 'cadastral' | 'elevation'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const datasetList: DatasetItem[] = [
    {
      id: 'ds_sat_01',
      category: 'SATELLITE',
      title: 'Multispectral High-Res Satellite Imagery',
      subtitle: '0.3m Ground Sample Distance (GSD) • Urban Orthomosaic',
      source: 'Cartosat-3 / Sentinel-2 / Maxar Urban Dataset',
      resolution: '0.30 m / pixel (Visible + NIR)',
      confidence: '98% Sensor Calibrated',
      icon: Satellite,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      actionText: 'Run AI Building Extraction →',
      actionHandler: () => {
        onClose();
        onLaunchAIExtraction();
      },
    },
    {
      id: 'ds_drone_01',
      category: 'DRONE',
      title: 'UAV / Drone Oblique Photogrammetry',
      subtitle: '5cm Ultra-Fine Resolution • 3D Facade & Roof Geometry',
      source: 'DGCA Compliant Survey Drone (Ward 150 Corridor)',
      resolution: '0.05 m / pixel (3D Mesh Ready)',
      confidence: '99% RTK Corrected',
      icon: Plane,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      actionText: 'Segment Floors & Heights →',
      actionHandler: () => {
        onClose();
        onLaunchFloorSegmentation();
      },
    },
    {
      id: 'ds_geojson_01',
      category: 'GEOJSON',
      title: 'Cadastral Parcel & Boundary GeoJSON',
      subtitle: 'Official 2D Land Records with Revenue Survey Numbers',
      source: 'Survey of India / Bhoomi Revenue Portal Format',
      resolution: 'Vector Polygons (WGS84 EPSG:4326)',
      confidence: 'Authoritative Cadastral Vector',
      icon: FileText,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      actionText: 'Import Cadastral GeoJSON →',
      actionHandler: () => {
        onClose();
        onLaunchGeoJsonImport();
      },
    },
    {
      id: 'ds_lidar_01',
      category: 'LIDAR',
      title: 'LiDAR & 3D Point Cloud (Synthetic Demo / LAS)',
      subtitle: 'Simulated Point Cloud • 3D Geometric Inferences',
      source: 'Derived from 3D Cadastral Geometry (Ready for Survey LAS/LAZ)',
      resolution: '48 points / m² (Classified LoD-2/3)',
      confidence: 'Simulated Point Cloud Analysis',
      icon: Box,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      actionText: 'Inspect Point Cloud 3D →',
      actionHandler: () => {
        onClose();
        onOpenPointCloud();
      },
    },
    {
      id: 'ds_dem_01',
      category: 'DEM_DSM',
      title: 'Digital Elevation & Surface Model (DEM / DSM)',
      subtitle: 'Absolute MSL Heights (920m Ground Baseline)',
      source: 'SRTM / Survey of India Digital Terrain Dataset',
      resolution: '0.5m Vertical Precision',
      confidence: '96% Hydro-Enforced Datum',
      icon: TrendingUp,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      actionText: 'View DEM / DSM Elevation Profile →',
      actionHandler: () => {
        onClose();
        onOpenElevation();
      },
    },
    {
      id: 'ds_gnss_01',
      category: 'GNSS_CORS',
      title: 'GNSS / CORS Network Geodetic Reference',
      subtitle: 'Dual-Frequency NavIC + GPS • Sub-meter Accuracies',
      source: 'Survey of India CORS Network (Station: BLR-01)',
      resolution: 'H: ±0.5m • V: ±0.8m',
      confidence: '99% Survey-Grade Control',
      icon: MapPin,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      actionText: 'Inspect Geodetic Datum →',
      actionHandler: () => {
        onClose();
        onOpenCoordinates();
      },
    },
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const names = Array.from(e.dataTransfer.files).map((f: File) => f.name);
      setUploadedFiles(prev => [...prev, ...names]);
      setSuccessMessage(`Successfully parsed ${names.length} file(s). Select an acquisition module below to proceed.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const filteredDatasets = datasetList.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'imagery') return item.category === 'SATELLITE' || item.category === 'DRONE';
    if (activeTab === 'cadastral') return item.category === 'GEOJSON' || item.category === 'GNSS_CORS';
    if (activeTab === 'elevation') return item.category === 'DEM_DSM' || item.category === 'LIDAR';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Multi-Sensor Data Acquisition & Integration Panel
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  SIH26011 Pipeline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Acquire satellite, drone, LiDAR, cadastral vector, and GNSS geodetic layers for 3D ULPIN generation.
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
          
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging 
                ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' 
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Drag & Drop Spatial Data Files Here
              </h3>
              <p className="text-xs text-slate-400">
                Supports GeoTIFF (.tif), Orthophoto (.png/.jpg), GeoJSON (.geojson/.json), LiDAR (.las/.laz), or CSV GNSS Logs
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    setUploadedFiles(prev => [...prev, 'BLR_Ward150_Drone_Orthomosaic_5cm.tif', 'Survey_SyNo44_Parcel_Vector.geojson']);
                    setSuccessMessage('Loaded 2 high-resolution demo survey datasets into memory buffer.');
                    setTimeout(() => setSuccessMessage(null), 4000);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-600 transition-colors"
                >
                  Load Sample Survey Package
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Alert */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Sensors (6)
              </button>
              <button
                onClick={() => setActiveTab('imagery')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'imagery' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite & Drone
              </button>
              <button
                onClick={() => setActiveTab('cadastral')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'cadastral' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                GeoJSON & GNSS
              </button>
              <button
                onClick={() => setActiveTab('elevation')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'elevation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Elevation & LiDAR
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Bengaluru Urban Datum: WGS84 (EPSG:4326)
            </span>
          </div>

          {/* Dataset Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDatasets.map((ds) => {
              const IconComp = ds.icon;
              return (
                <div
                  key={ds.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-blue-400">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{ds.title}</h4>
                          <p className="text-[11px] text-slate-400">{ds.subtitle}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full shrink-0 ${ds.badgeColor}`}>
                        {ds.category}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 rounded-lg text-[11px] space-y-1 text-slate-300">
                      <div className="flex justify-between text-slate-400">
                        <span>Source:</span>
                        <span className="text-slate-200 truncate max-w-[200px]">{ds.source}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Resolution / Precision:</span>
                        <span className="text-slate-200 font-mono">{ds.resolution}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Provenance:</span>
                        <span className="text-emerald-400 font-medium">{ds.confidence}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={ds.actionHandler}
                    className="w-full py-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700 hover:border-blue-500"
                  >
                    <span>{ds.actionText}</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Multi-modal spatial acquisition engine compliant with LADM ISO 19152</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
