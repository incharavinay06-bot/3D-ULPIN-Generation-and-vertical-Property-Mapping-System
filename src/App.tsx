/**
 * 3D ULPIN & Vertical Property Mapping System
 * Smart India Hackathon 2026 • SIH26011
 * Ministry of Rural Development
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  CadastralParcel, 
  MapViewState, 
  VisualColorMode, 
  TopologyIssue,
  UndergroundVisibilityFilter,
  Building,
  FloorLevel,
  PropertyUnit,
  SpatialCoordinates2D,
  BuildingAcquisitionState
} from './types/cadastre';
import { SAMPLE_CADASTRAL_PARCELS, getAllPropertyUnits, getAllBuildings } from './data/sampleCadastre';
import { run3DCadastralValidation } from './utils/topologyEngine';
import { generateTierUlpin, generateUnitUlpin3D, generateFloorUlpin3D } from './utils/ulpinGenerator';
import { OsmBuildingFeature, createCadastreFromOsmBuilding, getCachedOrFallbackBuildings } from './utils/osmService';
import { generateVerifiedFallbackBuildingsForLocation } from './data/verifiedOsmFallback';
import { runAIBuildingAnalysis } from './utils/aiAnalysisService';

// Viewport Components
import { CesiumViewer } from './components/CesiumViewer';
import { RealLeafletMap } from './components/RealLeafletMap';
import { Navbar } from './components/Navbar';
import { PropertyInspector } from './components/PropertyInspector';
import { CadastralLegend } from './components/CadastralLegend';
import { EndToEndWorkflowBar } from './components/EndToEndWorkflowBar';
import { DemoPresetBar, DemoPreset } from './components/DemoPresetBar';
import { VERIFIED_BNMIT_BUILDINGS } from './data/verifiedOsmFallback';

// Modals & Panels
import { ValidationModal } from './components/ValidationModal';
import { GuidedDemoTour } from './components/GuidedDemoTour';
import { ArchitectureModal } from './components/ArchitectureModal';
import { GeoJsonImportModal } from './components/GeoJsonImportModal';
import { DataAcquisitionPanel } from './components/DataAcquisitionPanel';
import { AIBuildingExtractionModal } from './components/AIBuildingExtractionModal';
import { AIFloorSegmentationModal } from './components/AIFloorSegmentationModal';
import { CoordinateReferencePanel } from './components/CoordinateReferencePanel';
import { DemElevationPanel } from './components/DemElevationPanel';
import { PointCloudViewer } from './components/PointCloudViewer';
import { UndergroundUtilityPanel } from './components/UndergroundUtilityPanel';
import { DataProvenancePanel } from './components/DataProvenancePanel';
import { UlpinExplainerModal } from './components/UlpinExplainerModal';
import { GeometryVerificationModal } from './components/GeometryVerificationModal';

export default function App() {
  const [appMode, setAppMode] = useState<'DEMO' | 'REAL_LOCATION'>('DEMO');
  const [demoParcels, setDemoParcels] = useState<CadastralParcel[]>(SAMPLE_CADASTRAL_PARCELS);
  const [realLocationParcels, setRealLocationParcels] = useState<CadastralParcel[]>([]);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<number>(1);

  // Active parcels depending on selected mode
  const parcels = useMemo(() => {
    if (appMode === 'DEMO') {
      return demoParcels;
    } else {
      return realLocationParcels.length > 0 ? realLocationParcels : demoParcels;
    }
  }, [appMode, demoParcels, realLocationParcels]);

  const [viewState, setViewState] = useState<MapViewState>({
    viewPerspective: '3D',
    selectedParcelId: 'P001',
    selectedBuildingId: 'B001',
    selectedFloorNumber: null,
    selectedUnitId: null,
    selectedUndergroundAssetId: null,
    isExplodedView: false,
    explosionFactor: 0.0,
    subsurfaceMode: 'BOTH',
    showBasements: true,
    showParcels: true,
    showBuildingEnvelopes: false,
    showPropertyUnits: true,
    showWireframe: true,
    showConflictAlertsOnly: false,
    filterResidential: true,
    filterCommercial: true,
    filterCommonFacilities: true,
    filterUndergroundInfra: true,
    colorMode: 'by-floor',
    searchQuery: '',
    undergroundFilter: {
      showSurfaceBuilding: true,
      showGroundLayer: true,
      showUndergroundParking: true,
      showWaterPipeline: true,
      showSewagePipeline: true,
      showElectricalCable: true,
      showFiberOptic: true,
      showUtilityTunnel: true,
    },
  });

  // Modal States
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isGeometryVerificationOpen, setIsGeometryVerificationOpen] = useState(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isImportGeoJsonOpen, setIsImportGeoJsonOpen] = useState(false);
  const [isDataAcquisitionOpen, setIsDataAcquisitionOpen] = useState(false);
  const [isAIExtractionOpen, setIsAIExtractionOpen] = useState(false);
  const [isFloorSegmentationOpen, setIsFloorSegmentationOpen] = useState(false);
  const [isCoordinatesOpen, setIsCoordinatesOpen] = useState(false);
  const [isElevationOpen, setIsElevationOpen] = useState(false);
  const [isPointCloudOpen, setIsPointCloudOpen] = useState(false);
  const [isUndergroundOpen, setIsUndergroundOpen] = useState(false);
  const [isDataProvenanceOpen, setIsDataProvenanceOpen] = useState(false);
  const [isUlpinExplainerOpen, setIsUlpinExplainerOpen] = useState(false);
  const [activeUlpinCode, setActiveUlpinCode] = useState('IN-KA-BLR-P001-B001-F03-U302');
  const [selectedOsmBuilding, setSelectedOsmBuilding] = useState<OsmBuildingFeature | null>(null);
  const [acquisitionState, setAcquisitionState] = useState<BuildingAcquisitionState | undefined>(undefined);

  // Compute 3D Topology & Boundary validation report
  const validationReport = useMemo(() => {
    return run3DCadastralValidation(parcels);
  }, [parcels]);

  // Total metrics
  const totalUnitsCount = useMemo(() => {
    return parcels.reduce((sum, p) => 
      sum + p.buildings.reduce((bSum, b) => 
        bSum + b.floors.reduce((fSum, f) => fSum + f.units.length, 0), 0), 0);
  }, [parcels]);

  // Active selected parcel and building helpers
  const activeSelectedParcel = useMemo(() => {
    // If a building is explicitly selected, find the parcel containing it first
    if (viewState.selectedBuildingId) {
      for (const p of parcels) {
        if (p.buildings.some(b => b.id === viewState.selectedBuildingId)) {
          return p;
        }
      }
    }
    if (viewState.selectedParcelId) {
      const found = parcels.find(p => p.id === viewState.selectedParcelId);
      if (found) return found;
    }
    return parcels[0] || null;
  }, [parcels, viewState.selectedParcelId, viewState.selectedBuildingId]);

  const activeSelectedBuilding = useMemo(() => {
    // 1. If buildingId is explicitly selected, search across ALL parcels
    if (viewState.selectedBuildingId) {
      for (const p of parcels) {
        const found = p.buildings.find(b => b.id === viewState.selectedBuildingId);
        if (found) return found;
      }
    }
    // 2. If parcel is selected, return its first building
    if (activeSelectedParcel && activeSelectedParcel.buildings.length > 0) {
      return activeSelectedParcel.buildings[0];
    }
    // 3. Fallback to first available building in any parcel
    for (const p of parcels) {
      if (p.buildings.length > 0) return p.buildings[0];
    }
    return null;
  }, [parcels, activeSelectedParcel, viewState.selectedBuildingId]);

  // Handlers for selection state
  const handleSelectParcel = useCallback((parcelId: string | null) => {
    const targetParcel = parcelId ? parcels.find(p => p.id === parcelId) : null;
    setViewState(prev => ({
      ...prev,
      selectedParcelId: parcelId,
      selectedBuildingId: targetParcel?.buildings[0]?.id || null,
      selectedFloorNumber: null,
      selectedUnitId: null,
    }));
  }, [parcels]);

  const handleSelectBuilding = useCallback((buildingId: string | null) => {
    let parentParcelId: string | null = null;
    let resolvedBuildingId = buildingId;
    if (buildingId) {
      for (const p of parcels) {
        const found = p.buildings.find(b => 
          b.id === buildingId || 
          b.id === `B-${buildingId}` || 
          `B-${b.id}` === buildingId ||
          (b.osmId && buildingId.includes(b.osmId))
        );
        if (found) {
          parentParcelId = p.id;
          resolvedBuildingId = found.id;
          break;
        }
      }
    }
    setViewState(prev => ({
      ...prev,
      selectedBuildingId: resolvedBuildingId,
      selectedParcelId: parentParcelId || prev.selectedParcelId,
      selectedFloorNumber: null,
      selectedUnitId: null,
    }));
  }, [parcels]);

  const handleSelectFloor = useCallback((floorNumber: number | null) => {
    setViewState(prev => ({
      ...prev,
      selectedFloorNumber: floorNumber,
    }));
  }, []);

  const handleSelectUnit = useCallback((unitId: string | null) => {
    setViewState(prev => ({
      ...prev,
      selectedUnitId: unitId,
    }));
    if (unitId) {
      for (const p of parcels) {
        for (const b of p.buildings) {
          for (const f of b.floors) {
            const u = f.units.find(item => item.id === unitId);
            if (u) {
              setActiveUlpinCode(u.prototypeUlpin3D);
            }
          }
        }
      }
    }
  }, [parcels]);

  const handleExplosionChange = useCallback((factor: number) => {
    setViewState(prev => ({
      ...prev,
      explosionFactor: factor,
      isExplodedView: factor > 0,
    }));
  }, []);

  const handleExplodeToggle = useCallback(() => {
    setViewState(prev => {
      const nextExploded = !prev.isExplodedView;
      return {
        ...prev,
        isExplodedView: nextExploded,
        explosionFactor: nextExploded ? 1.5 : 0.0,
      };
    });
  }, []);

  const handleToggleBasements = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      showBasements: !prev.showBasements,
    }));
  }, []);

  const handleColorModeChange = useCallback((mode: VisualColorMode) => {
    setViewState(prev => ({
      ...prev,
      colorMode: mode,
    }));
  }, []);

  const handleToggleViewPerspective = useCallback((mode: '2D' | '3D') => {
    setViewState(prev => ({
      ...prev,
      viewPerspective: mode,
    }));
  }, []);

  const handleToggleLayerFilter = useCallback((filterKey: keyof MapViewState, value: any) => {
    setViewState(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  }, []);

  const handleUndergroundFilterChange = useCallback((newFilter: UndergroundVisibilityFilter) => {
    setViewState(prev => ({
      ...prev,
      undergroundFilter: newFilter,
    }));
  }, []);

  // Handle direct selection of OSM Building on the real Leaflet map
  const handleSelectOsmBuilding = useCallback(async (osmBldg: OsmBuildingFeature) => {
    setSelectedOsmBuilding(osmBldg);
    const aiAnalysis = await runAIBuildingAnalysis(osmBldg);
    const isCache = (osmBldg.id.toString().startsWith('osm-fallback') || osmBldg.id.toString().startsWith('bnmit-'));
    const realParcel = createCadastreFromOsmBuilding(osmBldg, {
      floors: aiAnalysis.estimatedFloors,
      heightM: aiAnalysis.estimatedHeightM,
      aiAnalysis,
    }, {
      source: isCache ? 'CACHE' : 'REAL_OSM',
      matchMethod: 'MANUAL_MAP_SELECTION',
      heightSource: 'ESTIMATED_AI_RULE',
      floorSource: 'AI_Estimated',
      confidenceLevel: 'High',
      confidence: aiAnalysis.confidenceScore,
      isSynthetic: isCache,
      osmTimeoutOccurred: false,
    });
    setRealLocationParcels(prev => {
      const filtered = prev.filter(p => p.id !== realParcel.id);
      return [realParcel, ...filtered];
    });
    setAcquisitionState({
      status: 'polygon_found',
      locationCoords: osmBldg.centroid,
      locationName: osmBldg.name,
      searchRadiusM: 100,
      osmFootprintsCount: 1,
      selectedBuilding: realParcel.buildings[0],
      selectedOsmBuilding: osmBldg,
      selectionMethod: 'MANUAL_MAP_SELECTION',
      responseTimeMs: 250,
      source: isCache ? 'CACHE' : 'OSM',
      isUsingFallback: isCache,
      osmTimeoutOccurred: false,
      aiAnalysis,
      badge: isCache ? 'CACHED / DEMO GEOMETRY' : 'REAL OSM DATA',
      resolutionAudit: realParcel.buildings[0]?.resolutionAudit,
      candidates: [{
        id: osmBldg.id,
        name: osmBldg.name,
        distanceM: 0,
        areaSqm: osmBldg.areaSqm,
        footprintCoords: osmBldg.footprintCoords,
        matchMethod: 'MANUAL_MAP_SELECTION',
        confidence: 'High',
        building: osmBldg,
      }],
    });
    setAppMode('REAL_LOCATION');
    setViewState(prev => ({
      ...prev,
      selectedParcelId: realParcel.id,
      selectedBuildingId: realParcel.buildings[0]?.id || null,
      selectedFloorNumber: null,
      selectedUnitId: null,
    }));
  }, []);

  // 1-Click Cadastre Generation from Real OpenStreetMap Building Footprint
  const handleCreateCadastreFromOsm = useCallback((
    osmBuilding: OsmBuildingFeature, 
    overrides?: { floors?: number; heightM?: number; aiAnalysis?: any; structureType?: any },
    provenance?: any
  ) => {
    setSelectedOsmBuilding(osmBuilding);
    const isCache = provenance?.source === 'CACHE' || 
      osmBuilding.id.toString().startsWith('osm-fallback') || 
      osmBuilding.id.toString().startsWith('bnmit-') ||
      Boolean(provenance?.isSynthetic);

    const newParcel = createCadastreFromOsmBuilding(osmBuilding, overrides, provenance);
    
    // Switch to Real Location mode
    setAppMode('REAL_LOCATION');
    
    // Store in real location parcels
    setRealLocationParcels(prev => {
      const filtered = prev.filter(p => p.id !== newParcel.id);
      return [newParcel, ...filtered];
    });

    setAcquisitionState({
      status: 'polygon_found',
      locationCoords: osmBuilding.centroid,
      locationName: osmBuilding.name,
      searchRadiusM: 100,
      osmFootprintsCount: 1,
      selectedBuilding: newParcel.buildings[0],
      selectedOsmBuilding: osmBuilding,
      selectionMethod: provenance?.matchMethod || (isCache ? 'CACHED_RECORD' : 'EXTRUDE_CADASTRE'),
      responseTimeMs: provenance?.responseTimeMs || 200,
      source: isCache ? 'CACHE' : 'OSM',
      isUsingFallback: isCache,
      osmTimeoutOccurred: Boolean(provenance?.osmTimeoutOccurred),
      aiAnalysis: overrides?.aiAnalysis || newParcel.buildings[0]?.aiAnalysis,
      fallbackType: provenance?.fallbackType,
      badge: isCache ? 'CACHED / DEMO GEOMETRY' : 'REAL OSM DATA',
      resolutionAudit: newParcel.buildings[0]?.resolutionAudit,
      candidates: [{
        id: osmBuilding.id,
        name: osmBuilding.name,
        distanceM: 0,
        areaSqm: osmBuilding.areaSqm,
        footprintCoords: osmBuilding.footprintCoords,
        matchMethod: provenance?.matchMethod || (isCache ? 'CACHED_RECORD' : 'POINT_CONTAINS'),
        confidence: 'High',
        building: osmBuilding,
      }],
    });

    // Select the new real parcel & building, switch to 3D view with exploded strata view
    setViewState(prev => ({
      ...prev,
      selectedParcelId: newParcel.id,
      selectedBuildingId: newParcel.buildings[0]?.id || null,
      selectedFloorNumber: null,
      selectedUnitId: null,
      viewPerspective: '3D',
      isExplodedView: true,
      explosionFactor: 1.2,
      colorMode: 'by-floor',
    }));

    setCurrentWorkflowStep(5);
  }, []);

  const handleUseCachedGeometry = useCallback(async () => {
    const targetCoords = acquisitionState?.locationCoords || { lat: 12.9219, lng: 77.5678 };
    const fallbackResult = getCachedOrFallbackBuildings(targetCoords.lat, targetCoords.lng, 150);
    const fallbackBldgs = fallbackResult.buildings;
    if (fallbackBldgs.length > 0) {
      const chosen = fallbackBldgs[0];
      const aiAnalysis = await runAIBuildingAnalysis(chosen);
      handleCreateCadastreFromOsm(chosen, {
        floors: aiAnalysis.estimatedFloors,
        heightM: aiAnalysis.estimatedHeightM,
        aiAnalysis,
      }, {
        source: 'CACHE',
        matchMethod: 'CACHED_RECORD',
        heightSource: 'ESTIMATED_AI_RULE',
        floorSource: 'AI_Estimated',
        confidenceLevel: 'High',
        confidence: aiAnalysis.confidenceScore,
        isSynthetic: true,
        osmTimeoutOccurred: true,
        fallbackType: fallbackResult.fallbackType,
        cachedTimestamp: Date.now(),
      });
    }
  }, [acquisitionState, handleCreateCadastreFromOsm]);

  const [activePresetId, setActivePresetId] = useState<string>('bnmit-campus');

  const handleSelectDemoPreset = useCallback(async (preset: DemoPreset) => {
    setActivePresetId(preset.id);
    if (preset.id === 'bnmit-campus') {
      const bnmitBuilding = VERIFIED_BNMIT_BUILDINGS[0];
      const aiAnalysis = await runAIBuildingAnalysis(bnmitBuilding);
      handleCreateCadastreFromOsm(bnmitBuilding, {
        floors: 8,
        heightM: 26.4,
        aiAnalysis,
      }, {
        source: 'OSM',
        matchMethod: 'CACHED_RECORD',
        heightSource: 'OSM_TAG',
        floorSource: 'OSM',
        confidenceLevel: 'High',
        confidence: 96,
        isSynthetic: false,
        osmTimeoutOccurred: false,
        fallbackType: 'VERIFIED_CAMPUS_PRESET',
        cachedTimestamp: Date.now(),
      });
    } else {
      setAppMode('DEMO');
      const matchingParcel = demoParcels.find(p => p.id === preset.parcelId) || demoParcels[0];
      if (matchingParcel) {
        handleSelectParcel(matchingParcel.id);
        const matchingBldg = matchingParcel.buildings.find(b => b.id === preset.buildingId) || matchingParcel.buildings[0];
        if (matchingBldg) {
          handleSelectBuilding(matchingBldg.id);
        }
      }
      setViewState(prev => ({
        ...prev,
        viewPerspective: '3D',
        isExplodedView: true,
        explosionFactor: 1.2,
        colorMode: 'by-floor',
      }));
    }
  }, [demoParcels, handleCreateCadastreFromOsm, handleSelectParcel, handleSelectBuilding]);

  const handleRetryOsmQuery = useCallback(() => {
    setViewState(prev => ({ ...prev, viewPerspective: '2D' }));
  }, []);

  const handleRenameBuilding = useCallback((parcelId: string, buildingId: string, newName: string) => {
    const updater = (prevParcels: CadastralParcel[]) => prevParcels.map(p => {
      if (p.id !== parcelId) return p;
      return {
        ...p,
        buildings: p.buildings.map(b => b.id === buildingId ? { ...b, name: newName } : b)
      };
    });
    setRealLocationParcels(updater);
    setDemoParcels(updater);
  }, []);

  const handleImportParcels = useCallback((newParcels: CadastralParcel[], replaceExisting: boolean) => {
    if (appMode === 'DEMO') {
      if (replaceExisting) {
        setDemoParcels(newParcels);
      } else {
        setDemoParcels(prev => {
          const newIds = new Set(newParcels.map(p => p.id));
          return [...prev.filter(p => !newIds.has(p.id)), ...newParcels];
        });
      }
    } else {
      if (replaceExisting) {
        setRealLocationParcels(newParcels);
      } else {
        setRealLocationParcels(prev => {
          const newIds = new Set(newParcels.map(p => p.id));
          return [...prev.filter(p => !newIds.has(p.id)), ...newParcels];
        });
      }
    }
    if (newParcels.length > 0) {
      const firstParcel = newParcels[0];
      setViewState(prev => ({
        ...prev,
        selectedParcelId: firstParcel.id,
        selectedBuildingId: firstParcel.buildings[0]?.id || null,
        selectedFloorNumber: null,
        selectedUnitId: null,
        viewPerspective: '3D',
      }));
    }
  }, [appMode]);

  // Jump to specific issue from validation modal
  const handleJumpToIssue = useCallback((issue: TopologyIssue) => {
    setViewState(prev => ({
      ...prev,
      viewPerspective: '3D',
      selectedParcelId: issue.parcelId,
      selectedBuildingId: issue.buildingId,
      selectedFloorNumber: issue.floorNumber ?? null,
      selectedUnitId: issue.affectedUnitIds[0] || null,
      isExplodedView: true,
      explosionFactor: 1.6,
      colorMode: 'by-conflict',
    }));
    setCurrentWorkflowStep(8);
  }, []);

  // Apply AI Extracted Building into Selected Parcel
  const handleApplyExtractedBuilding = useCallback((parcelId: string, extractedData: any) => {
    const updateFn = (prevParcels: CadastralParcel[]) => {
      return prevParcels.map(parcel => {
        if (parcel.id !== parcelId) return parcel;

        // Use actual extracted building footprint coordinates (never discard real geometry)
        const c = parcel.centroid;
        const bldgFootprint: SpatialCoordinates2D[] = (extractedData.footprintCoords && extractedData.footprintCoords.length >= 3)
          ? extractedData.footprintCoords
          : (parcel.boundaryPolygon && parcel.boundaryPolygon.length >= 3)
            ? parcel.boundaryPolygon
            : [
                { lat: c.lat - 0.0001, lng: c.lng - 0.0001 },
                { lat: c.lat - 0.0001, lng: c.lng + 0.0001 },
                { lat: c.lat + 0.0001, lng: c.lng + 0.0001 },
                { lat: c.lat + 0.0001, lng: c.lng - 0.0001 },
              ];

        // Create initial floors strictly inheriting the real building footprint
        const newFloors: FloorLevel[] = [];
        const floorCount = extractedData.estimatedFloorsCount || 12;
        const floorHeight = extractedData.estimatedHeightM / floorCount;

        for (let f = 1; f <= floorCount; f++) {
          const bottomZ = (f - 1) * floorHeight;
          const topZ = f * floorHeight;
          const ulpin3D = generateUnitUlpin3D(parcel.id, extractedData.id, f, 1);

          newFloors.push({
            floorNumber: f,
            floorName: `Level ${f}`,
            prototypeUlpin3D: generateFloorUlpin3D(parcel.id, extractedData.id, f, 'KA', 'BLR'),
            elevationBottom: bottomZ,
            elevationTop: topZ,
            height: floorHeight,
            totalBuiltAreaSqm: Math.round(extractedData.footprintAreaSqm || 210),
            isBasement: false,
            footprintCoords: bldgFootprint,
            geometry: bldgFootprint,
            units: [
              {
                id: `u_${parcel.id}_${extractedData.id}_f${f}_01`,
                parcelId: parcel.id,
                buildingId: extractedData.id,
                unitNumber: `Unit ${f}01`,
                prototypeUlpin3D: ulpin3D,
                floorNumber: f,
                unitType: f === floorCount ? 'Penthouse (Terrace Rights)' : 'Residential Apartment',
                carpetAreaSqm: Math.round((extractedData.footprintAreaSqm || 210) * 0.85),
                builtUpAreaSqm: Math.round(extractedData.footprintAreaSqm || 210),
                volumeCubicM: Math.round((extractedData.footprintAreaSqm || 210) * floorHeight),
                minElevation: bottomZ,
                maxElevation: topZ,
                ownerName: 'Karnataka Housing Board (Allotted)',
                legalStatus: 'Registered (3D Title)',
                hasTopologyCollision: false,
                annualPropertyTaxInr: 18500,
                electricityMeterId: `BESCOM-2026-F${f}01`,
                waterConsumerNo: `BWSSB-2026-W${f}01`,
                polygon: bldgFootprint,
              },
            ],
          });
        }

        const newBuilding: Building = {
          id: extractedData.id,
          parcelId: parcel.id,
          name: extractedData.name,
          structureType: 'Residential High-Rise',
          footprintCoords: bldgFootprint,
          baseGroundElevationMsl: parcel.groundElevationMsl,
          floorCountAboveGround: floorCount,
          basementCount: 0,
          totalHeightM: extractedData.estimatedHeightM,
          totalUnitsCount: floorCount,
          hasBoundaryOverhang: false,
          approvalYear: 2024,
          reraRegNo: 'PRM/KA/RERA/1251/310/PR/240101/006500',
          floors: newFloors,
        };

        return {
          ...parcel,
          buildings: [...parcel.buildings, newBuilding],
        };
      });
    };

    if (appMode === 'DEMO') {
      setDemoParcels(updateFn);
    } else {
      setRealLocationParcels(updateFn);
    }

    setViewState(prev => ({
      ...prev,
      selectedParcelId: parcelId,
      selectedBuildingId: extractedData.id,
    }));
    setCurrentWorkflowStep(4);
  }, [appMode]);

  // Apply AI Floor Segmentation Stack
  const handleApplyFloorsToCadastre = useCallback((parcelId: string, floorData: any) => {
    const updateFn = (prevParcels: CadastralParcel[]) => {
      return prevParcels.map(parcel => {
        if (parcel.id !== parcelId || parcel.buildings.length === 0) return parcel;

        const targetBuilding = parcel.buildings[0];
        const updatedFloors: FloorLevel[] = floorData.floorItems.map((fi: any) => ({
          floorNumber: fi.floorNumber,
          floorName: fi.name,
          prototypeUlpin3D: generateFloorUlpin3D(parcel.id, targetBuilding.id, fi.floorNumber, 'KA', 'BLR'),
          elevationBottom: fi.bottomZ,
          elevationTop: fi.topZ,
          height: fi.height,
          totalBuiltAreaSqm: 140 * fi.unitCount,
          isBasement: fi.isBasement,
          footprintCoords: targetBuilding.footprintCoords,
          geometry: targetBuilding.footprintCoords,
          units: Array.from({ length: fi.unitCount }).map((_, uIdx) => {
            const uNum = `${fi.floorNumber > 0 ? fi.floorNumber : 'B' + Math.abs(fi.floorNumber)}${(uIdx + 1).toString().padStart(2, '0')}`;
            return {
              id: `u_${parcel.id}_${targetBuilding.id}_${fi.floorNumber}_${uIdx + 1}`,
              parcelId: parcel.id,
              buildingId: targetBuilding.id,
              unitNumber: `Unit ${uNum}`,
              prototypeUlpin3D: generateUnitUlpin3D(parcel.id, targetBuilding.id, fi.floorNumber, uIdx + 1),
              floorNumber: fi.floorNumber,
              unitType: fi.isBasement 
                ? 'Basement Parking Slot' 
                : fi.floorNumber === floorData.floorCount 
                  ? 'Penthouse (Terrace Rights)' 
                  : 'Residential Apartment',
              carpetAreaSqm: 120,
              builtUpAreaSqm: 140,
              volumeCubicM: 140 * fi.height,
              minElevation: fi.bottomZ,
              maxElevation: fi.topZ,
              ownerName: 'Strata Title Holder',
              legalStatus: 'Registered (3D Title)',
              hasTopologyCollision: false,
              annualPropertyTaxInr: 16200,
              electricityMeterId: `BESCOM-STRATA-${fi.floorNumber}-${uIdx + 1}`,
              waterConsumerNo: `BWSSB-STRATA-${fi.floorNumber}-${uIdx + 1}`,
              polygon: targetBuilding.footprintCoords,
            };
          }),
        }));

        const updatedBuilding: Building = {
          ...targetBuilding,
          totalHeightM: floorData.buildingHeight,
          floorCountAboveGround: floorData.floorCount,
          basementCount: floorData.basementCount,
          floors: updatedFloors,
          totalUnitsCount: updatedFloors.reduce((s, f) => s + f.units.length, 0),
        };

        return {
          ...parcel,
          buildings: parcel.buildings.map(b => b.id === targetBuilding.id ? updatedBuilding : b),
        };
      });
    };

    if (appMode === 'DEMO') {
      setDemoParcels(updateFn);
    } else {
      setRealLocationParcels(updateFn);
    }

    setViewState(prev => ({
      ...prev,
      viewPerspective: '3D',
      isExplodedView: true,
      explosionFactor: 1.5,
    }));
    setCurrentWorkflowStep(5);
  }, [appMode]);

  // Export 3D Cadastral GeoJSON
  const handleExportGeoJSON = useCallback(() => {
    const featureCollection = {
      type: 'FeatureCollection',
      name: '3D_ULPIN_Cadastral_Dataset_SIH26011',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      features: parcels.map(p => ({
        type: 'Feature',
        id: p.id,
        geometry: {
          type: 'Polygon',
          coordinates: [p.boundaryPolygon.map(c => [c.lng, c.lat])],
        },
        properties: {
          parcelId: p.id,
          ulpin2D: p.ulpin2D,
          surveyNumber: p.surveyNumber,
          landUse: p.landUseCategory,
          groundElevationMsl: p.groundElevationMsl,
          undergroundAssetsCount: p.undergroundAssets?.length || 0,
          buildings: p.buildings.map(b => ({
            buildingId: b.id,
            name: b.name,
            totalHeightM: b.totalHeightM,
            units: b.floors.flatMap(f => f.units.map(u => ({
              prototypeUlpin3D: u.prototypeUlpin3D,
              unitNumber: u.unitNumber,
              floor: u.floorNumber,
              minZ: u.minElevation,
              maxZ: u.maxElevation,
              volumeM3: u.volumeCubicM,
              owner: u.ownerName,
              status: u.legalStatus,
              collision: u.hasTopologyCollision,
            }))),
          })),
        },
      })),
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3D_ULPIN_Cadastre_Export_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }, [parcels]);

  // Execute Step from Workflow Bar
  const handleWorkflowStepClick = useCallback((stepNumber: number) => {
    setCurrentWorkflowStep(stepNumber);
    switch (stepNumber) {
      case 1: // Select Location (2D Map)
        setViewState(prev => ({ ...prev, viewPerspective: '2D' }));
        break;
      case 2: // Import / Acquire Data
        setIsDataAcquisitionOpen(true);
        break;
      case 3: // AI Building Extraction
        setIsAIExtractionOpen(true);
        break;
      case 4: // Floor Segmentation
        setIsFloorSegmentationOpen(true);
        break;
      case 5: // Generate 3D Cadastre
        setViewState(prev => ({ ...prev, viewPerspective: '3D' }));
        break;
      case 6: // Assign 3D ULPIN
        setIsUlpinExplainerOpen(true);
        break;
      case 7: // Underground Infra
        setIsUndergroundOpen(true);
        break;
      case 8: // Topology Validation
        setIsValidationOpen(true);
        break;
      default:
        break;
    }
  }, []);

  // Demo Tour step handler
  const handleExecuteDemoStep = useCallback((step: number) => {
    switch (step) {
      case 0:
        setViewState(prev => ({
          ...prev,
          viewPerspective: '3D',
          selectedParcelId: null,
          selectedBuildingId: null,
          isExplodedView: false,
          colorMode: 'by-floor',
        }));
        break;
      case 1:
        setViewState(prev => ({
          ...prev,
          viewPerspective: '3D',
          selectedParcelId: 'P001',
          selectedBuildingId: 'B001',
          isExplodedView: false,
        }));
        break;
      case 2:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P001',
          selectedBuildingId: 'B001',
          isExplodedView: false,
        }));
        break;
      case 3:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P001',
          selectedBuildingId: 'B001',
          isExplodedView: true,
          explosionFactor: 1.8,
        }));
        break;
      case 4:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P001',
          selectedBuildingId: 'B001',
          selectedFloorNumber: 5,
          selectedUnitId: 'u_p001_b001_f5_01',
          isExplodedView: true,
          explosionFactor: 1.8,
        }));
        break;
      case 5:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P001',
          selectedBuildingId: 'B001',
          selectedFloorNumber: 5,
          selectedUnitId: 'u_p001_b001_f5_01',
        }));
        break;
      case 6:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P001',
          selectedBuildingId: 'B001',
          selectedFloorNumber: -2,
          selectedUnitId: 'u_p001_b001_fb2_01',
          showBasements: true,
          isExplodedView: true,
          explosionFactor: 1.8,
        }));
        break;
      case 7:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P004',
          selectedBuildingId: 'B004',
          selectedFloorNumber: -2,
          selectedUnitId: 'u_p004_b004_fb2_01',
          showBasements: true,
          isExplodedView: true,
          explosionFactor: 1.5,
          colorMode: 'by-use',
        }));
        break;
      case 8:
        setIsValidationOpen(true);
        break;
      case 9:
        setIsValidationOpen(false);
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P003',
          selectedBuildingId: 'B003',
          selectedFloorNumber: 3,
          selectedUnitId: 'u_p003_b003_f3_01',
          isExplodedView: true,
          explosionFactor: 1.8,
          colorMode: 'by-conflict',
        }));
        break;
      case 10:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P003',
          selectedBuildingId: 'B003',
          selectedFloorNumber: 4,
          selectedUnitId: 'u_p003_b003_f4_02',
          isExplodedView: true,
          explosionFactor: 1.8,
          colorMode: 'by-conflict',
        }));
        break;
      case 11:
        setViewState(prev => ({
          ...prev,
          selectedParcelId: 'P002',
          selectedBuildingId: 'B002',
          selectedFloorNumber: 4,
          selectedUnitId: 'u_p002_b002_f4_01',
          isExplodedView: true,
          explosionFactor: 1.5,
          colorMode: 'by-use',
        }));
        break;
      default:
        break;
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* 1. Government-Grade Geospatial Header */}
      <Navbar
        appMode={appMode}
        onToggleAppMode={setAppMode}
        onOpenDemoTour={() => setIsDemoTourOpen(true)}
        onOpenValidation={() => setIsValidationOpen(true)}
        onOpenGeometryVerification={() => setIsGeometryVerificationOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenImportGeoJSON={() => setIsImportGeoJsonOpen(true)}
        onOpenDataAcquisition={() => setIsDataAcquisitionOpen(true)}
        onOpenDataProvenance={() => setIsDataProvenanceOpen(true)}
        onOpenUlpinExplainer={() => setIsUlpinExplainerOpen(true)}
        onOpenUnderground={() => setIsUndergroundOpen(true)}
        onExportGeoJSON={handleExportGeoJSON}
        totalParcels={parcels.length}
        totalUnits={totalUnitsCount}
        conflictsCount={validationReport.issuesCount}
      />

      {/* 2. End-to-End Workflow Navigation Bar for Judges & Surveyors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-950 border-b border-slate-800/80 px-2">
        <EndToEndWorkflowBar
          currentStep={currentWorkflowStep}
          onStepClick={handleWorkflowStepClick}
        />
        <DemoPresetBar
          activePresetId={activePresetId}
          onSelectPreset={handleSelectDemoPreset}
        />
      </div>

      {/* 3. Main Cadastral Workstation Body */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Left Property Inspector & Hierarchy Sidebar */}
        <PropertyInspector
          parcels={parcels}
          viewState={viewState}
          appMode={appMode}
          acquisitionState={acquisitionState}
          onRetryOsmQuery={handleRetryOsmQuery}
          onUseCachedGeometry={handleUseCachedGeometry}
          onOpenImportGeoJson={() => setIsImportGeoJsonOpen(true)}
          onSelectParcel={handleSelectParcel}
          onSelectBuilding={handleSelectBuilding}
          onSelectFloor={handleSelectFloor}
          onSelectUnit={handleSelectUnit}
          onExplodeToggle={handleExplodeToggle}
          onOpenPointCloud={() => setIsPointCloudOpen(true)}
          onOpenGeometryVerification={() => setIsGeometryVerificationOpen(true)}
          onToggleLayerFilter={handleToggleLayerFilter}
          onRenameBuilding={handleRenameBuilding}
        />

        {/* Dynamic Dual-Engine GIS Viewport (2D Leaflet OSM vs 3D Cesium Vertical Cadastre) */}
        <main className="flex-1 relative h-full">
          {viewState.viewPerspective === '2D' ? (
            <RealLeafletMap
              parcels={parcels}
              viewState={viewState}
              appMode={appMode}
              onToggleAppMode={setAppMode}
              onSelectParcel={handleSelectParcel}
              onSelectBuilding={handleSelectBuilding}
              onSwitchTo3D={() => setViewState(prev => ({ ...prev, viewPerspective: '3D' }))}
              onOpenDataAcquisition={() => setIsDataAcquisitionOpen(true)}
              onOpenAIExtraction={() => setIsAIExtractionOpen(true)}
              onCreateCadastreFromOsm={handleCreateCadastreFromOsm}
              selectedOsmBuilding={selectedOsmBuilding}
              onSelectOsmBuilding={handleSelectOsmBuilding}
              onOpenPointCloud={() => setIsPointCloudOpen(true)}
              onOpenGeometryVerification={() => setIsGeometryVerificationOpen(true)}
              onAcquisitionStateChange={setAcquisitionState}
              onSelectFloor={handleSelectFloor}
              onSelectUnit={handleSelectUnit}
            />
          ) : (
            <CesiumViewer
              parcels={parcels}
              viewState={viewState}
              appMode={appMode}
              acquisitionState={acquisitionState}
              onRetryOsmQuery={handleRetryOsmQuery}
              onUseCachedGeometry={handleUseCachedGeometry}
              onOpenImportGeoJson={() => setIsImportGeoJsonOpen(true)}
              onSelectParcel={handleSelectParcel}
              onSelectBuilding={handleSelectBuilding}
              onSelectFloor={handleSelectFloor}
              onSelectUnit={handleSelectUnit}
              onExplosionChange={handleExplosionChange}
              onToggleBasements={handleToggleBasements}
              onColorModeChange={handleColorModeChange}
              onToggleViewPerspective={handleToggleViewPerspective}
              onOpenPointCloud={() => setIsPointCloudOpen(true)}
            />
          )}

          {/* Symbology & Legend Card in 3D Mode */}
          {viewState.viewPerspective === '3D' && <CadastralLegend />}
        </main>

      </div>

      {/* 4. Multi-Modal Panels & Functional Modules */}
      
      {/* 3D Topology Audit & Boundary Clash Modal */}
      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        report={validationReport}
        onJumpToIssue={handleJumpToIssue}
      />

      {/* Judge Walkthrough Tour */}
      <GuidedDemoTour
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onExecuteDemoStep={handleExecuteDemoStep}
      />

      {/* Architecture & ISO 19152 LADM Specs */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Cadastral GeoJSON Import */}
      <GeoJsonImportModal
        isOpen={isImportGeoJsonOpen}
        onClose={() => setIsImportGeoJsonOpen(false)}
        onImportParcels={handleImportParcels}
      />

      {/* Multi-Sensor Spatial Data Acquisition Panel */}
      <DataAcquisitionPanel
        isOpen={isDataAcquisitionOpen}
        onClose={() => setIsDataAcquisitionOpen(false)}
        onLaunchAIExtraction={() => setIsAIExtractionOpen(true)}
        onLaunchFloorSegmentation={() => setIsFloorSegmentationOpen(true)}
        onLaunchGeoJsonImport={() => setIsImportGeoJsonOpen(true)}
        onOpenPointCloud={() => setIsPointCloudOpen(true)}
        onOpenElevation={() => setIsElevationOpen(true)}
        onOpenCoordinates={() => setIsCoordinatesOpen(true)}
      />

      {/* AI Building Extraction Modal */}
      <AIBuildingExtractionModal
        isOpen={isAIExtractionOpen}
        onClose={() => setIsAIExtractionOpen(false)}
        parcels={parcels}
        onApplyExtractedBuilding={handleApplyExtractedBuilding}
        onProceedToFloorSegmentation={() => setIsFloorSegmentationOpen(true)}
      />

      {/* AI Vertical Floor Segmentation Modal */}
      <AIFloorSegmentationModal
        isOpen={isFloorSegmentationOpen}
        onClose={() => setIsFloorSegmentationOpen(false)}
        parcels={parcels}
        onApplyFloorsToCadastre={handleApplyFloorsToCadastre}
        onProceedTo3DView={() => setViewState(prev => ({ ...prev, viewPerspective: '3D' }))}
      />

      {/* GNSS & CORS Geodetic Reference Panel */}
      <CoordinateReferencePanel
        isOpen={isCoordinatesOpen}
        onClose={() => setIsCoordinatesOpen(false)}
      />

      {/* DEM / DSM Elevation Model Panel */}
      <DemElevationPanel
        isOpen={isElevationOpen}
        onClose={() => setIsElevationOpen(false)}
      />

      {/* LiDAR Point Cloud Inspector */}
      <PointCloudViewer
        isOpen={isPointCloudOpen}
        onClose={() => setIsPointCloudOpen(false)}
        selectedBuilding={activeSelectedBuilding}
        selectedParcel={activeSelectedParcel}
        undergroundAssets={activeSelectedParcel?.undergroundAssets || []}
        parcels={parcels}
        onSelectBuilding={handleSelectBuilding}
      />

      {/* Underground Utilities & Multi-Layer Manager */}
      <UndergroundUtilityPanel
        isOpen={isUndergroundOpen}
        onClose={() => setIsUndergroundOpen(false)}
        parcels={parcels}
        filter={viewState.undergroundFilter!}
        onFilterChange={handleUndergroundFilterChange}
        onSelectUndergroundAsset={(id) => setViewState(prev => ({ ...prev, selectedUndergroundAssetId: id }))}
        onNavigateToConflict={(id) => {
          setViewState(prev => ({
            ...prev,
            viewPerspective: '3D',
            selectedParcelId: 'P001',
            selectedBuildingId: 'B001',
            showBasements: true,
            isExplodedView: true,
            explosionFactor: 1.5,
            selectedUndergroundAssetId: id,
          }));
        }}
      />

      {/* Data Provenance & Sensor Confidence Registry */}
      <DataProvenancePanel
        isOpen={isDataProvenanceOpen}
        onClose={() => setIsDataProvenanceOpen(false)}
      />

      {/* 3D ULPIN Architecture & Interactive Decoder */}
      <UlpinExplainerModal
        isOpen={isUlpinExplainerOpen}
        onClose={() => setIsUlpinExplainerOpen(false)}
        initialCode={activeUlpinCode}
      />

      {/* 3D Cadastral Geometry Verification Modal */}
      <GeometryVerificationModal
        isOpen={isGeometryVerificationOpen}
        onClose={() => setIsGeometryVerificationOpen(false)}
        parcels={parcels}
        selectedParcelId={viewState.selectedParcelId}
        selectedBuildingId={viewState.selectedBuildingId}
        selectedUnitId={viewState.selectedUnitId}
        onSelectParcel={handleSelectParcel}
        onSelectBuilding={handleSelectBuilding}
      />

    </div>
  );
}
