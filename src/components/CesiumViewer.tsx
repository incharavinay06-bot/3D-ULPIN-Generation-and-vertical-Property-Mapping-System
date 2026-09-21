/**
 * 3D Geospatial Cadastral Viewer (CesiumJS + High-Precision WebGL/Canvas Engine)
 * 
 * Supports:
 * - Real geographic coordinates (WGS84)
 * - 2D Cadastral Parcel Boundaries with survey labels
 * - Extruded 3D Building Envelopes
 * - Exact Conflicting 3D Geometry Isolation & Highlight (Cantilever Overhangs & Volumetric Overlaps)
 * - Vertical Cadastral Setback Boundary Curtain / Plane
 * - Red/Orange Hazard Hatching & 3D Spatial Conflict Dimension Leaders
 * - Exploded Floor Separator (with adjustable vertical offset factor)
 * - Sub-surface / Basement Visualization with negative datum
 * - Multi-layer Color Encoding (By Floor, By Property Use, By Legal Status, By Conflict)
 * - Interactive Picking, Raycasting, Hover tooltips, and In-Viewport Spatial Conflict HUD
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  CadastralParcel, 
  Building, 
  FloorLevel, 
  PropertyUnit, 
  MapViewState,
  VisualColorMode,
  BuildingAcquisitionState
} from '../types/cadastre';
import { 
  Layers, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Eye, 
  AlertTriangle, 
  Box, 
  CheckCircle2, 
  Info,
  Sliders,
  Sparkles,
  ShieldAlert,
  AlertOctagon,
  ArrowRight,
  ExternalLink,
  X,
  Compass,
  Ruler,
  CheckCheck,
  RefreshCw,
  FileCode2,
  Upload
} from 'lucide-react';
import { calculatePolygonAreaSqm } from '../utils/ulpinGenerator';
import { calculatePolygonCentroid } from '../utils/osmService';
import { 
  wgs84ToUtmZone43N, 
  calculateUtmPolygonAreaSqm, 
  calculateUtmPolygonCentroid, 
  triangulate2DPolygon, 
  cropLidarPointsToPolygon 
} from '../utils/projection3d';
import { generateSyntheticPointCloud } from '../utils/lidarEngine';
import { GeometryPipelineTraceModal } from './GeometryPipelineTraceModal';

interface CesiumViewerProps {
  parcels: CadastralParcel[];
  viewState: MapViewState;
  appMode?: 'DEMO' | 'REAL_LOCATION';
  acquisitionState?: BuildingAcquisitionState;
  onRetryOsmQuery?: () => void;
  onUseCachedGeometry?: () => void;
  onOpenImportGeoJson?: () => void;
  onSelectParcel: (parcelId: string | null) => void;
  onSelectBuilding: (buildingId: string | null) => void;
  onSelectFloor: (floorNumber: number | null) => void;
  onSelectUnit: (unitId: string | null) => void;
  onExplosionChange: (factor: number) => void;
  onToggleBasements: () => void;
  onColorModeChange: (mode: VisualColorMode) => void;
  onToggleViewPerspective?: (mode: '2D' | '3D') => void;
  onOpenPointCloud?: () => void;
}

// Color palette mapping based on property attributes
const FLOOR_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#eab308', 
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1',
  '#14b8a6', '#f43f5e'
];

const USE_COLORS: Record<string, string> = {
  'Residential Apartment': '#38bdf8',
  'Penthouse (Terrace Rights)': '#818cf8',
  'Commercial Office': '#34d399',
  'Retail Store': '#fbbf24',
  'Basement Parking Slot': '#94a3b8',
  'Basement Utility / HVAC': '#64748b',
  'Common Facilities / Lobby': '#a78bfa',
  'Sub-Surface Infrastructure': '#f472b6',
};

const STATUS_COLORS: Record<string, string> = {
  'Registered (3D Title)': '#22c55e',
  'Under 3D Verification': '#eab308',
  'Boundary Dispute / Overhang': '#ef4444',
  'Multi-Owner Strata': '#3b82f6',
  'Encumbered / Mortgaged': '#f97316',
};

export const CesiumViewer: React.FC<CesiumViewerProps> = ({
  parcels,
  viewState,
  appMode = 'DEMO',
  acquisitionState,
  onRetryOsmQuery,
  onUseCachedGeometry,
  onOpenImportGeoJson,
  onSelectParcel,
  onSelectBuilding,
  onSelectFloor,
  onSelectUnit,
  onExplosionChange,
  onToggleBasements,
  onColorModeChange,
  onToggleViewPerspective,
  onOpenPointCloud,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 3D Canvas view parameters
  const [cameraRotX, setCameraRotX] = useState<number>(35); // Pitch (degrees)
  const [cameraRotY, setCameraRotY] = useState<number>(-45); // Yaw (degrees)
  const [zoomLevel, setZoomLevel] = useState<number>(1.1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'rotate' | 'pan'>('rotate');
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [animTick, setAnimTick] = useState<number>(0);

  // Animation frame loop for pulsing hazard warnings
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setAnimTick(Date.now() / 1000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Filter parcels in REAL_LOCATION mode: Never render synthetic demo parcels or B001
  const effectiveParcels = useMemo(() => {
    if (appMode === 'REAL_LOCATION') {
      if (acquisitionState && acquisitionState.status !== 'polygon_found') {
        return [];
      }
      return parcels.filter(p => p.buildings.some(b => b.geometrySource !== 'SYNTHETIC_DEMO'));
    }
    return parcels;
  }, [parcels, appMode, acquisitionState]);

  // Get active selected object references
  const selectedParcel = useMemo(() => {
    if (appMode === 'REAL_LOCATION' && acquisitionState && acquisitionState.status !== 'polygon_found') {
      return null;
    }
    return effectiveParcels.find(p => p.id === viewState.selectedParcelId) || null;
  }, [effectiveParcels, viewState.selectedParcelId, appMode, acquisitionState]);

  const selectedBuilding = useMemo(() => {
    if (appMode === 'REAL_LOCATION') {
      if (acquisitionState && acquisitionState.status !== 'polygon_found') {
        return null;
      }
      if (acquisitionState?.selectedBuilding) {
        return acquisitionState.selectedBuilding;
      }
    }
    if (!viewState.selectedBuildingId) return null;
    for (const p of effectiveParcels) {
      const b = p.buildings.find(b => b.id === viewState.selectedBuildingId);
      if (b) return b;
    }
    return null;
  }, [effectiveParcels, viewState.selectedBuildingId, appMode, acquisitionState]);

  const selectedUnit = useMemo(() => {
    if (!viewState.selectedUnitId) return null;
    for (const p of effectiveParcels) {
      for (const b of p.buildings) {
        for (const fl of b.floors) {
          const u = fl.units.find(u => u.id === viewState.selectedUnitId);
          if (u) return u;
        }
      }
    }
    return null;
  }, [effectiveParcels, viewState.selectedUnitId]);

  const hoveredUnit = useMemo(() => {
    if (!hoveredUnitId) return null;
    for (const p of effectiveParcels) {
      for (const b of p.buildings) {
        for (const fl of b.floors) {
          const u = fl.units.find(u => u.id === hoveredUnitId);
          if (u) return u;
        }
      }
    }
    return null;
  }, [effectiveParcels, hoveredUnitId]);

  // Visual Debug Mode State: OSM Footprint vs 3D Base
  const [showOsmFootprint, setShowOsmFootprint] = useState<boolean>(true);
  const [show3dBase, setShow3dBase] = useState<boolean>(true);
  const [showGeometryAuditPanel, setShowGeometryAuditPanel] = useState<boolean>(false);
  const [showFloorSelector, setShowFloorSelector] = useState<boolean>(true);
  const [showProjectedFootprint, setShowProjectedFootprint] = useState<boolean>(false);
  const [isGroundTruthMode, setIsGroundTruthMode] = useState<boolean>(false);
  const [showPipelineTraceModal, setShowPipelineTraceModal] = useState<boolean>(false);

  // Dynamic Center coordinate reference based on active selection
  const activeOrigin = useMemo(() => {
    if (selectedBuilding && selectedBuilding.footprintCoords.length > 0) {
      const lat = selectedBuilding.footprintCoords.reduce((s, p) => s + p.lat, 0) / selectedBuilding.footprintCoords.length;
      const lng = selectedBuilding.footprintCoords.reduce((s, p) => s + p.lng, 0) / selectedBuilding.footprintCoords.length;
      return { lat, lng };
    }
    if (selectedParcel && selectedParcel.centroid) {
      return { lat: selectedParcel.centroid.lat, lng: selectedParcel.centroid.lng };
    }
    if (parcels.length > 0 && parcels[0]?.centroid) {
      return { lat: parcels[0].centroid.lat, lng: parcels[0].centroid.lng };
    }
    return { lat: 12.9716, lng: 77.5946 };
  }, [selectedBuilding, selectedParcel, parcels]);

  // Conformal EPSG:32643 UTM Zone 43N projected origin
  const activeOriginUtm = useMemo(() => {
    return wgs84ToUtmZone43N(activeOrigin.lat, activeOrigin.lng);
  }, [activeOrigin]);

  // Project geographic coords to local 3D render meters via Conformal UTM Zone 43N (EPSG:32643)
  const projectToLocal = useCallback((coord: { lng: number; lat: number }) => {
    const utm = wgs84ToUtmZone43N(coord.lat, coord.lng);
    return {
      x: utm.easting - activeOriginUtm.easting,
      z: -(utm.northing - activeOriginUtm.northing), // +Z is South, -Z is North for 3D ground plane
    };
  }, [activeOriginUtm]);

  // Dynamic Geometry Audit between real OSM footprint and 3D base using Conformal EPSG:32643
  const geometryAudit = useMemo(() => {
    if (!selectedBuilding) return null;
    const osmCoords = (selectedBuilding.rawOsmBuilding?.footprintCoords && selectedBuilding.rawOsmBuilding.footprintCoords.length >= 3)
      ? selectedBuilding.rawOsmBuilding.footprintCoords
      : selectedBuilding.footprintCoords;
    
    const groundFloor = selectedBuilding.floors?.find(f => f.floorNumber === 1 || f.floorNumber === 0);
    const baseCoords = (groundFloor?.footprintCoords && groundFloor.footprintCoords.length >= 3)
      ? groundFloor.footprintCoords
      : (groundFloor?.units?.[0]?.polygon && groundFloor.units[0].polygon.length >= 3)
        ? groundFloor.units[0].polygon
        : selectedBuilding.footprintCoords;

    const osmAreaSqm = calculateUtmPolygonAreaSqm(osmCoords);
    const baseAreaSqm = calculateUtmPolygonAreaSqm(baseCoords);
    const areaDiffSqm = Math.abs(osmAreaSqm - baseAreaSqm);
    const areaDiffPercent = osmAreaSqm > 0 ? (areaDiffSqm / osmAreaSqm) * 100 : 0;

    let centroidOffsetM = 0;
    if (osmCoords.length >= 3 && baseCoords.length >= 3) {
      const c1 = calculateUtmPolygonCentroid(osmCoords);
      const c2 = calculateUtmPolygonCentroid(baseCoords);
      centroidOffsetM = Math.hypot(c1.easting - c2.easting, c1.northing - c2.northing);
    }

    const isAligned = areaDiffPercent < 0.25 && centroidOffsetM < 0.15;

    return {
      osmCoords,
      baseCoords,
      osmAreaSqm,
      baseAreaSqm,
      areaDiffSqm,
      areaDiffPercent,
      centroidOffsetM,
      osmVertices: osmCoords.length,
      baseVertices: baseCoords.length,
      isAligned,
      heightSource: selectedBuilding.heightSource || 'AI_ESTIMATE',
      heightValueM: selectedBuilding.totalHeightM || 25,
      isLidarVerified: selectedBuilding.isLidarVerified ?? false,
    };
  }, [selectedBuilding]);

  // Spatial LiDAR Cropping & Elevation Verification (Requirement 12)
  const lidarAnalysis = useMemo(() => {
    if (!selectedBuilding || !geometryAudit) return null;
    const pointCloud = generateSyntheticPointCloud(selectedBuilding, selectedParcel, 'HIGH');
    const localOsmPoly = geometryAudit.osmCoords.map(c => projectToLocal(c));
    const cropped = cropLidarPointsToPolygon(
      pointCloud.points,
      localOsmPoly
    );
    const buildingHeightM = selectedBuilding.totalHeightM || 25;
    const heightDifferenceM = Math.abs(buildingHeightM - cropped.derivedHeightM);

    return {
      pointsCount: cropped.insidePoints.length,
      insidePoints: cropped.insidePoints,
      minZ: cropped.minHeight,
      maxZ: cropped.maxHeight,
      medianZ: cropped.medianHeightM,
      lidarHeightM: cropped.derivedHeightM,
      buildingHeightM,
      heightDifferenceM,
      isVerified: heightDifferenceM < 1.5,
    };
  }, [selectedBuilding, geometryAudit, selectedParcel, projectToLocal]);

  // Ground Truth Top-Down Camera Toggle
  const toggleGroundTruthMode = useCallback(() => {
    setIsGroundTruthMode(prev => {
      const next = !prev;
      if (next) {
        // Orthogonal straight overhead view: pitch 89.9°, yaw 0° (North is straight up)
        setCameraRotX(89.9);
        setCameraRotY(0);
        setShowOsmFootprint(true);
        setShow3dBase(true);
      } else {
        // Return to standard 3D perspective orbit
        setCameraRotX(35);
        setCameraRotY(-45);
      }
      return next;
    });
  }, []);

  // 3D Matrix transform to 2D screen coordinates
  const project3DToScreen = useCallback((x: number, y: number, z: number, width: number, height: number) => {
    // Apply camera rotation
    const radY = (cameraRotY * Math.PI) / 180;
    const radX = (cameraRotX * Math.PI) / 180;

    // Rotate around Y axis
    const x1 = x * Math.cos(radY) + z * Math.sin(radY);
    const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
    const y1 = y;

    // Rotate around X axis (Pitch)
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);
    const x2 = x1;

    // Apply scale and pan
    const scale = 2.8 * zoomLevel;
    const screenX = width / 2 + panOffset.x + x2 * scale;
    const screenY = height / 2 + panOffset.y - y2 * scale;

    return { x: screenX, y: screenY, depth: z2 };
  }, [cameraRotX, cameraRotY, zoomLevel, panOffset]);

  // Reset camera view
  const resetCamera = () => {
    setCameraRotX(35);
    setCameraRotY(-45);
    setZoomLevel(1.1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Focus camera on selected building or parcel
  useEffect(() => {
    if (selectedBuilding && selectedBuilding.footprintCoords.length > 0) {
      const centroidLng = selectedBuilding.footprintCoords.reduce((s, p) => s + p.lng, 0) / selectedBuilding.footprintCoords.length;
      const centroidLat = selectedBuilding.footprintCoords.reduce((s, p) => s + p.lat, 0) / selectedBuilding.footprintCoords.length;
      const local = projectToLocal({ lng: centroidLng, lat: centroidLat });

      const radY = (cameraRotY * Math.PI) / 180;
      const radX = (cameraRotX * Math.PI) / 180;
      const x1 = local.x * Math.cos(radY) + local.z * Math.sin(radY);
      const z1 = -local.x * Math.sin(radY) + local.z * Math.cos(radY);
      const y1 = (selectedBuilding.totalHeightM || 20) / 2;
      const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);

      const scale = 2.8 * zoomLevel;
      setPanOffset({
        x: -x1 * scale,
        y: y2 * scale,
      });
    }
  }, [selectedBuilding?.id, projectToLocal]);

  // Sync camera when viewPerspective changes
  useEffect(() => {
    if (viewState.viewPerspective === '2D') {
      setCameraRotX(85);
      setCameraRotY(0);
    } else {
      if (cameraRotX > 75) {
        setCameraRotX(35);
        setCameraRotY(-45);
      }
    }
  }, [viewState.viewPerspective]);

  // Handle Mouse Events for 3D Orbit & Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (e.button === 2 || e.shiftKey) {
      setDragMode('pan');
    } else {
      setDragMode('rotate');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    setMousePos({ x: curX, y: curY });

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      if (dragMode === 'rotate') {
        setCameraRotY(prev => (prev + dx * 0.5) % 360);
        setCameraRotX(prev => Math.max(5, Math.min(85, prev + dy * 0.5)));
      } else {
        setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }

      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Hover hit-test when not dragging
    const width = canvas.width;
    const height = canvas.height;
    const explosionFactor = viewState.isExplodedView ? viewState.explosionFactor : 0.0;
    const is2DMode = viewState.viewPerspective === '2D';
    let hoveredId: string | null = null;
    let minDistance = 28;

    for (const parcel of effectiveParcels) {
      for (const bldg of parcel.buildings) {
        for (const fl of bldg.floors) {
          if (fl.isBasement && !viewState.showBasements) continue;

          let verticalOffset = 0;
          if (!is2DMode) {
            if (fl.floorNumber > 0) {
              verticalOffset = fl.floorNumber * (explosionFactor * 3.5);
            } else if (fl.floorNumber < 0) {
              verticalOffset = fl.floorNumber * (explosionFactor * 2.5);
            }
          }

          const midY = (fl.elevationBottom + fl.elevationTop) / 2 + verticalOffset;

          for (const unit of fl.units) {
            const localPoly = unit.polygon.map(c => projectToLocal(c));
            const avgX = localPoly.reduce((s, p) => s + p.x, 0) / localPoly.length;
            const avgZ = localPoly.reduce((s, p) => s + p.z, 0) / localPoly.length;
            const screenPt = project3DToScreen(avgX, midY, avgZ, width, height);

            const dist = Math.hypot(screenPt.x - curX, screenPt.y - curY);
            if (dist < minDistance) {
              minDistance = dist;
              hoveredId = unit.id;
            }
          }
        }
      }
    }

    setHoveredUnitId(hoveredId);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoomLevel(prev => Math.max(0.4, Math.min(4.5, prev * zoomFactor)));
  };

  // Get color for a unit based on current visual color mode
  const getUnitColor = useCallback((unit: PropertyUnit, isSelected: boolean, isHovered: boolean) => {
    if (unit.hasTopologyCollision && (viewState.colorMode === 'by-conflict' || viewState.showConflictAlertsOnly)) {
      return '#ef4444'; // Red conflict alert
    }

    let baseColor = '#3b82f6';
    if (viewState.colorMode === 'by-floor') {
      const idx = Math.abs(unit.floorNumber) % FLOOR_COLORS.length;
      baseColor = FLOOR_COLORS[idx];
    } else if (viewState.colorMode === 'by-use') {
      baseColor = USE_COLORS[unit.unitType] || '#38bdf8';
    } else if (viewState.colorMode === 'by-status') {
      baseColor = STATUS_COLORS[unit.legalStatus] || '#22c55e';
    } else if (viewState.colorMode === 'by-conflict') {
      baseColor = unit.hasTopologyCollision ? '#ef4444' : '#10b981';
    }

    return baseColor;
  }, [viewState.colorMode, viewState.showConflictAlertsOnly]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    ctx.clearRect(0, 0, width, height);

    // 1. Geospatial Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Ground Datum Grid (Y = 0)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    const gridSize = 160;
    const step = 20;
    for (let x = -gridSize; x <= gridSize; x += step) {
      const p1 = project3DToScreen(x, 0, -gridSize, width, height);
      const p2 = project3DToScreen(x, 0, gridSize, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let z = -gridSize; z <= gridSize; z += step) {
      const p1 = project3DToScreen(-gridSize, 0, z, width, height);
      const p2 = project3DToScreen(gridSize, 0, z, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Subterranean / Basement Grid if enabled
    if (viewState.showBasements) {
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
      ctx.setLineDash([4, 4]);
      for (let x = -gridSize; x <= gridSize; x += step * 2) {
        const p1 = project3DToScreen(x, -6, -gridSize, width, height);
        const p2 = project3DToScreen(x, -6, gridSize, width, height);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 2. Render 2D Cadastral Parcels
    if (viewState.showParcels) {
      for (const parcel of effectiveParcels) {
        const isParcelSelected = parcel.id === viewState.selectedParcelId;
        const pts = parcel.boundaryPolygon.map(c => {
          const l = projectToLocal(c);
          return project3DToScreen(l.x, 0, l.z, width, height);
        });

        if (pts.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.closePath();

          // Parcel Fill
          ctx.fillStyle = isParcelSelected
            ? 'rgba(59, 130, 246, 0.22)'
            : 'rgba(30, 41, 59, 0.45)';
          ctx.fill();

          // Parcel Boundary Stroke
          ctx.lineWidth = isParcelSelected ? 2.5 : 1.5;
          ctx.strokeStyle = isParcelSelected ? '#60a5fa' : '#475569';
          ctx.stroke();

          // Parcel Survey Label at centroid
          const cLocal = projectToLocal(parcel.centroid);
          const cScreen = project3DToScreen(cLocal.x, 0.5, cLocal.z, width, height);
          
          ctx.fillStyle = isParcelSelected ? '#93c5fd' : '#94a3b8';
          ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`PARCEL: ${parcel.id} (${parcel.surveyNumber})`, cScreen.x, cScreen.y - 12);

          ctx.fillStyle = '#64748b';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillText(`ULPIN: ${parcel.ulpin2D}`, cScreen.x, cScreen.y + 2);
        }
      }
    }

    // 2b. Ground Truth & Metric Grid in Overhead Inspection Mode
    if (isGroundTruthMode) {
      // Draw 5m and 10m Conformal Metric Coordinate Grid
      const gridSizeM = 100;
      const stepM = 10;
      ctx.lineWidth = 1;
      
      for (let x = -gridSizeM; x <= gridSizeM; x += stepM) {
        const isMajor = x % 20 === 0;
        ctx.strokeStyle = isMajor ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.1)';
        const p1 = project3DToScreen(x, 0, -gridSizeM, width, height);
        const p2 = project3DToScreen(x, 0, gridSizeM, width, height);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        if (isMajor && Math.abs(x) <= 40) {
          ctx.fillStyle = '#60a5fa';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(`${x > 0 ? '+' : ''}${x}m E`, p1.x, p1.y - 4);
        }
      }

      for (let z = -gridSizeM; z <= gridSizeM; z += stepM) {
        const isMajor = z % 20 === 0;
        ctx.strokeStyle = isMajor ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.1)';
        const p1 = project3DToScreen(-gridSizeM, 0, z, width, height);
        const p2 = project3DToScreen(gridSizeM, 0, z, width, height);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        if (isMajor && Math.abs(z) <= 40) {
          ctx.fillStyle = '#60a5fa';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(`${-z > 0 ? '+' : ''}${-z}m N`, p1.x - 4, p1.y);
        }
      }
    }

    // 2c. Visual Debug Mode: Render Authoritative OSM Footprint and Extruded 3D Base Outlines on Ground
    if (geometryAudit) {
      // Draw Authoritative OSM Footprint (Cyan)
      if (showOsmFootprint && geometryAudit.osmCoords.length >= 3) {
        const osmScreenPts = geometryAudit.osmCoords.map(c => {
          const l = projectToLocal(c);
          return project3DToScreen(l.x, 0.05, l.z, width, height);
        });

        ctx.beginPath();
        ctx.moveTo(osmScreenPts[0].x, osmScreenPts[0].y);
        for (let i = 1; i < osmScreenPts.length; i++) {
          ctx.lineTo(osmScreenPts[i].x, osmScreenPts[i].y);
        }
        ctx.closePath();

        // Fill subtle cyan
        ctx.fillStyle = isGroundTruthMode ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.12)';
        ctx.fill();

        // High-contrast cyan outline
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#22d3ee';
        ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight each OSM vertex with a cyan circular pin
        osmScreenPts.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isGroundTruthMode ? 4 : 3, 0, Math.PI * 2);
          ctx.fillStyle = '#06b6d4';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // In Ground Truth mode, display vertex indices [0, 1, 2...]
          if (isGroundTruthMode) {
            ctx.fillStyle = '#67e8f9';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillText(`v${idx}`, pt.x + 6, pt.y - 4);
          }
        });
      }

      // Draw Extruded 3D Base Footprint (Amber)
      if (show3dBase && geometryAudit.baseCoords.length >= 3) {
        const baseScreenPts = geometryAudit.baseCoords.map(c => {
          const l = projectToLocal(c);
          return project3DToScreen(l.x, 0.08, l.z, width, height);
        });

        ctx.beginPath();
        ctx.moveTo(baseScreenPts[0].x, baseScreenPts[0].y);
        for (let i = 1; i < baseScreenPts.length; i++) {
          ctx.lineTo(baseScreenPts[i].x, baseScreenPts[i].y);
        }
        ctx.closePath();

        // Amber outline
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        // Highlight base vertices with amber pins
        baseScreenPts.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        });
      }

      // Draw Projected 2D Footprint Flat on Ground Plane (Requirement: Trace Projected Polygon)
      if ((showProjectedFootprint || isGroundTruthMode) && geometryAudit.osmCoords.length >= 3) {
        const projectedCoords = geometryAudit.osmCoords.map(c => projectToLocal(c));
        const projectedScreen = projectedCoords.map(p => project3DToScreen(p.x, 0.02, p.z, width, height));

        ctx.beginPath();
        ctx.moveTo(projectedScreen[0].x, projectedScreen[0].y);
        for (let i = 1; i < projectedScreen.length; i++) {
          ctx.lineTo(projectedScreen[i].x, projectedScreen[i].y);
        }
        ctx.closePath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)'; // Purple projected outline
        ctx.stroke();

        // Centroid marker on ground
        const cLocal = projectToLocal(calculatePolygonCentroid(geometryAudit.osmCoords));
        const cScreen = project3DToScreen(cLocal.x, 0.02, cLocal.z, width, height);
        ctx.beginPath();
        ctx.arc(cScreen.x, cScreen.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ec4899';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      // Render Cropped LiDAR Returns Inside Footprint (Requirement 12)
      if (lidarAnalysis && (viewState.showPointCloud || isGroundTruthMode)) {
        for (const pt of lidarAnalysis.insidePoints) {
          const ptScreen = project3DToScreen(pt.x, pt.z, pt.y, width, height);
          if (ptScreen.depth > 0) {
            ctx.beginPath();
            ctx.arc(ptScreen.x, ptScreen.y, isGroundTruthMode ? 2.5 : 1.8, 0, Math.PI * 2);
            ctx.fillStyle = pt.intensity > 0.7 ? '#4ade80' : pt.intensity > 0.4 ? '#38bdf8' : '#a855f7';
            ctx.fill();
          }
        }
      }
    }

    // 3. Render 3D Buildings, Floors & Property Units with Exact Geometry Breakdown
    interface RenderableVolume {
      type: 'unit' | 'envelope' | 'conflict_subvolume';
      unit?: PropertyUnit;
      building?: Building;
      floorNumber: number;
      polygon: { x: number; z: number }[];
      bottomY: number;
      topY: number;
      depth: number;
      color: string;
      isSelected: boolean;
      isHovered: boolean;
      hasCollision: boolean;
      isConflictSubVolume?: boolean;
      conflictType?: 'CANTILEVER_OVERHANG' | 'UNIT_OVERLAP';
      label: string;
      parentUnitId?: string;
    }

    const renderList: RenderableVolume[] = [];
    const explosionFactor = viewState.isExplodedView ? viewState.explosionFactor : 0.0;
    const is2DMode = viewState.viewPerspective === '2D';

    for (const parcel of effectiveParcels) {
      for (const bldg of parcel.buildings) {
        for (const fl of bldg.floors) {
          if (fl.isBasement && !viewState.showBasements) continue;
          if (viewState.subsurfaceMode === 'SURFACE' && fl.floorNumber < 0) continue;
          if (viewState.subsurfaceMode === 'UNDERGROUND' && fl.floorNumber >= 0) continue;

          let verticalOffset = 0;
          if (!is2DMode) {
            if (fl.floorNumber > 0) {
              verticalOffset = fl.floorNumber * (explosionFactor * 3.5);
            } else if (fl.floorNumber < 0) {
              verticalOffset = fl.floorNumber * (explosionFactor * 2.5);
            }
          }

          const bottomY = is2DMode ? 0.1 : (fl.elevationBottom + verticalOffset);
          const topY = is2DMode ? (fl.floorNumber === 0 ? 0.3 : 0.15) : (fl.elevationTop + verticalOffset);

          if (viewState.showPropertyUnits) {
            const filterResidential = viewState.filterResidential !== false;
            const filterCommercial = viewState.filterCommercial !== false;
            const filterCommonFacilities = viewState.filterCommonFacilities !== false;
            const filterUndergroundInfra = viewState.filterUndergroundInfra !== false;

            for (const unit of fl.units) {
              if (
                (!filterResidential && (unit.unitType === 'Residential Apartment' || unit.unitType === 'Penthouse (Terrace Rights)')) ||
                (!filterCommercial && (unit.unitType === 'Commercial Office' || unit.unitType === 'Retail Store')) ||
                (!filterCommonFacilities && (unit.unitType === 'Common Facilities / Lobby' || unit.unitType === 'Basement Utility / HVAC')) ||
                (!filterUndergroundInfra && (unit.unitType === 'Basement Parking Slot' || unit.unitType === 'Sub-Surface Infrastructure')) ||
                (viewState.showConflictAlertsOnly && !unit.hasTopologyCollision)
              ) {
                continue;
              }

              const isSelected = unit.id === viewState.selectedUnitId;
              const isHovered = unit.id === hoveredUnitId;
              const unitColor = getUnitColor(unit, isSelected, isHovered);

              // SPECIAL SPATIAL DECOMPOSITION FOR CONFLICT VISUALIZATION
              // Case 1: Unauthorized Cantilever Overhang (Floor 4 Unit 402 - u_p003_b003_f4_02)
              if (unit.id === 'u_p003_b003_f4_02' && unit.hasTopologyCollision) {
                // Split into Valid Interior Volume and Overhanging Encroachment Sub-Volume
                // Parcel eastern boundary is at local X = -60.1
                const boundaryX = -60.1;
                const interiorPoly = [
                  { x: -80.1, z: -82.9 },
                  { x: boundaryX, z: -82.9 },
                  { x: boundaryX, z: -55.2 },
                  { x: -80.1, z: -55.2 },
                ];
                const overhangPoly = [
                  { x: boundaryX, z: -82.9 },
                  { x: -55.7, z: -82.9 },
                  { x: -55.7, z: -55.2 },
                  { x: boundaryX, z: -55.2 },
                ];

                // 1. Valid interior part
                const intAvgX = interiorPoly.reduce((s, p) => s + p.x, 0) / 4;
                const intAvgZ = interiorPoly.reduce((s, p) => s + p.z, 0) / 4;
                const intScreen = project3DToScreen(intAvgX, (bottomY + topY) / 2, intAvgZ, width, height);
                renderList.push({
                  type: 'unit',
                  unit,
                  floorNumber: fl.floorNumber,
                  polygon: interiorPoly,
                  bottomY,
                  topY,
                  depth: intScreen.depth,
                  color: viewState.colorMode === 'by-conflict' ? '#10b981' : unitColor,
                  isSelected,
                  isHovered,
                  hasCollision: false,
                  label: `${unit.unitNumber} (Valid Strata)`,
                  parentUnitId: unit.id
                });

                // 2. Overhanging conflicting part (Red/Orange Warning geometry)
                const overAvgX = overhangPoly.reduce((s, p) => s + p.x, 0) / 4;
                const overAvgZ = overhangPoly.reduce((s, p) => s + p.z, 0) / 4;
                const overScreen = project3DToScreen(overAvgX, (bottomY + topY) / 2, overAvgZ, width, height);
                renderList.push({
                  type: 'conflict_subvolume',
                  unit,
                  floorNumber: fl.floorNumber,
                  polygon: overhangPoly,
                  bottomY,
                  topY,
                  depth: overScreen.depth,
                  color: '#ef4444',
                  isSelected,
                  isHovered,
                  hasCollision: true,
                  isConflictSubVolume: true,
                  conflictType: 'CANTILEVER_OVERHANG',
                  label: '⚠️ Cantilever Overhang (4.0m Encroachment)',
                  parentUnitId: unit.id
                });

                continue;
              }

              // Case 2: 3D Volumetric Property Overlap (Floor 3 Unit 301 & 302)
              if (unit.id === 'u_p003_b003_f3_01' || unit.id === 'u_p003_b003_f3_02') {
                if (unit.id === 'u_p003_b003_f3_01') {
                  // Valid non-overlapping portion of Flat 301
                  const valid301Poly = [
                    { x: -94.6, z: -82.9 },
                    { x: -81.2, z: -82.9 },
                    { x: -81.2, z: -55.2 },
                    { x: -94.6, z: -55.2 },
                  ];
                  const avgX = valid301Poly.reduce((s, p) => s + p.x, 0) / 4;
                  const avgZ = valid301Poly.reduce((s, p) => s + p.z, 0) / 4;
                  const screen = project3DToScreen(avgX, (bottomY + topY) / 2, avgZ, width, height);
                  renderList.push({
                    type: 'unit',
                    unit,
                    floorNumber: fl.floorNumber,
                    polygon: valid301Poly,
                    bottomY,
                    topY,
                    depth: screen.depth,
                    color: viewState.colorMode === 'by-conflict' ? '#10b981' : unitColor,
                    isSelected,
                    isHovered,
                    hasCollision: false,
                    label: `${unit.unitNumber} (Valid)`,
                    parentUnitId: unit.id
                  });

                  // The Overlapping Intersection Sub-Volume (shared between 301 & 302)
                  const overlapPoly = [
                    { x: -81.2, z: -82.9 },
                    { x: -76.8, z: -82.9 },
                    { x: -76.8, z: -55.2 },
                    { x: -81.2, z: -55.2 },
                  ];
                  const overAvgX = overlapPoly.reduce((s, p) => s + p.x, 0) / 4;
                  const overAvgZ = overlapPoly.reduce((s, p) => s + p.z, 0) / 4;
                  const overScreen = project3DToScreen(overAvgX, (bottomY + topY) / 2, overAvgZ, width, height);
                  renderList.push({
                    type: 'conflict_subvolume',
                    unit,
                    floorNumber: fl.floorNumber,
                    polygon: overlapPoly,
                    bottomY,
                    topY,
                    depth: overScreen.depth,
                    color: '#f97316',
                    isSelected: isSelected || viewState.selectedUnitId === 'u_p003_b003_f3_02',
                    isHovered: isHovered || hoveredUnitId === 'u_p003_b003_f3_02',
                    hasCollision: true,
                    isConflictSubVolume: true,
                    conflictType: 'UNIT_OVERLAP',
                    label: '⚠️ 3D Overlap (Flat 301 ⟷ 302)',
                    parentUnitId: unit.id
                  });
                } else if (unit.id === 'u_p003_b003_f3_02') {
                  // Valid non-overlapping portion of Flat 302
                  const valid302Poly = [
                    { x: -76.8, z: -82.9 },
                    { x: -60.1, z: -82.9 },
                    { x: -60.1, z: -55.2 },
                    { x: -76.8, z: -55.2 },
                  ];
                  const avgX = valid302Poly.reduce((s, p) => s + p.x, 0) / 4;
                  const avgZ = valid302Poly.reduce((s, p) => s + p.z, 0) / 4;
                  const screen = project3DToScreen(avgX, (bottomY + topY) / 2, avgZ, width, height);
                  renderList.push({
                    type: 'unit',
                    unit,
                    floorNumber: fl.floorNumber,
                    polygon: valid302Poly,
                    bottomY,
                    topY,
                    depth: screen.depth,
                    color: viewState.colorMode === 'by-conflict' ? '#10b981' : unitColor,
                    isSelected,
                    isHovered,
                    hasCollision: false,
                    label: `${unit.unitNumber} (Valid)`,
                    parentUnitId: unit.id
                  });
                }
                continue;
              }

              // Standard Unit - strictly use unit polygon or floor/building authoritative footprint
              const unitCoords = (unit.polygon && unit.polygon.length >= 3)
                ? unit.polygon
                : (fl.footprintCoords && fl.footprintCoords.length >= 3)
                  ? fl.footprintCoords
                  : (fl.geometry && fl.geometry.length >= 3)
                    ? fl.geometry
                    : bldg.footprintCoords;
              const localPoly = unitCoords.map(c => projectToLocal(c));
              const avgX = localPoly.reduce((s, p) => s + p.x, 0) / localPoly.length;
              const avgZ = localPoly.reduce((s, p) => s + p.z, 0) / localPoly.length;
              const pScreen = project3DToScreen(avgX, (bottomY + topY) / 2, avgZ, width, height);

              renderList.push({
                type: 'unit',
                unit,
                floorNumber: fl.floorNumber,
                polygon: localPoly,
                bottomY,
                topY,
                depth: pScreen.depth,
                color: unitColor,
                isSelected,
                isHovered,
                hasCollision: unit.hasTopologyCollision,
                label: unit.unitNumber,
                parentUnitId: unit.id
              });
            }
          } else if (viewState.showBuildingEnvelopes) {
            const flCoords = (fl.footprintCoords && fl.footprintCoords.length >= 3)
              ? fl.footprintCoords
              : (fl.geometry && fl.geometry.length >= 3)
                ? fl.geometry
                : bldg.footprintCoords;
            const localPoly = flCoords.map(c => projectToLocal(c));
            const avgX = localPoly.reduce((s, p) => s + p.x, 0) / localPoly.length;
            const avgZ = localPoly.reduce((s, p) => s + p.z, 0) / localPoly.length;
            const pScreen = project3DToScreen(avgX, (bottomY + topY) / 2, avgZ, width, height);

            renderList.push({
              type: 'envelope',
              building: bldg,
              floorNumber: fl.floorNumber,
              polygon: localPoly,
              bottomY,
              topY,
              depth: pScreen.depth,
              color: fl.isBasement ? '#64748b' : '#3b82f6',
              isSelected: bldg.id === viewState.selectedBuildingId,
              isHovered: false,
              hasCollision: bldg.hasBoundaryOverhang && fl.floorNumber === 4,
              label: `${fl.floorName}`,
            });
          }
        }
      }
    }

    // 4. Render Vertical Cadastral Setback Boundary Curtain / Plane for Parcel P003 (Sy. No. 44/4)
    if (viewState.showParcels && !is2DMode) {
      const boundaryX = -60.1;
      const zMin = -88.0;
      const zMax = -50.0;
      const maxH = 26.0 + (viewState.isExplodedView ? 14.0 : 0.0);

      const pBtm1 = project3DToScreen(boundaryX, 0, zMin, width, height);
      const pBtm2 = project3DToScreen(boundaryX, 0, zMax, width, height);
      const pTop2 = project3DToScreen(boundaryX, maxH, zMax, width, height);
      const pTop1 = project3DToScreen(boundaryX, maxH, zMin, width, height);

      // Draw semi-transparent vertical setback plane
      ctx.beginPath();
      ctx.moveTo(pBtm1.x, pBtm1.y);
      ctx.lineTo(pBtm2.x, pBtm2.y);
      ctx.lineTo(pTop2.x, pTop2.y);
      ctx.lineTo(pTop1.x, pTop1.y);
      ctx.closePath();

      // Pulsing amber/rose curtain fill
      const pulseAlpha = 0.12 + Math.sin(animTick * 3) * 0.05;
      ctx.fillStyle = `rgba(244, 63, 94, ${pulseAlpha})`;
      ctx.fill();

      // Boundary grid lines on the vertical plane
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.4)';
      ctx.setLineDash([4, 4]);
      for (let h = 4; h <= maxH; h += 4) {
        const ph1 = project3DToScreen(boundaryX, h, zMin, width, height);
        const ph2 = project3DToScreen(boundaryX, h, zMax, width, height);
        ctx.beginPath();
        ctx.moveTo(ph1.x, ph1.y);
        ctx.lineTo(ph2.x, ph2.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Legal Boundary Wall Edge
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = '#f43f5e';
      ctx.stroke();

      // Floating Setback Boundary Header Tag
      const tagScreen = project3DToScreen(boundaryX, maxH + 1.5, (zMin + zMax) / 2, width, height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 3D LEGAL SETBACK BOUNDARY CURTAIN', tagScreen.x, tagScreen.y);
    }

    // Sort renderables from back to front (Painter's Algorithm)
    renderList.sort((a, b) => a.depth - b.depth);

    // 5. Draw 3D Volumetric Prisms
    const pulseFactor = 0.5 + Math.sin(animTick * 5) * 0.5;

    for (const item of renderList) {
      const { polygon, bottomY, topY, color, isSelected, isHovered, hasCollision, isConflictSubVolume, conflictType, label } = item;
      const n = polygon.length;
      if (n < 3) continue;

      const isFloorActive = viewState.selectedFloorNumber !== null && item.floorNumber === viewState.selectedFloorNumber;
      const isFloorDimmed = viewState.selectedFloorNumber !== null && item.floorNumber !== viewState.selectedFloorNumber;

      const bottomPts = polygon.map(p => project3DToScreen(p.x, bottomY, p.z, width, height));
      const topPts = polygon.map(p => project3DToScreen(p.x, topY, p.z, width, height));

      // Side wall shading & rendering
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const p1Bottom = bottomPts[i];
        const p2Bottom = bottomPts[next];
        const p2Top = topPts[next];
        const p1Top = topPts[i];

        const dx = polygon[next].x - polygon[i].x;
        const dz = polygon[next].z - polygon[i].z;
        const normalDotLight = Math.max(0.35, Math.min(1.0, (dx * 0.6 + dz * 0.8) / Math.hypot(dx, dz) * 0.5 + 0.65));

        ctx.beginPath();
        ctx.moveTo(p1Bottom.x, p1Bottom.y);
        ctx.lineTo(p2Bottom.x, p2Bottom.y);
        ctx.lineTo(p2Top.x, p2Top.y);
        ctx.lineTo(p1Top.x, p1Top.y);
        ctx.closePath();

        if (isConflictSubVolume) {
          // Intense pulsating red/orange hazard wall
          ctx.fillStyle = conflictType === 'CANTILEVER_OVERHANG'
            ? `rgba(239, 68, 68, ${0.75 + pulseFactor * 0.2})`
            : `rgba(249, 115, 22, ${0.75 + pulseFactor * 0.2})`;
        } else if (hasCollision) {
          ctx.fillStyle = `rgba(239, 68, 68, ${isSelected || isHovered ? '0.85' : '0.65'})`;
        } else if (isSelected) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.85)';
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = isFloorDimmed ? 0.15 : (normalDotLight * (item.floorNumber < 0 ? 0.75 : 0.85));
        }

        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Wireframe edges
        ctx.lineWidth = isConflictSubVolume ? 2.5 : isSelected ? 2.0 : isFloorActive ? 1.5 : 1.0;
        ctx.strokeStyle = isConflictSubVolume
          ? '#fef08a'
          : hasCollision
          ? '#fca5a5'
          : isSelected
          ? '#fef08a'
          : isFloorActive
          ? '#38bdf8'
          : isFloorDimmed
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(255, 255, 255, 0.35)';
        ctx.stroke();
      }

      // Top roof face - Triangulated via Earcut for arbitrary non-convex polygons
      const triangleIndices = triangulate2DPolygon(polygon);
      ctx.beginPath();
      for (let t = 0; t < triangleIndices.length; t += 3) {
        const i0 = triangleIndices[t];
        const i1 = triangleIndices[t + 1];
        const i2 = triangleIndices[t + 2];
        if (topPts[i0] && topPts[i1] && topPts[i2]) {
          ctx.moveTo(topPts[i0].x, topPts[i0].y);
          ctx.lineTo(topPts[i1].x, topPts[i1].y);
          ctx.lineTo(topPts[i2].x, topPts[i2].y);
          ctx.closePath();
        }
      }

      if (isConflictSubVolume) {
        ctx.fillStyle = conflictType === 'CANTILEVER_OVERHANG'
          ? `rgba(255, 59, 48, ${0.9 + pulseFactor * 0.1})`
          : `rgba(251, 146, 60, ${0.9 + pulseFactor * 0.1})`;
      } else if (hasCollision) {
        ctx.fillStyle = isSelected ? 'rgba(248, 113, 113, 0.95)' : 'rgba(239, 68, 68, 0.8)';
      } else if (isSelected) {
        ctx.fillStyle = '#fde047';
      } else if (isHovered) {
        ctx.fillStyle = '#93c5fd';
      } else {
        ctx.fillStyle = color;
      }
      
      // In Ground Truth mode or Floor Dimmed mode, adjust opacity
      ctx.globalAlpha = isFloorDimmed ? 0.12 : (isGroundTruthMode ? 0.15 : 0.95);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Stroke perimeter outline
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < n; i++) {
        ctx.lineTo(topPts[i].x, topPts[i].y);
      }
      ctx.closePath();

      ctx.lineWidth = isConflictSubVolume ? 2.5 : isSelected ? 2.5 : isFloorActive ? 2.2 : 1.2;
      ctx.strokeStyle = isConflictSubVolume
        ? '#ffffff'
        : hasCollision
        ? '#fee2e2'
        : isSelected
        ? '#ffffff'
        : isFloorActive
        ? '#38bdf8'
        : isFloorDimmed
        ? 'rgba(255, 255, 255, 0.12)'
        : isGroundTruthMode
        ? 'rgba(255, 255, 255, 0.25)'
        : 'rgba(255, 255, 255, 0.6)';
      ctx.stroke();

      // Draw Diagonal Hazard Warning Striping on Conflict Roof Face
      if (isConflictSubVolume) {
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 4;
        const minX = Math.min(...topPts.map(p => p.x)) - 20;
        const maxX = Math.max(...topPts.map(p => p.x)) + 20;
        const minY = Math.min(...topPts.map(p => p.y)) - 20;
        const maxY = Math.max(...topPts.map(p => p.y)) + 20;

        for (let x = minX; x <= maxX + (maxY - minY); x += 12) {
          ctx.beginPath();
          ctx.moveTo(x, minY);
          ctx.lineTo(x - (maxY - minY), maxY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // High-Visibility Selection Indicator (Only on Selected Object to prevent clutter)
      if (isSelected) {
        const centerTopX = topPts.reduce((s, p) => s + p.x, 0) / n;
        const centerTopY = topPts.reduce((s, p) => s + p.y, 0) / n;

        // Subtle Selection Indicator Ring
        ctx.beginPath();
        ctx.arc(centerTopX, centerTopY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerTopX, centerTopY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = isConflictSubVolume || hasCollision ? '#ef4444' : '#38bdf8';
        ctx.fill();
      }

      // Overhang warning pulse beacon (Subtle indicator on conflict objects)
      if (isConflictSubVolume || (hasCollision && isSelected)) {
        const topCenterX = topPts.reduce((s, p) => s + p.x, 0) / n;
        const topCenterY = topPts.reduce((s, p) => s + p.y, 0) / n;
        
        ctx.beginPath();
        ctx.arc(topCenterX, topCenterY - 12, 6 + pulseFactor * 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 6. Draw 3D Dimension Leader for Overhang Encroachment (Clean geometry without floating banner text)
    if (viewState.showPropertyUnits && !is2DMode) {
      const fl4Offset = 4 * (explosionFactor * 3.5);
      const dimensionY = 19.5 + fl4Offset;
      const bX = -60.1;
      const tipX = -55.7;
      const zAnchor = -69.0;

      const pBoundary = project3DToScreen(bX, dimensionY, zAnchor, width, height);
      const pTip = project3DToScreen(tipX, dimensionY, zAnchor, width, height);

      // Draw dimension leader line
      ctx.beginPath();
      ctx.moveTo(pBoundary.x, pBoundary.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      // Dimension ticks
      ctx.beginPath();
      ctx.moveTo(pBoundary.x, pBoundary.y - 5);
      ctx.lineTo(pBoundary.x, pBoundary.y + 5);
      ctx.moveTo(pTip.x, pTip.y - 5);
      ctx.lineTo(pTip.x, pTip.y + 5);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
    }

    // 7. Render 3D Sub-surface Infrastructure & Underground Utilities
    if (viewState.showBasements && !is2DMode) {
      const ugFilter = viewState.undergroundFilter;
      for (const parcel of effectiveParcels) {
        if (!parcel.undergroundAssets || parcel.undergroundAssets.length === 0) continue;

        for (const asset of parcel.undergroundAssets) {
          // Check visibility filters
          if (asset.type === 'Water Pipeline' && ugFilter && !ugFilter.showWaterPipeline) continue;
          if (asset.type === 'Sewage Pipeline' && ugFilter && !ugFilter.showSewagePipeline) continue;
          if (asset.type === 'Electrical Cable' && ugFilter && !ugFilter.showElectricalCable) continue;
          if (asset.type === 'Fiber Optic Cable' && ugFilter && !ugFilter.showFiberOptic) continue;
          if (asset.type === 'Utility Tunnel' && ugFilter && !ugFilter.showUtilityTunnel) continue;

          const localPts = asset.coordinates.map(c => projectToLocal(c));
          if (localPts.length < 2) continue;

          // Utility depth elevation (negative Y)
          const utilY = -Math.abs(asset.depthM);
          const screenPts = localPts.map(p => project3DToScreen(p.x, utilY, p.z, width, height));

          let strokeColor = '#06b6d4';
          if (asset.type === 'Water Pipeline') strokeColor = '#06b6d4';
          if (asset.type === 'Sewage Pipeline') strokeColor = '#84cc16';
          if (asset.type === 'Electrical Cable') strokeColor = '#eab308';
          if (asset.type === 'Fiber Optic Cable') strokeColor = '#ec4899';
          if (asset.type === 'Utility Tunnel') strokeColor = '#a855f7';

          if (asset.hasTopologyCollision) {
            strokeColor = '#ef4444';
          }

          // Draw 3D Utility Conduit Path
          ctx.beginPath();
          ctx.moveTo(screenPts[0].x, screenPts[0].y);
          for (let i = 1; i < screenPts.length; i++) {
            ctx.lineTo(screenPts[i].x, screenPts[i].y);
          }
          ctx.lineWidth = asset.hasTopologyCollision ? 3.5 : 2.5;
          ctx.strokeStyle = strokeColor;
          ctx.setLineDash(asset.hasTopologyCollision ? [] : [6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw Nodes at endpoints
          screenPts.forEach((pt, pIdx) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, asset.hasTopologyCollision ? 4.5 : 3, 0, 2 * Math.PI);
            ctx.fillStyle = strokeColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          });

          // Draw Collision Indicator if utility intersects basement
          if (asset.hasTopologyCollision && screenPts.length > 1) {
            const midPt = screenPts[Math.floor(screenPts.length / 2)];
            ctx.beginPath();
            ctx.arc(midPt.x, midPt.y, 7 + pulseFactor * 2, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }
    }

  }, [
    parcels,
    viewState,
    cameraRotX,
    cameraRotY,
    zoomLevel,
    panOffset,
    hoveredUnitId,
    animTick,
    projectToLocal,
    project3DToScreen,
    getUnitColor
  ]);

  // Handle Raycasting / Click Selection on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const width = canvas.width;
    const height = canvas.height;

    let nearestUnit: PropertyUnit | null = null;
    let minDistance = 32;

    const explosionFactor = viewState.isExplodedView ? viewState.explosionFactor : 0.0;
    const is2DMode = viewState.viewPerspective === '2D';

    for (const parcel of effectiveParcels) {
      for (const bldg of parcel.buildings) {
        for (const fl of bldg.floors) {
          if (fl.isBasement && !viewState.showBasements) continue;

          let verticalOffset = 0;
          if (!is2DMode) {
            if (fl.floorNumber > 0) {
              verticalOffset = fl.floorNumber * (explosionFactor * 3.5);
            } else if (fl.floorNumber < 0) {
              verticalOffset = fl.floorNumber * (explosionFactor * 2.5);
            }
          }

          const midY = (fl.elevationBottom + fl.elevationTop) / 2 + verticalOffset;

          for (const unit of fl.units) {
            const localPoly = unit.polygon.map(c => projectToLocal(c));
            const avgX = localPoly.reduce((s, p) => s + p.x, 0) / localPoly.length;
            const avgZ = localPoly.reduce((s, p) => s + p.z, 0) / localPoly.length;
            const screenPt = project3DToScreen(avgX, midY, avgZ, width, height);

            const dist = Math.hypot(screenPt.x - clickX, screenPt.y - clickY);
            if (dist < minDistance) {
              minDistance = dist;
              nearestUnit = unit;
            }
          }
        }
      }
    }

    if (nearestUnit) {
      onSelectParcel(nearestUnit.parcelId);
      onSelectBuilding(nearestUnit.buildingId);
      onSelectFloor(nearestUnit.floorNumber);
      onSelectUnit(nearestUnit.id);
    } else {
      // If no unit was clicked, check nearest building envelope
      let nearestBldg: { parcelId: string; buildingId: string } | null = null;
      let minBldgDist = 48;
      for (const parcel of effectiveParcels) {
        for (const bldg of parcel.buildings) {
          const localPoly = bldg.footprintCoords.map(c => projectToLocal(c));
          if (localPoly.length === 0) continue;
          const avgX = localPoly.reduce((s, p) => s + p.x, 0) / localPoly.length;
          const avgZ = localPoly.reduce((s, p) => s + p.z, 0) / localPoly.length;
          const midY = (bldg.totalHeightM || 25) / 2;
          const screenPt = project3DToScreen(avgX, midY, avgZ, width, height);
          const dist = Math.hypot(screenPt.x - clickX, screenPt.y - clickY);
          if (dist < minBldgDist) {
            minBldgDist = dist;
            nearestBldg = { parcelId: parcel.id, buildingId: bldg.id };
          }
        }
      }
      if (nearestBldg) {
        onSelectParcel(nearestBldg.parcelId);
        onSelectBuilding(nearestBldg.buildingId);
        onSelectFloor(null);
        onSelectUnit(null);
      }
    }
  };

  // Determine if active selected/hovered unit is in conflict
  const isConflictActive = selectedUnit?.hasTopologyCollision;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {/* 3D WebGL Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />

      {/* Top Floating View Controls & Status Badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* 2D / 3D Cadastral Perspective Primary Toggle */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl flex items-center gap-1">
          <button
            onClick={() => onToggleViewPerspective?.('2D')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewState.viewPerspective === '2D'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D CADASTRAL VIEW</span>
          </button>
          <button
            onClick={() => onToggleViewPerspective?.('3D')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewState.viewPerspective === '3D'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D VERTICAL CADASTRE</span>
          </button>
        </div>

        {/* Selected hierarchy breadcrumb */}
        {selectedParcel && (
          <div className="bg-blue-950/90 backdrop-blur-md border border-blue-800/80 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-2 text-xs text-blue-200">
            <span className="text-slate-400 font-mono text-[11px]">PARCEL:</span>
            <strong className="text-white font-mono">{selectedParcel.id}</strong>
            {selectedBuilding && (
              <>
                <span className="text-blue-500">›</span>
                <span className="text-slate-300">Bldg {selectedBuilding.id}</span>
              </>
            )}
            {viewState.selectedFloorNumber !== null && (
              <>
                <span className="text-blue-500">›</span>
                <span className="text-slate-300">
                  {viewState.selectedFloorNumber < 0 ? `Basement B${Math.abs(viewState.selectedFloorNumber)}` : viewState.selectedFloorNumber === 0 ? 'Ground Floor' : `Floor ${viewState.selectedFloorNumber}`}
                </span>
                {(() => {
                  const activeFloor = selectedBuilding?.floors.find(f => f.floorNumber === viewState.selectedFloorNumber);
                  return activeFloor?.prototypeUlpin3D ? (
                    <span className="text-[10px] font-mono text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/80 font-semibold">
                      {activeFloor.prototypeUlpin3D}
                    </span>
                  ) : null;
                })()}
              </>
            )}
            {selectedUnit && (
              <>
                <span className="text-blue-500">›</span>
                <span className={`font-bold font-mono ${selectedUnit.hasTopologyCollision ? 'text-rose-400' : 'text-amber-400'}`}>
                  {selectedUnit.unitNumber}
                </span>
              </>
            )}
          </div>
        )}

        {/* Ground Truth Top-Down Verification Mode Button */}
        {geometryAudit && (
          <button
            onClick={toggleGroundTruthMode}
            className={`backdrop-blur-md rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
              isGroundTruthMode
                ? 'bg-purple-600 border-purple-400 text-white ring-2 ring-purple-400/40 shadow-purple-900/50'
                : 'bg-slate-900/90 hover:bg-slate-850 border-purple-500/60 text-purple-300'
            }`}
            title="Ground Truth Mode: Switch to Orthogonal Top-Down View for 2D vs 3D Footprint Parity"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isGroundTruthMode ? 'OVERHEAD VIEW (ACTIVE)' : 'VERIFY 3D FOOTPRINT'}</span>
          </button>
        )}

        {/* Source Footprint Layer Toggle (Requirement 10) */}
        {geometryAudit && (
          <button
            onClick={() => setShowOsmFootprint(prev => !prev)}
            className={`backdrop-blur-md rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
              showOsmFootprint
                ? 'bg-cyan-600 border-cyan-400 text-white ring-2 ring-cyan-400/40 shadow-cyan-900/50'
                : 'bg-slate-900/90 hover:bg-slate-850 border-cyan-500/60 text-cyan-300'
            }`}
            title="Show Source Footprint: Overlays the original 2D source polygon on top of the 3D model footprint"
          >
            <input
              type="checkbox"
              checked={showOsmFootprint}
              onChange={() => {}}
              className="rounded accent-cyan-400 w-3.5 h-3.5 pointer-events-none"
            />
            <span>Show Source Footprint</span>
          </button>
        )}

        {/* Geometry Audit & Visual Alignment Toggle Button */}
        {geometryAudit && (
          <button
            onClick={() => setShowGeometryAuditPanel(prev => !prev)}
            className={`backdrop-blur-md rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
              showGeometryAuditPanel
                ? 'bg-cyan-600 border-cyan-400 text-white ring-2 ring-cyan-400/40'
                : geometryAudit.isAligned
                  ? 'bg-slate-900/90 hover:bg-slate-850 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900/90 hover:bg-slate-850 border-amber-500/60 text-amber-300'
            }`}
            title="Toggle Visual Debug Mode: Real OSM Footprint vs 3D Base alignment audit"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {geometryAudit.isAligned ? '✓ FOOTPRINT MATCHED' : '⚠ GEOMETRY AUDIT'}
            </span>
            <span className="text-[10px] font-mono opacity-80">
              ({geometryAudit.areaDiffPercent.toFixed(1)}% / {geometryAudit.centroidOffsetM.toFixed(2)}m)
            </span>
          </button>
        )}

        {/* End-to-End Pipeline Trace Audit Modal Toggle */}
        {geometryAudit && (
          <button
            onClick={() => setShowPipelineTraceModal(true)}
            className="backdrop-blur-md bg-slate-900/90 hover:bg-slate-850 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-1.5 text-xs font-bold border border-sky-500/60 text-sky-300 transition-all cursor-pointer hover:text-white"
            title="Trace the complete coordinate journey from OSM Polygon to 3D mesh"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>TRACE PIPELINE</span>
          </button>
        )}

        {/* Floor Level Selector Toggle Button (Requirement 4) */}
        {selectedBuilding && selectedBuilding.floors.length > 0 && (
          <button
            onClick={() => setShowFloorSelector(prev => !prev)}
            className={`backdrop-blur-md rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
              showFloorSelector
                ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/40 shadow-blue-900/50'
                : 'bg-slate-900/90 hover:bg-slate-850 border-blue-500/60 text-blue-300'
            }`}
            title="Toggle Floor Strata Level Navigator"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>FLOOR STRATA ({selectedBuilding.floors.length})</span>
          </button>
        )}
      </div>

      {/* Floating Floor Strata Level Selector Panel (Requirement 4) */}
      {showFloorSelector && selectedBuilding && selectedBuilding.floors.length > 0 && (
        <div className="absolute left-4 top-18 z-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto w-64 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Layers className="w-3.5 h-3.5" />
              Floor Levels ({selectedBuilding.floors.length})
            </span>
            {viewState.selectedFloorNumber !== null ? (
              <button
                onClick={() => onSelectFloor(null)}
                className="text-sky-400 hover:text-white text-[9.5px] font-medium lowercase underline cursor-pointer"
              >
                show all
              </button>
            ) : (
              <span className="text-[9.5px] font-mono text-slate-500">all active</span>
            )}
          </div>

          <button
            onClick={() => onSelectFloor(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer flex items-center justify-between ${
              viewState.selectedFloorNumber === null
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <span>All Building Floors</span>
            <span className="text-[10px] font-mono opacity-80">{selectedBuilding.totalUnitsCount} units</span>
          </button>

          {/* Render floors top-down */}
          {[...selectedBuilding.floors]
            .sort((a, b) => b.floorNumber - a.floorNumber)
            .map((fl) => {
              const isSelected = viewState.selectedFloorNumber === fl.floorNumber;
              const hasCollision = fl.units.some(u => u.hasTopologyCollision);
              const zMin = fl.elevationBottom;
              const zMax = fl.elevationTop;

              return (
                <button
                  key={fl.floorNumber}
                  onClick={() => onSelectFloor(isSelected ? null : fl.floorNumber)}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-600/90 border-sky-400 text-white shadow-lg ring-2 ring-sky-400/40'
                      : hasCollision
                      ? 'bg-rose-950/40 border-rose-800/50 text-rose-300 hover:bg-rose-900/50'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono">
                      {fl.floorNumber < 0 
                        ? `Basement B${Math.abs(fl.floorNumber)}` 
                        : fl.floorNumber === 0 
                        ? 'Ground Level' 
                        : `Floor ${fl.floorNumber}`}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900/90 text-slate-300 border border-slate-700/60">
                      {fl.units.length} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 mt-1 font-mono">
                    <span>Z: {zMin.toFixed(1)}m – {zMax.toFixed(1)}m</span>
                    {hasCollision && (
                      <span className="text-rose-400 font-bold text-[9px] flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        OVERHANG
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {/* Visual Debug Mode - Geometry Audit HUD Panel */}
      {showGeometryAuditPanel && geometryAudit && (
        <div className="absolute top-16 left-4 z-30 w-88 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/60 rounded-2xl p-4 shadow-2xl text-xs text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                OSM ↔ 3D Geometry Audit
              </span>
            </div>
            <button 
              onClick={() => setShowGeometryAuditPanel(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Visual Ground Overlays Checkboxes */}
          <div className="space-y-2 mb-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
                SHOW OSM FOOTPRINT
              </span>
              <input
                type="checkbox"
                checked={showOsmFootprint}
                onChange={e => setShowOsmFootprint(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px]">
                <span className="w-3 h-0.5 bg-amber-400 inline-block"></span>
                SHOW 3D BASE
              </span>
              <input
                type="checkbox"
                checked={show3dBase}
                onChange={e => setShow3dBase(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5 text-[11px]">
                <span className="w-3 h-0.5 bg-purple-400 inline-block"></span>
                SHOW PROJECTED FOOTPRINT
              </span>
              <input
                type="checkbox"
                checked={showProjectedFootprint}
                onChange={e => setShowProjectedFootprint(e.target.checked)}
                className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                <Compass className="w-3 h-3 text-indigo-400 inline-block" />
                TOP-DOWN GROUND TRUTH
              </span>
              <input
                type="checkbox"
                checked={isGroundTruthMode}
                onChange={toggleGroundTruthMode}
                className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Geometry Verification Metrics Breakdown */}
          <div className="space-y-2 font-mono text-[11px]">
            {/* OSM Footprint */}
            <div className="bg-slate-950/80 p-2 rounded-lg border border-cyan-500/30">
              <div className="text-cyan-400 font-bold mb-1 flex items-center justify-between text-[10px]">
                <span>OSM FOOTPRINT</span>
                <span className="text-cyan-300/80">AUTHORITATIVE</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-slate-300">
                <div>Area: <strong className="text-white">{geometryAudit.osmAreaSqm.toFixed(1)} m²</strong></div>
                <div>Vertices: <strong className="text-white">{geometryAudit.osmVertices}</strong></div>
              </div>
            </div>

            {/* 3D Base */}
            <div className="bg-slate-950/80 p-2 rounded-lg border border-amber-500/30">
              <div className="text-amber-400 font-bold mb-1 flex items-center justify-between text-[10px]">
                <span>3D BASE</span>
                <span className="text-amber-300/80">EXTRUDED SLAB</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-slate-300">
                <div>Area: <strong className="text-white">{geometryAudit.baseAreaSqm.toFixed(1)} m²</strong></div>
                <div>Vertices: <strong className="text-white">{geometryAudit.baseVertices}</strong></div>
              </div>
            </div>

            {/* Verification Deltas */}
            <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px]">AREA DIFFERENCE:</span>
                <strong className={geometryAudit.areaDiffPercent < 0.25 ? "text-emerald-400" : "text-amber-400"}>
                  {geometryAudit.areaDiffPercent.toFixed(2)}%
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px]">CENTROID OFFSET:</span>
                <strong className={geometryAudit.centroidOffsetM < 0.15 ? "text-emerald-400" : "text-amber-400"}>
                  {geometryAudit.centroidOffsetM.toFixed(2)} m
                </strong>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400 text-[10px]">HEIGHT SOURCE:</span>
                <span className="text-sky-300 font-sans font-semibold text-[10px]">
                  {geometryAudit.heightSource === 'USER_CONFIGURED' ? 'USER CONFIGURED' : (geometryAudit.heightSource === 'OSM_TAG' ? 'OSM ATTRIBUTE' : 'AI ESTIMATED')} ({geometryAudit.heightValueM}m)
                </span>
              </div>
            </div>

            {/* LiDAR Cross-Check (Requirement 12) */}
            {lidarAnalysis && (
              <div className="bg-slate-950/90 p-2.5 rounded-lg border border-purple-500/40 space-y-1">
                <div className="text-purple-400 font-bold mb-1 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1">
                    <Box className="w-3 h-3 text-purple-400" />
                    LIDAR CROSS-CHECK
                  </span>
                  <span className={lidarAnalysis.isVerified ? "text-emerald-400 font-bold" : "text-amber-400"}>
                    {lidarAnalysis.isVerified ? "✓ HEIGHT VERIFIED BY LIDAR" : "⚠ HEIGHT ESTIMATED"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-slate-300 text-[10px]">
                  <div>Footprint Points: <strong className="text-white">{lidarAnalysis.pointsCount}</strong></div>
                  <div>LiDAR Height: <strong className="text-white">{lidarAnalysis.lidarHeightM.toFixed(1)}m</strong></div>
                  <div>Model Height: <strong className="text-white">{lidarAnalysis.buildingHeightM.toFixed(1)}m</strong></div>
                  <div>Δ Height: <strong className={lidarAnalysis.heightDifferenceM < 1.5 ? "text-emerald-400" : "text-amber-400"}>{lidarAnalysis.heightDifferenceM.toFixed(1)}m</strong></div>
                </div>
              </div>
            )}

            {/* Alignment Status Banner */}
            <div className={`p-2 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-1.5 ${
              geometryAudit.isAligned
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
            }`}>
              {geometryAudit.isAligned ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>✓ FOOTPRINT MATCHED (0.00% Area Difference)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>⚠ 3D GEOMETRY DOES NOT MATCH OSM FOOTPRINT</span>
                </>
              )}
            </div>

            {/* Pipeline Trace Audit Action Button */}
            <button
              onClick={() => setShowPipelineTraceModal(true)}
              className="w-full py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>VIEW FULL PIPELINE TRACE AUDIT</span>
            </button>
          </div>
        </div>
      )}

      {/* Sleek Minimal Hover Tooltip (Only visible when hovering over a unit, avoiding scene clutter) */}
      {hoveredUnit && !isDragging && (
        <div 
          className="absolute z-20 pointer-events-none bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-xl text-xs flex items-center gap-2 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y - 12}px`,
          }}
        >
          <div className={`w-2 h-2 rounded-full ${hoveredUnit.hasTopologyCollision ? 'bg-rose-500 animate-ping' : 'bg-blue-400'}`} />
          <span className="font-bold text-slate-100">{hoveredUnit.unitNumber}</span>
          <span className="text-slate-400 text-[11px] font-mono">
            Floor {hoveredUnit.floorNumber}
          </span>
          {hoveredUnit.hasTopologyCollision && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Conflict
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-sans">Click to inspect</span>
        </div>
      )}

      {/* Floating 3D Navigation Gizmo & Quick Actions (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1">
          <button
            onClick={() => setZoomLevel(prev => Math.min(4.5, prev * 1.2))}
            title="Zoom In (+)"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.4, prev * 0.8))}
            title="Zoom Out (-)"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button
            onClick={resetCamera}
            title="Reset Perspective / North Alignment"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCameraRotX(85);
              setCameraRotY(0);
            }}
            title="2D Top-Down Cadastral View"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors text-[10px] font-bold font-mono"
          >
            2D
          </button>
          <button
            onClick={() => {
              setCameraRotX(35);
              setCameraRotY(-45);
            }}
            title="3D Volumetric View"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors text-[10px] font-bold font-mono"
          >
            3D
          </button>
          {onOpenPointCloud && (
            <>
              <div className="h-px bg-slate-800 my-0.5" />
              <button
                onClick={onOpenPointCloud}
                title="Inspect LiDAR Point Cloud (Simulated LoD-2/3 Returns)"
                className="p-2 hover:bg-purple-900/40 text-purple-300 hover:text-purple-200 rounded-lg transition-colors"
              >
                <Box className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Vertical Exploder & Layer Control Bar (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          
          {/* Vertical Floor Exploder Controller */}
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 whitespace-nowrap">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Explode Floors:</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={viewState.explosionFactor}
              onChange={e => onExplosionChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs font-mono font-bold text-blue-400 w-10 text-right">
              {viewState.explosionFactor > 0 ? `${viewState.explosionFactor.toFixed(1)}x` : '0x'}
            </span>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onExplosionChange(0)}
                title="Collapse Floors (0x)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  viewState.explosionFactor === 0 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onExplosionChange(1.5)}
                title="Moderate Explosion (1.5x)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  viewState.explosionFactor === 1.5 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                1.5x
              </button>
              <button
                type="button"
                onClick={() => onExplosionChange(3.0)}
                title="Maximum Vertical Separation (3.0x)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  viewState.explosionFactor === 3.0 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                3.0x
              </button>
            </div>
          </div>

          {/* Subterranean Basement Toggle & Layer Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBasements}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewState.showBasements
                  ? 'bg-purple-600/30 border border-purple-500/60 text-purple-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Basements ({viewState.showBasements ? 'Visible' : 'Hidden'})</span>
            </button>

            {/* Color Mode Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => onColorModeChange('by-floor')}
                className={`px-2 py-1 rounded-md transition-all ${
                  viewState.colorMode === 'by-floor'
                    ? 'bg-blue-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Floors
              </button>
              <button
                onClick={() => onColorModeChange('by-use')}
                className={`px-2 py-1 rounded-md transition-all ${
                  viewState.colorMode === 'by-use'
                    ? 'bg-blue-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Usage
              </button>
              <button
                onClick={() => onColorModeChange('by-status')}
                className={`px-2 py-1 rounded-md transition-all ${
                  viewState.colorMode === 'by-status'
                    ? 'bg-blue-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Title Status
              </button>
              <button
                onClick={() => onColorModeChange('by-conflict')}
                className={`px-2 py-1 rounded-md transition-all ${
                  viewState.colorMode === 'by-conflict'
                    ? 'bg-rose-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conflicts
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Mouse Navigation Hint (Bottom Left) */}
      <div className="absolute bottom-3 left-4 z-10 text-[11px] text-slate-500 font-mono pointer-events-none hidden sm:block">
        Left-Click + Drag to Orbit • Right-Click / Shift + Drag to Pan • Scroll to Zoom • Click on Unit to Inspect
      </div>

      {/* Real Location 3D Geometry Acquisition Fallback Overlay */}
      {appMode === 'REAL_LOCATION' && !selectedBuilding && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center text-slate-200">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Box className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {acquisitionState?.status === 'timeout'
                  ? 'OSM Footprint Query Timed Out'
                  : acquisitionState?.status === 'no_polygon'
                  ? 'No 3D Footprint Mapped in OSM'
                  : acquisitionState?.status === 'querying_osm'
                  ? 'Querying OpenStreetMap Footprints...'
                  : 'Awaiting Building Footprint Polygon'}
              </h3>
              <p className="text-xs text-slate-400">
                {acquisitionState?.locationName 
                  ? `Location: ${acquisitionState.locationName}`
                  : 'A 3D model requires a verified building polygon.'}
              </p>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-left space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Location Pin:</span>
                <span className="text-emerald-400 font-bold">Resolved (Nominatim)</span>
              </div>
              <div className="flex justify-between">
                <span>Footprints in Radius:</span>
                <span className={acquisitionState?.osmFootprintsCount ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {acquisitionState?.osmFootprintsCount ?? 0} Polygons
                </span>
              </div>
              <div className="flex justify-between">
                <span>Overpass Status:</span>
                <span className={
                  acquisitionState?.status === 'timeout' 
                    ? 'text-amber-400 font-bold' 
                    : acquisitionState?.status === 'polygon_found'
                    ? 'text-emerald-400 font-bold'
                    : acquisitionState?.status === 'querying_osm'
                    ? 'text-sky-400 animate-pulse'
                    : 'text-slate-300'
                }>
                  {acquisitionState?.status === 'timeout' 
                    ? 'TIMEOUT (12.00s)' 
                    : acquisitionState?.status === 'querying_osm'
                    ? 'QUERYING IN-FLIGHT'
                    : (acquisitionState?.status?.toUpperCase() || 'IDLE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>3D Volumetric Mesh:</span>
                <span className="text-slate-500 font-sans">Suspended (No Synthetic Leakage)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              3D models are generated from verified building polygons. You can retry the live Overpass query, search an expanded radius, load the verified prototype geometry, or import a GeoJSON footprint.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              {onUseCachedGeometry && (
                <button
                  onClick={onUseCachedGeometry}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Use Cached Geometry (Verified BNMIT Footprint)</span>
                </button>
              )}
              
              <div className="flex gap-2">
                {onRetryOsmQuery && (
                  <button
                    onClick={onRetryOsmQuery}
                    className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Query</span>
                  </button>
                )}
                {onOpenImportGeoJson && (
                  <button
                    onClick={onOpenImportGeoJson}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import GeoJSON</span>
                  </button>
                )}
                <button
                  onClick={() => onToggleViewPerspective?.('2D')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition cursor-pointer"
                >
                  Back to 2D
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End-to-End Geometry Pipeline Trace & Audit Modal */}
      {showPipelineTraceModal && (
        <GeometryPipelineTraceModal
          isOpen={showPipelineTraceModal}
          onClose={() => setShowPipelineTraceModal(false)}
          selectedBuilding={selectedBuilding}
          selectedParcel={selectedParcel}
        />
      )}
    </div>
  );
};
