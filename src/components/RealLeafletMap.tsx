/**
 * Real GIS Viewport powered by Leaflet & OpenStreetMap Live Services
 * Features:
 * 1. Real Nominatim Geocoding (Bengaluru, Basavanagudi, Whitefield, Indiranagar, Addresses, Lat/Lng)
 * 2. Robust Multi-Mirror Overpass API Ingestion (out body geom, radius retry 1000m -> 2000m)
 * 3. High-Contrast Interactive Clickable Polygon Layer with Hover Tooltips & Active Selection Highlight
 * 4. Comprehensive Developer / Real Data Debug Status Panel
 * 5. Instant Fallback to Verified Prototype GeoJSON & Custom GeoJSON File Upload
 * 6. 1-Click 3D Cadastre Extrusion & Strata Title Generation from real polygon geometries
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  CadastralParcel, 
  MapViewState, 
  SpatialCoordinates2D,
  BuildingAcquisitionState
} from '../types/cadastre';
import { 
  geocodeLocation, 
  reverseGeocodeLocation,
  findBuildingAtOrNear,
  findNearbyBuildingPolygons,
  NearbyBuildingCandidate,
  CandidateRanking,
  fetchNearbyBuildingFootprintsDetailed, 
  isAbortError,
  OsmBuildingFeature, 
  GeocodedLocation,
  calculatePolygonAreaSqm,
  calculatePolygonCentroid,
  findMatchingCampus,
  createCadastreFromOsmBuilding,
  getCachedOrFallbackBuildings
} from '../utils/osmService';
import { generateVerifiedFallbackBuildingsForLocation } from '../data/verifiedOsmFallback';
import { runAIBuildingAnalysis } from '../utils/aiAnalysisService';
import { 
  Search, 
  MapPin, 
  Layers, 
  Maximize2, 
  Compass, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Eye,
  Sliders,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Zap,
  Droplets,
  Radio,
  Loader2,
  RefreshCw,
  Clock,
  Box,
  SlidersHorizontal,
  X,
  ExternalLink,
  HelpCircle,
  Upload,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileCode2,
  MousePointerClick,
  Crosshair,
  Target,
  Navigation,
  Pencil,
  Check,
  Minimize2
} from 'lucide-react';

interface RealLeafletMapProps {
  parcels: CadastralParcel[];
  viewState: MapViewState;
  appMode: 'DEMO' | 'REAL_LOCATION';
  onToggleAppMode: (mode: 'DEMO' | 'REAL_LOCATION') => void;
  onSelectParcel: (parcelId: string | null) => void;
  onSelectBuilding: (buildingId: string | null) => void;
  onSwitchTo3D: () => void;
  onOpenDataAcquisition: () => void;
  onOpenAIExtraction: () => void;
  onCreateCadastreFromOsm: (osmBuilding: OsmBuildingFeature, overrides?: { floors?: number; heightM?: number; aiAnalysis?: any; structureType?: any }, provenance?: any) => void;
  selectedOsmBuilding?: OsmBuildingFeature | null;
  onSelectOsmBuilding?: (osmBuilding: OsmBuildingFeature | null) => void;
  onOpenPointCloud?: () => void;
  onOpenGeometryVerification?: () => void;
  onAcquisitionStateChange?: (state: BuildingAcquisitionState) => void;
  onSelectFloor?: (floorNumber: number | null) => void;
  onSelectUnit?: (unitId: string | null) => void;
}

const PRESET_LOCATIONS: { name: string; query: string; lat: number; lng: number; zoom: number; desc: string }[] = [
  { 
    name: 'BNM Institute of Technology', 
    query: 'BNM Institute of Technology Bengaluru', 
    lat: 12.92197, 
    lng: 77.56725, 
    zoom: 18,
    desc: 'Academy & Administration Block, Banashankari Stage II'
  },
  { 
    name: 'Basavanagudi', 
    query: 'Basavanagudi Bengaluru', 
    lat: 12.9422, 
    lng: 77.5753, 
    zoom: 18,
    desc: 'Heritage residential ward with varied building morphologies'
  },
  { 
    name: 'Bengaluru (MG Road)', 
    query: 'MG Road Bengaluru', 
    lat: 12.9756, 
    lng: 77.6066, 
    zoom: 18,
    desc: 'High-density commercial core with high-rise office towers'
  },
  { 
    name: 'Whitefield IT Corridor', 
    query: 'Whitefield Bengaluru', 
    lat: 12.9698, 
    lng: 77.7499, 
    zoom: 17,
    desc: 'Massive tech parks with expansive polygonal envelopes'
  },
  { 
    name: 'Indiranagar Urban Hub', 
    query: 'Indiranagar Bengaluru', 
    lat: 12.9784, 
    lng: 77.6408, 
    zoom: 18,
    desc: 'Mixed-use retail and residential multi-story strata properties'
  },
  { 
    name: 'Electronic City Phase 1', 
    query: 'Electronic City Phase 1 Bengaluru', 
    lat: 12.8452, 
    lng: 77.6602, 
    zoom: 17,
    desc: 'Industrial IT parks and institutional campuses'
  },
];

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  parcels,
  viewState,
  appMode,
  onToggleAppMode,
  onSelectParcel,
  onSelectBuilding,
  onSwitchTo3D,
  onOpenDataAcquisition,
  onOpenAIExtraction,
  onCreateCadastreFromOsm,
  selectedOsmBuilding: selectedOsmBuildingProp,
  onSelectOsmBuilding,
  onOpenPointCloud,
  onOpenGeometryVerification,
  onAcquisitionStateChange,
  onSelectFloor,
  onSelectUnit,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const parcelsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const osmLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const selectionMarkerGroupRef = useRef<L.LayerGroup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const overpassAbortControllerRef = useRef<AbortController | null>(null);

  // Search & Geocoding State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeLocationLabel, setActiveLocationLabel] = useState<string>('Basavanagudi');
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({ lat: 12.9422, lng: 77.5753 });
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPinCoords, setSelectedPinCoords] = useState<{ lat: number; lng: number } | null>({ lat: 12.9422, lng: 77.5753 });

  // Live OSM Building Footprints State
  const [osmBuildings, setOsmBuildings] = useState<OsmBuildingFeature[]>([]);
  const [isLoadingOverpass, setIsLoadingOverpass] = useState(false);
  const [overpassError, setOverpassError] = useState<string | null>(null);
  const [selectedOsmBuilding, setSelectedOsmBuilding] = useState<OsmBuildingFeature | null>(selectedOsmBuildingProp || null);

  // Keep internal selectedOsmBuilding in sync with prop from orchestrator
  useEffect(() => {
    if (selectedOsmBuildingProp !== undefined) {
      setSelectedOsmBuilding(selectedOsmBuildingProp);
    }
  }, [selectedOsmBuildingProp]);

  // Building Identity Renaming State
  const [isEditingBuildingName, setIsEditingBuildingName] = useState(false);
  const [editedBuildingName, setEditedBuildingName] = useState('');

  // Floating Panel Visibility & Minimization States to prevent blocking views
  const [isOsmCardMinimized, setIsOsmCardMinimized] = useState(false);
  const [isParcelPillDismissed, setIsParcelPillDismissed] = useState(false);

  // Keep editedBuildingName in sync when selection changes & un-minimize
  useEffect(() => {
    if (selectedOsmBuilding) {
      setEditedBuildingName(selectedOsmBuilding.name);
      setIsEditingBuildingName(false);
      setIsOsmCardMinimized(false);
    }
  }, [selectedOsmBuilding?.id]);

  useEffect(() => {
    setIsParcelPillDismissed(false);
  }, [viewState.selectedParcelId]);

  // Cadastre Generation Customization Parameters
  const [customFloors, setCustomFloors] = useState<number>(6);
  const [customHeight, setCustomHeight] = useState<number>(19.2);

  // Nearby Building Resolution State (When a POI / Campus / Point is selected)
  const [poiResolution, setPoiResolution] = useState<{
    isOpen: boolean;
    poiName: string;
    poiShortName: string;
    poiCoords: { lat: number; lng: number };
    candidates: NearbyBuildingCandidate[];
    searchRadiusM: number;
    isLoading: boolean;
  } | null>(null);

  // Hovered Candidate Building ID (for live map preview highlight when hovering candidate card)
  const [hoveredCandidateBuildingId, setHoveredCandidateBuildingId] = useState<number | string | null>(null);

  // Search generation counter to cancel out-of-order responses cleanly
  const searchGenerationRef = useRef<number>(0);

  // Query loading duration tracker (shows progress text if Overpass takes > 4 seconds)
  const [loadingDurationSec, setLoadingDurationSec] = useState<number>(0);

  useEffect(() => {
    if (!isLoadingOverpass) {
      setLoadingDurationSec(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingDurationSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoadingOverpass]);

  // OSM Query Status & Notification (differentiates: NO_DATA, TIMEOUT, ERROR)
  const [osmNotification, setOsmNotification] = useState<{
    type: 'NO_DATA' | 'TIMEOUT' | 'ERROR';
    title: string;
    message: string;
    coords: { lat: number; lng: number };
    radiusM: number;
    nextRadiusM: number | null;
  } | null>(null);

  // Layer Visibility Toggles
  const [showParcels, setShowParcels] = useState(true);
  const [showOsmFootprints, setShowOsmFootprints] = useState(true);
  const [showUtilities, setShowUtilities] = useState(true);

  // Debug Panel State
  const [isDebugOpen, setIsDebugOpen] = useState(true);
  const [debugStatus, setDebugStatus] = useState<{
    endpoint: string;
    locationSearchStatus: 'IDLE' | 'SEARCHING' | 'SUCCESS' | 'FAILED';
    searchCoordinates: { lat: number; lng: number } | null;
    overpassStatus: 'IDLE' | 'LOADING' | 'SUCCESS' | 'NO_BUILDINGS_IN_RADIUS' | 'TIMEOUT' | 'FAILED' | 'CANCELLED';
    radiusM: number;
    responseTimeMs: number;
    buildingsReturned: number;
    validGeometries: number;
    rendered: number;
    candidateCount: number;
    selectedBuildingId: string | number | null;
    selectionMethod: 'CONTAINS POINT' | 'NEAREST' | 'NAME MATCH' | 'MANUAL' | null;
    matchDistanceM: number;
    lastError: string | null;
    isUsingFallback: boolean;
  }>({
    endpoint: 'overpass-api.de',
    locationSearchStatus: 'IDLE',
    searchCoordinates: { lat: 12.9422, lng: 77.5753 },
    overpassStatus: 'IDLE',
    radiusM: 100,
    responseTimeMs: 0,
    buildingsReturned: 0,
    validGeometries: 0,
    rendered: 0,
    candidateCount: 0,
    selectedBuildingId: null,
    selectionMethod: null,
    matchDistanceM: 0,
    lastError: null,
    isUsingFallback: false,
  });

  // Updates the visual pulsating pin on the map
  const updateSelectionMarker = useCallback((lat: number, lng: number, label?: string) => {
    setSelectedPinCoords({ lat, lng });
    const pinGroup = selectionMarkerGroupRef.current;
    if (!pinGroup) return;
    pinGroup.clearLayers();

    const pinIcon = L.divIcon({
      className: 'custom-location-pin-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer pointer-events-auto">
          <span class="absolute -top-1 w-10 h-10 rounded-full bg-amber-400/40 animate-ping"></span>
          <span class="absolute -top-3 w-14 h-14 rounded-full bg-blue-500/25 animate-pulse"></span>
          <div class="relative z-10 w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 border-2 border-white shadow-2xl flex items-center justify-center text-slate-950 font-bold">
            <svg class="w-5 h-5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const marker = L.marker([lat, lng], { icon: pinIcon, zIndexOffset: 2000 });
    if (label) {
      marker.bindTooltip(`
        <div class="px-2.5 py-1 bg-slate-950 text-white rounded-lg text-xs font-bold shadow-2xl border border-amber-400 font-sans">
          📍 ${label}
        </div>
      `, { permanent: true, direction: 'top', offset: [0, -40] });
    }
    pinGroup.addLayer(marker);
  }, []);

  // Fetch real building footprints for a given coordinate with candidate ranking and failure differentiation
  const loadNearbyOsmBuildings = useCallback(async (
    lat: number, 
    lng: number, 
    options?: { 
      radiusM?: number; 
      poiName?: string; 
      poiShortName?: string; 
      isPoiSearch?: boolean;
    }
  ) => {
    // 1. Cancel previous in-flight request
    if (overpassAbortControllerRef.current) {
      overpassAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    overpassAbortControllerRef.current = controller;

    // Increment search generation so stale/cancelled requests are silently ignored
    const currentGeneration = ++searchGenerationRef.current;

    const currentRadius = options?.radiusM || 100;
    const queryName = options?.poiShortName || options?.poiName;

    setIsLoadingOverpass(true);
    setOverpassError(null);
    setOsmNotification(null);
    onAcquisitionStateChange?.({
      status: 'querying_osm',
      locationCoords: { lat, lng },
      locationName: queryName || 'Selected Location',
      searchRadiusM: currentRadius,
      osmFootprintsCount: 0,
      candidates: [],
    });
    setDebugStatus(prev => ({
      ...prev,
      overpassStatus: 'LOADING',
      radiusM: currentRadius,
      searchCoordinates: { lat, lng },
      lastError: null,
      isUsingFallback: false,
    }));

    try {
      const result = await fetchNearbyBuildingFootprintsDetailed(
        lat,
        lng,
        currentRadius,
        queryName,
        controller.signal
      );

      // If a newer search was started while this query was in flight, discard response silently
      if (currentGeneration !== searchGenerationRef.current) {
        return;
      }

      if (result.status === 'SUCCESS' && result.buildings.length > 0) {
        setOsmBuildings(result.buildings);

        const candidates = result.candidates || [];
        const topCandidate = result.selectedCandidate || (candidates.length > 0 ? candidates[0] : null);

        if (topCandidate) {
          setSelectedOsmBuilding(topCandidate.building);
          updateSelectionMarker(
            topCandidate.building.centroid.lat,
            topCandidate.building.centroid.lng,
            topCandidate.building.name
          );

          // Run AI Building Analysis for the selected live OSM building
          const aiAnalysis = await runAIBuildingAnalysis(topCandidate.building);
          if (currentGeneration !== searchGenerationRef.current) return;

          let finalTopBuilding = topCandidate.building;
          if (aiAnalysis && aiAnalysis.estimatedFloors) {
            setCustomFloors(aiAnalysis.estimatedFloors);
            setCustomHeight(aiAnalysis.estimatedHeightM);
            finalTopBuilding = {
              ...topCandidate.building,
              levels: aiAnalysis.estimatedFloors,
              heightM: aiAnalysis.estimatedHeightM,
              buildingType: aiAnalysis.buildingType || topCandidate.building.buildingType,
            };
            setSelectedOsmBuilding(finalTopBuilding);
          }

          const createdParcel = createCadastreFromOsmBuilding(finalTopBuilding, {
            floors: aiAnalysis.estimatedFloors,
            heightM: aiAnalysis.estimatedHeightM,
            aiAnalysis,
          }, {
            source: 'REAL_OSM',
            matchMethod: topCandidate.selectionMethod === 'CONTAINS POINT' ? 'POINT_CONTAINS' : 'NEAREST',
            confidenceLevel: 'High',
            confidence: aiAnalysis.confidenceScore,
            isSynthetic: false,
            osmTimeoutOccurred: false,
          });

          onAcquisitionStateChange?.({
            status: 'polygon_found',
            locationCoords: { lat, lng },
            locationName: queryName || finalTopBuilding.name,
            searchRadiusM: currentRadius,
            osmFootprintsCount: result.buildings.length,
            candidates,
            selectedBuilding: createdParcel.buildings[0],
            selectedOsmBuilding: finalTopBuilding,
            selectionMethod: topCandidate.selectionMethod,
            responseTimeMs: result.responseTimeMs,
            endpointUsed: result.endpointUsed,
            source: 'OSM',
            isUsingFallback: false,
            osmTimeoutOccurred: false,
            aiAnalysis,
            badge: 'REAL OSM DATA',
            resolutionAudit: createdParcel.buildings[0]?.resolutionAudit,
          });

          setDebugStatus(prev => ({
            ...prev,
            endpoint: result.endpointUsed,
            overpassStatus: 'SUCCESS',
            radiusM: currentRadius,
            responseTimeMs: result.responseTimeMs,
            buildingsReturned: result.totalElementsRaw,
            validGeometries: result.validGeometriesCount,
            rendered: result.buildings.length,
            candidateCount: candidates.length,
            selectedBuildingId: topCandidate.building.id,
            selectionMethod: topCandidate.selectionMethod,
            matchDistanceM: topCandidate.distanceM,
            lastError: null,
            isUsingFallback: false,
          }));

          // If POI coordinate was outside building footprints and multiple candidates exist,
          // open Nearby Building Resolution panel so the user can choose specific blocks/buildings
          if (options?.isPoiSearch && !topCandidate.isContained && candidates.length > 1) {
            setPoiResolution({
              isOpen: true,
              poiName: options.poiName || options.poiShortName || 'Selected Location',
              poiShortName: options.poiShortName || 'Selected Location',
              poiCoords: { lat, lng },
              candidates,
              searchRadiusM: currentRadius,
              isLoading: false,
            });
          } else {
            setPoiResolution(null);
          }
        }
      } else if (result.status === 'NO_BUILDINGS_IN_RADIUS') {
        // Zero buildings mapped within this radius on OpenStreetMap - recover using verified offline fallback
        const fallbackResult = getCachedOrFallbackBuildings(lat, lng, currentRadius);
        setOsmBuildings(fallbackResult.buildings);
        const topFallback = fallbackResult.buildings[0];
        setSelectedOsmBuilding(topFallback);
        setPoiResolution(null);

        updateSelectionMarker(
          topFallback.centroid.lat,
          topFallback.centroid.lng,
          topFallback.name
        );

        setOsmNotification({
          type: 'INFO',
          title: `NO OSM FOOTPRINT IN ${currentRadius}m → CACHED / DEMO GEOMETRY`,
          message: `No building polygon mapped within ${currentRadius}m of "${queryName || 'selected location'}". Verified ${fallbackResult.description} loaded automatically to continue 3D cadastral pipeline.`,
          coords: { lat, lng },
          radiusM: currentRadius,
        });

        const aiAnalysis = await runAIBuildingAnalysis(topFallback);
        if (currentGeneration !== searchGenerationRef.current) return;

        const fallbackCandidates: NearbyBuildingCandidate[] = fallbackResult.buildings.map((b) => ({
          id: b.id,
          name: b.name,
          distanceM: 0,
          areaSqm: b.areaSqm,
          footprintCoords: b.footprintCoords,
          matchMethod: 'CACHED_RECORD',
          confidence: 'High',
          isContained: true,
          building: b,
        }));

        const createdParcel = createCadastreFromOsmBuilding(topFallback, {
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
          osmTimeoutOccurred: false,
          fallbackType: fallbackResult.fallbackType,
          cachedTimestamp: Date.now(),
        });

        onAcquisitionStateChange?.({
          status: 'polygon_found',
          locationCoords: { lat, lng },
          locationName: queryName || topFallback.name,
          searchRadiusM: currentRadius,
          osmFootprintsCount: fallbackResult.buildings.length,
          candidates: fallbackCandidates,
          selectedBuilding: createdParcel.buildings[0],
          selectedOsmBuilding: topFallback,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          responseTimeMs: result.responseTimeMs,
          endpointUsed: `${result.endpointUsed} (Fallback: ${fallbackResult.description})`,
          source: 'CACHE',
          isUsingFallback: true,
          osmTimeoutOccurred: false,
          aiAnalysis,
          fallbackType: fallbackResult.fallbackType,
          badge: 'CACHED / DEMO GEOMETRY',
          resolutionAudit: createdParcel.buildings[0]?.resolutionAudit,
        });

        setDebugStatus(prev => ({
          ...prev,
          endpoint: `${result.endpointUsed} (Fallback: ${fallbackResult.description})`,
          overpassStatus: 'RECOVERED (CACHED GEOMETRY)',
          radiusM: currentRadius,
          responseTimeMs: result.responseTimeMs,
          buildingsReturned: fallbackResult.buildings.length,
          validGeometries: fallbackResult.buildings.length,
          rendered: fallbackResult.buildings.length,
          candidateCount: fallbackResult.buildings.length,
          selectedBuildingId: topFallback.id,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          matchDistanceM: 0,
          lastError: `No OSM building footprints mapped within ${currentRadius}m. Recovered using verified geometry.`,
          isUsingFallback: true,
        }));
      } else if (result.status === 'TIMEOUT') {
        // Strict Overpass timeout reached (12s) - AUTOMATIC FALLBACK TO PREVENT PIPELINE STALL
        const fallbackResult = getCachedOrFallbackBuildings(lat, lng, currentRadius);
        setOsmBuildings(fallbackResult.buildings);
        const topFallback = fallbackResult.buildings[0];
        setSelectedOsmBuilding(topFallback);
        setPoiResolution(null);

        updateSelectionMarker(
          topFallback.centroid.lat,
          topFallback.centroid.lng,
          topFallback.name
        );

        setOsmNotification({
          type: 'INFO',
          title: 'OSM TIMEOUT → CACHED / DEMO GEOMETRY ACTIVATED',
          message: `Live OpenStreetMap Overpass query timed out after ${Math.round(result.responseTimeMs / 1000)}s. To prevent pipeline stall, verified ${fallbackResult.description} has been loaded. Procedural 3D model generation and AI floor analysis proceeding.`,
          coords: { lat, lng },
          radiusM: currentRadius,
        });

        setDebugStatus(prev => ({
          ...prev,
          endpoint: `${result.endpointUsed} (Fallback: ${fallbackResult.description})`,
          overpassStatus: 'TIMEOUT (CACHED FALLBACK)',
          radiusM: currentRadius,
          responseTimeMs: result.responseTimeMs,
          buildingsReturned: fallbackResult.buildings.length,
          validGeometries: fallbackResult.buildings.length,
          rendered: fallbackResult.buildings.length,
          candidateCount: fallbackResult.buildings.length,
          selectedBuildingId: topFallback.id,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          matchDistanceM: 0,
          lastError: 'Live Overpass mirror timed out after 12s. Automatically recovered using cached geometry.',
          isUsingFallback: true,
        }));

        const aiAnalysis = await runAIBuildingAnalysis(topFallback);
        if (currentGeneration !== searchGenerationRef.current) return;

        const fallbackCandidates: NearbyBuildingCandidate[] = fallbackResult.buildings.map((b) => ({
          id: b.id,
          name: b.name,
          distanceM: 0,
          areaSqm: b.areaSqm,
          footprintCoords: b.footprintCoords,
          matchMethod: 'CACHED_RECORD',
          confidence: 'High',
          isContained: true,
          building: b,
        }));

        const createdParcel = createCadastreFromOsmBuilding(topFallback, {
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

        onAcquisitionStateChange?.({
          status: 'polygon_found',
          locationCoords: { lat, lng },
          locationName: queryName || topFallback.name,
          searchRadiusM: currentRadius,
          osmFootprintsCount: fallbackResult.buildings.length,
          candidates: fallbackCandidates,
          selectedBuilding: createdParcel.buildings[0],
          selectedOsmBuilding: topFallback,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          responseTimeMs: result.responseTimeMs,
          endpointUsed: `${result.endpointUsed} (Fallback: ${fallbackResult.description})`,
          source: 'CACHE',
          isUsingFallback: true,
          osmTimeoutOccurred: true,
          aiAnalysis,
          fallbackType: fallbackResult.fallbackType,
          badge: 'CACHED / DEMO GEOMETRY',
          resolutionAudit: createdParcel.buildings[0]?.resolutionAudit,
        });

        // Continue pipeline automatically into 3D cadastral generation
        onCreateCadastreFromOsm(topFallback, {
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
      } else {
        // Request failed across mirrors or HTTP error - recover gracefully
        const fallbackResult = getCachedOrFallbackBuildings(lat, lng, currentRadius);
        setOsmBuildings(fallbackResult.buildings);
        const topFallback = fallbackResult.buildings[0];
        setSelectedOsmBuilding(topFallback);
        setPoiResolution(null);

        updateSelectionMarker(
          topFallback.centroid.lat,
          topFallback.centroid.lng,
          topFallback.name
        );

        const errorMsg = result.errorMessage || result.error || 'Live Overpass mirror query failed.';
        setOverpassError(errorMsg);

        setOsmNotification({
          type: 'INFO',
          title: 'OSM UNREACHABLE → CACHED / DEMO GEOMETRY ACTIVATED',
          message: `${errorMsg} Automatically engaged ${fallbackResult.description} to ensure continuous 3D model generation.`,
          coords: { lat, lng },
          radiusM: currentRadius,
        });

        setDebugStatus(prev => ({
          ...prev,
          endpoint: `${result.endpointUsed} (Fallback: ${fallbackResult.description})`,
          overpassStatus: 'FAILED (CACHED FALLBACK)',
          radiusM: currentRadius,
          responseTimeMs: result.responseTimeMs,
          buildingsReturned: fallbackResult.buildings.length,
          validGeometries: fallbackResult.buildings.length,
          rendered: fallbackResult.buildings.length,
          candidateCount: fallbackResult.buildings.length,
          selectedBuildingId: topFallback.id,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          matchDistanceM: 0,
          lastError: errorMsg,
          isUsingFallback: true,
        }));

        const aiAnalysis = await runAIBuildingAnalysis(topFallback);
        if (currentGeneration !== searchGenerationRef.current) return;

        const fallbackCandidates: NearbyBuildingCandidate[] = fallbackResult.buildings.map((b) => ({
          id: b.id,
          name: b.name,
          distanceM: 0,
          areaSqm: b.areaSqm,
          footprintCoords: b.footprintCoords,
          matchMethod: 'CACHED_RECORD',
          confidence: 'High',
          isContained: true,
          building: b,
        }));

        const createdParcel = createCadastreFromOsmBuilding(topFallback, {
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

        onAcquisitionStateChange?.({
          status: 'polygon_found',
          locationCoords: { lat, lng },
          locationName: queryName || topFallback.name,
          searchRadiusM: currentRadius,
          osmFootprintsCount: fallbackResult.buildings.length,
          candidates: fallbackCandidates,
          selectedBuilding: createdParcel.buildings[0],
          selectedOsmBuilding: topFallback,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          responseTimeMs: result.responseTimeMs,
          endpointUsed: `${result.endpointUsed} (Fallback: ${fallbackResult.description})`,
          source: 'CACHE',
          isUsingFallback: true,
          osmTimeoutOccurred: true,
          aiAnalysis,
          fallbackType: fallbackResult.fallbackType,
          badge: 'CACHED / DEMO GEOMETRY',
        });

        onCreateCadastreFromOsm(topFallback, {
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
    } catch (err: any) {
      if (isAbortError(err)) {
        // Silently discard aborted search - user triggered a newer action
        return;
      }
      if (currentGeneration !== searchGenerationRef.current) {
        return;
      }

      const errorMsg = err.message || 'Live Overpass mirror unreachable.';
      setOverpassError(errorMsg);

      // Fallback recovery on exception
      const fallbackResult = getCachedOrFallbackBuildings(lat, lng, currentRadius);
      setOsmBuildings(fallbackResult.buildings);
      const topFallback = fallbackResult.buildings[0];
      setSelectedOsmBuilding(topFallback);
      setPoiResolution(null);

      updateSelectionMarker(
        topFallback.centroid.lat,
        topFallback.centroid.lng,
        topFallback.name
      );

      setOsmNotification({
        type: 'INFO',
        title: 'NETWORK EXCEPTION → CACHED / DEMO GEOMETRY ACTIVATED',
        message: `${errorMsg}. Verified offline geometry loaded to maintain uninterrupted 3D cadastre generation.`,
        coords: { lat, lng },
        radiusM: currentRadius,
      });

      setDebugStatus(prev => ({
        ...prev,
        overpassStatus: 'FAILED (RECOVERED)',
        radiusM: currentRadius,
        buildingsReturned: fallbackResult.buildings.length,
        validGeometries: fallbackResult.buildings.length,
        rendered: fallbackResult.buildings.length,
        candidateCount: fallbackResult.buildings.length,
        selectedBuildingId: topFallback.id,
        selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
        matchDistanceM: 0,
        lastError: errorMsg,
        isUsingFallback: true,
      }));

      runAIBuildingAnalysis(topFallback).then(aiAnalysis => {
        if (currentGeneration !== searchGenerationRef.current) return;
        const createdParcel = createCadastreFromOsmBuilding(topFallback, {
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

        onAcquisitionStateChange?.({
          status: 'polygon_found',
          locationCoords: { lat, lng },
          locationName: queryName || topFallback.name,
          searchRadiusM: currentRadius,
          osmFootprintsCount: fallbackResult.buildings.length,
          candidates: fallbackResult.buildings.map(b => ({
            id: b.id,
            name: b.name,
            distanceM: 0,
            areaSqm: b.areaSqm,
            footprintCoords: b.footprintCoords,
            matchMethod: 'CACHED_RECORD',
            confidence: 'High',
            isContained: true,
            building: b,
          })),
          selectedBuilding: createdParcel.buildings[0],
          selectedOsmBuilding: topFallback,
          selectionMethod: 'CACHED_OFFLINE_GEOMETRY',
          responseTimeMs: 0,
          source: 'CACHE',
          isUsingFallback: true,
          osmTimeoutOccurred: true,
          aiAnalysis,
          fallbackType: fallbackResult.fallbackType,
          badge: 'CACHED / DEMO GEOMETRY',
        });

        onCreateCadastreFromOsm(topFallback, {
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
      });
    } finally {
      if (currentGeneration === searchGenerationRef.current) {
        setIsLoadingOverpass(false);
      }
    }
  }, [updateSelectionMarker]);

  // Load Verified Demo GeoJSON Dataset fallback
  const handleLoadVerifiedDemoGeoJson = useCallback(() => {
    const fallbackBuildings = generateVerifiedFallbackBuildingsForLocation(currentCenter.lat, currentCenter.lng);
    setOsmBuildings(fallbackBuildings);
    setSelectedOsmBuilding(fallbackBuildings[0]);
    setOverpassError(null);
    if (fallbackBuildings.length > 0) {
      onAcquisitionStateChange?.({
        status: 'polygon_found',
        locationCoords: { lat: currentCenter.lat, lng: currentCenter.lng },
        locationName: fallbackBuildings[0].name || 'Verified Prototype Polygon Cache',
        searchRadiusM: 150,
        osmFootprintsCount: fallbackBuildings.length,
        selectedBuilding: createCadastreFromOsmBuilding(fallbackBuildings[0]).buildings[0],
        selectedOsmBuilding: fallbackBuildings[0],
        selectionMethod: 'CACHED_GEOMETRY',
        responseTimeMs: 15,
        source: 'CACHE',
      });
    }
    setDebugStatus(prev => ({
      ...prev,
      endpoint: 'Verified Prototype GeoJSON Fallback',
      overpassStatus: 'SUCCESS',
      buildingsReturned: fallbackBuildings.length,
      validGeometries: fallbackBuildings.length,
      rendered: fallbackBuildings.length,
      selectedBuildingId: fallbackBuildings[0]?.id ?? null,
      lastError: null,
      isUsingFallback: true,
    }));
  }, [currentCenter, onAcquisitionStateChange]);

  // Handle Custom GeoJSON Upload
  const handleGeoJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const features = json.features || (json.type === 'Feature' ? [json] : []);
        const parsedBuildings: OsmBuildingFeature[] = [];

        features.forEach((feat: any, idx: number) => {
          if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
            const rawCoords = feat.geometry.type === 'Polygon' ? feat.geometry.coordinates[0] : feat.geometry.coordinates[0][0];
            if (Array.isArray(rawCoords) && rawCoords.length >= 3) {
              const coords: SpatialCoordinates2D[] = rawCoords.map((c: any) => ({
                lat: c[1],
                lng: c[0],
              }));
              const area = calculatePolygonAreaSqm(coords);
              const centroid = calculatePolygonCentroid(coords);
              parsedBuildings.push({
                id: feat.id || `custom-geojson-${idx + 1}`,
                osmType: 'way',
                name: feat.properties?.name || `Imported Structure #${idx + 1}`,
                buildingType: feat.properties?.building || 'Commercial / Residential',
                footprintCoords: coords,
                centroid,
                areaSqm: area,
                heightM: feat.properties?.height ? parseFloat(feat.properties.height) : 22.4,
                isHeightEstimated: !feat.properties?.height,
                levels: feat.properties?.['building:levels'] ? parseInt(feat.properties['building:levels'], 10) : 7,
                isLevelsEstimated: !feat.properties?.['building:levels'],
                osmTags: feat.properties || {},
                address: feat.properties?.address || 'User Imported GeoJSON',
              });
            }
          }
        });

        if (parsedBuildings.length > 0) {
          setOsmBuildings(parsedBuildings);
          setSelectedOsmBuilding(parsedBuildings[0]);
          setOverpassError(null);
          onAcquisitionStateChange?.({
            status: 'polygon_found',
            locationCoords: { lat: parsedBuildings[0].centroid.lat, lng: parsedBuildings[0].centroid.lng },
            locationName: file.name,
            searchRadiusM: 100,
            osmFootprintsCount: parsedBuildings.length,
            selectedBuilding: createCadastreFromOsmBuilding(parsedBuildings[0]).buildings[0],
            selectedOsmBuilding: parsedBuildings[0],
            selectionMethod: 'GEOJSON_UPLOAD',
            responseTimeMs: 30,
            source: 'USER_GEOJSON',
          });
          setDebugStatus(prev => ({
            ...prev,
            endpoint: `Uploaded GeoJSON (${file.name})`,
            overpassStatus: 'SUCCESS',
            buildingsReturned: parsedBuildings.length,
            validGeometries: parsedBuildings.length,
            rendered: parsedBuildings.length,
            selectedBuildingId: parsedBuildings[0]?.id ?? null,
            lastError: null,
            isUsingFallback: false,
          }));

          // Pan to first building
          if (mapInstanceRef.current && parsedBuildings[0]) {
            mapInstanceRef.current.flyTo([parsedBuildings[0].centroid.lat, parsedBuildings[0].centroid.lng], 18);
          }
        } else {
          alert('No valid Polygon geometry found in uploaded GeoJSON.');
        }
      } catch (err: any) {
        alert(`Failed to parse GeoJSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default to Basavanagudi (12.9422, 77.5753) for rich building morphology
    const initialLat = 12.9422;
    const initialLng = 77.5753;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom High-Res OSM Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Create a dedicated pane with higher z-index for OSM buildings to guarantee clickability
    map.createPane('osmBuildingPane');
    const osmPane = map.getPane('osmBuildingPane');
    if (osmPane) {
      osmPane.style.zIndex = '450';
    }

    const parcelsLayerGroup = L.layerGroup().addTo(map);
    const osmLayerGroup = L.layerGroup([], { pane: 'osmBuildingPane' } as any).addTo(map);
    const selectionMarkerGroup = L.layerGroup([], { zIndex: 1000 } as any).addTo(map);

    osmLayerGroupRef.current = osmLayerGroup;
    parcelsLayerGroupRef.current = parcelsLayerGroup;
    selectionMarkerGroupRef.current = selectionMarkerGroup;
    mapInstanceRef.current = map;

    // Track mouse coordinate
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Track map center movement
    map.on('moveend', () => {
      const center = map.getCenter();
      setCurrentCenter({ lat: center.lat, lng: center.lng });
    });

    // Track map click for interactive location / plot selection
    map.on('click', (e: L.LeafletMouseEvent) => {
      handleMapClickRef.current?.(e);
    });

    // Initial load of nearby OSM footprints & initial pin
    loadNearbyOsmBuildings(initialLat, initialLng);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loadNearbyOsmBuildings]);

  // Click on map to select a real OSM building footprint
  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Switch to Real Location mode immediately
    if (appMode !== 'REAL_LOCATION') {
      onToggleAppMode('REAL_LOCATION');
    }

    setOsmNotification(null);

    // 1. Check if clicked point is in or near an already loaded OSM building polygon
    const nearby = findNearbyBuildingPolygons({ lat, lng }, osmBuildings, 30);
    if (nearby.length > 0) {
      const direct = nearby.find(c => c.isContained);
      if (direct || nearby.length === 1) {
        const chosen = direct ? direct.building : nearby[0].building;
        setSelectedOsmBuilding(chosen);
        onSelectBuilding(`OSM-${chosen.id}`);
        updateSelectionMarker(chosen.centroid.lat, chosen.centroid.lng, chosen.name || `Building #${chosen.id}`);
        setActiveLocationLabel(chosen.name || `Building #${chosen.id}`);
        setPoiResolution(null);
        setDebugStatus(prev => ({
          ...prev,
          selectedBuildingId: chosen.id,
          searchCoordinates: { lat, lng }
        }));
        return;
      } else {
        // Multiple buildings close to clicked point - prompt resolution
        updateSelectionMarker(lat, lng, 'Clicked Location');
        setPoiResolution({
          isOpen: true,
          poiName: `Map Point (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
          poiShortName: `Clicked Location`,
          poiCoords: { lat, lng },
          candidates: nearby,
          searchRadiusM: 30,
          isLoading: false,
        });
        return;
      }
    }

    // 2. Query Overpass live at clicked coordinate
    updateSelectionMarker(lat, lng, 'Querying OSM...');
    setIsLoadingOverpass(true);
    try {
      const result = await fetchNearbyBuildingFootprintsDetailed(lat, lng, 120);
      if (result.buildings.length > 0) {
        setOsmBuildings(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const newBldgs = result.buildings.filter(b => !existingIds.has(b.id));
          return [...newBldgs, ...prev];
        });

        const candidates = findNearbyBuildingPolygons({ lat, lng }, result.buildings, 120);
        if (candidates.length > 0) {
          const direct = candidates.find(c => c.isContained);
          if (direct || candidates.length === 1) {
            const chosen = direct ? direct.building : candidates[0].building;
            setSelectedOsmBuilding(chosen);
            onSelectBuilding(`OSM-${chosen.id}`);
            updateSelectionMarker(chosen.centroid.lat, chosen.centroid.lng, chosen.name);
            setActiveLocationLabel(chosen.name);
            setPoiResolution(null);
          } else {
            setPoiResolution({
              isOpen: true,
              poiName: `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
              poiShortName: 'Clicked Point',
              poiCoords: { lat, lng },
              candidates,
              searchRadiusM: 120,
              isLoading: false,
            });
          }
          return;
        }
      }

      // If no direct OSM building was returned, check verified cadastral fallback (e.g. BNMIT campus)
      const fallbackResult = getCachedOrFallbackBuildings(lat, lng, 120);
      if (fallbackResult.buildings.length > 0) {
        setOsmBuildings(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const newBldgs = fallbackResult.buildings.filter(b => !existingIds.has(b.id));
          return [...newBldgs, ...prev];
        });
        const topFallback = fallbackResult.buildings[0];
        setSelectedOsmBuilding(topFallback);
        onSelectBuilding(`OSM-${topFallback.id}`);
        updateSelectionMarker(topFallback.centroid.lat, topFallback.centroid.lng, topFallback.name);
        setActiveLocationLabel(topFallback.name);
        setPoiResolution(null);
        return;
      }

      // 3. No OSM building polygon exists at this point
      updateSelectionMarker(lat, lng, 'Open Ground / No Building');
      setSelectedOsmBuilding(null);
      setOsmNotification({
        type: 'NO_DATA',
        title: 'Building Not Mapped In OSM',
        message: `No OpenStreetMap building footprint (building=*) exists directly at coordinate ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E within 100m. The clicked location may be an open courtyard, road, or unmapped ground.`,
        coords: { lat, lng },
        radiusM: 100,
        nextRadiusM: 250,
      });
    } catch (err: any) {
      if (isAbortError(err)) {
        return;
      }
      
      // On exception, recover using verified offline dataset if available
      const fallbackResult = getCachedOrFallbackBuildings(lat, lng, 120);
      if (fallbackResult.buildings.length > 0) {
        setOsmBuildings(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const newBldgs = fallbackResult.buildings.filter(b => !existingIds.has(b.id));
          return [...newBldgs, ...prev];
        });
        const topFallback = fallbackResult.buildings[0];
        setSelectedOsmBuilding(topFallback);
        onSelectBuilding(`OSM-${topFallback.id}`);
        updateSelectionMarker(topFallback.centroid.lat, topFallback.centroid.lng, topFallback.name);
        setActiveLocationLabel(topFallback.name);
        return;
      }

      const isTimeout = err?.message?.toLowerCase().includes('time') || err?.name === 'TimeoutError';
      setOsmNotification({
        type: isTimeout ? 'TIMEOUT' : 'ERROR',
        title: isTimeout ? 'OSM Building Query Timed Out' : 'OSM Building Query Failed',
        message: isTimeout 
          ? 'Overpass request timed out while retrieving building footprints for this point. The map remains interactive.'
          : (err.message || 'Unable to retrieve OSM building data for this point.'),
        coords: { lat, lng },
        radiusM: 100,
        nextRadiusM: 250,
      });
    } finally {
      setIsLoadingOverpass(false);
    }
  }, [appMode, onToggleAppMode, osmBuildings, onSelectBuilding, updateSelectionMarker]);

  const handleMapClickRef = useRef(handleMapClick);
  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
  }, [handleMapClick]);

  // Sync custom floor & height defaults whenever a new OSM building is selected
  useEffect(() => {
    if (selectedOsmBuilding) {
      setCustomFloors(selectedOsmBuilding.levels);
      setCustomHeight(selectedOsmBuilding.heightM);
    }
  }, [selectedOsmBuilding]);

  // Render Real OpenStreetMap Building Footprints Layer
  useEffect(() => {
    const osmGroup = osmLayerGroupRef.current;
    if (!osmGroup) return;

    osmGroup.clearLayers();

    if (!showOsmFootprints) {
      setDebugStatus(prev => ({ ...prev, rendered: 0 }));
      return;
    }

    let renderedCount = 0;

    osmBuildings.forEach((bldg) => {
      const isSelected = selectedOsmBuilding?.id === bldg.id;
      const isHoveredCandidate = hoveredCandidateBuildingId === bldg.id;
      const latLngs: L.LatLngExpression[] = bldg.footprintCoords.map(p => [p.lat, p.lng]);

      const polygon = L.polygon(latLngs, {
        color: isSelected ? '#f59e0b' : (isHoveredCandidate ? '#06b6d4' : '#0284c7'),
        weight: isSelected ? 4 : (isHoveredCandidate ? 4 : 2),
        opacity: isSelected ? 1 : 0.95,
        fillColor: isSelected ? '#fbbf24' : (isHoveredCandidate ? '#22d3ee' : '#38bdf8'),
        fillOpacity: isSelected ? 0.8 : (isHoveredCandidate ? 0.75 : 0.35),
        className: 'osm-clickable-building cursor-pointer',
        pane: 'osmBuildingPane',
      });

      polygon.bindTooltip(`
        <div class="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs shadow-2xl border ${
          isSelected 
            ? 'border-amber-400 ring-2 ring-amber-400/40' 
            : (isHoveredCandidate ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-700')
        }">
          <div class="flex items-center gap-1 font-bold ${isSelected ? 'text-amber-400' : 'text-sky-400'}">
            <span>${bldg.name || `OSM Building #${bldg.id}`}</span>
          </div>
          <div class="text-[10px] text-slate-300 space-y-0.5 mt-1 font-mono">
            <p><span class="text-slate-400">OSM ID:</span> <span class="text-amber-300 font-bold">${bldg.osmType || 'way'}/${bldg.id}</span></p>
            <p><span class="text-slate-400">Building Tag:</span> <span class="text-sky-300">building=${bldg.osmTags?.building || 'yes'}</span></p>
            <p><span class="text-slate-400">Footprint Area:</span> <span class="text-emerald-400 font-bold">${bldg.areaSqm} m²</span></p>
            <p><span class="text-slate-400">Vertices:</span> <span class="text-slate-200">${bldg.footprintCoords.length} Points (Polygon)</span></p>
            <p><span class="text-slate-400">Source:</span> <span class="text-emerald-400 font-semibold">OpenStreetMap</span></p>
          </div>
          <div class="mt-1 flex items-center gap-1 text-[9.5px] text-amber-300 font-bold">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>Click to select footprint</span>
          </div>
        </div>
      `, { sticky: true, className: 'osm-building-tooltip' });

      // Hover feedback
      polygon.on('mouseover', () => {
        if (selectedOsmBuilding?.id !== bldg.id && hoveredCandidateBuildingId !== bldg.id) {
          polygon.setStyle({
            weight: 3,
            color: '#f59e0b',
            fillOpacity: 0.55,
          });
        }
      });

      polygon.on('mouseout', () => {
        if (selectedOsmBuilding?.id !== bldg.id && hoveredCandidateBuildingId !== bldg.id) {
          polygon.setStyle({
            weight: 2,
            color: '#0284c7',
            fillOpacity: 0.35,
          });
        }
      });

      // Click selection handler
      polygon.on('click', async (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedOsmBuilding(bldg);
        setCustomFloors(bldg.levels);
        setCustomHeight(bldg.heightM);
        onSelectOsmBuilding?.(bldg);
        onSelectBuilding(`OSM-${bldg.id}`);
        updateSelectionMarker(bldg.centroid.lat, bldg.centroid.lng, bldg.name);
        setPoiResolution(null);
        setOsmNotification(null);
        setDebugStatus(prev => ({ 
          ...prev, 
          selectedBuildingId: bldg.id,
          selectionMethod: 'MANUAL',
          matchDistanceM: 0,
        }));

        try {
          const aiAnalysis = await runAIBuildingAnalysis(bldg);
          if (aiAnalysis && aiAnalysis.estimatedFloors) {
            setCustomFloors(aiAnalysis.estimatedFloors);
            setCustomHeight(aiAnalysis.estimatedHeightM);
            const updated = {
              ...bldg,
              levels: aiAnalysis.estimatedFloors,
              heightM: aiAnalysis.estimatedHeightM,
              buildingType: aiAnalysis.buildingType || bldg.buildingType,
            };
            setSelectedOsmBuilding(prev => (prev && prev.id === bldg.id ? updated : prev));
            const createdParcel = createCadastreFromOsmBuilding(updated, {
              floors: aiAnalysis.estimatedFloors,
              heightM: aiAnalysis.estimatedHeightM,
              aiAnalysis,
            }, {
              source: 'REAL_OSM',
              matchMethod: 'MANUAL_MAP_SELECTION',
              confidenceLevel: 'High',
              confidence: aiAnalysis.confidenceScore,
              isSynthetic: false,
              osmTimeoutOccurred: false,
            });

            onAcquisitionStateChange?.({
              status: 'polygon_found',
              locationCoords: { lat: bldg.centroid.lat, lng: bldg.centroid.lng },
              locationName: bldg.name,
              searchRadiusM: 100,
              osmFootprintsCount: osmBuildings.length,
              selectedBuilding: createdParcel.buildings[0],
              selectedOsmBuilding: updated,
              selectionMethod: 'MANUAL',
              responseTimeMs: 30,
              source: 'OSM',
              isUsingFallback: false,
              osmTimeoutOccurred: false,
              aiAnalysis,
              badge: 'REAL OSM DATA',
            });
          }
        } catch (err) {
          console.warn('AI analysis on polygon click error:', err);
        }
      });

      osmGroup.addLayer(polygon);
      renderedCount++;

      if (isSelected || isHoveredCandidate) {
        polygon.bringToFront();
      }
    });

    setDebugStatus(prev => ({ ...prev, rendered: renderedCount }));
  }, [osmBuildings, selectedOsmBuilding, hoveredCandidateBuildingId, showOsmFootprints, onSelectBuilding, onSelectOsmBuilding]);

  // Render Official Cadastral Parcels Layer (Only in DEMO MODE or if explicitly toggled)
  useEffect(() => {
    const parcelGroup = parcelsLayerGroupRef.current;
    if (!parcelGroup) return;

    parcelGroup.clearLayers();

    // In Real Location Mode, suppress demo parcels to keep map clean and prevent click interception
    if (appMode === 'REAL_LOCATION' && !showParcels) return;

    if (!showParcels) return;

    parcels.forEach((parcel) => {
      const isSelected = parcel.id === viewState.selectedParcelId;
      const latLngs: L.LatLngExpression[] = parcel.boundaryPolygon.map(p => [p.lat, p.lng]);

      const parcelPolygon = L.polygon(latLngs, {
        color: isSelected ? '#3b82f6' : '#10b981',
        weight: isSelected ? 3 : 2,
        opacity: 0.9,
        fillColor: isSelected ? '#3b82f6' : '#10b981',
        fillOpacity: isSelected ? 0.25 : 0.12,
        dashArray: isSelected ? undefined : '5, 5',
      });

      parcelPolygon.bindTooltip(`
        <div class="px-2 py-1 bg-slate-900 text-white rounded text-xs shadow-lg border border-slate-700">
          <p class="font-bold text-emerald-400">${parcel.id} - ${parcel.surveyNumber}</p>
          <p class="text-slate-300 text-[10px]">2D ULPIN: ${parcel.ulpin2D}</p>
          <p class="text-slate-400 text-[10px]">Area: ${parcel.areaSqm} m²</p>
        </div>
      `, { sticky: true });

      parcelPolygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectParcel(parcel.id);
        if (parcel.buildings.length > 0) {
          onSelectBuilding(parcel.buildings[0].id);
        }
        setSelectedOsmBuilding(null);
        setDebugStatus(prev => ({ ...prev, selectedBuildingId: parcel.buildings[0]?.id || parcel.id }));
      });

      parcelGroup.addLayer(parcelPolygon);

      // Render Individual Demo Building Footprints inside each parcel
      parcel.buildings.forEach((bldg) => {
        const isBldgSelected = bldg.id === viewState.selectedBuildingId;
        const bldgLatLngs: L.LatLngExpression[] = bldg.footprintCoords.map(p => [p.lat, p.lng]);

        const bldgPolygon = L.polygon(bldgLatLngs, {
          color: isBldgSelected ? '#f59e0b' : '#6366f1',
          weight: isBldgSelected ? 3 : 2,
          opacity: 0.95,
          fillColor: isBldgSelected ? '#fbbf24' : '#818cf8',
          fillOpacity: isBldgSelected ? 0.7 : 0.45,
          className: 'demo-building-polygon cursor-pointer',
        });

        bldgPolygon.bindTooltip(`
          <div class="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs shadow-xl border ${
            isBldgSelected ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-indigo-500/50'
          }">
            <p class="font-bold ${isBldgSelected ? 'text-amber-400' : 'text-indigo-300'}">${bldg.name} (${bldg.id})</p>
            <p class="text-[10px] text-slate-300">Type: ${bldg.structureType} • Floors: ${bldg.floorCountAboveGround}</p>
            <p class="text-[10px] text-emerald-400 font-mono">Height: ${bldg.totalHeightM}m • Units: ${bldg.totalUnitsCount}</p>
            <p class="text-[9.5px] text-amber-300 font-semibold mt-0.5">Click to inspect in 3D cadastre</p>
          </div>
        `, { sticky: true });

        bldgPolygon.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectParcel(parcel.id);
          onSelectBuilding(bldg.id);
          setSelectedOsmBuilding(null);
          setDebugStatus(prev => ({ ...prev, selectedBuildingId: bldg.id }));
        });

        parcelGroup.addLayer(bldgPolygon);
        if (isBldgSelected) {
          bldgPolygon.bringToFront();

          // Render 2D Strata Floor and Unit subdivisions if a floor is selected (Requirement 9)
          if (viewState.selectedFloorNumber !== null) {
            const activeFloor = bldg.floors.find(f => f.floorNumber === viewState.selectedFloorNumber);
            if (activeFloor && activeFloor.units.length > 0) {
              activeFloor.units.forEach((unit) => {
                const uPolyCoords = (unit.polygon && unit.polygon.length >= 3)
                  ? unit.polygon
                  : (activeFloor.footprintCoords && activeFloor.footprintCoords.length >= 3)
                    ? activeFloor.footprintCoords
                    : bldg.footprintCoords;
                
                if (uPolyCoords.length >= 3) {
                  const uLatLngs: L.LatLngExpression[] = uPolyCoords.map(p => [p.lat, p.lng]);
                  const isUnitSelected = unit.id === viewState.selectedUnitId;
                  const hasCol = unit.hasTopologyCollision;

                  const unitPoly = L.polygon(uLatLngs, {
                    color: isUnitSelected ? '#ffffff' : hasCol ? '#ef4444' : '#38bdf8',
                    weight: isUnitSelected ? 3.5 : 2.0,
                    fillColor: isUnitSelected ? '#f59e0b' : hasCol ? '#f43f5e' : '#0284c7',
                    fillOpacity: isUnitSelected ? 0.85 : hasCol ? 0.7 : 0.5,
                    dashArray: hasCol ? '4, 4' : undefined,
                  });

                  unitPoly.bindTooltip(`
                    <div class="px-2 py-1.5 bg-slate-950 text-white rounded-lg text-xs border border-slate-700 shadow-xl font-mono">
                      <div class="flex items-center justify-between gap-2">
                        <strong class="text-sky-300">Unit ${unit.unitNumber}</strong>
                        <span class="text-[9px] px-1 rounded bg-slate-800 text-slate-300">${unit.unitType}</span>
                      </div>
                      <p class="text-[10px] text-slate-400 mt-0.5">3D ULPIN: <span class="text-emerald-400 font-bold">${unit.prototypeUlpin3D}</span></p>
                      <p class="text-[10px] text-slate-400">Owner: ${unit.ownerName} • ${unit.builtUpAreaSqm.toFixed(1)} m²</p>
                      ${hasCol ? `<p class="text-[10px] text-rose-400 font-bold mt-0.5">⚠️ Collision: ${unit.collisionReason}</p>` : ''}
                    </div>
                  `, { sticky: true });

                  unitPoly.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    onSelectParcel(parcel.id);
                    onSelectBuilding(bldg.id);
                    if (onSelectUnit) {
                      onSelectUnit(unit.id);
                    }
                  });

                  parcelGroup.addLayer(unitPoly);
                  unitPoly.bringToFront();
                }
              });
            }
          }
        }
      });

      // Centroid Marker Badge
      const parcelIcon = L.divIcon({
        className: 'custom-parcel-marker',
        html: `
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-md border ${
            isSelected 
              ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/50' 
              : 'bg-slate-900/90 border-emerald-500/50 text-emerald-300'
          }">
            <span>${parcel.id}</span>
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });

      const marker = L.marker([parcel.centroid.lat, parcel.centroid.lng], { icon: parcelIcon });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectParcel(parcel.id);
      });
      parcelGroup.addLayer(marker);

      // Draw Sub-surface Utilities if enabled
      if (showUtilities && parcel.undergroundAssets) {
        parcel.undergroundAssets.forEach((asset) => {
          if (asset.coordinates.length >= 2) {
            const utilLatLngs: L.LatLngExpression[] = asset.coordinates.map(p => [p.lat, p.lng]);
            let lineColor = '#06b6d4';
            if (asset.type === 'Sewage Pipeline') lineColor = '#84cc16';
            if (asset.type === 'Electrical Cable') lineColor = '#eab308';
            if (asset.type === 'Fiber Optic Cable') lineColor = '#ec4899';
            if (asset.type === 'Utility Tunnel') lineColor = '#a855f7';

            const polyline = L.polyline(utilLatLngs, {
              color: asset.hasTopologyCollision ? '#ef4444' : lineColor,
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.8,
            });

            polyline.bindTooltip(`
              <div class="px-2 py-1 bg-slate-900 text-white rounded text-xs border border-slate-700">
                <p class="font-semibold text-cyan-300">${asset.name}</p>
                <p class="text-slate-400 text-[10px]">Type: ${asset.type} • Depth: ${asset.depthM}m</p>
                <p class="text-slate-400 text-[10px]">3D ULPIN: ${asset.prototypeUlpin3D}</p>
              </div>
            `, { sticky: true });

            parcelGroup.addLayer(polyline);
          }
        });
      }
    });
  }, [parcels, viewState.selectedParcelId, showParcels, showUtilities, onSelectParcel, appMode]);

  // Execute Real Location Geocoding Search
  const handlePerformSearch = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q.trim()) return;

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setDebugStatus(prev => ({ ...prev, locationSearchStatus: 'SEARCHING' }));

    // Check if query matches a known preset directly
    const matchingPreset = PRESET_LOCATIONS.find(p => 
      p.name.toLowerCase().includes(q.toLowerCase()) || 
      p.query.toLowerCase().includes(q.toLowerCase()) ||
      q.toLowerCase().includes(p.name.toLowerCase())
    );

    try {
      // Check if user entered direct lat, lng coordinates e.g. "12.9716, 77.5946"
      const coordMatch = q.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[3]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          handleSelectGeocodedResult({
            placeId: 'coord-direct',
            displayName: `Coordinates (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
            shortName: `Location @ ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
            lat,
            lng,
            type: 'coordinate'
          });
          return;
        }
      }

      const results = await geocodeLocation(q, controller.signal);
      if (results.length === 0) {
        if (matchingPreset) {
          handlePresetSelect(matchingPreset);
        } else {
          const msg = `No matching locations found for "${q}". Try an address, ward name, or lat,lng.`;
          setSearchError(msg);
          setDebugStatus(prev => ({ ...prev, locationSearchStatus: 'FAILED', lastError: msg }));
        }
      } else if (results.length === 1) {
        handleSelectGeocodedResult(results[0]);
      } else {
        setSearchResults(results);
        setDebugStatus(prev => ({ ...prev, locationSearchStatus: 'SUCCESS' }));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        if (matchingPreset) {
          handlePresetSelect(matchingPreset);
        } else {
          const msg = err.message || 'Geocoding request failed.';
          setSearchError(msg);
          setDebugStatus(prev => ({ ...prev, locationSearchStatus: 'FAILED', lastError: msg }));
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectGeocodedResult = (loc: GeocodedLocation) => {
    setSearchResults([]);
    setActiveLocationLabel(loc.shortName);
    setSearchQuery(loc.shortName);
    setOsmNotification(null);
    if (appMode !== 'REAL_LOCATION') {
      onToggleAppMode('REAL_LOCATION');
    }
    // Place selection marker at the exact searched POI coordinate
    updateSelectionMarker(loc.lat, loc.lng, loc.shortName);
    setDebugStatus(prev => ({
      ...prev,
      locationSearchStatus: 'SUCCESS',
      searchCoordinates: { lat: loc.lat, lng: loc.lng }
    }));

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 18, { duration: 1.5 });
      // Fetch nearby real OSM building polygons and initiate candidate resolution pipeline
      loadNearbyOsmBuildings(loc.lat, loc.lng, {
        radiusM: 200,
        poiName: loc.displayName,
        poiShortName: loc.shortName,
        isPoiSearch: true,
      });
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
    setActiveLocationLabel(preset.name);
    setSearchQuery(preset.name);
    setSearchResults([]);
    setSearchError(null);
    setOsmNotification(null);
    if (appMode !== 'REAL_LOCATION') {
      onToggleAppMode('REAL_LOCATION');
    }
    updateSelectionMarker(preset.lat, preset.lng, preset.name);
    setDebugStatus(prev => ({
      ...prev,
      locationSearchStatus: 'SUCCESS',
      searchCoordinates: { lat: preset.lat, lng: preset.lng }
    }));

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], preset.zoom, { duration: 1.5 });
      loadNearbyOsmBuildings(preset.lat, preset.lng, {
        radiusM: 200,
        poiName: preset.name,
        poiShortName: preset.name,
        isPoiSearch: true,
      });
    }
  };

  const handleSaveBuildingName = useCallback((newName: string) => {
    if (!selectedOsmBuilding || !newName.trim()) return;
    const updatedName = newName.trim();
    const updatedBuilding: OsmBuildingFeature = {
      ...selectedOsmBuilding,
      name: updatedName,
    };
    setSelectedOsmBuilding(updatedBuilding);
    setOsmBuildings(prev => prev.map(b => b.id === updatedBuilding.id ? { ...b, name: updatedName } : b));
    updateSelectionMarker(updatedBuilding.centroid.lat, updatedBuilding.centroid.lng, updatedName);
    setIsEditingBuildingName(false);
  }, [selectedOsmBuilding, updateSelectionMarker]);

  const handleCreate3DFromSelectedOsm = () => {
    if (!selectedOsmBuilding) return;
    onCreateCadastreFromOsm(selectedOsmBuilding, {
      floors: customFloors,
      heightM: customHeight,
    });
  };

  const selectedParcel = parcels.find(p => p.id === viewState.selectedParcelId);

  return (
    <div id="real-leaflet-gis-container" className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      
      {/* Hidden File Input for GeoJSON upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={handleGeoJsonUpload}
        className="hidden"
      />

      {/* Real OpenStreetMap Tile Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Command Ribbon */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left Controls: Mode Switcher & Real Location Geocoding Bar */}
        <div className="pointer-events-auto flex items-center flex-wrap gap-2 max-w-2xl">
          
          {/* Mode Switcher */}
          <div className="bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-1">
            <button
              onClick={() => onToggleAppMode('DEMO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                appMode === 'DEMO'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Demo Parcels</span>
            </button>

            <button
              onClick={() => onToggleAppMode('REAL_LOCATION')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                appMode === 'REAL_LOCATION'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Real OSM Live</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformSearch();
              }} 
              className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/80 shadow-xl min-w-[260px] sm:min-w-[320px]"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search city, ward, or Lat,Lng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none py-0.5 font-mono"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-[11px] font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                <span>Locate</span>
              </button>
            </form>

            {/* Search Result Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-md rounded-xl border border-blue-500/50 shadow-2xl overflow-hidden z-30 divide-y divide-slate-800">
                <div className="px-3 py-1.5 bg-blue-950/60 text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  Matching Locations ({searchResults.length})
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.placeId}
                    onClick={() => handleSelectGeocodedResult(result)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600/20 text-xs text-slate-200 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-white truncate">{result.displayName}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Lat: {result.lat.toFixed(5)}°, Lng: {result.lng.toFixed(5)}° • {result.type}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Error Toast */}
            {searchError && (
              <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 bg-rose-950/95 border border-rose-600/50 text-rose-300 text-xs rounded-xl shadow-lg flex items-center justify-between z-30">
                <span>{searchError}</span>
                <button onClick={() => setSearchError(null)} className="text-rose-400 hover:text-rose-200 p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Location Chips */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60">
            {PRESET_LOCATIONS.map((preset) => {
              const isActive = activeLocationLabel.toLowerCase().includes(preset.name.toLowerCase().split(' ')[0]);
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={preset.desc}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          {/* Manual Search Radius Progression Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-1.5 py-1 rounded-xl border border-slate-700/80 shadow-lg">
            <span className="text-[9.5px] font-mono font-bold text-slate-400 px-1">RADIUS:</span>
            {[100, 250, 500].map((radius) => {
              const isSelected = debugStatus.radiusM === radius;
              return (
                <button
                  key={radius}
                  onClick={() => {
                    loadNearbyOsmBuildings(currentCenter.lat, currentCenter.lng, {
                      radiusM: radius,
                      isPoiSearch: true,
                      poiShortName: activeLocationLabel,
                    });
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-sky-600 text-white shadow-sm' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`Search OSM building footprints within ${radius}m radius`}
                >
                  {radius}m
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Controls: Quick Actions & 3D Switch */}
        <div className="pointer-events-auto flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md transition-colors cursor-pointer"
            title="Upload custom building footprint GeoJSON"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Import GeoJSON</span>
          </button>

          <button
            onClick={handleLoadVerifiedDemoGeoJson}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md transition-colors cursor-pointer"
            title="Load authentic Bengaluru building footprints fallback"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Demo GeoJSON</span>
          </button>

          <button
            onClick={onOpenAIExtraction}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl border border-indigo-400/40 shadow-lg backdrop-blur-md transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI Extraction</span>
          </button>

          <button
            onClick={() => {
              if (appMode === 'REAL_LOCATION' && selectedOsmBuilding) {
                handleCreate3DFromSelectedOsm();
              } else {
                onSwitchTo3D();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all border border-blue-400/50 hover:shadow-blue-500/25 cursor-pointer active:scale-95"
          >
            <span>Open 3D Cadastre</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Honest Data Source Status Indicator */}
      <div className="absolute top-14 left-3 z-10 pointer-events-auto hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-[10.5px] text-slate-300 font-mono shadow-lg">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Location:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
            <Check className="w-3 h-3" /> OSM Nominatim
          </span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Footprint:</span>
          {debugStatus.isUsingFallback ? (
            <span className="text-amber-400 font-bold flex items-center gap-0.5">
              ⚠ Demo / Prototype GeoJSON
            </span>
          ) : selectedOsmBuilding ? (
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              {debugStatus.selectionMethod === 'CONTAINS POINT' || debugStatus.selectionMethod === 'MANUAL' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> OSM Exact Polygon
                </>
              ) : (
                <>
                  ⚠ OSM Nearby Match ({debugStatus.matchDistanceM}m)
                </>
              )}
            </span>
          ) : debugStatus.overpassStatus === 'LOADING' ? (
            <span className="text-sky-400 font-bold flex items-center gap-0.5">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Querying ({debugStatus.radiusM}m)
            </span>
          ) : (
            <span className="text-slate-400 font-medium">
              Not selected / query pending
            </span>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoadingOverpass && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-sky-950/95 backdrop-blur-md px-4 py-2 rounded-full border border-sky-500/50 text-sky-200 text-xs flex items-center gap-2.5 shadow-xl animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
          <span>
            {loadingDurationSec >= 4 
              ? `Querying Overpass mirror... (taking longer than usual, strict timeout in ${Math.max(0, 12 - loadingDurationSec)}s)` 
              : `Fetching OSM building footprints for ${activeLocationLabel || 'location'} (${debugStatus.radiusM}m)...`}
          </span>
        </div>
      )}

      {/* Unified OSM Query Status & Failure Diagnostic Dialog / Toast */}
      {osmNotification && (
        <div className={`absolute top-20 left-4 right-4 sm:left-auto sm:right-4 z-30 sm:w-[420px] bg-slate-900/98 backdrop-blur-xl p-4 rounded-2xl border shadow-2xl text-slate-200 text-xs space-y-2.5 animate-in fade-in slide-in-from-top-3 ${
          osmNotification.type === 'TIMEOUT' ? 'border-amber-500/90' :
          osmNotification.type === 'ERROR' ? 'border-rose-500/90' :
          'border-sky-500/80'
        }`}>
          <div className="flex items-start justify-between">
            <div className={`flex items-center gap-2 font-bold ${
              osmNotification.type === 'TIMEOUT' ? 'text-amber-400' :
              osmNotification.type === 'ERROR' ? 'text-rose-400' :
              'text-sky-400'
            }`}>
              {osmNotification.type === 'TIMEOUT' ? (
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="text-xs uppercase tracking-wider">{osmNotification.title}</span>
            </div>
            <button 
              onClick={() => setOsmNotification(null)} 
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <p className="text-[11.5px] text-slate-300 leading-relaxed">
            {osmNotification.message}
          </p>

          {(osmNotification.type === 'TIMEOUT' || osmNotification.type === 'ERROR') && (
            <p className="text-[10px] text-amber-300/80 italic">
              Note: A timeout or network failure does not indicate the building is unmapped.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/90">
            {(osmNotification.type === 'TIMEOUT' || osmNotification.type === 'ERROR') && (
              <button
                onClick={() => {
                  const c = osmNotification.coords;
                  const rad = osmNotification.radiusM;
                  setOsmNotification(null);
                  loadNearbyOsmBuildings(c.lat, c.lng, {
                    radiusM: rad,
                    isPoiSearch: true,
                    poiShortName: activeLocationLabel,
                  });
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-xl transition cursor-pointer shadow flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}

            {osmNotification.nextRadiusM && (
              <button
                onClick={() => {
                  const c = osmNotification.coords;
                  const nextR = osmNotification.nextRadiusM!;
                  setOsmNotification(null);
                  loadNearbyOsmBuildings(c.lat, c.lng, {
                    radiusM: nextR,
                    isPoiSearch: true,
                    poiShortName: activeLocationLabel,
                  });
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-xl transition cursor-pointer shadow flex items-center gap-1.5"
              >
                <Search className="w-3 h-3" />
                <span>Search {osmNotification.nextRadiusM}m</span>
              </button>
            )}

            <button
              onClick={() => {
                setOsmNotification(null);
                handleLoadVerifiedDemoGeoJson();
              }}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition cursor-pointer shadow flex items-center gap-1.5"
            >
              <FileCode2 className="w-3 h-3" />
              <span>Use Cached Geometry</span>
            </button>

            <button
              onClick={() => {
                setOsmNotification(null);
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] rounded-xl transition cursor-pointer border border-slate-700"
            >
              Import GeoJSON
            </button>

            <button
              onClick={() => setOsmNotification(null)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] rounded-xl transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Nearby Building Resolution Panel (When a POI / Campus / Point is selected with nearby buildings) */}
      {poiResolution && poiResolution.isOpen && (
        <div 
          id="nearby-building-resolution-panel"
          className="absolute top-20 right-4 z-30 w-80 sm:w-96 max-h-[calc(100vh-6.5rem)] flex flex-col bg-slate-900/98 backdrop-blur-xl p-4 rounded-2xl border border-sky-500/80 shadow-2xl text-left animate-in fade-in slide-in-from-right-4"
        >
          {/* Panel Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Multiple Buildings Found Nearby</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                <span className="text-slate-400">Selected POI:</span> <span className="font-semibold text-white">{poiResolution.poiShortName}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                The selected location is an OSM POI / Ground marker. Choose the actual building polygon to extrude into 3D:
              </p>
            </div>
            <button 
              onClick={() => setPoiResolution(null)} 
              className="text-slate-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
              title="Close resolution"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Candidate List (Scrollable) */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-2 mt-3 scrollbar-thin scrollbar-thumb-slate-700">
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>{poiResolution.candidates.length} CANDIDATE FOOTPRINTS</span>
              <span>WITHIN {poiResolution.searchRadiusM}m</span>
            </div>

            {poiResolution.candidates.map((candidate) => {
              const bldg = candidate.building;
              const isHovered = hoveredCandidateBuildingId === bldg.id;
              const isSelected = selectedOsmBuilding?.id === bldg.id;

              return (
                <div
                  key={bldg.id}
                  onMouseEnter={() => setHoveredCandidateBuildingId(bldg.id)}
                  onMouseLeave={() => setHoveredCandidateBuildingId(null)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-950/40 border-amber-400 shadow-md' 
                      : (isHovered 
                          ? 'bg-sky-950/60 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md' 
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700')
                  }`}
                  onClick={() => {
                    setSelectedOsmBuilding(bldg);
                    onSelectOsmBuilding?.(bldg);
                    onSelectBuilding(`OSM-${bldg.id}`);
                    setPoiResolution(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-white group-hover:text-sky-300 truncate">
                          {bldg.name}
                        </span>
                        {candidate.isContained && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                            📍 Marker Inside
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-semibold">{bldg.osmType || 'way'}/{bldg.id}</span>
                          <span>•</span>
                          <span className="text-sky-300">building={bldg.osmTags?.building || 'yes'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300 flex-wrap">
                          <span className="text-emerald-400 font-bold">{bldg.areaSqm} m²</span>
                          <span>•</span>
                          <span>{bldg.footprintCoords.length} Vertices</span>
                          <span>•</span>
                          <span>{candidate.distanceM}m away</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {bldg.levels} Floors • {bldg.heightM}m Height
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOsmBuilding(bldg);
                        onSelectOsmBuilding?.(bldg);
                        onSelectBuilding(`OSM-${bldg.id}`);
                        setPoiResolution(null);
                      }}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10.5px] rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Select Footprint</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Inspector Card for Real OpenStreetMap Selected Building */}
      {!poiResolution?.isOpen && selectedOsmBuilding && (
        <div 
          id="osm-building-inspector-card"
          className={`absolute top-20 right-4 z-20 transition-all ${
            isOsmCardMinimized 
              ? 'w-auto max-w-sm bg-slate-900/95 backdrop-blur-xl px-3 py-2 rounded-xl border border-amber-500/70 shadow-2xl animate-in fade-in' 
              : 'w-80 sm:w-96 max-h-[calc(100vh-6.5rem)] flex flex-col bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-amber-500/80 shadow-2xl text-left animate-in fade-in slide-in-from-right-4'
          }`}
        >
          {isOsmCardMinimized ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-white block truncate text-[11px]">{selectedOsmBuilding.name}</span>
                <span className="text-[9.5px] text-amber-400 font-mono">{customFloors} Fl • {selectedOsmBuilding.areaSqm} m²</span>
              </div>
              <button
                onClick={handleCreate3DFromSelectedOsm}
                className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-[10px] shrink-0 flex items-center gap-1 cursor-pointer transition shadow"
                title="Create 3D Cadastre"
              >
                <Box className="w-3 h-3" />
                <span>Create 3D</span>
              </button>
              <button
                onClick={() => setIsOsmCardMinimized(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                title="Expand Details"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedOsmBuilding(null)}
                className="p-1 text-slate-400 hover:text-rose-300 rounded hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Header (fixed shrink-0) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">BUILDING SELECTED</span>
                    <span className="text-[10px] text-amber-400 font-mono block truncate">
                      Source: OpenStreetMap
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button 
                    onClick={() => setIsOsmCardMinimized(true)}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Minimize panel to unblock map view"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedOsmBuilding(null)}
                    className="text-slate-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Close selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-3 mt-2 scrollbar-thin scrollbar-thumb-slate-700">
                {/* Building Name Header with Inline Edit / Rename */}
                {(() => {
                  const nearbyCampus = findMatchingCampus(selectedOsmBuilding.centroid.lat, selectedOsmBuilding.centroid.lng);
                  return (
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400">
                          Building Identity / Name
                        </span>
                        {!isEditingBuildingName && (
                          <button
                            onClick={() => {
                              setIsEditingBuildingName(true);
                              setEditedBuildingName(selectedOsmBuilding.name);
                            }}
                            className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded bg-sky-950/50 border border-sky-800/50 hover:bg-sky-900/50 transition cursor-pointer"
                            title="Edit or correct building name"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit Name</span>
                          </button>
                        )}
                      </div>

                      {isEditingBuildingName ? (
                        <div className="space-y-2">
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="text"
                              value={editedBuildingName}
                              onChange={(e) => setEditedBuildingName(e.target.value)}
                              placeholder="Enter building or institution name..."
                              className="flex-1 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-400 font-semibold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveBuildingName(editedBuildingName);
                                if (e.key === 'Escape') setIsEditingBuildingName(false);
                              }}
                            />
                            <button
                              onClick={() => handleSaveBuildingName(editedBuildingName)}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold transition cursor-pointer"
                              title="Save Name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIsEditingBuildingName(false)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Suggested Campus Names chips if nearby */}
                          {nearbyCampus && (
                            <div className="text-[10px] pt-1.5 border-t border-slate-800/80">
                              <span className="text-slate-400 block mb-1 text-[9.5px]">Campus Block Quick-Assign:</span>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  onClick={() => handleSaveBuildingName(`${nearbyCampus.name} - Academy & Administration Block`)}
                                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 text-[10px] transition cursor-pointer"
                                >
                                  Academy & Admin Block
                                </button>
                                <button
                                  onClick={() => handleSaveBuildingName('BNM Auditorium')}
                                  className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/40 text-[10px] transition cursor-pointer"
                                >
                                  BNM Auditorium
                                </button>
                                <button
                                  onClick={() => handleSaveBuildingName(`${nearbyCampus.name} - Central Library & Information Centre`)}
                                  className="px-2 py-0.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded border border-sky-500/40 text-[10px] transition cursor-pointer"
                                >
                                  Central Library
                                </button>
                                <button
                                  onClick={() => handleSaveBuildingName(`${nearbyCampus.name} - New Building`)}
                                  className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded border border-purple-500/40 text-[10px] transition cursor-pointer"
                                >
                                  New Building
                                </button>
                                <button
                                  onClick={() => handleSaveBuildingName(`${nearbyCampus.name} - Science & Computing Wing`)}
                                  className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/40 text-[10px] transition cursor-pointer"
                                >
                                  Science & Computing
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-bold text-sm text-white leading-snug">
                            {selectedOsmBuilding.name}
                          </h3>
                          {nearbyCampus && !selectedOsmBuilding.name.includes(nearbyCampus.name) && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400">Detected Campus:</span>
                              <button
                                onClick={() => handleSaveBuildingName(`${nearbyCampus.name} - ${selectedOsmBuilding.name}`)}
                                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                                title="Assign to detected campus"
                              >
                                {nearbyCampus.name}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">OSM ID:</span>
                    <span className="font-mono font-bold text-amber-300">{selectedOsmBuilding.osmType || 'way'}/{selectedOsmBuilding.id}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">OSM TYPE:</span>
                    <span className="font-mono font-semibold text-sky-400 uppercase">{selectedOsmBuilding.osmType || 'way'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">GEOMETRY:</span>
                    <span className="font-mono font-semibold text-emerald-400">Polygon</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">VERTICES:</span>
                    <span className="font-mono font-bold text-emerald-300">{selectedOsmBuilding.footprintCoords.length} Points</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">AREA:</span>
                    <span className="font-mono font-bold text-emerald-400">{selectedOsmBuilding.areaSqm} m²</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">SOURCE:</span>
                    <span className="font-mono font-semibold text-sky-300">OpenStreetMap</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">Building Type:</span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {selectedOsmBuilding.buildingType || 'Urban Structure'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">Height:</span>
                    <span className="font-mono text-[11px] text-amber-300 font-semibold">
                      {selectedOsmBuilding.osmTags?.height || `${selectedOsmBuilding.heightM}m (${selectedOsmBuilding.isHeightEstimated ? 'Estimated' : 'Direct'})`}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">Levels:</span>
                    <span className="font-mono text-[11px] text-slate-200 font-semibold">
                      {selectedOsmBuilding.osmTags?.['building:levels'] || `${selectedOsmBuilding.levels} Floors (${selectedOsmBuilding.isLevelsEstimated ? 'AI Estimated' : 'Direct'})`}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 font-mono text-[11px]">Coordinates:</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {selectedOsmBuilding.centroid.lat.toFixed(5)}° N, {selectedOsmBuilding.centroid.lng.toFixed(5)}° E
                    </span>
                  </div>

                  {/* Configurable Floors and Height for Extrusion */}
                  <div className="pt-1.5">
                    <div className="flex items-center justify-between text-slate-300 mb-1">
                      <span className="font-semibold text-[11px] flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                        Configure 3D Floors:
                      </span>
                      <span className="font-mono font-bold text-amber-400">{customFloors} Floors ({customHeight.toFixed(1)}m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={customFloors}
                        onChange={(e) => {
                          const f = parseInt(e.target.value, 10);
                          const floorH = selectedOsmBuilding?.buildingType?.toLowerCase().includes('institutional') || selectedOsmBuilding?.buildingType?.toLowerCase().includes('education') || selectedOsmBuilding?.buildingType?.toLowerCase().includes('college') ? 3.3 : (selectedOsmBuilding?.buildingType?.toLowerCase().includes('commercial') ? 3.4 : 3.1);
                          const h = Number((f * floorH).toFixed(1));
                          setCustomFloors(f);
                          setCustomHeight(h);
                          setSelectedOsmBuilding(prev => prev ? { ...prev, levels: f, heightM: h } : prev);
                        }}
                        className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer (shrink-0) */}
              <div className="pt-2.5 mt-2 border-t border-slate-800/80 space-y-2 shrink-0">
                {/* Transparency Notice */}
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[9.5px] text-slate-400 font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>Height Provenance:</span>
                    <span className="text-amber-300">
                      {(selectedOsmBuilding.osmTags?.height || (selectedOsmBuilding as any)?.tags?.height) ? 'OSM Tag (Volunteer)' : `AI Heuristic (${customFloors}fl × 3.2m)`}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    * Heuristic estimate is volumetric approximation; not survey-grade. OSM provides public geometries, not legal title.
                  </p>
                </div>

                <button
                  onClick={handleCreate3DFromSelectedOsm}
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold rounded-xl text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Box className="w-4 h-4" />
                  <span>CREATE 3D CADASTRE</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  {onOpenPointCloud && (
                    <button
                      onClick={() => {
                        // Ensure 3D building is created or ready
                        handleCreate3DFromSelectedOsm();
                        onOpenPointCloud();
                      }}
                      className="py-1.5 px-2.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/50 text-purple-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Inspect dynamic 3D LiDAR point cloud returns for this OSM building"
                    >
                      <Box className="w-3.5 h-3.5 text-purple-400" />
                      <span>Inspect LiDAR</span>
                    </button>
                  )}

                  {onOpenGeometryVerification && (
                    <button
                      onClick={() => {
                        handleCreate3DFromSelectedOsm();
                        onOpenGeometryVerification();
                      }}
                      className="py-1.5 px-2.5 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Verify geometric bounds, footprint polygon & IoU reference"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verify 3D</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active 2D Strata Floor Overlay Banner (Requirement 9) */}
      {viewState.selectedFloorNumber !== null && (
        <div className="absolute top-20 right-4 z-20 bg-slate-900/95 backdrop-blur-xl border border-sky-500/60 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">2D Map Strata Overlay</span>
              <strong className="text-white font-mono text-sm">
                {viewState.selectedFloorNumber < 0 
                  ? `Basement B${Math.abs(viewState.selectedFloorNumber)}` 
                  : viewState.selectedFloorNumber === 0 
                  ? 'Ground Floor' 
                  : `Floor ${viewState.selectedFloorNumber}`}
              </strong>
            </div>
          </div>
          {onSelectFloor && (
            <button
              onClick={() => onSelectFloor(null)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Exit Strata
            </button>
          )}
        </div>
      )}

      {/* Bottom Center Combined Status, Coordinates & Interaction Hint Badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-15 pointer-events-none hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-full border border-slate-800 text-[10px] font-mono text-slate-300 shadow-2xl">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Crosshair className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Lat: {cursorCoords ? cursorCoords.lat.toFixed(6) : currentCenter.lat.toFixed(6)}° N • Lng: {cursorCoords ? cursorCoords.lng.toFixed(6) : currentCenter.lng.toFixed(6)}° E</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-400 font-semibold">EPSG:4326</span>
        <span className="text-slate-600 hidden md:inline">|</span>
        <span className="text-amber-300/90 font-sans text-[10px] hidden md:flex items-center gap-1">
          <MousePointerClick className="w-3 h-3 text-amber-400 animate-pulse" />
          <span>Click any footprint to inspect</span>
        </span>
      </div>

      {/* Bottom Left Layer Controls & Diagnostics */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 max-w-xs sm:max-w-sm">
        
        {/* Layer Visibility Toggles */}
        <div className="bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 shadow-xl flex items-center justify-between gap-2 text-xs text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showOsmFootprints}
              onChange={(e) => setShowOsmFootprints(e.target.checked)}
              className="rounded bg-slate-800 border-slate-600 text-sky-500 focus:ring-0"
            />
            <span className="text-[11px] font-bold text-sky-400">OSM BUILDING FOOTPRINTS ({osmBuildings.length})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showParcels}
              onChange={(e) => setShowParcels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
            />
            <span className="text-[11px] font-medium text-emerald-400">Parcels ({parcels.length})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showUtilities}
              onChange={(e) => setShowUtilities(e.target.checked)}
              className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-0"
            />
            <span className="text-[11px] font-medium text-cyan-400">Sub-surface</span>
          </label>
        </div>

        {/* Integrated Data Provenance & Real Data Diagnostics Panel */}
        <div className="bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl overflow-hidden text-[10px]">
          <div 
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 cursor-pointer hover:bg-slate-850 transition-colors"
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>DATA FEED STATUS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                debugStatus.overpassStatus === 'SUCCESS' ? 'bg-emerald-400' :
                debugStatus.overpassStatus === 'LOADING' ? 'bg-sky-400 animate-ping' :
                'bg-rose-400'
              }`}></span>
              {isDebugOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </div>
          </div>

          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>Base Map:</span>
              <span className="font-semibold text-slate-200">OpenStreetMap (WGS84)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Vector Feed:</span>
              <span className="font-semibold text-sky-400">
                {debugStatus.isUsingFallback ? 'Verified GeoJSON Fallback' : 'OSM Overpass Live API'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Active Mode:</span>
              <span className={`font-semibold ${appMode === 'REAL_LOCATION' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {appMode === 'REAL_LOCATION' ? 'Real Location Mode' : 'Demo Mode (P001-P004)'}
              </span>
            </div>

            {/* Expanded Diagnostics */}
            {isDebugOpen && (
              <div className="pt-1.5 mt-1.5 border-t border-slate-800/80 space-y-1 font-mono text-[9px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Location Query:</span>
                  <span className="font-bold text-emerald-400">{debugStatus.locationSearchStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Search Coordinates:</span>
                  <span className="text-slate-200">
                    {debugStatus.searchCoordinates 
                      ? `${debugStatus.searchCoordinates.lat.toFixed(5)}, ${debugStatus.searchCoordinates.lng.toFixed(5)}`
                      : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Search Radius:</span>
                  <span className="text-sky-300 font-bold">{debugStatus.radiusM}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overpass Status:</span>
                  <span className={`font-bold ${
                    debugStatus.overpassStatus === 'SUCCESS' ? 'text-emerald-400' :
                    debugStatus.overpassStatus === 'LOADING' ? 'text-sky-400' :
                    debugStatus.overpassStatus === 'TIMEOUT' ? 'text-amber-400' :
                    debugStatus.overpassStatus === 'NO_BUILDINGS_IN_RADIUS' ? 'text-slate-400' :
                    'text-rose-400'
                  }`}>
                    {debugStatus.overpassStatus === 'SUCCESS' ? '✓ SUCCESS' : debugStatus.overpassStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Response Time:</span>
                  <span className="text-slate-200 font-bold">
                    {debugStatus.responseTimeMs > 0 ? `${(debugStatus.responseTimeMs / 1000).toFixed(2)}s` : '0s (Cached)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buildings In Radius:</span>
                  <span className="font-bold text-amber-300">{debugStatus.buildingsReturned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Candidate Buildings:</span>
                  <span className="font-bold text-blue-300">{debugStatus.candidateCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Building:</span>
                  <span className="text-white truncate max-w-[130px] font-bold">
                    {debugStatus.selectedBuildingId ? `#${debugStatus.selectedBuildingId}` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Selection Method:</span>
                  <span className="text-emerald-400 font-bold">
                    {debugStatus.selectionMethod ? `[${debugStatus.selectionMethod}]` : 'None'}
                  </span>
                </div>
                {debugStatus.lastError && (
                  <div className="text-rose-300 pt-1">
                    <span className="font-bold text-rose-400">Error: </span>
                    <span>{debugStatus.lastError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Right Parcel Inspector Pill (Hidden when OSM building is selected to prevent blocking view; Dismissable) */}
      {!selectedOsmBuilding && selectedParcel && !isParcelPillDismissed && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-blue-500/50 shadow-2xl text-left max-w-xs">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                {selectedParcel.id} • {selectedParcel.surveyNumber}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 font-mono rounded">
                  {selectedParcel.areaSqm} m²
                </span>
                <button
                  onClick={() => setIsParcelPillDismissed(true)}
                  className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Dismiss parcel preview"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] font-mono text-slate-300 truncate">
              ULPIN: {selectedParcel.ulpin2D}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onSwitchTo3D}
                className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg text-center transition-colors shadow-sm cursor-pointer"
              >
                Inspect 3D Strata Units →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
