/**
 * 3D ULPIN & Vertical Cadastral Mapping System - Data Models
 * Problem Statement: SIH26011 (Ministry of Rural Development)
 * 
 * Standardized schema adhering to ISO 19152 (LADM) 3D Spatial Unit concepts.
 */

export type PropertyUnitType = 
  | 'Residential Apartment' 
  | 'Penthouse (Terrace Rights)' 
  | 'Commercial Office' 
  | 'Retail Store' 
  | 'Basement Parking Slot' 
  | 'Basement Utility / HVAC' 
  | 'Common Facilities / Lobby' 
  | 'Sub-Surface Infrastructure';

export type UndergroundUtilityType = 
  | 'Underground Parking'
  | 'Water Pipeline'
  | 'Sewage Pipeline'
  | 'Electrical Cable'
  | 'Fiber Optic Cable'
  | 'Utility Tunnel';

export interface UndergroundAsset {
  id: string;
  type: UndergroundUtilityType;
  name: string;
  depthM: number;               // Negative number in meters (e.g. -8.0)
  diameterM: number;            // e.g. 1.2m
  lengthM?: number;
  owner: string;                // e.g. "BWSSB (Bangalore Water Supply)"
  prototypeUlpin3D: string;     // e.g. 'IN-KA-BLR-P001-B001-UG-WP01'
  parcelId: string;
  buildingId?: string;
  coordinates: SpatialCoordinates2D[]; // Path or footprint coordinates
  hasTopologyCollision: boolean;
  collisionReason?: string;
  status: 'Operational' | 'Conflict / Encroachment' | 'Planned / Surveyed';
  notes?: string;
}

export interface UndergroundVisibilityFilter {
  showSurfaceBuilding: boolean;
  showGroundLayer: boolean;
  showUndergroundParking: boolean;
  showWaterPipeline: boolean;
  showSewagePipeline: boolean;
  showElectricalCable: boolean;
  showFiberOptic: boolean;
  showUtilityTunnel: boolean;
}

export interface CoordinateReference {
  latitude: number;
  longitude: number;
  elevationMsl: number;
  crs: string;                  // 'WGS84 / EPSG:4326'
  gnssSource: string;           // 'Multi-frequency GNSS (GPS L1/L5 + NavIC L5 + Galileo E1/E5)'
  corsStation: string;          // 'Survey of India CORS Network (Station: BLR-URB-01)'
  horizontalAccuracyM: number;  // ±0.5m
  verticalAccuracyM: number;    // ±0.8m
}

export interface DemElevationData {
  groundElevationMsl: number;   // 920.0m
  buildingBaseMsl: number;      // 920.0m
  buildingTopMsl: number;       // 956.0m
  verticalPropertyRangeMsl: {
    min: number;
    max: number;
    label: string;
  };
  dsmResolution: string;
  terrainProfile: {
    distanceM: number;
    elevationM: number;
    label: string;
  }[];
}

export type LidarClassification = 'BUILDING' | 'GROUND' | 'SUBSURFACE' | 'VEGETATION' | 'OTHER';

export interface LidarPoint {
  x: number;          // relative meters from local centroid
  y: number;          // relative meters from local centroid
  z: number;          // meters relative to ground surface datum (0.0m)
  classification: LidarClassification;
  intensity: number;  // 0-255 laser reflection intensity
  returnNumber?: number;
}

export type LidarDensityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PointCloudData {
  isRealData: boolean; // false for synthetic demo, true for ingested LAS/LAZ
  sourceName: string;  // e.g. "Synthetic demonstration generated from 3D cadastral geometry"
  buildingId?: string;
  buildingName?: string;
  parcelId?: string;
  totalPoints: number;
  buildingPoints: number;
  groundPoints: number;
  subsurfacePoints: number;
  vegetationPoints: number;
  derivedResults: {
    minZ: number;
    maxZ: number;
    buildingHeightM: number;
    roofGeometry: string;
    floorEstimatesCount: number;
    groundElevationM: number;
    averageIntensity: number;
    pointDensityPerSqm: number;
  };
  points: LidarPoint[];
}

export interface AIExtractionResult {
  buildingDetected: boolean;
  confidenceScore: number;       // 94%
  footprintAreaSqm: number;      // 850
  estimatedHeightM: number;      // 36
  estimatedFloors: number;       // 12
  boundaryPolygon: SpatialCoordinates2D[];
  imageUrl?: string;
  processedAt: string;
}

export interface AIFloorSegmentationResult {
  buildingHeightM: number;       // 36m
  detectedFloorsCount: number;   // 12
  averageFloorHeightM: number;   // 3.0m
  confidenceScore: number;       // 91%
  floors: {
    floorNumber: number;
    floorName: string;
    elevationBottom: number;
    elevationTop: number;
    height: number;
    suggestedUnitsCount: number;
  }[];
}

export interface DataProvenanceRecord {
  id: string;
  category: string;
  name: string;
  source: string;
  confidence: number;
  status: 'Validated' | 'Authoritative' | 'Calibrated' | 'Registered' | 'Prototype Specimen';
  description: string;
}

export type LegalCadastralStatus = 
  | 'Registered (3D Title)' 
  | 'Under 3D Verification' 
  | 'Boundary Dispute / Overhang' 
  | 'Multi-Owner Strata' 
  | 'Encumbered / Mortgaged';

export interface SpatialCoordinates2D {
  lng: number;
  lat: number;
}

export interface BoundingBox3D {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  minElevation: number; // meters relative to ground
  maxElevation: number; // meters relative to ground
}

export type DataSourceProvenance = 
  | 'Synthetic Demonstration Dataset'
  | 'User Imported GeoJSON'
  | 'Future Government Cadastral Dataset'
  | 'Future Drone/LiDAR Survey';

export type DataConfidence = 
  | 'Demonstration Specimen'
  | 'User-Provided & Validated'
  | 'Authoritative Registry';

export type ViewPerspective = '2D' | '3D';

export type SubsurfaceViewFilter = 'BOTH' | 'SURFACE' | 'UNDERGROUND';

export interface PropertyUnit {
  id: string;                      // Internal unique ID (e.g., 'u_p001_b001_f5_101')
  prototypeUlpin3D: string;        // Proposed Prototype 3D Property Identifier (e.g., 'IN-KA-BLR-P001-B01-F05-U501')
  parcelId: string;                // Parent 2D Parcel ID
  buildingId: string;              // Parent Building ID
  floorNumber: number;             // Floor index (-2, -1, 0, 1, 2, ... 10)
  unitNumber: string;              // Unit label (e.g., 'Flat 501', 'Office 302', 'B2-P12')
  unitType: PropertyUnitType;
  ownerName: string;               // Synthetic demo title holder
  builtUpAreaSqm: number;          // Total built-up area in m²
  carpetAreaSqm: number;           // Usable carpet area in m²
  volumeCubicM: number;            // 3D Volumetric capacity in m³
  minElevation: number;            // Lower Z boundary (m above ground datum)
  maxElevation: number;            // Upper Z boundary (m above ground datum)
  polygon: SpatialCoordinates2D[]; // Horizontal footprint slice of this specific unit
  legalStatus: LegalCadastralStatus;
  hasTopologyCollision: boolean;   // Flags if volume intersects another unit or breaches parcel boundary
  collisionReason?: string;        // Detailed explanation of conflict for GIS audit
  annualPropertyTaxInr: number;
  electricityMeterId: string;
  waterConsumerNo: string;
  dataSource?: DataSourceProvenance;
  dataConfidence?: DataConfidence;
  notes?: string;
}

export interface FloorLevel {
  floorNumber: number;             // -2 for B2, -1 for B1, 0 for Ground, 1 for 1st Floor, etc.
  floorName: string;               // 'Basement 2', 'Ground Level', 'Floor 5'
  elevationBottom: number;         // Bottom elevation relative to ground (m)
  elevationTop: number;            // Top elevation relative to ground (m)
  height: number;                  // Height of floor in meters (e.g., 3.2m)
  isBasement: boolean;
  units: PropertyUnit[];
  totalBuiltAreaSqm: number;
  prototypeUlpin3D?: string;       // Proposed Floor-Level 3D ULPIN (e.g., 'IN-KA-BLR-P001-B001-F05')
  footprintCoords?: SpatialCoordinates2D[]; // Floor-level footprint polygon (inherits building footprint by default)
  geometry?: SpatialCoordinates2D[];        // Authoritative geometry alias: floor.geometry ?? building.geometry
  source?: string;                         // e.g., 'AI Estimated' | 'OSM Survey' | 'User Configured'
}

export type HeightSourceType = 
  | 'OSM_TAG' 
  | 'ESTIMATED_AI_RULE' 
  | 'LIDAR_MEASURED' 
  | 'USER_CONFIGURED'
  | 'DRONE_DERIVED'
  | 'MUNICIPAL_REFERENCE'
  | 'NOT_AVAILABLE';

export type GeometrySourceType = 'REAL_OSM' | 'CACHE' | 'USER_GEOJSON' | 'LIDAR' | 'SYNTHETIC_DEMO' | 'OSM' | 'GEOJSON' | 'DRONE' | 'SYNTHETIC';

export type AcquisitionStatus = 
  | 'idle' 
  | 'searching_location' 
  | 'querying_osm' 
  | 'polygon_found' 
  | 'no_polygon' 
  | 'timeout' 
  | 'error';

export type AcquisitionSource = 
  | 'REAL_OSM' 
  | 'CACHE' 
  | 'USER_GEOJSON' 
  | 'LIDAR' 
  | 'SYNTHETIC_DEMO' 
  | null;

export interface CandidateBuilding {
  id: string | number;
  name: string;
  distanceM: number;
  areaSqm: number;
  footprintCoords: SpatialCoordinates2D[];
  matchMethod: string;
  confidence: 'High' | 'Medium' | 'Low';
  isContained?: boolean;
  building?: any;
}

export interface BuildingAcquisitionState {
  status: AcquisitionStatus;
  source: AcquisitionSource;
  selectedBuilding: Building | null;
  selectedOsmBuilding?: any | null;
  candidates: CandidateBuilding[];
  requestId?: string;
  responseTime?: number;
  responseTimeMs?: number;
  error?: string;
  cachedTimestamp?: number;
  locationName?: string;
  locationCoords?: SpatialCoordinates2D | null;
  searchRadiusM?: number;
  osmFootprintsCount?: number;
  selectionMethod?: string | null;
  endpointUsed?: string;
  isSoftTimeout?: boolean;
  osmTimeoutOccurred?: boolean;
  isUsingFallback?: boolean;
  aiAnalysis?: any;
  fallbackType?: string;
  badge?: string;
  resolutionAudit?: ResolutionPipelineAudit;
}

export type ResolutionDecisionBranch = 
  | 'OSM_LEVELS_DIRECT'        // Does OSM contain building:levels? -> YES -> Use it
  | 'OSM_HEIGHT_DERIVED'       // Does OSM contain height? -> YES -> Estimate floors = height / average floor height
  | 'AI_SATELLITE_ESTIMATION'; // Neither -> Use AI/image-based estimation if aerial/satellite imagery is available

export interface FlowchartStepRecord {
  stepIndex: number;
  title: string;
  status: 'PASSED' | 'BRANCHED' | 'SKIPPED' | 'ACTIVE';
  detail: string;
}

export interface ResolutionPipelineAudit {
  branch: ResolutionDecisionBranch;
  branchName: string;
  hasOsmLevels: boolean;
  rawOsmLevels?: number;
  hasOsmHeight: boolean;
  rawOsmHeightM?: number;
  averageFloorHeightM: number;
  satelliteImageryAvailable: boolean;
  satelliteImagerySource?: string;
  confidenceScore: number;
  confidenceRating: 'High' | 'Medium' | 'Low';
  decisionSummary: string;
  rationale: string;
  floors: number;
  totalHeightM: number;
  floorHeightM: number;
  structureType: string;
  roofCharacteristics: string;
  flowchartSteps: FlowchartStepRecord[];
}

export type GeometryMatchMethod = 
  | 'POINT_CONTAINS' 
  | 'NEAREST' 
  | 'NAME_MATCH' 
  | 'USER_IMPORTED' 
  | 'LIDAR_DERIVED'
  | 'CACHED_RECORD'
  | 'EXACT_POLYGON'
  | 'MANUAL_MAP_SELECTION';

export type GeometryConfidenceLevel = 
  | 'High' 
  | 'Medium' 
  | 'Low' 
  | 'User supplied' 
  | 'Computed from point cloud';

export interface BuildingGeometry {
  id: string;
  name: string;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: [number, number][][];
  };
  footprintCoords: SpatialCoordinates2D[];
  source: GeometrySourceType;
  sourceId?: string | number;
  sourceLabel?: string;
  matchMethod: GeometryMatchMethod;
  confidence: GeometryConfidenceLevel;
  confidenceScore?: number;
  footprintArea: number; // m²
  centroid: SpatialCoordinates2D;
  height: number | null; // null if not available
  heightSource: HeightSourceType;
  heightAccuracyNote?: string;
  levels?: number;
  isHeightEstimated?: boolean;
  isLevelsEstimated?: boolean;
  rawOsm?: any;
}

export interface BuildingCrsInfo {
  osmCrs: string;       // 'WGS84 (EPSG:4326)'
  cadastralCrs: string; // 'Local ENU / UTM Zone 43N (EPSG:32643)'
  lidarCrs: string;     // 'Local Metric Cartesian Datum (Z rel. to ground MSL)'
  transformationNote: string;
}

export interface Building {
  id: string;                      // e.g., 'B001'
  parcelId: string;                // e.g., 'P001'
  name: string;                    // Building / Tower name
  structureType: 'Residential High-Rise' | 'Commercial Complex' | 'Mixed-Use Tower' | 'Institutional' | 'Sub-Surface Facility';
  footprintCoords: SpatialCoordinates2D[]; // 2D polygon of building ground footprint
  geometry?: SpatialCoordinates2D[];        // Authoritative geometry alias
  baseGroundElevationMsl: number;  // Mean Sea Level elevation of parcel ground (e.g., 920m Bangalore)
  totalHeightM: number;            // Height above ground
  floorCountAboveGround: number;   // e.g., 10
  basementCount: number;           // e.g., 2
  totalUnitsCount: number;
  floors: FloorLevel[];
  hasBoundaryOverhang: boolean;    // Upper floors cantilever past 2D ground parcel boundary
  overhangDetails?: string;
  approvalYear: number;
  reraRegNo: string;
  dataSource?: DataSourceProvenance;
  dataConfidence?: DataConfidence;

  // Real OSM & Provenance Metadata
  source?: 'OSM' | 'GeoJSON' | 'Cache' | 'Demo';
  sourceId?: string | number;
  osmId?: number | string;
  osmType?: 'way' | 'relation';
  osmTags?: Record<string, string>;
  heightSource?: HeightSourceType;
  floorSource?: 'AI_Estimated' | 'UserConfigured' | 'OSM';
  heightAccuracyNote?: string;
  osmHeightTagM?: number;
  estimatedHeightM?: number;
  crsInfo?: BuildingCrsInfo;
  rawOsmBuilding?: any;
  buildingGeometry?: BuildingGeometry;
  geometrySource?: GeometrySourceType;
  matchMethod?: GeometryMatchMethod;
  confidenceLevel?: GeometryConfidenceLevel;
  confidence?: number;
  isSynthetic?: boolean;
  aiAnalysis?: any;
  roofCharacteristics?: string;
  cachedTimestamp?: number;
  resolutionAudit?: ResolutionPipelineAudit;
}

export interface CadastralParcel {
  id: string;                      // e.g., 'P001'
  ulpin2D: string;                 // Official 2D Bhu-Aadhaar / 14-digit ULPIN
  state: string;
  district: string;
  subDistrict: string;
  villageWard: string;
  surveyNumber: string;
  centroid: SpatialCoordinates2D;
  areaSqm: number;
  boundaryPolygon: SpatialCoordinates2D[]; // 2D boundary of the land parcel
  landUseCategory: 'Urban Residential' | 'Commercial Prime' | 'Mixed-Use Urban' | 'Public Infrastructure';
  totalBuildingsCount: number;
  buildings: Building[];
  undergroundAssets?: UndergroundAsset[];
  groundElevationMsl: number;      // Ground datum in meters MSL
  ownerType: 'Private Freehold' | 'Joint Cooperative Housing Society' | 'Municipal / Commercial Leasehold';
  dataSource?: DataSourceProvenance;
  dataConfidence?: DataConfidence;
  isRealLocationOsm?: boolean;
  osmId?: number | string;
}

export interface TopologyIssue {
  id: string;
  type: 'UNIT_OVERLAP' | 'PARCEL_OVERHANG' | 'ELEVATION_GAP' | 'INVALID_Z_RANGE' | 'UTILITY_INTERSECTION' | 'DUPLICATE_ULPIN';
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  conflictTypeLabel: string; // e.g. "Unauthorized Cantilever Overhang Encroachment", "3D Volumetric Property Overlap", "Sub-Surface Utility Collision"
  message: string;
  parcelId: string;
  buildingId?: string;
  floorNumber?: number;
  affectedUnitIds: string[];
  affectedParcelBoundary?: string; // e.g. "Eastern boundary of Parcel P003 (Sy. No. 44/4)"
  encroachmentDistanceM?: number; // e.g. 4.0 meters
  encroachmentAreaSqm?: number; // e.g. 56.0 m²
  overlappingVolumeM3?: number; // e.g. 18.2 m³ or 12.5 m³
  suggestedAction: string; // "Requires cadastral review"
  recommendedAction: string;
  detectedAt: string;
}

export interface ValidationReport {
  timestamp: string;
  totalParcelsChecked: number;
  totalBuildingsChecked: number;
  totalUnitsChecked: number;
  totalFloorsChecked: number;
  validUnitsCount: number;
  issuesCount: number;
  criticalCount: number;
  warningCount: number;
  issues: TopologyIssue[];
  status: 'PASSED' | 'FAILED_WITH_WARNINGS';
  checksSummary: {
    parcelBoundaryValid: boolean;
    buildingVolumeValid: boolean;
    floorBoundariesValid: boolean;
    spatialConflictDetected: boolean;
  };
}

export type VisualColorMode = 'by-floor' | 'by-use' | 'by-status' | 'by-conflict' | 'monochrome';

export interface MapViewState {
  viewPerspective: ViewPerspective; // '2D' or '3D'
  selectedParcelId: string | null;
  selectedBuildingId: string | null;
  selectedFloorNumber: number | null;
  selectedUnitId: string | null;
  selectedUndergroundAssetId: string | null;
  isExplodedView: boolean;
  explosionFactor: number;         // 0.0 (compact) to 3.0 (fully exploded)
  subsurfaceMode: SubsurfaceViewFilter; // 'BOTH' | 'SURFACE' | 'UNDERGROUND'
  showBasements: boolean;
  showParcels: boolean;
  showBuildingEnvelopes: boolean;
  showPropertyUnits: boolean;
  showWireframe: boolean;
  showConflictAlertsOnly: boolean;
  // Strata unit type layer filters
  filterResidential: boolean;
  filterCommercial: boolean;
  filterCommonFacilities: boolean;
  filterUndergroundInfra: boolean;
  // Specific underground infrastructure layer toggles
  undergroundFilter: UndergroundVisibilityFilter;
  colorMode: VisualColorMode;
  searchQuery: string;
}
