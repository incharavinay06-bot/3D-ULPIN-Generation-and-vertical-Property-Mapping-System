/**
 * Proposed Prototype 3D Property Identifier Generator & Codec
 * Problem Statement: SIH26011 (Ministry of Rural Development)
 * 
 * Cadastral Context:
 * - In India's national land records framework, the official 2D Bhu-Aadhaar / ULPIN is a
 *   14-digit alphanumeric identifier assigned to horizontal ground land parcels.
 * - For multi-storey vertical apartments, commercial complexes, and underground utilities,
 *   a distinct spatial unit identifier is needed.
 * 
 * - ISO 19152 (Land Administration Domain Model - LADM) provides standard spatial unit
 *   and strata rights concepts, while the alphanumeric notation below is our PROPOSED
 *   research prototype format.
 * 
 * Proposed 3D Property Identifier Format:
 * [ISO Country]-[State]-[District]-[Parcel_ULPIN]-[Building_Seq]-[Vertical_Level]-[Unit_Code]
 * 
 * Example:
 * IN-KA-BLR-P001-B01-F05-U502
 * (Country: India, State: Karnataka, Dist: Bangalore, Parcel: P001, Building: 01, Floor: +5, Unit: 502)
 * 
 * Basement Example:
 * IN-KA-BLR-P001-B01-B02-UP08
 * (Basement level -2, Parking slot 08)
 */

export interface Ulpin3DComponents {
  countryCode: string;
  stateCode: string;
  districtCode: string;
  parcelId: string;
  buildingSeq?: string;
  levelCode?: string;
  unitCode?: string;
  tier: 'Surface Parcel' | 'Building Envelope' | 'Floor Level' | 'Property Unit' | 'Underground Infrastructure' | 'Air Rights';
  fullCode: string;
  readableDescription: string;
}

/**
 * Formats level into standardized string (e.g. -2 -> B02, 0 -> G00, 5 -> F05)
 */
export function formatFloorCode(floorNumber: number): string {
  if (floorNumber < 0) {
    const abs = Math.abs(floorNumber).toString().padStart(2, '0');
    return `B${abs}`;
  } else if (floorNumber === 0) {
    return 'G00';
  } else {
    const str = floorNumber.toString().padStart(2, '0');
    return `F${str}`;
  }
}

/**
 * Generates a systematic prototype 3D ULPIN for a given property unit
 */
export function generatePrototype3DUlpin(
  stateCode: string,
  districtCode: string,
  parcelId: string,
  buildingId: string,
  floorNumber: number,
  unitNumber: string
): string {
  const countryCode = 'IN';
  const cleanState = (stateCode || 'KA').toUpperCase().slice(0, 2);
  const cleanDist = (districtCode || 'BLR').toUpperCase().slice(0, 3);
  const cleanParcel = parcelId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanBldg = buildingId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padStart(3, 'B');
  const levelCode = formatFloorCode(floorNumber);
  const cleanUnit = 'U' + unitNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  return `${countryCode}-${cleanState}-${cleanDist}-${cleanParcel}-${cleanBldg}-${levelCode}-${cleanUnit}`;
}

/**
 * Convenient helper to generate unit 3D ULPIN
 */
export function generateUnitUlpin3D(
  parcelId: string,
  buildingId: string,
  floorNumber: number,
  unitIdx: number | string
): string {
  const unitNum = typeof unitIdx === 'number' 
    ? `${floorNumber > 0 ? floorNumber : 'B' + Math.abs(floorNumber)}${unitIdx.toString().padStart(2, '0')}` 
    : unitIdx;
  return generatePrototype3DUlpin('KA', 'BLR', parcelId, buildingId, floorNumber, unitNum);
}

/**
 * Convenient helper to generate Floor-level 3D ULPIN
 * Format: IN-KA-BLR-P001-B001-F05 or IN-KA-BLR-P001-B001-B02
 */
export function generateFloorUlpin3D(
  parcelId: string,
  buildingId: string,
  floorNumber: number,
  stateCode = 'KA',
  districtCode = 'BLR'
): string {
  return generateTierUlpin('Floor', {
    stateCode,
    districtCode,
    parcelId,
    buildingId,
    floorNumber,
  });
}

/**
 * Generates hierarchical 3D ULPIN at any cadastral tier
 */
export function generateTierUlpin(
  tier: 'Surface Parcel' | 'Building' | 'Floor' | 'Property Unit' | 'Underground Parking' | 'Water Pipeline' | 'Air Rights',
  params: {
    stateCode?: string;
    districtCode?: string;
    parcelId: string;
    buildingId?: string;
    floorNumber?: number;
    unitCode?: string;
    utilityCode?: string;
  }
): string {
  const state = (params.stateCode || 'KA').toUpperCase().slice(0, 2);
  const dist = (params.districtCode || 'BLR').toUpperCase().slice(0, 3);
  const p = params.parcelId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const b = (params.buildingId || 'B001').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  switch (tier) {
    case 'Surface Parcel':
      return `IN-${state}-${dist}-${p}`;
    case 'Building':
      return `IN-${state}-${dist}-${p}-${b}`;
    case 'Floor':
      return `IN-${state}-${dist}-${p}-${b}-${formatFloorCode(params.floorNumber ?? 0)}`;
    case 'Property Unit':
      return `IN-${state}-${dist}-${p}-${b}-${formatFloorCode(params.floorNumber ?? 0)}-U${(params.unitCode || '101').replace(/[^a-zA-Z0-9]/g, '')}`;
    case 'Underground Parking':
      return `IN-${state}-${dist}-${p}-${b}-UG-${(params.utilityCode || 'P01').toUpperCase()}`;
    case 'Water Pipeline':
      return `IN-${state}-${dist}-${p}-${b}-UG-${(params.utilityCode || 'WP01').toUpperCase()}`;
    case 'Air Rights':
      return `IN-${state}-${dist}-${p}-${b}-AR-${(params.utilityCode || '01').toUpperCase()}`;
    default:
      return `IN-${state}-${dist}-${p}`;
  }
}

/**
 * Parses a 3D ULPIN string into its composite cadastral components
 */
export function parse3DUlpin(ulpin3D: string): Ulpin3DComponents | null {
  const parts = ulpin3D.split('-');
  if (parts.length < 4) return null;

  const countryCode = parts[0];
  const stateCode = parts[1];
  const districtCode = parts[2];
  const parcelId = parts[3];

  if (parts.length === 4) {
    return {
      countryCode,
      stateCode,
      districtCode,
      parcelId,
      tier: 'Surface Parcel',
      fullCode: ulpin3D,
      readableDescription: `Surface Cadastral Land Parcel ${parcelId} in ${stateCode}-${districtCode}`,
    };
  }

  const buildingSeq = parts[4];
  if (parts.length === 5) {
    return {
      countryCode,
      stateCode,
      districtCode,
      parcelId,
      buildingSeq,
      tier: 'Building Envelope',
      fullCode: ulpin3D,
      readableDescription: `3D Building Structure Envelope ${buildingSeq} on Parcel ${parcelId}`,
    };
  }

  const levelCode = parts[5];
  if (parts.length === 6) {
    return {
      countryCode,
      stateCode,
      districtCode,
      parcelId,
      buildingSeq,
      levelCode,
      tier: 'Floor Level',
      fullCode: ulpin3D,
      readableDescription: `Vertical Floor Level ${levelCode} in Building ${buildingSeq}`,
    };
  }

  const unitCode = parts.slice(6).join('-');
  const isUnderground = levelCode === 'UG';
  const isAirRights = levelCode === 'AR';

  return {
    countryCode,
    stateCode,
    districtCode,
    parcelId,
    buildingSeq,
    levelCode,
    unitCode,
    tier: isUnderground 
      ? 'Underground Infrastructure' 
      : isAirRights 
        ? 'Air Rights' 
        : 'Property Unit',
    fullCode: ulpin3D,
    readableDescription: isUnderground
      ? `Sub-surface Utility / Asset ${unitCode} below Parcel ${parcelId}`
      : isAirRights
        ? `Air Rights Envelope ${unitCode} above Building ${buildingSeq}`
        : `Volumetric Strata Unit ${unitCode} at Level ${levelCode} in Building ${buildingSeq}`,
  };
}

/**
 * Calculates geometric polygon area in square meters using spherical/planar Shoelace formula
 */
export function calculatePolygonAreaSqm(coords: { lng: number; lat: number }[]): number {
  if (!coords || coords.length < 3) return 0;
  
  // Approximate conversion at Bangalore latitude (~12.97 deg N)
  // 1 deg Lat ~= 110,574 m; 1 deg Lng ~= 111,320 * cos(lat) m ~= 108,500 m
  const meanLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const latFactor = 110574;
  const lngFactor = 111320 * Math.cos((meanLat * Math.PI) / 180);

  const localMeters = coords.map(c => ({
    x: (c.lng - coords[0].lng) * lngFactor,
    y: (c.lat - coords[0].lat) * latFactor,
  }));

  let area = 0;
  for (let i = 0; i < localMeters.length; i++) {
    const j = (i + 1) % localMeters.length;
    area += localMeters[i].x * localMeters[j].y;
    area -= localMeters[j].x * localMeters[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculates 3D volume in cubic meters from area and height
 */
export function calculateVolumeCubicM(areaSqm: number, minElevation: number, maxElevation: number): number {
  const heightM = Math.max(0, maxElevation - minElevation);
  return Number((areaSqm * heightM).toFixed(2));
}

/**
 * Prototype & Research Disclaimer required for SIH judging transparency
 */
export const ULPIN_3D_DISCLAIMER = 
  "RESEARCH PROTOTYPE DISCLAIMER: The 3D property identifiers generated in this prototype " +
  "(e.g. IN-KA-BLR-P001-B01-F05-U502) are research proposals designed to demonstrate vertical cadastral " +
  "segmentation and volumetric modeling. They are based on ISO 19152 (LADM) spatial unit principles and do " +
  "not represent an officially notified Government of India 3D Bhu-Aadhaar standard. Official 2D ULPIN / " +
  "Bhu-Aadhaar remains the authoritative 14-digit national standard for ground land parcels. All demo owner " +
  "names and tax records are synthetic specimen data.";
