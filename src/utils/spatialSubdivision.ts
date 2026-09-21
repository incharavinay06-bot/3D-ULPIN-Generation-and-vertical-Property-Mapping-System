/**
 * Spatial Subdivision Engine for 3D Cadastral Property Units
 * Subdivides an authoritative 2D building footprint into multi-unit strata titles
 * using half-plane polygon clipping (Sutherland-Hodgman algorithm).
 */

import { SpatialCoordinates2D } from '../types/cadastre';

/**
 * Clips a polygon by a half-plane defined by line through (px, py) with normal (nx, ny).
 * A point (x, y) is inside if (x - px) * nx + (y - py) * ny >= 0.
 */
function clipPolygonByHalfPlane(
  polygon: SpatialCoordinates2D[],
  px: number,
  py: number,
  nx: number,
  ny: number
): SpatialCoordinates2D[] {
  if (polygon.length < 3) return [...polygon];

  // Remove duplicate closing vertex if present
  let ring = [...polygon];
  if (
    ring.length > 3 &&
    Math.abs(ring[0].lng - ring[ring.length - 1].lng) < 1e-7 &&
    Math.abs(ring[0].lat - ring[ring.length - 1].lat) < 1e-7
  ) {
    ring.pop();
  }

  const isInside = (pt: SpatialCoordinates2D) => {
    return (pt.lng - px) * nx + (pt.lat - py) * ny >= -1e-9;
  };

  const computeIntersection = (
    s: SpatialCoordinates2D,
    e: SpatialCoordinates2D
  ): SpatialCoordinates2D => {
    const dsx = s.lng - px;
    const dsy = s.lat - py;
    const dex = e.lng - px;
    const dey = e.lat - py;

    const valS = dsx * nx + dsy * ny;
    const valE = dex * nx + dey * ny;

    const denom = valS - valE;
    if (Math.abs(denom) < 1e-12) return s;

    const t = valS / denom;
    return {
      lng: s.lng + t * (e.lng - s.lng),
      lat: s.lat + t * (e.lat - s.lat),
    };
  };

  const output: SpatialCoordinates2D[] = [];
  for (let i = 0; i < ring.length; i++) {
    const s = ring[i];
    const e = ring[(i + 1) % ring.length];

    const sIn = isInside(s);
    const eIn = isInside(e);

    if (eIn) {
      if (!sIn) {
        output.push(computeIntersection(s, e));
      }
      output.push(e);
    } else if (sIn) {
      output.push(computeIntersection(s, e));
    }
  }

  // Ensure closed polygon
  if (output.length >= 3) {
    output.push({ ...output[0] });
  }

  return output;
}

/**
 * Calculates centroid of a 2D polygon
 */
export function getPolygonCentroid(pts: SpatialCoordinates2D[]): SpatialCoordinates2D {
  if (!pts || pts.length === 0) return { lat: 0, lng: 0 };
  let sumLat = 0;
  let sumLng = 0;
  const count = pts.length;
  for (const p of pts) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  return { lat: sumLat / count, lng: sumLng / count };
}

/**
 * Subdivides a floor footprint into 1, 2, or 4 prototype property units.
 * Exactly preserves the original footprint boundary without creating gaps or overlaps.
 */
export function subdivideFloorFootprint(
  footprint: SpatialCoordinates2D[],
  unitsCount: number = 2
): { unitIndex: number; polygon: SpatialCoordinates2D[]; nameSuffix: string }[] {
  if (!footprint || footprint.length < 3) {
    return [{ unitIndex: 1, polygon: footprint, nameSuffix: 'Suite 01' }];
  }

  if (unitsCount <= 1) {
    return [{ unitIndex: 1, polygon: footprint, nameSuffix: 'Full Floor Suite' }];
  }

  const centroid = getPolygonCentroid(footprint);

  // Compute bounding box dimensions to decide whether to split East-West or North-South first
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const pt of footprint) {
    if (pt.lng < minLng) minLng = pt.lng;
    if (pt.lng > maxLng) maxLng = pt.lng;
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
  }
  const deltaLng = maxLng - minLng;
  const deltaLat = maxLat - minLat;

  if (unitsCount === 2) {
    // Split along major axis
    if (deltaLng >= deltaLat) {
      // Split East / West (vertical dividing line at centroid.lng)
      const westPoly = clipPolygonByHalfPlane(footprint, centroid.lng, centroid.lat, -1, 0);
      const eastPoly = clipPolygonByHalfPlane(footprint, centroid.lng, centroid.lat, 1, 0);

      const res: { unitIndex: number; polygon: SpatialCoordinates2D[]; nameSuffix: string }[] = [];
      if (westPoly.length >= 3) res.push({ unitIndex: 1, polygon: westPoly, nameSuffix: 'Wing A (West)' });
      if (eastPoly.length >= 3) res.push({ unitIndex: 2, polygon: eastPoly, nameSuffix: 'Wing B (East)' });
      return res.length > 0 ? res : [{ unitIndex: 1, polygon: footprint, nameSuffix: 'Full Suite' }];
    } else {
      // Split North / South (horizontal dividing line at centroid.lat)
      const southPoly = clipPolygonByHalfPlane(footprint, centroid.lng, centroid.lat, 0, -1);
      const northPoly = clipPolygonByHalfPlane(footprint, centroid.lng, centroid.lat, 0, 1);

      const res: { unitIndex: number; polygon: SpatialCoordinates2D[]; nameSuffix: string }[] = [];
      if (southPoly.length >= 3) res.push({ unitIndex: 1, polygon: southPoly, nameSuffix: 'Wing A (South)' });
      if (northPoly.length >= 3) res.push({ unitIndex: 2, polygon: northPoly, nameSuffix: 'Wing B (North)' });
      return res.length > 0 ? res : [{ unitIndex: 1, polygon: footprint, nameSuffix: 'Full Suite' }];
    }
  }

  // 4 Quadrants
  // Q1: NW (lng <= centroid, lat >= centroid)
  const west = clipPolygonByHalfPlane(footprint, centroid.lng, centroid.lat, -1, 0);
  const east = clipPolygonByHalfPlane(footprint, centroid.lng, centroid.lat, 1, 0);

  const nw = clipPolygonByHalfPlane(west, centroid.lng, centroid.lat, 0, 1);
  const sw = clipPolygonByHalfPlane(west, centroid.lng, centroid.lat, 0, -1);
  const ne = clipPolygonByHalfPlane(east, centroid.lng, centroid.lat, 0, 1);
  const se = clipPolygonByHalfPlane(east, centroid.lng, centroid.lat, 0, -1);

  const quads: { unitIndex: number; polygon: SpatialCoordinates2D[]; nameSuffix: string }[] = [];
  let idx = 1;
  if (nw.length >= 3) quads.push({ unitIndex: idx++, polygon: nw, nameSuffix: 'Quadrant 1 (North-West)' });
  if (ne.length >= 3) quads.push({ unitIndex: idx++, polygon: ne, nameSuffix: 'Quadrant 2 (North-East)' });
  if (se.length >= 3) quads.push({ unitIndex: idx++, polygon: se, nameSuffix: 'Quadrant 3 (South-East)' });
  if (sw.length >= 3) quads.push({ unitIndex: idx++, polygon: sw, nameSuffix: 'Quadrant 4 (South-West)' });

  return quads.length > 0 ? quads : [{ unitIndex: 1, polygon: footprint, nameSuffix: 'Full Suite' }];
}
