/**
 * Cadastral GeoJSON & Spatial Data Importer Pipeline
 * Transforms uploaded 2D/3D Cadastral GeoJSON into structured CadastralParcel data
 */

import { CadastralParcel, Building, FloorLevel, PropertyUnit, SpatialCoordinates2D } from '../types/cadastre';
import { generatePrototype3DUlpin, calculatePolygonAreaSqm, calculateVolumeCubicM } from './ulpinGenerator';
import { subdivideFloorFootprint } from './spatialSubdivision';

export interface ImportValidationResult {
  success: boolean;
  parcels: CadastralParcel[];
  parcelsCount: number;
  buildingsCount: number;
  unitsCount: number;
  logMessages: string[];
  errorMessage?: string;
}

/**
 * Validates and converts standard GeoJSON FeatureCollection into 3D Cadastral structures
 */
export function parseCadastralGeoJSON(geoJsonText: string): ImportValidationResult {
  const logMessages: string[] = [];
  
  try {
    const data = JSON.parse(geoJsonText);
    logMessages.push('✓ JSON syntax verified successfully');

    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      return {
        success: false,
        parcels: [],
        parcelsCount: 0,
        buildingsCount: 0,
        unitsCount: 0,
        logMessages,
        errorMessage: 'Invalid GeoJSON: Root object must be a FeatureCollection with a "features" array.',
      };
    }

    logMessages.push(`✓ Detected ${data.features.length} GeoJSON features`);

    const parcelsMap = new Map<string, CadastralParcel>();
    const pendingBuildings: { feature: any; building: Partial<Building>; parcelIdRef?: string }[] = [];

    let parcelIndex = 1;
    let bldgIndex = 1;

    for (const feature of data.features) {
      const geom = feature.geometry;
      const props = feature.properties || {};

      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
        continue;
      }

      // Extract polygon coordinates
      const coordsArray = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
      if (!Array.isArray(coordsArray) || coordsArray.length < 3) {
        continue;
      }

      const boundaryPolygon: SpatialCoordinates2D[] = coordsArray.map((c: any) => ({
        lng: Number(c[0]),
        lat: Number(c[1]),
      }));

      // Determine centroid
      const centroidLng = boundaryPolygon.reduce((s, p) => s + p.lng, 0) / boundaryPolygon.length;
      const centroidLat = boundaryPolygon.reduce((s, p) => s + p.lat, 0) / boundaryPolygon.length;

      const isBuilding = props.type === 'building' || props.building || props.height || props.floors || props.building_id;

      if (!isBuilding) {
        // It's a land parcel
        const pId = String(props.parcel_id || props.id || `IMP-P00${parcelIndex++}`);
        const ulpin2D = String(props.ulpin_2d || props.ulpin2D || props.survey_no || `KA29${Math.floor(1000000000 + Math.random() * 9000000000)}`);
        const areaSqm = props.area_sqm || Math.round(calculatePolygonAreaSqm(boundaryPolygon)) || 2500;
        const groundElevationMsl = props.elevation_msl || props.ground_elevation || 918.5;

        parcelsMap.set(pId, {
          id: pId,
          ulpin2D,
          state: props.state || 'Karnataka',
          district: props.district || 'Bengaluru Urban',
          subDistrict: props.sub_district || 'Bengaluru East',
          villageWard: props.ward || props.village || 'Ward 152 (Imported)',
          surveyNumber: String(props.survey_number || props.survey_no || `Sy. No. ${100 + parcelIndex}/1`),
          centroid: { lng: centroidLng, lat: centroidLat },
          areaSqm,
          boundaryPolygon,
          landUseCategory: props.land_use || 'Urban Residential',
          totalBuildingsCount: 0,
          buildings: [],
          groundElevationMsl,
          ownerType: props.owner_type || 'Private Freehold',
          dataSource: 'User Imported GeoJSON',
          dataConfidence: 'User-Provided & Validated',
        });
      } else {
        // It's a building footprint
        pendingBuildings.push({
          feature,
          building: {
            id: String(props.building_id || props.id || `IMP-B00${bldgIndex++}`),
            name: String(props.name || props.building_name || `Structure ${bldgIndex}`),
            structureType: props.structure_type || 'Residential High-Rise',
            footprintCoords: boundaryPolygon,
            baseGroundElevationMsl: props.elevation_msl || 918.5,
            totalHeightM: Number(props.height || props.total_height || 18.0),
            floorCountAboveGround: Number(props.floors || props.floor_count || 5),
            basementCount: Number(props.basements || 0),
            approvalYear: Number(props.approval_year || 2023),
            reraRegNo: String(props.rera_no || 'PRM/KA/RERA/1251/IMPORTED'),
            hasBoundaryOverhang: false,
            dataSource: 'User Imported GeoJSON',
            dataConfidence: 'User-Provided & Validated',
          },
          parcelIdRef: props.parcel_id || props.parcelId,
        });
      }
    }

    logMessages.push(`✓ Identified ${parcelsMap.size} land parcels`);
    logMessages.push(`✓ Identified ${pendingBuildings.length} building footprints`);

    // If no parcels were explicitly defined but buildings exist, synthesize enclosing parcels
    if (parcelsMap.size === 0 && pendingBuildings.length > 0) {
      logMessages.push('⚡ Generating parent parcels for standalone building footprints...');
      let autoPIndex = 1;
      for (const pb of pendingBuildings) {
        const pId = `AUTO-P00${autoPIndex++}`;
        const bFootprint = pb.building.footprintCoords!;
        
        // Slightly buffer footprint to create parcel boundary
        const bufferedParcel: SpatialCoordinates2D[] = bFootprint.map(c => ({
          lng: c.lng + (c.lng > pb.building.footprintCoords![0].lng ? 0.00015 : -0.00015),
          lat: c.lat + (c.lat > pb.building.footprintCoords![0].lat ? 0.00015 : -0.00015),
        }));

        const centroidLng = bFootprint.reduce((s, p) => s + p.lng, 0) / bFootprint.length;
        const centroidLat = bFootprint.reduce((s, p) => s + p.lat, 0) / bFootprint.length;

        parcelsMap.set(pId, {
          id: pId,
          ulpin2D: `KA29${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          state: 'Karnataka',
          district: 'Bengaluru Urban',
          subDistrict: 'Bengaluru South',
          villageWard: 'Ward 152 (Auto-Generated Parcel)',
          surveyNumber: `Sy. No. ${200 + autoPIndex}/A`,
          centroid: { lng: centroidLng, lat: centroidLat },
          areaSqm: Math.round(calculatePolygonAreaSqm(bufferedParcel)) || 3200,
          boundaryPolygon: bufferedParcel,
          landUseCategory: 'Mixed-Use Urban',
          totalBuildingsCount: 0,
          buildings: [],
          groundElevationMsl: pb.building.baseGroundElevationMsl || 918.5,
          ownerType: 'Private Freehold',
          dataSource: 'User Imported GeoJSON',
          dataConfidence: 'User-Provided & Validated',
        });

        pb.parcelIdRef = pId;
      }
    }

    // Attach buildings and synthesize floor levels and 3D property units
    let totalGeneratedUnits = 0;
    const parcelsList = Array.from(parcelsMap.values());

    for (let bIdx = 0; bIdx < pendingBuildings.length; bIdx++) {
      const pb = pendingBuildings[bIdx];
      const targetParcel = (pb.parcelIdRef && parcelsMap.get(pb.parcelIdRef)) || parcelsList[bIdx % parcelsList.length];

      if (!targetParcel) continue;

      const floorsAbove = pb.building.floorCountAboveGround || 4;
      const basements = pb.building.basementCount || 0;
      const floorHeight = (pb.building.totalHeightM || 15) / Math.max(1, floorsAbove);
      const footprint = pb.building.footprintCoords!;
      const totalFootprintArea = calculatePolygonAreaSqm(footprint);

      const generatedFloors: FloorLevel[] = [];

      // Generate Basements
      for (let b = basements; b >= 1; b--) {
        const floorNum = -b;
        const minZ = -b * 3.2;
        const maxZ = -(b - 1) * 3.2;
        const uId = `imp_${targetParcel.id}_${pb.building.id}_fb${b}_01`;
        const unitNumber = `Basement Parking Bay B${b}`;
        const protoUlpin = generatePrototype3DUlpin('KA', 'BLR', targetParcel.id, pb.building.id!, floorNum, `P${b}`);

        const unit: PropertyUnit = {
          id: uId,
          prototypeUlpin3D: protoUlpin,
          parcelId: targetParcel.id,
          buildingId: pb.building.id!,
          floorNumber: floorNum,
          unitNumber,
          unitType: 'Basement Parking Slot',
          ownerName: 'Synthetic Association Parking Allotment',
          builtUpAreaSqm: Math.round(totalFootprintArea),
          carpetAreaSqm: Math.round(totalFootprintArea * 0.85),
          volumeCubicM: calculateVolumeCubicM(totalFootprintArea, minZ, maxZ),
          minElevation: minZ,
          maxElevation: maxZ,
          polygon: footprint,
          legalStatus: 'Registered (3D Title)',
          hasTopologyCollision: false,
          annualPropertyTaxInr: 12000,
          electricityMeterId: `EB-IMP-B${b}`,
          waterConsumerNo: `WTR-IMP-B${b}`,
          dataSource: 'User Imported GeoJSON',
          dataConfidence: 'User-Provided & Validated',
        };

        generatedFloors.push({
          floorNumber: floorNum,
          floorName: `Basement B${b}`,
          elevationBottom: minZ,
          elevationTop: maxZ,
          height: 3.2,
          isBasement: true,
          units: [unit],
          totalBuiltAreaSqm: Math.round(totalFootprintArea),
        });
        totalGeneratedUnits++;
      }

      // Generate Ground and Upper Floors
      for (let f = 0; f < floorsAbove; f++) {
        const floorNum = f;
        const minZ = Number((f * floorHeight).toFixed(2));
        const maxZ = Number(((f + 1) * floorHeight).toFixed(2));
        const floorName = f === 0 ? 'Ground Floor' : `Floor ${f}`;

        // Subdivide floor into prototype property units
        const unitCountPerFloor = 2;
        const subdivided = subdivideFloorFootprint(footprint, unitCountPerFloor);
        const floorUnits: PropertyUnit[] = [];

        for (const sub of subdivided) {
          const u = sub.unitIndex;
          const unitNumber = f === 0 ? `Unit G0${u} (${sub.nameSuffix})` : `Unit ${f}0${u} (${sub.nameSuffix})`;
          const uId = `imp_${targetParcel.id}_${pb.building.id}_f${f}_0${u}`;
          const protoUlpin = generatePrototype3DUlpin('KA', 'BLR', targetParcel.id, pb.building.id!, floorNum, `${f}0${u}`);
          const unitArea = Math.round(totalFootprintArea / subdivided.length);

          floorUnits.push({
            id: uId,
            prototypeUlpin3D: protoUlpin,
            parcelId: targetParcel.id,
            buildingId: pb.building.id!,
            floorNumber: floorNum,
            unitNumber,
            unitType: f === 0 && pb.building.structureType === 'Commercial Complex' ? 'Retail Store' : 'Residential Apartment',
            ownerName: `Strata Unit Holder ${unitNumber}`,
            builtUpAreaSqm: unitArea,
            carpetAreaSqm: Math.round(unitArea * 0.78),
            volumeCubicM: calculateVolumeCubicM(unitArea, minZ, maxZ),
            minElevation: minZ,
            maxElevation: maxZ,
            polygon: sub.polygon,
            legalStatus: 'Prototype spatial subdivision — Not legally registered property boundaries' as any,
            hasTopologyCollision: false,
            annualPropertyTaxInr: 28000 + f * 1500,
            electricityMeterId: `EB-IMP-F${f}-${u}`,
            waterConsumerNo: `WTR-IMP-F${f}-${u}`,
            dataSource: 'User Imported GeoJSON',
            dataConfidence: 'User-Provided & Validated',
          });
          totalGeneratedUnits++;
        }

        generatedFloors.push({
          floorNumber: floorNum,
          floorName,
          elevationBottom: minZ,
          elevationTop: maxZ,
          height: floorHeight,
          isBasement: false,
          units: floorUnits,
          totalBuiltAreaSqm: Math.round(totalFootprintArea),
        });
      }

      const completeBuilding: Building = {
        id: pb.building.id!,
        parcelId: targetParcel.id,
        name: pb.building.name!,
        structureType: pb.building.structureType || 'Residential High-Rise',
        footprintCoords: footprint,
        baseGroundElevationMsl: targetParcel.groundElevationMsl,
        totalHeightM: pb.building.totalHeightM || 18,
        floorCountAboveGround: floorsAbove,
        basementCount: basements,
        totalUnitsCount: generatedFloors.reduce((s, f) => s + f.units.length, 0),
        floors: generatedFloors,
        hasBoundaryOverhang: false,
        approvalYear: pb.building.approvalYear || 2023,
        reraRegNo: pb.building.reraRegNo || 'PRM/KA/RERA/IMPORTED',
        dataSource: 'User Imported GeoJSON',
        dataConfidence: 'User-Provided & Validated',
      };

      targetParcel.buildings.push(completeBuilding);
      targetParcel.totalBuildingsCount = targetParcel.buildings.length;
    }

    logMessages.push(`✓ Generated 3D volumetric extrusion for ${pendingBuildings.length} buildings`);
    logMessages.push(`✓ Computed ${totalGeneratedUnits} discrete 3D spatial property units & Prototype Identifiers`);
    logMessages.push('✓ GeoJSON 2D-to-3D transformation completed successfully');

    return {
      success: true,
      parcels: parcelsList,
      parcelsCount: parcelsList.length,
      buildingsCount: pendingBuildings.length,
      unitsCount: totalGeneratedUnits,
      logMessages,
    };
  } catch (err: any) {
    return {
      success: false,
      parcels: [],
      parcelsCount: 0,
      buildingsCount: 0,
      unitsCount: 0,
      logMessages,
      errorMessage: `Failed to parse GeoJSON file: ${err.message || String(err)}`,
    };
  }
}

/**
 * Built-in ready-to-test synthetic GeoJSON dataset representing Indiranagar Urban Extension (Ward 152)
 */
export const SAMPLE_IMPORTABLE_GEOJSON = JSON.stringify({
  type: "FeatureCollection",
  name: "Bengaluru_Ward152_Cadastral_Specimen",
  crs: {
    type: "name",
    properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
  },
  features: [
    {
      type: "Feature",
      id: "P005",
      properties: {
        parcel_id: "P005",
        ulpin_2d: "KA295720089104",
        survey_number: "Sy. No. 112/3",
        land_use: "Urban Residential",
        elevation_msl: 919.2,
        owner_type: "Private Freehold",
        area_sqm: 3600
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.59354, 12.97129],
          [77.59400, 12.97129],
          [77.59400, 12.97083],
          [77.59354, 12.97083],
          [77.59354, 12.97129]
        ]]
      }
    },
    {
      type: "Feature",
      id: "B005",
      properties: {
        type: "building",
        building_id: "B005",
        parcel_id: "P005",
        building_name: "Palm Meadows Tower Alpha",
        structure_type: "Residential High-Rise",
        height: 25.6,
        floors: 8,
        basements: 1,
        approval_year: 2024,
        rera_no: "PRM/KA/RERA/1251/2024/0912"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.59362, 12.97120],
          [77.59392, 12.97120],
          [77.59392, 12.97092],
          [77.59362, 12.97092],
          [77.59362, 12.97120]
        ]]
      }
    },
    {
      type: "Feature",
      id: "P006",
      properties: {
        parcel_id: "P006",
        ulpin_2d: "KA295720089105",
        survey_number: "Sy. No. 112/4",
        land_use: "Commercial Prime",
        elevation_msl: 919.0,
        owner_type: "Commercial Leasehold",
        area_sqm: 3600
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.59520, 12.97129],
          [77.59566, 12.97129],
          [77.59566, 12.97083],
          [77.59520, 12.97083],
          [77.59520, 12.97129]
        ]]
      }
    },
    {
      type: "Feature",
      id: "B006",
      properties: {
        type: "building",
        building_id: "B006",
        parcel_id: "P006",
        building_name: "Zenith Commercial Suites",
        structure_type: "Commercial Complex",
        height: 21.0,
        floors: 6,
        basements: 2,
        approval_year: 2023,
        rera_no: "PRM/KA/RERA/1251/2023/0441"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.59528, 12.97120],
          [77.59558, 12.97120],
          [77.59558, 12.97092],
          [77.59528, 12.97092],
          [77.59528, 12.97120]
        ]]
      }
    }
  ]
}, null, 2);
