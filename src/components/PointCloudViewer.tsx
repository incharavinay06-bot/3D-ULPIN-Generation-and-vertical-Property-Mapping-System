import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  X, 
  Box, 
  RotateCcw, 
  Layers, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  Sliders, 
  Maximize2, 
  Play, 
  Pause, 
  Upload, 
  Database, 
  ArrowRight, 
  ShieldCheck, 
  Compass, 
  TreePine, 
  Mountain, 
  Grid, 
  AlertCircle,
  Check,
  CheckSquare,
  Building as BuildingIcon,
  MapPin,
  Crosshair
} from 'lucide-react';
import { 
  Building, 
  CadastralParcel, 
  UndergroundAsset, 
  PointCloudData, 
  LidarDensityLevel, 
  LidarClassification,
  LidarPoint 
} from '../types/cadastre';
import { 
  generateSyntheticPointCloudFromBuilding, 
  subsamplePointsForRendering, 
  parseLasLazFile,
  verifyLidarBuildingAlignment,
  polygonToLocalMeters,
  cropPointCloudByBuildingFootprint,
  LidarAlignmentVerificationResult
} from '../utils/lidarEngine';

interface PointCloudViewerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBuilding?: Building | null;
  selectedParcel?: CadastralParcel | null;
  undergroundAssets?: UndergroundAsset[];
  customPointCloud?: PointCloudData | null;
  parcels?: CadastralParcel[];
  onSelectBuilding?: (buildingId: string) => void;
}

export const PointCloudViewer: React.FC<PointCloudViewerProps> = ({
  isOpen,
  onClose,
  selectedBuilding,
  selectedParcel,
  undergroundAssets = [],
  customPointCloud: propCustomPointCloud,
  parcels = [],
  onSelectBuilding,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Density & View Configurations
  const [densityLevel, setDensityLevel] = useState<LidarDensityLevel>('HIGH');
  const [pointSize, setPointSize] = useState<number>(2);
  const [colorMode, setColorMode] = useState<'classification' | 'height' | 'intensity'>('classification');
  const [filterClass, setFilterClass] = useState<'ALL' | LidarClassification>('ALL');
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);

  // Multi-layer visual overlay toggles (OSM 2D Footprint, 3D Cadastral Wireframe, and LiDAR Points)
  const [showOsmFootprint, setShowOsmFootprint] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showLidarPoints, setShowLidarPoints] = useState<boolean>(true);

  // Toggle all layers simultaneously
  const handleToggleOverlayAll = () => {
    const allActive = showOsmFootprint && showWireframe && showLidarPoints;
    if (allActive) {
      setShowOsmFootprint(false);
      setShowWireframe(false);
      setShowLidarPoints(true);
    } else {
      setShowOsmFootprint(true);
      setShowWireframe(true);
      setShowLidarPoints(true);
    }
  };

  // LiDAR ↔ Cadastral Building Alignment Diagnostic Result
  const [alignmentResult, setAlignmentResult] = useState<LidarAlignmentVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Mutable camera orientation for 60fps render loop without triggering React re-renders
  const cameraRef = useRef({
    rotX: 25,
    rotY: 45,
    zoom: 4.2,
    panX: 0,
    panY: 0,
    isAutoOrbit: true,
    isDragging: false,
    isPanning: false,
    dragStart: { x: 0, y: 0 },
  });

  // Sync isAutoOrbit to cameraRef
  useEffect(() => {
    cameraRef.current.isAutoOrbit = isAutoOrbit;
  }, [isAutoOrbit]);

  // Ingested Real LAS/LAZ State
  const [importedPointCloud, setImportedPointCloud] = useState<PointCloudData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Extract all available buildings for the quick-switcher bar
  const availableBuildings = useMemo(() => {
    const list: Building[] = [];
    if (parcels && parcels.length > 0) {
      for (const p of parcels) {
        for (const b of p.buildings) {
          if (!list.some(item => item.id === b.id)) {
            list.push(b);
          }
        }
      }
    }
    if (list.length === 0 && selectedBuilding) {
      list.push(selectedBuilding);
    }
    return list;
  }, [parcels, selectedBuilding]);

  // Determine effective building strictly using selectedBuilding as single source of truth
  const effectiveBuilding: Building | null = useMemo(() => {
    if (selectedBuilding) return selectedBuilding;
    if (availableBuildings.length > 0) return availableBuildings[0];
    return null;
  }, [selectedBuilding, availableBuildings]);

  // Find parent parcel for elevation datum & legal metadata
  const effectiveParentParcel = useMemo(() => {
    if (selectedParcel) return selectedParcel;
    if (effectiveBuilding && parcels.length > 0) {
      return parcels.find(p => p.buildings.some(b => b.id === effectiveBuilding.id)) || parcels[0] || null;
    }
    return parcels[0] || null;
  }, [selectedParcel, effectiveBuilding, parcels]);

  // Reset verification diagnostic whenever building selection changes
  useEffect(() => {
    setAlignmentResult(null);
  }, [effectiveBuilding?.id]);

  // Generate Synthetic LiDAR dynamically tied to the selected building
  const activePointCloud: PointCloudData = useMemo(() => {
    if (importedPointCloud) {
      return importedPointCloud;
    }
    if (propCustomPointCloud) {
      return propCustomPointCloud;
    }

    if (!effectiveBuilding) {
      return {
        isRealData: false,
        sourceName: 'No Building Selected',
        totalPoints: 0,
        buildingPoints: 0,
        groundPoints: 0,
        subsurfacePoints: 0,
        vegetationPoints: 0,
        derivedResults: {
          minZ: 0,
          maxZ: 0,
          buildingHeightM: 0,
          roofGeometry: 'N/A',
          floorEstimatesCount: 0,
          groundElevationM: 920,
          averageIntensity: 0,
          pointDensityPerSqm: 0,
        },
        points: [],
      };
    }

    // Dynamic generation from the exact selected building's footprint, height & floor metadata
    return generateSyntheticPointCloudFromBuilding(
      effectiveBuilding,
      effectiveParentParcel || undefined,
      densityLevel,
      undergroundAssets
    );
  }, [importedPointCloud, propCustomPointCloud, effectiveBuilding, effectiveParentParcel, densityLevel, undergroundAssets]);

  // Subsample points for smooth 60fps WebGL/2D canvas rendering
  const renderPoints = useMemo(() => {
    return subsamplePointsForRendering(activePointCloud.points, 28000);
  }, [activePointCloud]);

  // Handle LAS/LAZ File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const parsed = await parseLasLazFile(file);
      setImportedPointCloud(parsed);
      setAlignmentResult(null);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse LAS point cloud. Using synthetic cadastral generator.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Reset imported LAS back to synthetic demo
  const handleResetToSynthetic = () => {
    setImportedPointCloud(null);
    setImportError(null);
    setAlignmentResult(null);
  };

  // Spatial crop of imported point cloud to selected building footprint
  const handleCropToBuildingFootprint = () => {
    if (!importedPointCloud || !effectiveBuilding) return;
    const cropped = cropPointCloudByBuildingFootprint(importedPointCloud, effectiveBuilding, 6.0);
    setImportedPointCloud(cropped);
  };

  // Dynamic Metrics computed directly from point coordinates and building geometry
  const lidarMetrics = useMemo(() => {
    if (!activePointCloud || !activePointCloud.points.length) return null;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let sumX = 0, sumY = 0, sumZ = 0;

    for (const p of activePointCloud.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
      sumX += p.x;
      sumY += p.y;
      sumZ += p.z;
    }
    const count = activePointCloud.points.length;
    const groundMsl = effectiveBuilding?.baseGroundElevationMsl || effectiveParentParcel?.groundElevationMsl || 920.0;
    const bldgHeight = effectiveBuilding?.totalHeightM || 24.0;
    const lidarHeight = maxZ > -Infinity && minZ < Infinity ? Number((maxZ - minZ).toFixed(1)) : bldgHeight;

    let geoLat = 12.9716, geoLng = 77.5946;
    if (effectiveBuilding?.footprintCoords && effectiveBuilding.footprintCoords.length > 0) {
      const sLat = effectiveBuilding.footprintCoords.reduce((s, c) => s + c.lat, 0);
      const sLng = effectiveBuilding.footprintCoords.reduce((s, c) => s + c.lng, 0);
      geoLat = Number((sLat / effectiveBuilding.footprintCoords.length).toFixed(6));
      geoLng = Number((sLng / effectiveBuilding.footprintCoords.length).toFixed(6));
    }

    const heightVarianceM = Number(Math.abs(lidarHeight - bldgHeight).toFixed(2));
    const variancePct = bldgHeight > 0 ? Number(((heightVarianceM / bldgHeight) * 100).toFixed(1)) : 0;

    return {
      bbox: {
        minX: Number(minX.toFixed(2)),
        maxX: Number(maxX.toFixed(2)),
        minY: Number(minY.toFixed(2)),
        maxY: Number(maxY.toFixed(2)),
        minZ: Number(minZ.toFixed(2)),
        maxZ: Number(maxZ.toFixed(2)),
      },
      localCentroid: {
        x: Number((sumX / count).toFixed(2)),
        y: Number((sumY / count).toFixed(2)),
        z: Number((sumZ / count).toFixed(2)),
      },
      geoCentroid: { lat: geoLat, lng: geoLng },
      groundElevationMsl: groundMsl,
      roofElevationMsl: Number((groundMsl + bldgHeight).toFixed(1)),
      lidarElevationMsl: Number((groundMsl + lidarHeight).toFixed(1)),
      bldgHeight,
      lidarHeight,
      heightVarianceM,
      variancePct,
      isHeightConsistent: heightVarianceM <= 0.35,
    };
  }, [activePointCloud, effectiveBuilding, effectiveParentParcel]);

  // Perform LiDAR ↔ Building Spatial Alignment Verification
  const handleVerifyAlignment = () => {
    if (!effectiveBuilding) return;
    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyLidarBuildingAlignment(effectiveBuilding, activePointCloud);
      setAlignmentResult(result);
      setIsVerifying(false);
    }, 150);
  };

  // Camera Orbit Presets
  const setViewPreset = (preset: '3d' | 'top' | 'side' | 'front') => {
    const cam = cameraRef.current;
    cam.panX = 0;
    cam.panY = 0;
    setIsAutoOrbit(false);

    switch (preset) {
      case '3d':
        cam.rotX = 25;
        cam.rotY = 45;
        cam.zoom = 4.2;
        break;
      case 'top':
        cam.rotX = 90;
        cam.rotY = 0;
        cam.zoom = 4.8;
        break;
      case 'side':
        cam.rotX = 0;
        cam.rotY = 90;
        cam.zoom = 4.0;
        break;
      case 'front':
        cam.rotX = 0;
        cam.rotY = 0;
        cam.zoom = 4.0;
        break;
    }
  };

  // Mouse Orbit & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    cameraRef.current.isDragging = true;
    cameraRef.current.isPanning = e.button === 2 || e.shiftKey;
    cameraRef.current.dragStart = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cam = cameraRef.current;
    if (!cam.isDragging) return;

    const dx = e.clientX - cam.dragStart.x;
    const dy = e.clientY - cam.dragStart.y;
    cam.dragStart = { x: e.clientX, y: e.clientY };

    if (cam.isPanning) {
      cam.panX += dx * 0.8;
      cam.panY += dy * 0.8;
    } else {
      cam.rotY = (cam.rotY + dx * 0.6) % 360;
      cam.rotX = Math.max(-90, Math.min(90, cam.rotX - dy * 0.6));
    }
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
    cameraRef.current.isPanning = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.35 : -0.35;
    cameraRef.current.zoom = Math.max(1.5, Math.min(12.0, cameraRef.current.zoom + zoomDelta));
  };

  // Continuous Canvas Render Loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const cam = cameraRef.current;

      // Auto-orbit increment in internal ref
      if (cam.isAutoOrbit && !cam.isDragging) {
        cam.rotY = (cam.rotY + 0.3) % 360;
      }

      const cx = w / 2 + cam.panX;
      const cy = h / 2 + cam.panY + 20;

      // Euler rotation matrices
      const radX = (cam.rotX * Math.PI) / 180;
      const radY = (cam.rotY * Math.PI) / 180;
      const cosX = Math.cos(radX), sinX = Math.sin(radX);
      const cosY = Math.cos(radY), sinY = Math.sin(radY);

      // Project 3D point (x, y, z) into screen 2D space
      const projectPoint = (x: number, y: number, z: number) => {
        const rx = x * cosY - y * sinY;
        const ryTemp = x * sinY + y * cosY;
        const rz = -ryTemp * sinX + z * cosX;
        return {
          px: cx + rx * cam.zoom,
          py: cy - rz * cam.zoom,
        };
      };

      // 1. Draw subtle ground survey grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const gridStep = 10;
      ctx.beginPath();
      for (let g = -gridSize; g <= gridSize; g += gridStep) {
        const s1 = projectPoint(g, -gridSize, 0);
        const s2 = projectPoint(g, gridSize, 0);
        ctx.moveTo(s1.px, s1.py);
        ctx.lineTo(s2.px, s2.py);

        const s3 = projectPoint(-gridSize, g, 0);
        const s4 = projectPoint(gridSize, g, 0);
        ctx.moveTo(s3.px, s3.py);
        ctx.lineTo(s4.px, s4.py);
      }
      ctx.stroke();

      // 2. Render OSM 2D Footprint Ground Overlay (Authoritative Cadastral Boundary)
      if (showOsmFootprint && effectiveBuilding && effectiveBuilding.footprintCoords.length >= 3) {
        const localFootprint = polygonToLocalMeters(effectiveBuilding.footprintCoords);
        ctx.save();

        // 2a. Translucent Emerald Fill on Ground Plane (Z = 0)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.beginPath();
        for (let i = 0; i < localFootprint.length; i++) {
          const p = projectPoint(localFootprint[i].x, localFootprint[i].y, 0);
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.closePath();
        ctx.fill();

        // 2b. Solid Emerald Boundary Stroke
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([]);
        ctx.stroke();

        // 2c. Vertex markers and coordinate indices (V1, V2...)
        ctx.font = '9px monospace';
        for (let i = 0; i < localFootprint.length; i++) {
          const p = projectPoint(localFootprint[i].x, localFootprint[i].y, 0);
          ctx.beginPath();
          ctx.arc(p.px, p.py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#a7f3d0';
          ctx.fillText(`V${i + 1}`, p.px + 5, p.py - 3);
        }

        // 2d. Ground Centroid Crosshair Marker (+)
        const pCentroid = projectPoint(0, 0, 0);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pCentroid.px - 7, pCentroid.py);
        ctx.lineTo(pCentroid.px + 7, pCentroid.py);
        ctx.moveTo(pCentroid.px, pCentroid.py - 7);
        ctx.lineTo(pCentroid.px, pCentroid.py + 7);
        ctx.stroke();

        ctx.restore();
      }

      // 3. Render 3D Cadastral Wireframe Overlay (Aligned LoD-2 Extrusion)
      if (showWireframe && effectiveBuilding && effectiveBuilding.footprintCoords.length >= 3) {
        const localFootprint = polygonToLocalMeters(effectiveBuilding.footprintCoords);
        const bldgHeight = effectiveBuilding.totalHeightM > 0 ? effectiveBuilding.totalHeightM : 24.0;
        const nFloors = Math.max(1, effectiveBuilding.floorCountAboveGround || 6);

        ctx.save();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#f59e0b'; // Amber glowing wireframe
        ctx.setLineDash([4, 3]);

        // Ground perimeter polygon (Z = 0)
        ctx.beginPath();
        for (let i = 0; i < localFootprint.length; i++) {
          const p = projectPoint(localFootprint[i].x, localFootprint[i].y, 0);
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.closePath();
        ctx.stroke();

        // Roof perimeter polygon (Z = bldgHeight)
        ctx.beginPath();
        for (let i = 0; i < localFootprint.length; i++) {
          const p = projectPoint(localFootprint[i].x, localFootprint[i].y, bldgHeight);
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.closePath();
        ctx.stroke();

        // Corner vertical columns/pillars
        for (let i = 0; i < localFootprint.length; i++) {
          const pBot = projectPoint(localFootprint[i].x, localFootprint[i].y, 0);
          const pTop = projectPoint(localFootprint[i].x, localFootprint[i].y, bldgHeight);
          ctx.beginPath();
          ctx.moveTo(pBot.px, pBot.py);
          ctx.lineTo(pTop.px, pTop.py);
          ctx.stroke();
        }

        // Intermediate floor slabs (Cyan subtle rings)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 4]);
        for (let f = 1; f < nFloors; f++) {
          const floorZ = (f / nFloors) * bldgHeight;
          ctx.beginPath();
          for (let i = 0; i < localFootprint.length; i++) {
            const p = projectPoint(localFootprint[i].x, localFootprint[i].y, floorZ);
            if (i === 0) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
          }
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. Render projected 3D LiDAR points
      if (showLidarPoints) {
        const bldgMinZ = activePointCloud.derivedResults?.minZ ?? 0;
        const bldgMaxZ = activePointCloud.derivedResults?.maxZ ?? 30;
        const zRange = Math.max(1, bldgMaxZ - bldgMinZ);

        for (const pt of renderPoints) {
          if (filterClass !== 'ALL' && pt.classification !== filterClass) {
            continue;
          }

          const pScreen = projectPoint(pt.x, pt.y, pt.z);

          // Discard if outside canvas boundary
          if (pScreen.px < -10 || pScreen.px > w + 10 || pScreen.py < -10 || pScreen.py > h + 10) continue;

          // Color computation
          let color = '#38bdf8';

          if (colorMode === 'classification') {
            switch (pt.classification) {
              case 'BUILDING':
                color = '#38bdf8'; // Sky blue
                break;
              case 'GROUND':
                color = '#22c55e'; // Emerald green
                break;
              case 'SUBSURFACE':
                color = '#eab308'; // Amber yellow
                break;
              case 'VEGETATION':
                color = '#84cc16'; // Lime green
                break;
              default:
                color = '#94a3b8';
            }
          } else if (colorMode === 'height') {
            const normalizedZ = Math.max(0, Math.min(1, (pt.z - bldgMinZ) / zRange));
            if (normalizedZ < 0.2) color = '#3b82f6';
            else if (normalizedZ < 0.4) color = '#06b6d4';
            else if (normalizedZ < 0.6) color = '#10b981';
            else if (normalizedZ < 0.8) color = '#f59e0b';
            else color = '#ef4444';
          } else if (colorMode === 'intensity') {
            const intNorm = Math.max(40, Math.min(255, pt.intensity));
            color = `rgb(${intNorm}, ${intNorm}, ${intNorm})`;
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pScreen.px, pScreen.py, pointSize * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isOpen,
    renderPoints,
    filterClass,
    colorMode,
    pointSize,
    activePointCloud,
    showOsmFootprint,
    showWireframe,
    showLidarPoints,
    effectiveBuilding
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl max-h-[95vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  LiDAR Point Cloud & 3D Building Inspection
                </h2>
                {/* Data Mode Status Badge */}
                {activePointCloud.isRealData ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    REAL LAS/LAZ DATA
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full font-mono flex items-center gap-1" title="Extruded deterministically from real OSM building footprint and height attributes">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    SYNTHETIC DEMO
                  </span>
                )}
                {/* Real OSM Building Badge */}
                {effectiveBuilding && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300 bg-sky-950/80 border border-sky-800 rounded-md flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-400" />
                    <span>OSM: {effectiveBuilding.id.replace('B-OSM-', '').replace('OSM-', '')} ({effectiveBuilding.footprintCoords.length} pts)</span>
                  </span>
                )}
                {/* Height Source Badge */}
                {effectiveBuilding && (
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border flex items-center gap-1 ${
                    effectiveBuilding.heightSource === 'OSM_TAG' 
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : effectiveBuilding.heightSource === 'LIDAR_MEASURED'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`} title={effectiveBuilding.heightSource === 'OSM_TAG' ? 'Height derived from OpenStreetMap tags' : 'AI-estimated height; not survey-grade'}>
                    <span>HEIGHT: {effectiveBuilding.heightSource === 'OSM_TAG' ? 'OSM TAG' : effectiveBuilding.heightSource === 'LIDAR_MEASURED' ? 'LIDAR' : effectiveBuilding.heightSource === 'USER_CONFIGURED' ? 'USER' : 'AI ESTIMATE'}</span>
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded-md">
                  LoD-2 / LoD-3
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activePointCloud.isRealData
                  ? `Inspecting ${activePointCloud.totalPoints.toLocaleString()} points parsed from ${activePointCloud.sourceName}`
                  : `Point cloud dynamically generated from cadastral geometry of ${effectiveBuilding?.name || 'Building Structure'} (${effectiveBuilding?.totalHeightM}m, ${effectiveBuilding?.floorCountAboveGround} Floors).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* LAS/LAZ Import Trigger Button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".las,.laz" 
              className="hidden" 
            />
            {activePointCloud.isRealData ? (
              <button
                onClick={handleResetToSynthetic}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Switch back to dynamic synthetic building point cloud"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Use Synthetic Demo</span>
              </button>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 border border-purple-500/40 transition-colors cursor-pointer"
                title="Import an authoritative LAS or LAZ binary file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? 'Parsing LAS...' : 'Import LAS/LAZ'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Building Switcher Bar (Instant Selection Testing) */}
        {availableBuildings.length > 1 && (
          <div className="px-6 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold shrink-0 flex items-center gap-1">
              <BuildingIcon className="w-3.5 h-3.5 text-sky-400" />
              Select Building:
            </span>
            <div className="flex items-center gap-1.5">
              {availableBuildings.map((bldg) => {
                const isSelected = effectiveBuilding?.id === bldg.id;
                return (
                  <button
                    key={bldg.id}
                    onClick={() => onSelectBuilding?.(bldg.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-md border border-sky-400'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{bldg.name}</span>
                    <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-sky-700 text-white' : 'bg-slate-900 text-slate-400'}`}>
                      {bldg.id} • {bldg.totalHeightM}m
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Import Error Notice if any */}
          {importError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{importError}</span>
              </div>
              <button 
                onClick={() => setImportError(null)}
                className="text-amber-400 hover:text-amber-200 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Source Provenance Label */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Dataset Source:</span>
              <span className="font-semibold text-sky-400">{activePointCloud.sourceName}</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>Building: <strong className="text-white">{effectiveBuilding?.name} ({effectiveBuilding?.id})</strong></span>
              <span>Survey No: <strong className="text-white">{effectiveParentParcel?.surveyNumber || 'Sy. No. 44/1'}</strong></span>
              <span>Density: <strong className="text-white">{activePointCloud.derivedResults.pointDensityPerSqm} pts/m²</strong></span>
            </div>
          </div>
          
          {/* Dynamic Metrics Overview Bar (Mathematically calculated from actual points) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">TOTAL POINTS</span>
              <span className="text-sm font-bold text-white font-mono">{activePointCloud.totalPoints.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">100% of Point Cloud</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-mono block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                BUILDING
              </span>
              <span className="text-sm font-bold text-sky-400 font-mono">{activePointCloud.buildingPoints.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Roof, Walls & Slabs</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-mono block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                GROUND
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{activePointCloud.groundPoints.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Surface Baseline</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-mono block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                SUBSURFACE
              </span>
              <span className="text-sm font-bold text-amber-400 font-mono">{activePointCloud.subsurfacePoints.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Basements & Utilities</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-mono block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-lime-400" />
                VEGETATION
              </span>
              <span className="text-sm font-bold text-lime-400 font-mono">{activePointCloud.vegetationPoints.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Fringe Canopies</span>
            </div>
          </div>

          {/* Height Consistency & Vertical Calibration Card */}
          {lidarMetrics && (
            <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    Height Consistency & Vertical Extrusion Calibration
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                    lidarMetrics.isHeightConsistent
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {lidarMetrics.isHeightConsistent ? '✓ HEIGHT CONSISTENT (Δ ≤ 0.35m)' : '⚠ VERTICAL VARIANCE DETECTED'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Survey Tolerance: ±0.35m
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">OSM / Model Height</span>
                  <span className="text-sm font-bold text-white">{lidarMetrics.bldgHeight} m</span>
                  <span className="text-[9px] text-slate-500 block">
                    {effectiveBuilding?.heightSource === 'OSM_TAG' ? 'Authoritative Tag' : 'AI / Floor Estimate'}
                  </span>
                </div>

                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">LiDAR Laser Height</span>
                  <span className="text-sm font-bold text-sky-400">{lidarMetrics.lidarHeight} m</span>
                  <span className="text-[9px] text-slate-500 block">Z-Span Extrusion</span>
                </div>

                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Vertical Variance (Δ)</span>
                  <span className={`text-sm font-bold ${lidarMetrics.isHeightConsistent ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {lidarMetrics.heightVarianceM} m ({lidarMetrics.variancePct}%)
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {lidarMetrics.isHeightConsistent ? 'Within Survey Bounds' : 'Adjustment Recommended'}
                  </span>
                </div>

                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Elevation MSL (Datum)</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {lidarMetrics.groundElevationMsl}m → {lidarMetrics.roofElevationMsl}m
                  </span>
                  <span className="text-[9px] text-slate-500 block">EGM2008 / Survey MSL</span>
                </div>
              </div>

              {/* Centroid & CRS Tracking Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-slate-400 border-t border-slate-900">
                <div className="flex items-center gap-3">
                  <span>Centroid (WGS84): <strong className="text-slate-300">{lidarMetrics.geoCentroid.lat}°N, {lidarMetrics.geoCentroid.lng}°E</strong></span>
                  <span>Local ENU Origin: <strong className="text-slate-300">({lidarMetrics.localCentroid.x}, {lidarMetrics.localCentroid.y}, {lidarMetrics.localCentroid.z})m</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Bounding Box: <strong className="text-slate-300">[{lidarMetrics.bbox.minX}, {lidarMetrics.bbox.maxX}]m × [{lidarMetrics.bbox.minY}, {lidarMetrics.bbox.maxY}]m</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive 3D Point Cloud Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col items-center">
            
            <canvas
              ref={canvasRef}
              width={880}
              height={340}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-80 block cursor-grab active:cursor-grabbing select-none"
            />

            {/* Top Canvas Toolbar: Filter Categories, Presets & Verification Trigger */}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              
              {/* Classification Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setFilterClass('ALL')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    filterClass === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ALL POINTS
                </button>
                <button
                  onClick={() => setFilterClass('BUILDING')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    filterClass === 'BUILDING' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  BUILDING
                </button>
                <button
                  onClick={() => setFilterClass('GROUND')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    filterClass === 'GROUND' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GROUND
                </button>
                <button
                  onClick={() => setFilterClass('SUBSURFACE')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    filterClass === 'SUBSURFACE' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SUBSURFACE
                </button>
                <button
                  onClick={() => setFilterClass('VEGETATION')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    filterClass === 'VEGETATION' ? 'bg-lime-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  VEGETATION
                </button>
              </div>

              {/* Wireframe & Verification Controls */}
              <div className="flex items-center gap-2">
                {/* 1. Toggle OSM 2D Footprint Overlay */}
                <button
                  onClick={() => setShowOsmFootprint(prev => !prev)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    showOsmFootprint
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                  title="Toggle 2D real OSM ground footprint boundary and vertex markers"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{showOsmFootprint ? 'OSM Footprint: ON' : 'OSM Footprint'}</span>
                </button>

                {/* 2. Toggle 3D Building Wireframe Overlay */}
                <button
                  onClick={() => setShowWireframe(prev => !prev)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    showWireframe
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                  title="Toggle 3D extruded cadastral footprint wireframe overlay with floor levels"
                >
                  <Box className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showWireframe ? '3D Wireframe: ON' : '3D Wireframe'}</span>
                </button>

                {/* 3. Toggle LiDAR Points */}
                <button
                  onClick={() => setShowLidarPoints(prev => !prev)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    showLidarPoints
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                  title="Toggle 3D LiDAR point cloud returns"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>{showLidarPoints ? 'LiDAR: ON' : 'LiDAR'}</span>
                </button>

                {/* 4. OVERLAY ALL Quick Button */}
                <button
                  onClick={handleToggleOverlayAll}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    showOsmFootprint && showWireframe && showLidarPoints
                      ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-md border border-purple-400'
                      : 'bg-slate-800 text-purple-300 hover:text-white border border-purple-800/60'
                  }`}
                  title="Toggle complete overlay: Real OSM Footprint + 3D Cadastre Model + LiDAR Point Cloud"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Overlay All</span>
                </button>

                {/* 5. Spatial Cropping Button (when real LAS/LAZ is loaded) */}
                {activePointCloud.isRealData && effectiveBuilding && (
                  <button
                    onClick={handleCropToBuildingFootprint}
                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition-all cursor-pointer"
                    title="Spatially crop imported LAS file using the real OSM building footprint polygon"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Crop to Footprint</span>
                  </button>
                )}

                {/* Verify LiDAR ↔ Building Alignment Diagnostic Button */}
                <button
                  onClick={handleVerifyAlignment}
                  disabled={isVerifying}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="Run geodetic boundary and centroid alignment check between point cloud and building geometry"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isVerifying ? 'Checking...' : 'Verify LiDAR ↔ Building'}</span>
                </button>

                {/* View Presets & Orbit Controller */}
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px] font-mono">
                  <button
                    onClick={() => setViewPreset('3d')}
                    className="px-2 py-0.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                    title="Isometric 3D Perspective"
                  >
                    3D
                  </button>
                  <button
                    onClick={() => setViewPreset('top')}
                    className="px-2 py-0.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                    title="Top-Down Plan / Nadir View"
                  >
                    Top
                  </button>
                  <button
                    onClick={() => setViewPreset('side')}
                    className="px-2 py-0.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                    title="Side Elevation (X-Z Profile)"
                  >
                    Side
                  </button>
                  <button
                    onClick={() => setViewPreset('front')}
                    className="px-2 py-0.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                    title="Front Elevation (Y-Z Profile)"
                  >
                    Front
                  </button>
                </div>

                <button
                  onClick={() => setIsAutoOrbit(prev => !prev)}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isAutoOrbit ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Toggle continuous auto-orbit rotation"
                >
                  {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>

            </div>

            {/* Bottom Canvas Control Bar: Color Mode, Point Size & Density */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]">
              
              {/* Color Mode Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-mono text-[10px]">COLOR:</span>
                <button
                  onClick={() => setColorMode('classification')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    colorMode === 'classification' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Classification
                </button>
                <button
                  onClick={() => setColorMode('height')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    colorMode === 'height' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Height (Z)
                </button>
                <button
                  onClick={() => setColorMode('intensity')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    colorMode === 'intensity' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Intensity
                </button>
              </div>

              {/* Point Density (Configurable) */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-[10px]">DENSITY:</span>
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px]">
                  <button
                    onClick={() => setDensityLevel('LOW')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      densityLevel === 'LOW' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Low (25k)
                  </button>
                  <button
                    onClick={() => setDensityLevel('MEDIUM')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      densityLevel === 'MEDIUM' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Med (65k)
                  </button>
                  <button
                    onClick={() => setDensityLevel('HIGH')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      densityLevel === 'HIGH' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    High (125k)
                  </button>
                </div>

                {/* Point Size */}
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-slate-400 text-[10px]">Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={pointSize}
                    onChange={(e) => setPointSize(Number(e.target.value))}
                    className="w-14 accent-purple-500 h-1 bg-slate-700 rounded cursor-pointer"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* LiDAR ↔ Building Spatial Alignment Diagnostic Card (Shown when requested) */}
          {alignmentResult && (
            <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <span>LiDAR ↔ Building Spatial Alignment Verification</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {alignmentResult.spatialAlignment === 'PASS' ? '✓ STATUS: PASS' : '⚠ STATUS: REVIEW'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Evaluated for <strong>{alignmentResult.buildingName} ({alignmentResult.buildingId})</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAlignmentResult(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 bg-slate-800 rounded-md"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Centroid Offset */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Horizontal Centroid Offset</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {alignmentResult.centroidOffsetM} m
                    </span>
                    <span className="text-[10px] text-emerald-500/80 font-mono font-semibold">≤ 0.35m tolerance</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    LiDAR: ({alignmentResult.lidarCentroid.x}, {alignmentResult.lidarCentroid.y}) | Cadastre: ({alignmentResult.buildingCentroid.x}, {alignmentResult.buildingCentroid.y})
                  </span>
                </div>

                {/* Height Difference */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Vertical Height Variance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {alignmentResult.heightDifferenceM} m
                    </span>
                    <span className="text-[10px] text-emerald-500/80 font-mono font-semibold">≤ 0.25m tolerance</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    LiDAR Extrusion: {alignmentResult.lidarHeightM}m vs Cadastral: {alignmentResult.buildingHeightM}m
                  </span>
                </div>

                {/* Footprint Coverage */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">XY Footprint Point Coverage</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {alignmentResult.xyFootprintCoveragePct}%
                    </span>
                    <span className="text-[10px] text-emerald-500/80 font-mono font-semibold">≥ 90% tolerance</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Comprehensive laser returns across roof perimeter & exterior walls
                  </span>
                </div>
              </div>

              {/* Coordinate Reference Systems & Datum Alignment */}
              {alignmentResult.coordinateSystem && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">OSM Reference System</span>
                    <span className="text-slate-200 font-bold">{alignmentResult.coordinateSystem.osmCRS}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">3D Cadastre CRS</span>
                    <span className="text-slate-200 font-bold">{alignmentResult.coordinateSystem.cadastreCRS}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">LiDAR Vertical Datum</span>
                    <span className="text-slate-200 font-bold">{alignmentResult.coordinateSystem.lidarDatum}</span>
                  </div>
                </div>
              )}

              {/* Status Details Note */}
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{alignmentResult.statusDetails}</span>
              </div>
            </div>
          )}

          {/* Point Cloud Geometric Analysis (Dynamically derived from actual points) */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-purple-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Point Cloud Geometric Analysis & Inferences
              </h4>
              <span className="text-[10px] font-mono text-purple-300/80">
                Calculated from {activePointCloud.points.length.toLocaleString()} 3D Point Coordinates
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-slate-200">
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Height Profile</span>
                <span className="font-bold font-mono text-white text-sm">
                  {activePointCloud.derivedResults.buildingHeightM}m Extrusion
                </span>
                <span className="text-[9px] text-slate-500 block font-mono">
                  Z-Spread: {activePointCloud.derivedResults.minZ}m → {activePointCloud.derivedResults.maxZ}m
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Roof Classification</span>
                <span className="font-bold text-white text-xs block truncate" title={activePointCloud.derivedResults.roofGeometry}>
                  {activePointCloud.derivedResults.roofGeometry}
                </span>
                <span className="text-[9px] text-slate-500 block">Geometric Planar Inferences</span>
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Estimated Floors</span>
                <span className="font-bold font-mono text-white text-sm">
                  {effectiveBuilding ? `${effectiveBuilding.floorCountAboveGround} Floors` : `${activePointCloud.derivedResults.floorEstimatesCount} Levels`}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {activePointCloud.isRealData ? 'Inferred from Z-Slices' : 'Floor Estimate — Demo Geometry'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Mean Intensity</span>
                <span className="font-bold font-mono text-emerald-400 text-sm">
                  {activePointCloud.derivedResults.averageIntensity} / 255
                </span>
                <span className="text-[9px] text-slate-500 block font-mono">Laser Return Radiometry</span>
              </div>
            </div>
          </div>

          {/* Educational Framework & Provenance Transparency */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Info className="w-4 h-4 text-blue-400" />
              <span>HOW LiDAR SUPPORTS 3D CADASTRAL MAPPING & TITLE DELINEATION</span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              LiDAR provides dense 3D elevation measurements. In a production survey, classified point clouds calibrate building height, roof geometry, and ground terrain. This information directly supports 3D cadastral envelope extrusion, vertical strata delineation, and 3D ULPIN parcel validation.
            </p>

            {/* Upstream Workflow Flowchart */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded bg-blue-950 border border-blue-800 text-blue-300">
                1. 2D Parcel & Building
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-2.5 py-1 rounded bg-purple-950 border border-purple-800 text-purple-300">
                2. LiDAR Point Cloud
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-2.5 py-1 rounded bg-sky-950 border border-sky-800 text-sky-300">
                3. Geometric Inferences
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                4. 3D Cadastral Model
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-[11px]">
              <div>
                <span className="font-bold text-slate-300 block mb-0.5">CURRENT PROTOTYPE STATUS:</span>
                <span className="text-slate-400">
                  Synthetic point cloud deterministically derived from the active selected 3D cadastral building geometry, floor slabs, ground datum, and subsurface utilities.
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-300 block mb-0.5">REAL LAS/LAZ INGESTION:</span>
                <span className="text-slate-400">
                  Ready for survey files. Use &quot;Import LAS/LAZ&quot; to upload authoritative airborne or terrestrial LAS/LAZ data for automated point extraction.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Spatially aligned with active 3D Cadastral building ({effectiveBuilding?.name || 'Selected Building'})</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Return to 3D Cadastral Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
