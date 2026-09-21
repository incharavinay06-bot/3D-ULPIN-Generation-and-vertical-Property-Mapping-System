/**
 * Synthetic Urban Cadastral Dataset for 3D ULPIN / Bhu-Aadhaar Prototype
 * Location Anchor: Bangalore Urban Cadastral Division (Ward 150 / Electronic City Corridor)
 * Reference Datum: WGS84 (EPSG:4326), Heights in meters relative to MSL (~920m datum)
 */

import { CadastralParcel, Building, FloorLevel, PropertyUnit, SpatialCoordinates2D, UndergroundAsset } from '../types/cadastre';
import { generatePrototype3DUlpin, generateFloorUlpin3D, calculateVolumeCubicM } from '../utils/ulpinGenerator';

// Center reference coordinate: Bangalore Tech Hub (Lat: 12.9716, Lng: 77.5946)
const REF_LAT = 12.9716;
const REF_LNG = 77.5946;

// Helper to generate offset coordinates in meters
function offsetCoord(baseLng: number, baseLat: number, dxM: number, dyM: number): SpatialCoordinates2D {
  const latFactor = 1 / 110574;
  const lngFactor = 1 / (111320 * Math.cos((baseLat * Math.PI) / 180));
  return {
    lng: Number((baseLng + dxM * lngFactor).toFixed(7)),
    lat: Number((baseLat + dyM * latFactor).toFixed(7)),
  };
}

// --------------------------------------------------------------------------
// PARCEL 1: Surya Heights Residential Towers (10 Floors + 2 Basements)
// --------------------------------------------------------------------------
const p1Origin = { lng: REF_LNG, lat: REF_LAT };
const p1Boundary: SpatialCoordinates2D[] = [
  offsetCoord(p1Origin.lng, p1Origin.lat, -30, -30),
  offsetCoord(p1Origin.lng, p1Origin.lat, 30, -30),
  offsetCoord(p1Origin.lng, p1Origin.lat, 30, 30),
  offsetCoord(p1Origin.lng, p1Origin.lat, -30, 30),
];

const p1BldgFootprint: SpatialCoordinates2D[] = [
  offsetCoord(p1Origin.lng, p1Origin.lat, -18, -18),
  offsetCoord(p1Origin.lng, p1Origin.lat, 18, -18),
  offsetCoord(p1Origin.lng, p1Origin.lat, 18, 18),
  offsetCoord(p1Origin.lng, p1Origin.lat, -18, 18),
];

// Generate floors for Building 1 (Basement 2, Basement 1, Ground, Floors 1-10)
function generateP1Floors(): FloorLevel[] {
  const floors: FloorLevel[] = [];
  const floorHeight = 3.2;

  // Basement 2 (-6.4m to -3.2m)
  const b2Units: PropertyUnit[] = [
    {
      id: 'u_p001_b001_fb2_01',
      prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', -2, 'P01'),
      parcelId: 'P001',
      buildingId: 'B001',
      floorNumber: -2,
      unitNumber: 'Basement Parking Zone A',
      unitType: 'Basement Parking Slot',
      ownerName: 'Surya Heights Residents Welfare Association',
      builtUpAreaSqm: 540,
      carpetAreaSqm: 500,
      volumeCubicM: calculateVolumeCubicM(540, -6.4, -3.2),
      minElevation: -6.4,
      maxElevation: -3.2,
      polygon: [
        offsetCoord(p1Origin.lng, p1Origin.lat, -18, -18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 0, -18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 0, 18),
        offsetCoord(p1Origin.lng, p1Origin.lat, -18, 18),
      ],
      legalStatus: 'Registered (3D Title)',
      hasTopologyCollision: false,
      annualPropertyTaxInr: 12500,
      electricityMeterId: 'BESCOM-BLR-B2-01',
      waterConsumerNo: 'BWSSB-B2-01',
      notes: 'Contains 24 designated EV charging parking bays',
    },
    {
      id: 'u_p001_b001_fb2_02',
      prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', -2, 'HVAC'),
      parcelId: 'P001',
      buildingId: 'B001',
      floorNumber: -2,
      unitNumber: 'Central HVAC & Water Treatment Plant',
      unitType: 'Basement Utility / HVAC',
      ownerName: 'Surya Heights Infrastructure Trustee',
      builtUpAreaSqm: 540,
      carpetAreaSqm: 490,
      volumeCubicM: calculateVolumeCubicM(540, -6.4, -3.2),
      minElevation: -6.4,
      maxElevation: -3.2,
      polygon: [
        offsetCoord(p1Origin.lng, p1Origin.lat, 0, -18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 18, -18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 18, 18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 0, 18),
      ],
      legalStatus: 'Registered (3D Title)',
      hasTopologyCollision: false,
      annualPropertyTaxInr: 9400,
      electricityMeterId: 'BESCOM-BLR-B2-02',
      waterConsumerNo: 'BWSSB-B2-02',
      notes: 'Sub-surface utility room with backup diesel generators and pump house',
    },
  ];

  floors.push({
    floorNumber: -2,
    floorName: 'Basement B2',
    elevationBottom: -6.4,
    elevationTop: -3.2,
    height: 3.2,
    isBasement: true,
    units: b2Units,
    totalBuiltAreaSqm: 1080,
  });

  // Basement 1 (-3.2m to 0.0m)
  const b1Units: PropertyUnit[] = [
    {
      id: 'u_p001_b001_fb1_01',
      prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', -1, 'P02'),
      parcelId: 'P001',
      buildingId: 'B001',
      floorNumber: -1,
      unitNumber: 'Basement Parking Zone B',
      unitType: 'Basement Parking Slot',
      ownerName: 'Surya Heights Residents Welfare Association',
      builtUpAreaSqm: 1080,
      carpetAreaSqm: 1000,
      volumeCubicM: calculateVolumeCubicM(1080, -3.2, 0.0),
      minElevation: -3.2,
      maxElevation: 0.0,
      polygon: p1BldgFootprint,
      legalStatus: 'Registered (3D Title)',
      hasTopologyCollision: false,
      annualPropertyTaxInr: 18000,
      electricityMeterId: 'BESCOM-BLR-B1-01',
      waterConsumerNo: 'BWSSB-B1-01',
      notes: 'Upper basement level with 40 reserved vehicle bays',
    },
  ];

  floors.push({
    floorNumber: -1,
    floorName: 'Basement B1',
    elevationBottom: -3.2,
    elevationTop: 0.0,
    height: 3.2,
    isBasement: true,
    units: b1Units,
    totalBuiltAreaSqm: 1080,
  });

  // Ground Floor (0.0m to 3.6m)
  const g0Units: PropertyUnit[] = [
    {
      id: 'u_p001_b001_fg0_01',
      prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', 0, 'LOBBY'),
      parcelId: 'P001',
      buildingId: 'B001',
      floorNumber: 0,
      unitNumber: 'Grand Entrance Lobby & Clubhouse',
      unitType: 'Common Facilities / Lobby',
      ownerName: 'Common Property (Society Held)',
      builtUpAreaSqm: 680,
      carpetAreaSqm: 620,
      volumeCubicM: calculateVolumeCubicM(680, 0.0, 3.6),
      minElevation: 0.0,
      maxElevation: 3.6,
      polygon: [
        offsetCoord(p1Origin.lng, p1Origin.lat, -18, -18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 18, -18),
        offsetCoord(p1Origin.lng, p1Origin.lat, 18, 0),
        offsetCoord(p1Origin.lng, p1Origin.lat, -18, 0),
      ],
      legalStatus: 'Registered (3D Title)',
      hasTopologyCollision: false,
      annualPropertyTaxInr: 22000,
      electricityMeterId: 'BESCOM-BLR-G0-01',
      waterConsumerNo: 'BWSSB-G0-01',
      notes: 'Double height reception, security control room and library',
    },
    {
      id: 'u_p001_b001_fg0_02',
      prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', 0, 'COMM'),
      parcelId: 'P001',
      buildingId: 'B001',
      floorNumber: 0,
      unitNumber: 'Society Management Office & Creche',
      unitType: 'Common Facilities / Lobby',
      ownerName: 'Common Property (Society Held)',
      builtUpAreaSqm: 400,
      carpetAreaSqm: 360,
      volumeCubicM: calculateVolumeCubicM(400, 0.0, 3.6),
      minElevation: 0.0,
      maxElevation: 3.6,
      polygon: [
        offsetCoord(p1Origin.lng, p1Origin.lat, -18, 0),
        offsetCoord(p1Origin.lng, p1Origin.lat, 18, 0),
        offsetCoord(p1Origin.lng, p1Origin.lat, 18, 18),
        offsetCoord(p1Origin.lng, p1Origin.lat, -18, 18),
      ],
      legalStatus: 'Registered (3D Title)',
      hasTopologyCollision: false,
      annualPropertyTaxInr: 15000,
      electricityMeterId: 'BESCOM-BLR-G0-02',
      waterConsumerNo: 'BWSSB-G0-02',
      notes: 'Estate administrative office',
    },
  ];

  floors.push({
    floorNumber: 0,
    floorName: 'Ground Floor (G)',
    elevationBottom: 0.0,
    elevationTop: 3.6,
    height: 3.6,
    isBasement: false,
    units: g0Units,
    totalBuiltAreaSqm: 1080,
  });

  // Floors 1 to 10 (Residential 4 flats per floor)
  const names = [
    'Rajesh Verma', 'Ananya Iyer', 'Karthik Hegde', 'Meera Nair',
    'Deepak Sengupta', 'Pooja Bhattacharya', 'Vikramaditya Rao', 'Sunita Deshmukh',
    'Siddharth Menon', 'Lakshmi Narayanan', 'Rohan Kulkarni', 'Aditi Sharma',
    'Manish Agarwal', 'Divya Sundaram', 'Harish Patel', 'Sneha Mukhopadhyay',
    'Arjun Prasad', 'Kavita Chawla', 'Gaurav Singhal', 'Preeti Reddy',
  ];

  for (let f = 1; f <= 10; f++) {
    const bottomZ = 3.6 + (f - 1) * floorHeight;
    const topZ = bottomZ + floorHeight;

    const u1Name = names[(f * 4 - 4) % names.length];
    const u2Name = names[(f * 4 - 3) % names.length];
    const u3Name = names[(f * 4 - 2) % names.length];
    const u4Name = names[(f * 4 - 1) % names.length];

    const isPenthouseFloor = f === 10;

    const fUnits: PropertyUnit[] = [
      // Flat 01: North-West quadrant
      {
        id: `u_p001_b001_f${f}_01`,
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', f, `${f}01`),
        parcelId: 'P001',
        buildingId: 'B001',
        floorNumber: f,
        unitNumber: isPenthouseFloor ? `Sky Penthouse ${f}01` : `Flat ${f}01 (3BHK)`,
        unitType: isPenthouseFloor ? 'Penthouse (Terrace Rights)' : 'Residential Apartment',
        ownerName: u1Name,
        builtUpAreaSqm: 260,
        carpetAreaSqm: 235,
        volumeCubicM: calculateVolumeCubicM(260, bottomZ, topZ),
        minElevation: bottomZ,
        maxElevation: topZ,
        polygon: [
          offsetCoord(p1Origin.lng, p1Origin.lat, -18, 0),
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, 0),
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, 18),
          offsetCoord(p1Origin.lng, p1Origin.lat, -18, 18),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 28500 + f * 500,
        electricityMeterId: `BESCOM-BLR-F${f}-01`,
        waterConsumerNo: `BWSSB-F${f}-01`,
        notes: `3BHK Luxury Residence with West Balcony. Floor level +${f}`,
      },
      // Flat 02: North-East quadrant
      {
        id: `u_p001_b001_f${f}_02`,
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', f, `${f}02`),
        parcelId: 'P001',
        buildingId: 'B001',
        floorNumber: f,
        unitNumber: `Flat ${f}02 (3BHK)`,
        unitType: 'Residential Apartment',
        ownerName: u2Name,
        builtUpAreaSqm: 260,
        carpetAreaSqm: 235,
        volumeCubicM: calculateVolumeCubicM(260, bottomZ, topZ),
        minElevation: bottomZ,
        maxElevation: topZ,
        polygon: [
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, 0),
          offsetCoord(p1Origin.lng, p1Origin.lat, 18, 0),
          offsetCoord(p1Origin.lng, p1Origin.lat, 18, 18),
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, 18),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 28500 + f * 500,
        electricityMeterId: `BESCOM-BLR-F${f}-02`,
        waterConsumerNo: `BWSSB-F${f}-02`,
        notes: `3BHK Luxury Residence with East Balcony. Floor level +${f}`,
      },
      // Flat 03: South-East quadrant
      {
        id: `u_p001_b001_f${f}_03`,
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', f, `${f}03`),
        parcelId: 'P001',
        buildingId: 'B001',
        floorNumber: f,
        unitNumber: `Flat ${f}03 (2BHK)`,
        unitType: 'Residential Apartment',
        ownerName: u3Name,
        builtUpAreaSqm: 240,
        carpetAreaSqm: 215,
        volumeCubicM: calculateVolumeCubicM(240, bottomZ, topZ),
        minElevation: bottomZ,
        maxElevation: topZ,
        polygon: [
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, -18),
          offsetCoord(p1Origin.lng, p1Origin.lat, 18, -18),
          offsetCoord(p1Origin.lng, p1Origin.lat, 18, 0),
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, 0),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 24500 + f * 500,
        electricityMeterId: `BESCOM-BLR-F${f}-03`,
        waterConsumerNo: `BWSSB-F${f}-03`,
        notes: `2BHK Premium Lake-View Residence. Floor level +${f}`,
      },
      // Flat 04: South-West quadrant
      {
        id: `u_p001_b001_f${f}_04`,
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P001', 'B001', f, `${f}04`),
        parcelId: 'P001',
        buildingId: 'B001',
        floorNumber: f,
        unitNumber: `Flat ${f}04 (2BHK)`,
        unitType: 'Residential Apartment',
        ownerName: u4Name,
        builtUpAreaSqm: 240,
        carpetAreaSqm: 215,
        volumeCubicM: calculateVolumeCubicM(240, bottomZ, topZ),
        minElevation: bottomZ,
        maxElevation: topZ,
        polygon: [
          offsetCoord(p1Origin.lng, p1Origin.lat, -18, -18),
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, -18),
          offsetCoord(p1Origin.lng, p1Origin.lat, 0, 0),
          offsetCoord(p1Origin.lng, p1Origin.lat, -18, 0),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 24500 + f * 500,
        electricityMeterId: `BESCOM-BLR-F${f}-04`,
        waterConsumerNo: `BWSSB-F${f}-04`,
        notes: `2BHK Premium City-View Residence. Floor level +${f}`,
      },
    ];

    floors.push({
      floorNumber: f,
      floorName: isPenthouseFloor ? `Floor ${f} (Penthouse & Terrace Level)` : `Floor ${f}`,
      elevationBottom: bottomZ,
      elevationTop: topZ,
      height: floorHeight,
      isBasement: false,
      units: fUnits,
      totalBuiltAreaSqm: 1000,
    });
  }

  return floors;
}

const p1Floors = generateP1Floors();
const p1TotalUnits = p1Floors.reduce((acc, fl) => acc + fl.units.length, 0);

const building1: Building = {
  id: 'B001',
  parcelId: 'P001',
  name: 'Surya Heights Tower A',
  structureType: 'Residential High-Rise',
  footprintCoords: p1BldgFootprint,
  baseGroundElevationMsl: 920.0,
  totalHeightM: 35.6,
  floorCountAboveGround: 10,
  basementCount: 2,
  totalUnitsCount: p1TotalUnits,
  floors: p1Floors,
  hasBoundaryOverhang: false,
  approvalYear: 2022,
  reraRegNo: 'PRM/KA/RERA/1251/310/PR/220501/004812',
  geometrySource: 'SYNTHETIC_DEMO',
  matchMethod: 'EXACT_POLYGON',
  confidenceLevel: 'Low',
};

const parcel1UndergroundAssets: UndergroundAsset[] = [
  {
    id: 'ug_p001_wp01',
    type: 'Water Pipeline',
    name: 'Municipal High-Pressure Potable Water Main (1200mm)',
    depthM: -8.0,
    diameterM: 1.2,
    lengthM: 65,
    owner: 'BWSSB (Bangalore Water Supply & Sewerage Board)',
    prototypeUlpin3D: 'IN-KA-BLR-P001-B001-UG-WP01',
    parcelId: 'P001',
    buildingId: 'B001',
    coordinates: [
      offsetCoord(p1Origin.lng, p1Origin.lat, -30, -10),
      offsetCoord(p1Origin.lng, p1Origin.lat, 30, -10),
    ],
    hasTopologyCollision: true,
    collisionReason: 'Water Pipeline intersects Parking P02 (Overlap volume: 12.5 m³ at -2.4m depth)',
    status: 'Conflict / Encroachment',
    notes: 'Primary 1200mm feeder pipeline across east-west utility corridor',
  },
  {
    id: 'ug_p001_p01',
    type: 'Underground Parking',
    name: 'Basement Parking Vault Level 2 (B2)',
    depthM: -6.4,
    diameterM: 6.0,
    owner: 'Surya Heights Residents Welfare Association',
    prototypeUlpin3D: 'IN-KA-BLR-P001-B001-UG-P01',
    parcelId: 'P001',
    buildingId: 'B001',
    coordinates: p1BldgFootprint,
    hasTopologyCollision: true,
    collisionReason: 'Parking P02 structural footing intersects municipal 1.2m water pipeline easement',
    status: 'Conflict / Encroachment',
    notes: '24 Dedicated EV charging slots and vehicle parking bays',
  },
  {
    id: 'ug_p001_sp01',
    type: 'Sewage Pipeline',
    name: 'Trunk Sewage Conduit (900mm)',
    depthM: -5.2,
    diameterM: 0.9,
    lengthM: 60,
    owner: 'BWSSB Drainage & Sanitation Division',
    prototypeUlpin3D: 'IN-KA-BLR-P001-B001-UG-SP01',
    parcelId: 'P001',
    coordinates: [
      offsetCoord(p1Origin.lng, p1Origin.lat, -30, 15),
      offsetCoord(p1Origin.lng, p1Origin.lat, 30, 15),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
  {
    id: 'ug_p001_ec01',
    type: 'Electrical Cable',
    name: '11kV High-Tension Underground Power Cable',
    depthM: -3.0,
    diameterM: 0.4,
    lengthM: 58,
    owner: 'BESCOM (Bangalore Electricity Supply Company)',
    prototypeUlpin3D: 'IN-KA-BLR-P001-B001-UG-EC01',
    parcelId: 'P001',
    coordinates: [
      offsetCoord(p1Origin.lng, p1Origin.lat, -15, -30),
      offsetCoord(p1Origin.lng, p1Origin.lat, -15, 30),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
  {
    id: 'ug_p001_fo01',
    type: 'Fiber Optic Cable',
    name: 'National Gigabit Optical Fiber Backbone (96 Core)',
    depthM: -1.8,
    diameterM: 0.2,
    lengthM: 62,
    owner: 'KPTCL / BSNL Telecom Authority',
    prototypeUlpin3D: 'IN-KA-BLR-P001-B001-UG-FO01',
    parcelId: 'P001',
    coordinates: [
      offsetCoord(p1Origin.lng, p1Origin.lat, 15, -30),
      offsetCoord(p1Origin.lng, p1Origin.lat, 15, 30),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
  {
    id: 'ug_p001_ut01',
    type: 'Utility Tunnel',
    name: 'Smart City Sub-Surface Multi-Utility Gallery',
    depthM: -7.5,
    diameterM: 2.2,
    lengthM: 60,
    owner: 'BBMP Urban Infrastructure Cell',
    prototypeUlpin3D: 'IN-KA-BLR-P001-B001-UG-UT01',
    parcelId: 'P001',
    coordinates: [
      offsetCoord(p1Origin.lng, p1Origin.lat, -25, -25),
      offsetCoord(p1Origin.lng, p1Origin.lat, 25, 25),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
];

const parcel1: CadastralParcel = {
  id: 'P001',
  ulpin2D: 'KA295720049812',
  state: 'Karnataka',
  district: 'Bengaluru Urban',
  subDistrict: 'Bengaluru South',
  villageWard: 'Ward 150 (Bellandur / Outer Ring Rd)',
  surveyNumber: 'Sy. No. 44/2',
  centroid: p1Origin,
  areaSqm: 3600,
  boundaryPolygon: p1Boundary,
  landUseCategory: 'Urban Residential',
  totalBuildingsCount: 1,
  buildings: [building1],
  undergroundAssets: parcel1UndergroundAssets,
  groundElevationMsl: 920.0,
  ownerType: 'Joint Cooperative Housing Society',
};

// --------------------------------------------------------------------------
// PARCEL 2: Nexus Commercial IT Plaza (6 Floors + 1 Basement)
// --------------------------------------------------------------------------
const p2Origin = offsetCoord(REF_LNG, REF_LAT, 90, 10);
const p2Boundary: SpatialCoordinates2D[] = [
  offsetCoord(p2Origin.lng, p2Origin.lat, -25, -25),
  offsetCoord(p2Origin.lng, p2Origin.lat, 25, -25),
  offsetCoord(p2Origin.lng, p2Origin.lat, 25, 25),
  offsetCoord(p2Origin.lng, p2Origin.lat, -25, 25),
];

const p2BldgFootprint: SpatialCoordinates2D[] = [
  offsetCoord(p2Origin.lng, p2Origin.lat, -18, -18), // SW outer corner
  offsetCoord(p2Origin.lng, p2Origin.lat, 18, -18),  // SE outer corner
  offsetCoord(p2Origin.lng, p2Origin.lat, 18, 2),    // East inner notch start
  offsetCoord(p2Origin.lng, p2Origin.lat, 0, 2),     // Inner reflex corner
  offsetCoord(p2Origin.lng, p2Origin.lat, 0, 18),    // North inner step
  offsetCoord(p2Origin.lng, p2Origin.lat, -18, 18),  // NW outer corner
];

function generateP2Floors(): FloorLevel[] {
  const floors: FloorLevel[] = [];

  // Basement 1
  floors.push({
    floorNumber: -1,
    floorName: 'Basement B1 (Commercial Parking & Server Vault)',
    elevationBottom: -4.0,
    elevationTop: 0.0,
    height: 4.0,
    isBasement: true,
    units: [
      {
        id: 'u_p002_b002_fb1_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P002', 'B002', -1, 'SRV01'),
        parcelId: 'P002',
        buildingId: 'B002',
        floorNumber: -1,
        unitNumber: 'Underground Data Center & Power Vault',
        unitType: 'Basement Utility / HVAC',
        ownerName: 'Nexus Tech Infra Ltd',
        builtUpAreaSqm: 800,
        carpetAreaSqm: 740,
        volumeCubicM: calculateVolumeCubicM(800, -4.0, 0.0),
        minElevation: -4.0,
        maxElevation: 0.0,
        polygon: p2BldgFootprint,
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 45000,
        electricityMeterId: 'BESCOM-HT-COMM-01',
        waterConsumerNo: 'BWSSB-COMM-B1',
      },
    ],
    totalBuiltAreaSqm: 800,
  });

  // Ground: Retail anchor
  floors.push({
    floorNumber: 0,
    floorName: 'Ground Floor (Retail & Bank Branch)',
    elevationBottom: 0.0,
    elevationTop: 4.2,
    height: 4.2,
    isBasement: false,
    units: [
      {
        id: 'u_p002_b002_fg0_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P002', 'B002', 0, 'RET01'),
        parcelId: 'P002',
        buildingId: 'B002',
        floorNumber: 0,
        unitNumber: 'Retail Unit G-01 (Commercial Bank)',
        unitType: 'Retail Store',
        ownerName: 'State Bank of India (Commercial Lease)',
        builtUpAreaSqm: 380,
        carpetAreaSqm: 350,
        volumeCubicM: calculateVolumeCubicM(380, 0.0, 4.2),
        minElevation: 0.0,
        maxElevation: 4.2,
        polygon: [
          offsetCoord(p2Origin.lng, p2Origin.lat, -18, -18),
          offsetCoord(p2Origin.lng, p2Origin.lat, 0, -18),
          offsetCoord(p2Origin.lng, p2Origin.lat, 0, 18),
          offsetCoord(p2Origin.lng, p2Origin.lat, -18, 18),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 72000,
        electricityMeterId: 'BESCOM-COM-G01',
        waterConsumerNo: 'BWSSB-COM-G01',
      },
      {
        id: 'u_p002_b002_fg0_02',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P002', 'B002', 0, 'RET02'),
        parcelId: 'P002',
        buildingId: 'B002',
        floorNumber: 0,
        unitNumber: 'Retail Unit G-02 (Cafeteria & Lounge)',
        unitType: 'Retail Store',
        ownerName: 'Third Wave Coffee Roasters',
        builtUpAreaSqm: 380,
        carpetAreaSqm: 340,
        volumeCubicM: calculateVolumeCubicM(380, 0.0, 4.2),
        minElevation: 0.0,
        maxElevation: 4.2,
        polygon: [
          offsetCoord(p2Origin.lng, p2Origin.lat, 0, -18),
          offsetCoord(p2Origin.lng, p2Origin.lat, 18, -18),
          offsetCoord(p2Origin.lng, p2Origin.lat, 18, 2),
          offsetCoord(p2Origin.lng, p2Origin.lat, 0, 2),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 68000,
        electricityMeterId: 'BESCOM-COM-G02',
        waterConsumerNo: 'BWSSB-COM-G02',
      },
    ],
    totalBuiltAreaSqm: 760,
  });

  // Floors 1 to 6 (IT Offices)
  const corporateTenants = [
    'Cognitive Cloud Systems Pvt Ltd',
    'FinTech Bharat Solutions LLP',
    'Apex Robotics R&D India',
    'CyberSecure Global Labs',
    'Aerospace SpaceTech Analytics',
    'BioGen AI Therapeutics',
  ];

  for (let f = 1; f <= 6; f++) {
    const bottomZ = 4.2 + (f - 1) * 3.8;
    const topZ = bottomZ + 3.8;
    floors.push({
      floorNumber: f,
      floorName: `Floor ${f} (Corporate IT Floor)`,
      elevationBottom: bottomZ,
      elevationTop: topZ,
      height: 3.8,
      isBasement: false,
      units: [
        {
          id: `u_p002_b002_f${f}_01`,
          prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P002', 'B002', f, `OFF${f}01`),
          parcelId: 'P002',
          buildingId: 'B002',
          floorNumber: f,
          unitNumber: `Corporate Office Suite ${f}01`,
          unitType: 'Commercial Office',
          ownerName: corporateTenants[f - 1] || `Tech Enterprise Suite ${f}`,
          builtUpAreaSqm: 760,
          carpetAreaSqm: 700,
          volumeCubicM: calculateVolumeCubicM(760, bottomZ, topZ),
          minElevation: bottomZ,
          maxElevation: topZ,
          polygon: p2BldgFootprint,
          legalStatus: 'Registered (3D Title)',
          hasTopologyCollision: false,
          annualPropertyTaxInr: 95000 + f * 4000,
          electricityMeterId: `BESCOM-COM-F${f}`,
          waterConsumerNo: `BWSSB-COM-F${f}`,
          notes: `Entire floor leased corporate office space. Height: 3.8m`,
        },
      ],
      totalBuiltAreaSqm: 760,
    });
  }

  return floors;
}

const p2Floors = generateP2Floors();
const building2: Building = {
  id: 'B002',
  parcelId: 'P002',
  name: 'Nexus Commercial Plaza',
  structureType: 'Commercial Complex',
  footprintCoords: p2BldgFootprint,
  baseGroundElevationMsl: 920.0,
  totalHeightM: 27.0,
  floorCountAboveGround: 6,
  basementCount: 1,
  totalUnitsCount: p2Floors.reduce((acc, f) => acc + f.units.length, 0),
  floors: p2Floors,
  hasBoundaryOverhang: false,
  approvalYear: 2021,
  reraRegNo: 'PRM/KA/RERA/1251/310/PR/210815/003920',
  geometrySource: 'SYNTHETIC_DEMO',
  matchMethod: 'EXACT_POLYGON',
  confidenceLevel: 'Low',
};

const parcel2UndergroundAssets: UndergroundAsset[] = [
  {
    id: 'ug_p002_ut01',
    type: 'Utility Tunnel',
    name: 'Commercial Trench & District Cooling Conduit',
    depthM: -6.0,
    diameterM: 2.4,
    lengthM: 50,
    owner: 'Nexus Commercial Property Trust',
    prototypeUlpin3D: 'IN-KA-BLR-P002-B002-UG-UT01',
    parcelId: 'P002',
    buildingId: 'B002',
    coordinates: [
      offsetCoord(p2Origin.lng, p2Origin.lat, -20, 0),
      offsetCoord(p2Origin.lng, p2Origin.lat, 20, 0),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
  {
    id: 'ug_p002_wp01',
    type: 'Water Pipeline',
    name: 'Commercial Water Ingress Line (450mm)',
    depthM: -4.0,
    diameterM: 0.5,
    lengthM: 45,
    owner: 'BWSSB Commercial Utilities',
    prototypeUlpin3D: 'IN-KA-BLR-P002-B002-UG-WP01',
    parcelId: 'P002',
    coordinates: [
      offsetCoord(p2Origin.lng, p2Origin.lat, 0, -20),
      offsetCoord(p2Origin.lng, p2Origin.lat, 0, 20),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
];

const parcel2: CadastralParcel = {
  id: 'P002',
  ulpin2D: 'KA295720049813',
  state: 'Karnataka',
  district: 'Bengaluru Urban',
  subDistrict: 'Bengaluru South',
  villageWard: 'Ward 150 (Bellandur / Outer Ring Rd)',
  surveyNumber: 'Sy. No. 44/3',
  centroid: p2Origin,
  areaSqm: 2500,
  boundaryPolygon: p2Boundary,
  landUseCategory: 'Commercial Prime',
  totalBuildingsCount: 1,
  buildings: [building2],
  undergroundAssets: parcel2UndergroundAssets,
  groundElevationMsl: 920.0,
  ownerType: 'Municipal / Commercial Leasehold',
};

// --------------------------------------------------------------------------
// PARCEL 3: Vakil Enclave & Residential (5 Floors)
// CONTAINS INTENTIONAL TOPOLOGY CONFLICTS FOR THE JUDGE DEMO!
// Conflict 1: Overhanging Balcony on Floor 4 extends past 2D parcel boundary
// Conflict 2: Internal 3D volume overlap between Unit 301 & Unit 302 on Floor 3
// --------------------------------------------------------------------------
const p3Origin = offsetCoord(REF_LNG, REF_LAT, -80, 20);
const p3Boundary: SpatialCoordinates2D[] = [
  offsetCoord(p3Origin.lng, p3Origin.lat, -20, -20),
  offsetCoord(p3Origin.lng, p3Origin.lat, 20, -20),
  offsetCoord(p3Origin.lng, p3Origin.lat, 20, 20),
  offsetCoord(p3Origin.lng, p3Origin.lat, -20, 20),
];

const p3BldgFootprint: SpatialCoordinates2D[] = [
  offsetCoord(p3Origin.lng, p3Origin.lat, -14, -14),
  offsetCoord(p3Origin.lng, p3Origin.lat, 14, -14),
  offsetCoord(p3Origin.lng, p3Origin.lat, 14, 14),
  offsetCoord(p3Origin.lng, p3Origin.lat, -14, 14),
];

function generateP3Floors(): FloorLevel[] {
  const floors: FloorLevel[] = [];
  const floorHeight = 3.2;

  // Ground floor
  floors.push({
    floorNumber: 0,
    floorName: 'Ground Floor (Parking & Reception)',
    elevationBottom: 0.0,
    elevationTop: 3.2,
    height: 3.2,
    isBasement: false,
    units: [
      {
        id: 'u_p003_b003_fg0_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', 0, 'G01'),
        parcelId: 'P003',
        buildingId: 'B003',
        floorNumber: 0,
        unitNumber: 'Stilt Parking & Caretaker Suite',
        unitType: 'Common Facilities / Lobby',
        ownerName: 'Vakil Enclave Society',
        builtUpAreaSqm: 560,
        carpetAreaSqm: 520,
        volumeCubicM: calculateVolumeCubicM(560, 0.0, 3.2),
        minElevation: 0.0,
        maxElevation: 3.2,
        polygon: p3BldgFootprint,
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 14000,
        electricityMeterId: 'BESCOM-P3-G01',
        waterConsumerNo: 'BWSSB-P3-G01',
      },
    ],
    totalBuiltAreaSqm: 560,
  });

  // Floors 1 & 2 (Clean)
  for (let f = 1; f <= 2; f++) {
    const bottomZ = 3.2 + (f - 1) * floorHeight;
    const topZ = bottomZ + floorHeight;
    floors.push({
      floorNumber: f,
      floorName: `Floor ${f}`,
      elevationBottom: bottomZ,
      elevationTop: topZ,
      height: floorHeight,
      isBasement: false,
      units: [
        {
          id: `u_p003_b003_f${f}_01`,
          prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', f, `${f}01`),
          parcelId: 'P003',
          buildingId: 'B003',
          floorNumber: f,
          unitNumber: `Flat ${f}01`,
          unitType: 'Residential Apartment',
          ownerName: f === 1 ? 'Pradeep K. Sharma' : 'Sunil V. Hegde',
          builtUpAreaSqm: 270,
          carpetAreaSqm: 245,
          volumeCubicM: calculateVolumeCubicM(270, bottomZ, topZ),
          minElevation: bottomZ,
          maxElevation: topZ,
          polygon: [
            offsetCoord(p3Origin.lng, p3Origin.lat, -14, -14),
            offsetCoord(p3Origin.lng, p3Origin.lat, 0, -14),
            offsetCoord(p3Origin.lng, p3Origin.lat, 0, 14),
            offsetCoord(p3Origin.lng, p3Origin.lat, -14, 14),
          ],
          legalStatus: 'Registered (3D Title)',
          hasTopologyCollision: false,
          annualPropertyTaxInr: 22000,
          electricityMeterId: `BESCOM-P3-F${f}-01`,
          waterConsumerNo: `BWSSB-P3-F${f}-01`,
        },
        {
          id: `u_p003_b003_f${f}_02`,
          prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', f, `${f}02`),
          parcelId: 'P003',
          buildingId: 'B003',
          floorNumber: f,
          unitNumber: `Flat ${f}02`,
          unitType: 'Residential Apartment',
          ownerName: f === 1 ? 'Vandana R. Joshi' : 'Manoj N. Rao',
          builtUpAreaSqm: 270,
          carpetAreaSqm: 245,
          volumeCubicM: calculateVolumeCubicM(270, bottomZ, topZ),
          minElevation: bottomZ,
          maxElevation: topZ,
          polygon: [
            offsetCoord(p3Origin.lng, p3Origin.lat, 0, -14),
            offsetCoord(p3Origin.lng, p3Origin.lat, 14, -14),
            offsetCoord(p3Origin.lng, p3Origin.lat, 14, 14),
            offsetCoord(p3Origin.lng, p3Origin.lat, 0, 14),
          ],
          legalStatus: 'Registered (3D Title)',
          hasTopologyCollision: false,
          annualPropertyTaxInr: 22000,
          electricityMeterId: `BESCOM-P3-F${f}-02`,
          waterConsumerNo: `BWSSB-P3-F${f}-02`,
        },
      ],
      totalBuiltAreaSqm: 540,
    });
  }

  // Floor 3: Internal 3D Volume OVERLAP conflict between Unit 301 and Unit 302!
  const f3BottomZ = 3.2 + 2 * floorHeight; // 9.6m
  const f3TopZ = f3BottomZ + floorHeight;  // 12.8m
  floors.push({
    floorNumber: 3,
    floorName: 'Floor 3 [TOPOLOGY WARNING: Unit Overlap]',
    elevationBottom: f3BottomZ,
    elevationTop: f3TopZ,
    height: floorHeight,
    isBasement: false,
    units: [
      {
        id: 'u_p003_b003_f3_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', 3, '301'),
        parcelId: 'P003',
        buildingId: 'B003',
        floorNumber: 3,
        unitNumber: 'Flat 301 (Boundary Disputed)',
        unitType: 'Residential Apartment',
        ownerName: 'Amitabh Sen (Disputed Title)',
        builtUpAreaSqm: 310,
        carpetAreaSqm: 280,
        volumeCubicM: calculateVolumeCubicM(310, f3BottomZ, f3TopZ),
        minElevation: f3BottomZ,
        maxElevation: f3TopZ,
        // Overlaps 3 meters into eastern quadrant!
        polygon: [
          offsetCoord(p3Origin.lng, p3Origin.lat, -14, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 3, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 3, 14),
          offsetCoord(p3Origin.lng, p3Origin.lat, -14, 14),
        ],
        legalStatus: 'Boundary Dispute / Overhang',
        hasTopologyCollision: true,
        collisionReason: '3D Spatial Volume intersects 18.2 m³ of adjacent Flat 302 (X overlap: +3.0m). Dual registration claim detected.',
        annualPropertyTaxInr: 26000,
        electricityMeterId: 'BESCOM-P3-F3-01',
        waterConsumerNo: 'BWSSB-P3-F3-01',
        notes: '⚠️ Critical 3D Cadastral Overlap: Two legal sale deeds registered for overlapping volumetric portion of bedroom extension.',
      },
      {
        id: 'u_p003_b003_f3_02',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', 3, '302'),
        parcelId: 'P003',
        buildingId: 'B003',
        floorNumber: 3,
        unitNumber: 'Flat 302 (Boundary Disputed)',
        unitType: 'Residential Apartment',
        ownerName: 'Kishore B. Patel (Disputed Title)',
        builtUpAreaSqm: 290,
        carpetAreaSqm: 260,
        volumeCubicM: calculateVolumeCubicM(290, f3BottomZ, f3TopZ),
        minElevation: f3BottomZ,
        maxElevation: f3TopZ,
        // Extends from -1 meter westwards, intersecting Unit 301
        polygon: [
          offsetCoord(p3Origin.lng, p3Origin.lat, -1, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 14, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 14, 14),
          offsetCoord(p3Origin.lng, p3Origin.lat, -1, 14),
        ],
        legalStatus: 'Boundary Dispute / Overhang',
        hasTopologyCollision: true,
        collisionReason: '3D Spatial Volume intersected by Flat 301. Overlapping volume: 18.2 m³ in bedroom wing.',
        annualPropertyTaxInr: 25000,
        electricityMeterId: 'BESCOM-P3-F3-02',
        waterConsumerNo: 'BWSSB-P3-F3-02',
        notes: '⚠️ Registered boundary conflict under litigation before Sub-Registrar Bangalore South.',
      },
    ],
    totalBuiltAreaSqm: 600,
  });

  // Floor 4: Parcel Overhang Encroachment (Cantilever exceeds 2D ground parcel boundary)
  const f4BottomZ = 3.2 + 3 * floorHeight; // 12.8m
  const f4TopZ = f4BottomZ + floorHeight;  // 16.0m
  floors.push({
    floorNumber: 4,
    floorName: 'Floor 4 [ENCROACHMENT: Parcel Overhang]',
    elevationBottom: f4BottomZ,
    elevationTop: f4TopZ,
    height: floorHeight,
    isBasement: false,
    units: [
      {
        id: 'u_p003_b003_f4_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', 4, '401'),
        parcelId: 'P003',
        buildingId: 'B003',
        floorNumber: 4,
        unitNumber: 'Flat 401',
        unitType: 'Residential Apartment',
        ownerName: 'Naveen Swamy',
        builtUpAreaSqm: 270,
        carpetAreaSqm: 245,
        volumeCubicM: calculateVolumeCubicM(270, f4BottomZ, f4TopZ),
        minElevation: f4BottomZ,
        maxElevation: f4TopZ,
        polygon: [
          offsetCoord(p3Origin.lng, p3Origin.lat, -14, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 0, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 0, 14),
          offsetCoord(p3Origin.lng, p3Origin.lat, -14, 14),
        ],
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 23500,
        electricityMeterId: 'BESCOM-P3-F4-01',
        waterConsumerNo: 'BWSSB-P3-F4-01',
      },
      {
        id: 'u_p003_b003_f4_02',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P003', 'B003', 4, '402'),
        parcelId: 'P003',
        buildingId: 'B003',
        floorNumber: 4,
        unitNumber: 'Flat 402 (Unauthorized Cantilever Overhang)',
        unitType: 'Residential Apartment',
        ownerName: 'Tanvi G. Nambiar (Encroachment Flagged)',
        builtUpAreaSqm: 340,
        carpetAreaSqm: 310,
        volumeCubicM: calculateVolumeCubicM(340, f4BottomZ, f4TopZ),
        minElevation: f4BottomZ,
        maxElevation: f4TopZ,
        // Overhangs +24 meters to the East, exceeding parcel boundary (+20m) by 4 meters!
        polygon: [
          offsetCoord(p3Origin.lng, p3Origin.lat, 0, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 24, -14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 24, 14),
          offsetCoord(p3Origin.lng, p3Origin.lat, 0, 14),
        ],
        legalStatus: 'Boundary Dispute / Overhang',
        hasTopologyCollision: true,
        collisionReason: '3D Volume projects 4.0 meters beyond 2D Ground Parcel P003 eastern boundary into public setback easement.',
        annualPropertyTaxInr: 28000,
        electricityMeterId: 'BESCOM-P3-F4-02',
        waterConsumerNo: 'BWSSB-P3-F4-02',
        notes: '🚨 Unauthorized vertical projection: Balcony structure violates 2D parcel boundary envelope.',
      },
    ],
    totalBuiltAreaSqm: 610,
  });

  return floors;
}

const p3Floors = generateP3Floors();
const building3: Building = {
  id: 'B003',
  parcelId: 'P003',
  name: 'Vakil Enclave Building',
  structureType: 'Residential High-Rise',
  footprintCoords: p3BldgFootprint,
  baseGroundElevationMsl: 920.0,
  totalHeightM: 16.0,
  floorCountAboveGround: 4,
  basementCount: 0,
  totalUnitsCount: p3Floors.reduce((acc, f) => acc + f.units.length, 0),
  floors: p3Floors,
  hasBoundaryOverhang: true,
  overhangDetails: 'Floor 4 Unit 402 cantilevers 4.0m beyond 2D parcel boundary polygon (Sy. No. 44/4).',
  approvalYear: 2019,
  reraRegNo: 'PRM/KA/RERA/1251/310/PR/190410/002100',
  geometrySource: 'SYNTHETIC_DEMO',
  matchMethod: 'EXACT_POLYGON',
  confidenceLevel: 'Low',
};

const parcel3: CadastralParcel = {
  id: 'P003',
  ulpin2D: 'KA295720049814',
  state: 'Karnataka',
  district: 'Bengaluru Urban',
  subDistrict: 'Bengaluru South',
  villageWard: 'Ward 150 (Bellandur / Outer Ring Rd)',
  surveyNumber: 'Sy. No. 44/4',
  centroid: p3Origin,
  areaSqm: 1600,
  boundaryPolygon: p3Boundary,
  landUseCategory: 'Urban Residential',
  totalBuildingsCount: 1,
  buildings: [building3],
  groundElevationMsl: 920.0,
  ownerType: 'Private Freehold',
};

// --------------------------------------------------------------------------
// PARCEL 4: Sub-Surface Infrastructure Corridor (Underground Metro Easement)
// Demonstrates 3D ULPIN for spaces below ground parcel
// --------------------------------------------------------------------------
const p4Origin = offsetCoord(REF_LNG, REF_LAT, 0, -85);
const p4Boundary: SpatialCoordinates2D[] = [
  offsetCoord(p4Origin.lng, p4Origin.lat, -40, -15),
  offsetCoord(p4Origin.lng, p4Origin.lat, 40, -15),
  offsetCoord(p4Origin.lng, p4Origin.lat, 40, 15),
  offsetCoord(p4Origin.lng, p4Origin.lat, -40, 15),
];

const p4TunnelFootprint: SpatialCoordinates2D[] = [
  offsetCoord(p4Origin.lng, p4Origin.lat, -38, -10),
  offsetCoord(p4Origin.lng, p4Origin.lat, 38, -10),
  offsetCoord(p4Origin.lng, p4Origin.lat, 38, 10),
  offsetCoord(p4Origin.lng, p4Origin.lat, -38, 10),
];

const p4Floors: FloorLevel[] = [
  {
    floorNumber: -2,
    floorName: 'Subterranean Transit Box (Level -2)',
    elevationBottom: -14.0,
    elevationTop: -7.0,
    height: 7.0,
    isBasement: true,
    units: [
      {
        id: 'u_p004_b004_fb2_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P004', 'B004', -2, 'MTR01'),
        parcelId: 'P004',
        buildingId: 'B004',
        floorNumber: -2,
        unitNumber: 'Underground Metro Rail Track Corridor & Platform',
        unitType: 'Sub-Surface Infrastructure',
        ownerName: 'Bangalore Metro Rail Corporation Ltd (BMRCL)',
        builtUpAreaSqm: 1520,
        carpetAreaSqm: 1450,
        volumeCubicM: calculateVolumeCubicM(1520, -14.0, -7.0),
        minElevation: -14.0,
        maxElevation: -7.0,
        polygon: p4TunnelFootprint,
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 0,
        electricityMeterId: 'KPTCL-GRID-METRO-01',
        waterConsumerNo: 'BWSSB-METRO-01',
        notes: '3D Sub-Surface Public Utility Right-of-Way. Depth: 14m below surface datum.',
      },
    ],
    totalBuiltAreaSqm: 1520,
  },
  {
    floorNumber: -1,
    floorName: 'Underground Concourse & Passenger Transfer (Level -1)',
    elevationBottom: -7.0,
    elevationTop: -1.0,
    height: 6.0,
    isBasement: true,
    units: [
      {
        id: 'u_p004_b004_fb1_01',
        prototypeUlpin3D: generatePrototype3DUlpin('KA', 'BLR', 'P004', 'B004', -1, 'CONC01'),
        parcelId: 'P004',
        buildingId: 'B004',
        floorNumber: -1,
        unitNumber: 'Metro Concourse & Smart Ticketing Hall',
        unitType: 'Sub-Surface Infrastructure',
        ownerName: 'Bangalore Metro Rail Corporation Ltd (BMRCL)',
        builtUpAreaSqm: 1520,
        carpetAreaSqm: 1400,
        volumeCubicM: calculateVolumeCubicM(1520, -7.0, -1.0),
        minElevation: -7.0,
        maxElevation: -1.0,
        polygon: p4TunnelFootprint,
        legalStatus: 'Registered (3D Title)',
        hasTopologyCollision: false,
        annualPropertyTaxInr: 0,
        electricityMeterId: 'KPTCL-GRID-METRO-02',
        waterConsumerNo: 'BWSSB-METRO-02',
      },
    ],
    totalBuiltAreaSqm: 1520,
  },
];

const building4: Building = {
  id: 'B004',
  parcelId: 'P004',
  name: 'Metro Underground Station & Easement Box',
  structureType: 'Sub-Surface Facility',
  footprintCoords: p4TunnelFootprint,
  baseGroundElevationMsl: 920.0,
  totalHeightM: 0.0,
  floorCountAboveGround: 0,
  basementCount: 2,
  totalUnitsCount: 2,
  floors: p4Floors,
  hasBoundaryOverhang: false,
  approvalYear: 2023,
  reraRegNo: 'GOVT/INFRA/METRO/3D-ROW/2023/0091',
  geometrySource: 'SYNTHETIC_DEMO',
  matchMethod: 'EXACT_POLYGON',
  confidenceLevel: 'Low',
};

const parcel4UndergroundAssets: UndergroundAsset[] = [
  {
    id: 'ug_p004_mt01',
    type: 'Utility Tunnel',
    name: 'BMRCL Metro Twin-Tube Sub-surface Rail Tunnel',
    depthM: -12.0,
    diameterM: 5.8,
    lengthM: 80,
    owner: 'BMRCL (Bangalore Metro Rail Corporation Ltd)',
    prototypeUlpin3D: 'IN-KA-BLR-P004-B004-UG-MT01',
    parcelId: 'P004',
    buildingId: 'B004',
    coordinates: [
      offsetCoord(p4Origin.lng, p4Origin.lat, -38, 0),
      offsetCoord(p4Origin.lng, p4Origin.lat, 38, 0),
    ],
    hasTopologyCollision: false,
    status: 'Operational',
  },
];

const parcel4: CadastralParcel = {
  id: 'P004',
  ulpin2D: 'KA295720049815',
  state: 'Karnataka',
  district: 'Bengaluru Urban',
  subDistrict: 'Bengaluru South',
  villageWard: 'Ward 150 (Bellandur Corridor)',
  surveyNumber: 'Sy. No. 45/1 (Public ROW)',
  centroid: p4Origin,
  areaSqm: 2400,
  boundaryPolygon: p4Boundary,
  landUseCategory: 'Public Infrastructure',
  totalBuildingsCount: 1,
  buildings: [building4],
  undergroundAssets: parcel4UndergroundAssets,
  groundElevationMsl: 920.0,
  ownerType: 'Municipal / Commercial Leasehold',
};

// --------------------------------------------------------------------------
// Full Synthetic Dataset Export (Enriched with Floor 3D ULPINs)
// --------------------------------------------------------------------------
const rawParcels: CadastralParcel[] = [
  parcel1,
  parcel2,
  parcel3,
  parcel4,
];

// Guarantee every floor level has an authoritative 3D Floor ULPIN
export const SAMPLE_CADASTRAL_PARCELS: CadastralParcel[] = rawParcels.map(p => ({
  ...p,
  buildings: p.buildings.map(b => ({
    ...b,
    floors: b.floors.map(fl => ({
      ...fl,
      prototypeUlpin3D: fl.prototypeUlpin3D || generateFloorUlpin3D(p.id, b.id, fl.floorNumber, 'KA', 'BLR'),
    })),
  })),
}));

// Helper to look up all units in the system
export function getAllPropertyUnits(): PropertyUnit[] {
  const units: PropertyUnit[] = [];
  for (const p of SAMPLE_CADASTRAL_PARCELS) {
    for (const b of p.buildings) {
      for (const fl of b.floors) {
        units.push(...fl.units);
      }
    }
  }
  return units;
}

// Helper to look up all buildings in the system
export function getAllBuildings(): Building[] {
  const bldgs: Building[] = [];
  for (const p of SAMPLE_CADASTRAL_PARCELS) {
    bldgs.push(...p.buildings);
  }
  return bldgs;
}
