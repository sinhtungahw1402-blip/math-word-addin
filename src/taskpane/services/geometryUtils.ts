/**
 * Geometric Vector & SVG Helper Utilities
 * Provides exact trigonometric coordinates and standard mathematical markings (right angles, arcs, ticks)
 */

export interface Point {
  x: number;
  y: number;
}

export type AngleMarkType = 'none' | 'arc1' | 'arc2' | 'arc1-tick1' | 'arc1-tick2' | 'right';
export type SegmentMarkType = 'none' | 'tick1' | 'tick2' | 'tick3' | 'cross';

export type ExtraPointType =
  | 'midpoint'
  | 'centroid'
  | 'orthocenter'
  | 'circumcenter'
  | 'incenter'
  | 'projection'
  | 'intersection'
  | 'ratio'
  | 'free';

export interface ExtraPoint {
  id: string;
  label: string;
  type: ExtraPointType;
  color?: string;
  pt1?: string;
  pt2?: string;
  pt3?: string;
  fromPt?: string;
  ontoLineP1?: string;
  ontoLineP2?: string;
  line1P1?: string;
  line1P2?: string;
  line2P1?: string;
  line2P2?: string;
  ratio?: number;
  fixedPt?: Point;
  labelOffset?: { x: number; y: number };
}

export type ExtraLineType = 'segment' | 'line' | 'ray' | 'parallel' | 'perpendicular';

export interface ExtraLine {
  id: string;
  type: ExtraLineType;
  p1: string;
  p2?: string;
  refLineP1?: string;
  refLineP2?: string;
  style: 'solid' | 'dashed';
  color: string;
  strokeWidth: number;
  length?: number;
  hasRightAngle?: boolean;
}

export type ExtraShapeType =
  | 'circle_center_radius'
  | 'circle_center_point'
  | 'circumcircle'
  | 'incircle'
  | 'polygon_cross_section';

export interface ExtraShape {
  id: string;
  type: ExtraShapeType;
  center?: string;
  through?: string;
  radius?: number;
  pts?: string[];
  style: 'solid' | 'dashed';
  color: string;
  fill?: string;
  strokeWidth: number;
}

export const ANGLE_MARK_OPTIONS: { key: AngleMarkType; label: string; iconLabel: string }[] = [
  { key: 'none', label: 'Không', iconLabel: '—' },
  { key: 'arc1', label: '1 vòng cung', iconLabel: ')' },
  { key: 'arc2', label: '2 vòng cung', iconLabel: '))' },
  { key: 'arc1-tick1', label: '1 cung + 1 gạch', iconLabel: ')̸' },
  { key: 'arc1-tick2', label: '1 cung + 2 gạch', iconLabel: ')⫽' },
  { key: 'right', label: 'Góc vuông (∟)', iconLabel: '∟' }
];

export const SEGMENT_MARK_OPTIONS: { key: SegmentMarkType; label: string; iconLabel: string }[] = [
  { key: 'none', label: 'Không', iconLabel: '—' },
  { key: 'tick1', label: '1 gạch (|)', iconLabel: '|' },
  { key: 'tick2', label: '2 gạch (||)', iconLabel: '||' },
  { key: 'tick3', label: '3 gạch (|||)', iconLabel: '|||' },
  { key: 'cross', label: 'Dấu x (×)', iconLabel: '×' }
];

/**
 * Renders flexible mathematical angle markings at vertex V between rays towards pt1 and pt2
 */
export function renderAngleMark(
  V: Point,
  pt1: Point,
  pt2: Point,
  type: AngleMarkType,
  color: string = '#d13438',
  customRadius?: number
): string {
  if (!type || type === 'none') return '';

  const d1x = pt1.x - V.x;
  const d1y = pt1.y - V.y;
  const len1 = Math.hypot(d1x, d1y) || 1;
  const u1x = d1x / len1;
  const u1y = d1y / len1;

  const d2x = pt2.x - V.x;
  const d2y = pt2.y - V.y;
  const len2 = Math.hypot(d2x, d2y) || 1;
  const u2x = d2x / len2;
  const u2y = d2y / len2;

  // 1. Right Angle (Góc vuông)
  if (type === 'right') {
    const size = customRadius || 13;
    const p1x = V.x + size * u1x;
    const p1y = V.y + size * u1y;
    const p2x = p1x + size * u2x;
    const p2y = p1y + size * u2y;
    const p3x = V.x + size * u2x;
    const p3y = V.y + size * u2y;
    return `<polyline points="${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)} ${p3x.toFixed(1)},${p3y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.6" />`;
  }

  // 2. Arcs calculations
  const a1 = Math.atan2(u1y, u1x);
  const a2 = Math.atan2(u2y, u2x);

  let diff = a2 - a1;
  while (diff < 0) diff += 2 * Math.PI;
  while (diff > 2 * Math.PI) diff -= 2 * Math.PI;

  let startAngle = a1;
  let sweepAngle = diff;
  let sweepFlag = 1;

  if (diff > Math.PI) {
    startAngle = a2;
    sweepAngle = 2 * Math.PI - diff;
    sweepFlag = 1;
  }

  const endAngle = startAngle + sweepAngle;
  const midAngle = startAngle + sweepAngle / 2;

  const drawArc = (r: number) => {
    const sx = V.x + r * Math.cos(startAngle);
    const sy = V.y + r * Math.sin(startAngle);
    const ex = V.x + r * Math.cos(endAngle);
    const ey = V.y + r * Math.sin(endAngle);
    return `<path d="M ${sx.toFixed(1)},${sy.toFixed(1)} A ${r} ${r} 0 0 ${sweepFlag} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.5" />`;
  };

  const R = customRadius || 21;

  if (type === 'arc1') {
    return drawArc(R);
  }

  if (type === 'arc2') {
    return `${drawArc(R - 4)}\n${drawArc(R + 2)}`;
  }

  if (type === 'arc1-tick1') {
    const arcSvg = drawArc(R);
    const cosMid = Math.cos(midAngle);
    const sinMid = Math.sin(midAngle);
    const t1x = V.x + (R - 5) * cosMid;
    const t1y = V.y + (R - 5) * sinMid;
    const t2x = V.x + (R + 5) * cosMid;
    const t2y = V.y + (R + 5) * sinMid;
    return `${arcSvg}\n<line x1="${t1x.toFixed(1)}" y1="${t1y.toFixed(1)}" x2="${t2x.toFixed(1)}" y2="${t2y.toFixed(1)}" stroke="${color}" stroke-width="1.6" />`;
  }

  if (type === 'arc1-tick2') {
    const arcSvg = drawArc(R);
    const delta = 0.09;
    const mid1 = midAngle - delta;
    const mid2 = midAngle + delta;

    const t1a_x = V.x + (R - 5) * Math.cos(mid1);
    const t1a_y = V.y + (R - 5) * Math.sin(mid1);
    const t1b_x = V.x + (R + 5) * Math.cos(mid1);
    const t1b_y = V.y + (R + 5) * Math.sin(mid1);

    const t2a_x = V.x + (R - 5) * Math.cos(mid2);
    const t2a_y = V.y + (R - 5) * Math.sin(mid2);
    const t2b_x = V.x + (R + 5) * Math.cos(mid2);
    const t2b_y = V.y + (R + 5) * Math.sin(mid2);

    return `${arcSvg}\n<line x1="${t1a_x.toFixed(1)}" y1="${t1a_y.toFixed(1)}" x2="${t1b_x.toFixed(1)}" y2="${t1b_y.toFixed(1)}" stroke="${color}" stroke-width="1.6" />\n<line x1="${t2a_x.toFixed(1)}" y1="${t2a_y.toFixed(1)}" x2="${t2b_x.toFixed(1)}" y2="${t2b_y.toFixed(1)}" stroke="${color}" stroke-width="1.6" />`;
  }

  return '';
}

/**
 * Renders mathematical segment markings (equal ticks or cross) on a segment between pt1 and pt2
 */
export function renderSegmentMark(
  pt1: Point,
  pt2: Point,
  type: SegmentMarkType,
  color: string = '#d13438',
  length: number = 6
): string {
  if (!type || type === 'none') return '';

  const mx = (pt1.x + pt2.x) / 2;
  const my = (pt1.y + pt2.y) / 2;

  const dx = pt2.x - pt1.x;
  const dy = pt2.y - pt1.y;
  const len = Math.hypot(dx, dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  const px = dx / len;
  const py = dy / len;

  if (type === 'tick1') {
    const x1 = mx + length * nx;
    const y1 = my + length * ny;
    const x2 = mx - length * nx;
    const y2 = my - length * ny;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="1.8" />`;
  }

  if (type === 'tick2') {
    const offset = 2.5;
    const m1x = mx - offset * px;
    const m1y = my - offset * py;
    const m2x = mx + offset * px;
    const m2y = my + offset * py;

    const t1a_x = m1x + length * nx;
    const t1a_y = m1y + length * ny;
    const t1b_x = m1x - length * nx;
    const t1b_y = m1y - length * ny;

    const t2a_x = m2x + length * nx;
    const t2a_y = m2y + length * ny;
    const t2b_x = m2x - length * nx;
    const t2b_y = m2y - length * ny;

    return `<line x1="${t1a_x.toFixed(1)}" y1="${t1a_y.toFixed(1)}" x2="${t1b_x.toFixed(1)}" y2="${t1b_y.toFixed(1)}" stroke="${color}" stroke-width="1.8" />\n<line x1="${t2a_x.toFixed(1)}" y1="${t2a_y.toFixed(1)}" x2="${t2b_x.toFixed(1)}" y2="${t2b_y.toFixed(1)}" stroke="${color}" stroke-width="1.8" />`;
  }

  if (type === 'tick3') {
    const offset = 3.5;
    const m1x = mx - offset * px;
    const m1y = my - offset * py;
    const m2x = mx;
    const m2y = my;
    const m3x = mx + offset * px;
    const m3y = my + offset * py;

    return `<line x1="${(m1x + length * nx).toFixed(1)}" y1="${(m1y + length * ny).toFixed(1)}" x2="${(m1x - length * nx).toFixed(1)}" y2="${(m1y - length * ny).toFixed(1)}" stroke="${color}" stroke-width="1.8" />\n<line x1="${(m2x + length * nx).toFixed(1)}" y1="${(m2y + length * ny).toFixed(1)}" x2="${(m2x - length * nx).toFixed(1)}" y2="${(m2y - length * ny).toFixed(1)}" stroke="${color}" stroke-width="1.8" />\n<line x1="${(m3x + length * nx).toFixed(1)}" y1="${(m3y + length * ny).toFixed(1)}" x2="${(m3x - length * nx).toFixed(1)}" y2="${(m3y - length * ny).toFixed(1)}" stroke="${color}" stroke-width="1.8" />`;
  }

  if (type === 'cross') {
    const r = length * 0.9;
    const cos45 = Math.SQRT1_2;
    const d1x = (px + nx) * cos45 * r;
    const d1y = (py + ny) * cos45 * r;
    const d2x = (px - nx) * cos45 * r;
    const d2y = (py - ny) * cos45 * r;

    return `<line x1="${(mx - d1x).toFixed(1)}" y1="${(my - d1y).toFixed(1)}" x2="${(mx + d1x).toFixed(1)}" y2="${(my + d1y).toFixed(1)}" stroke="${color}" stroke-width="1.8" />\n<line x1="${(mx - d2x).toFixed(1)}" y1="${(my - d2y).toFixed(1)}" x2="${(mx + d2x).toFixed(1)}" y2="${(my + d2y).toFixed(1)}" stroke="${color}" stroke-width="1.8" />`;
  }

  return '';
}

/**
 * Computes a right-angle mark '∟' at vertex V between rays towards pt1 and pt2
 */
export function getRightAngleMark(V: Point, pt1: Point, pt2: Point, size: number = 14, color: string = '#d13438'): string {
  const d1x = pt1.x - V.x;
  const d1y = pt1.y - V.y;
  const len1 = Math.hypot(d1x, d1y) || 1;
  const u1x = d1x / len1;
  const u1y = d1y / len1;

  const d2x = pt2.x - V.x;
  const d2y = pt2.y - V.y;
  const len2 = Math.hypot(d2x, d2y) || 1;
  const u2x = d2x / len2;
  const u2y = d2y / len2;

  const p1x = V.x + size * u1x;
  const p1y = V.y + size * u1y;

  const p2x = p1x + size * u2x;
  const p2y = p1y + size * u2y;

  const p3x = V.x + size * u2x;
  const p3y = V.y + size * u2y;

  return `<polyline points="${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)} ${p3x.toFixed(1)},${p3y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.6" />`;
}

/**
 * Computes an arc marking an angle at vertex V between rays towards pt1 and pt2
 */
export function getAngleArc(V: Point, pt1: Point, pt2: Point, radius: number = 24, color: string = '#d13438'): string {
  const a1 = Math.atan2(pt1.y - V.y, pt1.x - V.x);
  const a2 = Math.atan2(pt2.y - V.y, pt2.x - V.x);

  // Normalize angle difference to be within [0, 2*PI]
  let diff = a2 - a1;
  while (diff < 0) diff += 2 * Math.PI;
  while (diff > 2 * Math.PI) diff -= 2 * Math.PI;

  // We want the interior angle (< PI)
  let startAngle = a1;
  let sweepAngle = diff;
  let sweepFlag = 1;

  if (diff > Math.PI) {
    startAngle = a2;
    sweepAngle = 2 * Math.PI - diff;
    sweepFlag = 1;
  }

  const endAngle = startAngle + sweepAngle;

  const startX = V.x + radius * Math.cos(startAngle);
  const startY = V.y + radius * Math.sin(startAngle);

  const endX = V.x + radius * Math.cos(endAngle);
  const endY = V.y + radius * Math.sin(endAngle);

  return `<path d="M ${startX.toFixed(1)},${startY.toFixed(1)} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX.toFixed(1)},${endY.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.6" />`;
}

/**
 * Computes equal segment tick marks (single or double) on segment between pt1 and pt2
 */
export function getSegmentTicks(pt1: Point, pt2: Point, count: 1 | 2 = 1, length: number = 6, color: string = '#d13438'): string {
  const mx = (pt1.x + pt2.x) / 2;
  const my = (pt1.y + pt2.y) / 2;

  const dx = pt2.x - pt1.x;
  const dy = pt2.y - pt1.y;
  const len = Math.hypot(dx, dy) || 1;

  // Normal unit vector perpendicular to segment
  const nx = -dy / len;
  const ny = dx / len;

  // Parallel unit vector
  const px = dx / len;
  const py = dy / len;

  if (count === 1) {
    const x1 = mx + length * nx;
    const y1 = my + length * ny;
    const x2 = mx - length * nx;
    const y2 = my - length * ny;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="1.8" />`;
  } else {
    const offset = 2.5;
    const m1x = mx - offset * px;
    const m1y = my - offset * py;
    const m2x = mx + offset * px;
    const m2y = my + offset * py;

    const t1a_x = m1x + length * nx;
    const t1a_y = m1y + length * ny;
    const t1b_x = m1x - length * nx;
    const t1b_y = m1y - length * ny;

    const t2a_x = m2x + length * nx;
    const t2a_y = m2y + length * ny;
    const t2b_x = m2x - length * nx;
    const t2b_y = m2y - length * ny;

    return `
      <line x1="${t1a_x.toFixed(1)}" y1="${t1a_y.toFixed(1)}" x2="${t1b_x.toFixed(1)}" y2="${t1b_y.toFixed(1)}" stroke="${color}" stroke-width="1.8" />
      <line x1="${t2a_x.toFixed(1)}" y1="${t2a_y.toFixed(1)}" x2="${t2b_x.toFixed(1)}" y2="${t2b_y.toFixed(1)}" stroke="${color}" stroke-width="1.8" />
    `;
  }
}

/**
 * Computes the projection of point P onto the line passing through A and B
 */
export function getProjection(P: Point, A: Point, B: Point): Point {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { ...A };

  const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / lenSq;
  return {
    x: A.x + t * dx,
    y: A.y + t * dy
  };
}

/**
 * Computes intersection of two lines: line1 (P1, P2) and line2 (P3, P4)
 */
export function getLineIntersection(P1: Point, P2: Point, P3: Point, P4: Point): Point | null {
  const d = (P1.x - P2.x) * (P3.y - P4.y) - (P1.y - P2.y) * (P3.x - P4.x);
  if (Math.abs(d) < 1e-6) return null;

  const t = ((P1.x - P3.x) * (P3.y - P4.y) - (P1.y - P3.y) * (P3.x - P4.x)) / d;
  return {
    x: P1.x + t * (P2.x - P1.x),
    y: P1.y + t * (P2.y - P1.y)
  };
}

/**
 * Computes midpoint between two points
 */
export function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

/**
 * Computes ratio point on segment P1P2 such that vector(P1, P) = ratio * vector(P1, P2)
 */
export function getRatioPoint(p1: Point, p2: Point, ratio: number = 0.5): Point {
  return {
    x: p1.x + ratio * (p2.x - p1.x),
    y: p1.y + ratio * (p2.y - p1.y)
  };
}

/**
 * Computes centroid of triangle (P1, P2, P3)
 */
export function getCentroid(p1: Point, p2: Point, p3: Point): Point {
  return {
    x: (p1.x + p2.x + p3.x) / 3,
    y: (p1.y + p2.y + p3.y) / 3
  };
}

/**
 * Computes circumcenter of triangle (A, B, C)
 */
export function getCircumcenter(A: Point, B: Point, C: Point): Point {
  const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(D) < 1e-5) return getCentroid(A, B, C);
  const A2 = A.x * A.x + A.y * A.y;
  const B2 = B.x * B.x + B.y * B.y;
  const C2 = C.x * C.x + C.y * C.y;
  const Ux = (A2 * (B.y - C.y) + B2 * (C.y - A.y) + C2 * (A.y - B.y)) / D;
  const Uy = (A2 * (C.x - B.x) + B2 * (A.x - C.x) + C2 * (B.x - A.x)) / D;
  return { x: Ux, y: Uy };
}

/**
 * Computes incenter of triangle (A, B, C)
 */
export function getIncenter(A: Point, B: Point, C: Point): Point {
  const a = Math.hypot(B.x - C.x, B.y - C.y) || 1;
  const b = Math.hypot(A.x - C.x, A.y - C.y) || 1;
  const c = Math.hypot(A.x - B.x, A.y - B.y) || 1;
  const p = a + b + c;
  return {
    x: (a * A.x + b * B.x + c * C.x) / p,
    y: (a * A.y + b * B.y + c * C.y) / p
  };
}

/**
 * Computes orthocenter of triangle (A, B, C)
 */
export function getOrthocenter(A: Point, B: Point, C: Point): Point {
  const H_A = getProjection(A, B, C);
  const H_B = getProjection(B, A, C);
  const inter = getLineIntersection(A, H_A, B, H_B);
  if (inter) return inter;
  return getCentroid(A, B, C);
}

/**
 * Computes circumcircle (center and radius) of triangle (A, B, C)
 */
export function getTriangleCircumcircle(A: Point, B: Point, C: Point): { center: Point; radius: number } {
  const center = getCircumcenter(A, B, C);
  const radius = Math.hypot(center.x - A.x, center.y - A.y);
  return { center, radius };
}

/**
 * Computes incircle (center and radius) of triangle (A, B, C)
 */
export function getTriangleIncircle(A: Point, B: Point, C: Point): { center: Point; radius: number } {
  const a = Math.hypot(B.x - C.x, B.y - C.y);
  const b = Math.hypot(A.x - C.x, A.y - C.y);
  const c = Math.hypot(A.x - B.x, A.y - B.y);
  const s = (a + b + c) / 2;
  const area = Math.abs(getSignedArea2D(A, B, C)) / 2;
  const radius = s > 0 ? area / s : 10;
  const center = getIncenter(A, B, C);
  return { center, radius };
}

/**
 * Computes endpoints of a segment passing through P and parallel to AB
 */
export function getParallelEndpoints(P: Point, A: Point, B: Point, length: number = 60): { p1: Point; p2: Point } {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const half = length / 2;
  return {
    p1: { x: P.x - ux * half, y: P.y - uy * half },
    p2: { x: P.x + ux * half, y: P.y + uy * half }
  };
}

/**
 * Computes endpoints of a segment passing through P and perpendicular to AB
 */
export function getPerpendicularEndpoints(P: Point, A: Point, B: Point, length: number = 60): { p1: Point; p2: Point } {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const half = length / 2;
  return {
    p1: { x: P.x - nx * half, y: P.y - ny * half },
    p2: { x: P.x + nx * half, y: P.y + ny * half }
  };
}

/**
 * Computes extended endpoints of segment P1P2 extending beyond both ends
 */
export function getExtendedEndpoints(p1: Point, p2: Point, ext1: number = 25, ext2: number = 25): { start: Point; end: Point } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    start: { x: p1.x - ux * ext1, y: p1.y - uy * ext1 },
    end: { x: p2.x + ux * ext2, y: p2.y + uy * ext2 }
  };
}

export interface RenderedExtraResult {
  svgContent: string;
  resolvedPointMap: Record<string, Point>;
  extraDraggableVertices: {
    id: string;
    pt: Point;
    label: string;
    labelOffset: { x: number; y: number };
    color?: string;
  }[];
}

/**
 * Recalculates and renders all user-added extra points, lines, and shapes dynamically
 */
export function renderExtraElements(
  extraPoints: ExtraPoint[],
  extraLines: ExtraLine[],
  extraShapes: ExtraShape[],
  basePointMap: Record<string, Point>,
  customPoints?: Record<string, Point>
): RenderedExtraResult {
  const resolvedPointMap: Record<string, Point> = { ...basePointMap };
  const extraDraggableVertices: {
    id: string;
    pt: Point;
    label: string;
    labelOffset: { x: number; y: number };
    color?: string;
  }[] = [];

  let shapesSvg = '';
  let linesSvg = '';
  let pointsSvg = '';

  // 1. Resolve Extra Points (2 passes to resolve chained geometric dependencies)
  for (let pass = 0; pass < 2; pass++) {
    for (const p of extraPoints) {
      if (p.type === 'midpoint' && p.pt1 && p.pt2 && resolvedPointMap[p.pt1] && resolvedPointMap[p.pt2]) {
        resolvedPointMap[p.id] = getMidpoint(resolvedPointMap[p.pt1], resolvedPointMap[p.pt2]);
      } else if (p.type === 'centroid' && p.pt1 && p.pt2 && p.pt3 && resolvedPointMap[p.pt1] && resolvedPointMap[p.pt2] && resolvedPointMap[p.pt3]) {
        resolvedPointMap[p.id] = getCentroid(resolvedPointMap[p.pt1], resolvedPointMap[p.pt2], resolvedPointMap[p.pt3]);
      } else if (p.type === 'orthocenter' && p.pt1 && p.pt2 && p.pt3 && resolvedPointMap[p.pt1] && resolvedPointMap[p.pt2] && resolvedPointMap[p.pt3]) {
        resolvedPointMap[p.id] = getOrthocenter(resolvedPointMap[p.pt1], resolvedPointMap[p.pt2], resolvedPointMap[p.pt3]);
      } else if (p.type === 'circumcenter' && p.pt1 && p.pt2 && p.pt3 && resolvedPointMap[p.pt1] && resolvedPointMap[p.pt2] && resolvedPointMap[p.pt3]) {
        resolvedPointMap[p.id] = getCircumcenter(resolvedPointMap[p.pt1], resolvedPointMap[p.pt2], resolvedPointMap[p.pt3]);
      } else if (p.type === 'incenter' && p.pt1 && p.pt2 && p.pt3 && resolvedPointMap[p.pt1] && resolvedPointMap[p.pt2] && resolvedPointMap[p.pt3]) {
        resolvedPointMap[p.id] = getIncenter(resolvedPointMap[p.pt1], resolvedPointMap[p.pt2], resolvedPointMap[p.pt3]);
      } else if (p.type === 'projection' && p.fromPt && p.ontoLineP1 && p.ontoLineP2 && resolvedPointMap[p.fromPt] && resolvedPointMap[p.ontoLineP1] && resolvedPointMap[p.ontoLineP2]) {
        resolvedPointMap[p.id] = getProjection(resolvedPointMap[p.fromPt], resolvedPointMap[p.ontoLineP1], resolvedPointMap[p.ontoLineP2]);
      } else if (p.type === 'intersection' && p.line1P1 && p.line1P2 && p.line2P1 && p.line2P2 && resolvedPointMap[p.line1P1] && resolvedPointMap[p.line1P2] && resolvedPointMap[p.line2P1] && resolvedPointMap[p.line2P2]) {
        const inter = getLineIntersection(resolvedPointMap[p.line1P1], resolvedPointMap[p.line1P2], resolvedPointMap[p.line2P1], resolvedPointMap[p.line2P2]);
        if (inter) resolvedPointMap[p.id] = inter;
      } else if (p.type === 'ratio' && p.pt1 && p.pt2 && resolvedPointMap[p.pt1] && resolvedPointMap[p.pt2]) {
        resolvedPointMap[p.id] = getRatioPoint(resolvedPointMap[p.pt1], resolvedPointMap[p.pt2], p.ratio ?? 0.5);
      } else if (p.type === 'free') {
        resolvedPointMap[p.id] = (customPoints && customPoints[p.id]) || p.fixedPt || { x: 155, y: 115 };
      }
    }
  }

  // 2. Render Extra Shapes (Fills and circles behind lines)
  for (const s of extraShapes) {
    const dashAttr = s.style === 'dashed' ? 'stroke-dasharray="4 4"' : '';
    const sw = s.strokeWidth || 1.6;
    const col = s.color || '#0f6cbd';
    const fillCol = s.fill || 'none';

    if (s.type === 'polygon_cross_section' && s.pts && s.pts.length >= 3) {
      const validPts = s.pts.map(id => resolvedPointMap[id]).filter(Boolean);
      if (validPts.length >= 3) {
        const ptsStr = validPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
        shapesSvg += `<polygon points="${ptsStr}" fill="${fillCol !== 'none' ? fillCol : 'rgba(209, 52, 56, 0.18)'}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
      }
    } else if (s.type === 'circle_center_point' && s.center && s.through && resolvedPointMap[s.center] && resolvedPointMap[s.through]) {
      const c = resolvedPointMap[s.center];
      const t = resolvedPointMap[s.through];
      const r = Math.hypot(t.x - c.x, t.y - c.y);
      shapesSvg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fillCol}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    } else if (s.type === 'circle_center_radius' && s.center && resolvedPointMap[s.center]) {
      const c = resolvedPointMap[s.center];
      const r = s.radius || 40;
      shapesSvg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fillCol}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    } else if (s.type === 'circumcircle' && s.pts && s.pts.length >= 3 && resolvedPointMap[s.pts[0]] && resolvedPointMap[s.pts[1]] && resolvedPointMap[s.pts[2]]) {
      const { center, radius } = getTriangleCircumcircle(resolvedPointMap[s.pts[0]], resolvedPointMap[s.pts[1]], resolvedPointMap[s.pts[2]]);
      shapesSvg += `<circle cx="${center.x.toFixed(1)}" cy="${center.y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fillCol}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    } else if (s.type === 'incircle' && s.pts && s.pts.length >= 3 && resolvedPointMap[s.pts[0]] && resolvedPointMap[s.pts[1]] && resolvedPointMap[s.pts[2]]) {
      const { center, radius } = getTriangleIncircle(resolvedPointMap[s.pts[0]], resolvedPointMap[s.pts[1]], resolvedPointMap[s.pts[2]]);
      shapesSvg += `<circle cx="${center.x.toFixed(1)}" cy="${center.y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fillCol}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    }
  }

  // 3. Render Extra Lines
  for (const l of extraLines) {
    const dashAttr = l.style === 'dashed' ? 'stroke-dasharray="4 4"' : '';
    const sw = l.strokeWidth || 1.8;
    const col = l.color || '#d13438';

    if (l.type === 'segment' && l.p1 && l.p2 && resolvedPointMap[l.p1] && resolvedPointMap[l.p2]) {
      const pt1 = resolvedPointMap[l.p1];
      const pt2 = resolvedPointMap[l.p2];
      linesSvg += `<line x1="${pt1.x.toFixed(1)}" y1="${pt1.y.toFixed(1)}" x2="${pt2.x.toFixed(1)}" y2="${pt2.y.toFixed(1)}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    } else if (l.type === 'line' && l.p1 && l.p2 && resolvedPointMap[l.p1] && resolvedPointMap[l.p2]) {
      const ext = getExtendedEndpoints(resolvedPointMap[l.p1], resolvedPointMap[l.p2], l.length || 25, l.length || 25);
      linesSvg += `<line x1="${ext.start.x.toFixed(1)}" y1="${ext.start.y.toFixed(1)}" x2="${ext.end.x.toFixed(1)}" y2="${ext.end.y.toFixed(1)}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    } else if (l.type === 'parallel' && l.p1 && l.refLineP1 && l.refLineP2 && resolvedPointMap[l.p1] && resolvedPointMap[l.refLineP1] && resolvedPointMap[l.refLineP2]) {
      const ends = getParallelEndpoints(resolvedPointMap[l.p1], resolvedPointMap[l.refLineP1], resolvedPointMap[l.refLineP2], l.length || 70);
      linesSvg += `<line x1="${ends.p1.x.toFixed(1)}" y1="${ends.p1.y.toFixed(1)}" x2="${ends.p2.x.toFixed(1)}" y2="${ends.p2.y.toFixed(1)}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
    } else if (l.type === 'perpendicular' && l.p1 && l.refLineP1 && l.refLineP2 && resolvedPointMap[l.p1] && resolvedPointMap[l.refLineP1] && resolvedPointMap[l.refLineP2]) {
      const P = resolvedPointMap[l.p1];
      const A = resolvedPointMap[l.refLineP1];
      const B = resolvedPointMap[l.refLineP2];
      const H = getProjection(P, A, B);
      linesSvg += `<line x1="${P.x.toFixed(1)}" y1="${P.y.toFixed(1)}" x2="${H.x.toFixed(1)}" y2="${H.y.toFixed(1)}" stroke="${col}" stroke-width="${sw}" ${dashAttr} />\n`;
      if (l.hasRightAngle) {
        linesSvg += getRightAngleMark(H, P, B, 11, col) + '\n';
      }
    }
  }

  // 4. Render Points and Labels
  const textStyle = 'font-family="Cambria Math, Times New Roman, serif" font-size="13" font-style="italic" font-weight="bold" fill="#242424"';
  for (const p of extraPoints) {
    const pt = resolvedPointMap[p.id];
    if (!pt) continue;

    const offset = p.labelOffset || { x: 7, y: -7 };
    const col = p.color || '#d13438';

    // If free point, make it draggable handle
    if (p.type === 'free') {
      extraDraggableVertices.push({
        id: p.id,
        pt,
        label: p.label,
        labelOffset: offset,
        color: col
      });
    } else {
      // Derived point: render static dot and label into svgContent
      pointsSvg += `
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2.8" fill="${col}" />
        <text x="${(pt.x + offset.x).toFixed(1)}" y="${(pt.y + offset.y).toFixed(1)}" ${textStyle}>${p.label}</text>
      `;
    }
  }

  const svgContent = `${shapesSvg}${linesSvg}${pointsSvg}`;
  return { svgContent, resolvedPointMap, extraDraggableVertices };
}

/**
 * Computes 2D signed area of triangle (P1, P2, P3)
 * Positive if counter-clockwise (in standard cartesian), negative if clockwise
 */
export function getSignedArea2D(p1: Point, p2: Point, p3: Point): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

/**
 * Computes 2D Convex Hull of a set of points using Monotone Chain algorithm
 * Returns points in counter-clockwise order along the boundary
 */
export function get2DConvexHull(pts: Point[]): Point[] {
  if (pts.length <= 3) return [...pts];

  // Remove duplicates & sort by x, then by y
  const sorted = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const unique: Point[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || Math.hypot(sorted[i].x - unique[unique.length - 1].x, sorted[i].y - unique[unique.length - 1].y) > 0.5) {
      unique.push(sorted[i]);
    }
  }
  if (unique.length <= 3) return unique;

  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  // Lower hull
  const lower: Point[] = [];
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: Point[] = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Checks if segment (p1, p2) is an edge on the convex hull boundary
 */
export function isSegmentOnHull(p1: Point, p2: Point, hull: Point[]): boolean {
  const n = hull.length;
  if (n < 2) return false;
  const match = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 1.5;

  for (let i = 0; i < n; i++) {
    const cur = hull[i];
    const next = hull[(i + 1) % n];
    if ((match(p1, cur) && match(p2, next)) || (match(p1, next) && match(p2, cur))) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if point P is inside triangle (A, B, C)
 */
export function isPointInTriangle(P: Point, A: Point, B: Point, C: Point): boolean {
  const d1 = getSignedArea2D(P, A, B);
  const d2 = getSignedArea2D(P, B, C);
  const d3 = getSignedArea2D(P, C, A);
  const hasNeg = (d1 < -0.1) || (d2 < -0.1) || (d3 < -0.1);
  const hasPos = (d1 > 0.1) || (d2 > 0.1) || (d3 > 0.1);
  return !(hasNeg && hasPos);
}

/**
 * DYNAMIC 3D VISIBILITY ALGORITHM FOR TRIANGULAR PYRAMID S.ABC
 * Guarantees 100% exact solid vs dashed edges for ANY dragged position of S, A, B, C
 */
export function getTriPyramidVisibility(S: Point, A: Point, B: Point, C: Point): Record<string, boolean> {
  const hull = get2DConvexHull([S, A, B, C]);
  const onHull = (p1: Point, p2: Point) => isSegmentOnHull(p1, p2, hull);

  const vis: Record<string, boolean> = {
    SA: onHull(S, A),
    SB: onHull(S, B),
    SC: onHull(S, C),
    AB: onHull(A, B),
    BC: onHull(B, C),
    CA: onHull(C, A)
  };

  // Case 1: All 4 edges on hull form a 4-gon
  if (hull.length === 4) {
    // There are 2 internal diagonals: one lateral ridge (S to front vertex) and one base edge
    // Find the base vertex with maximum y (closest to front viewer)
    const basePts = [
      { id: 'A', pt: A },
      { id: 'B', pt: B },
      { id: 'C', pt: C }
    ];
    basePts.sort((p1, p2) => p2.pt.y - p1.pt.y);
    const frontId = basePts[0].id; // Vertex with max y

    // Lateral ridge from S to front vertex is front-facing (solid)
    if (frontId === 'A') {
      vis.SA = true;
      vis.BC = false; // base edge behind it is dashed
    } else if (frontId === 'B') {
      vis.SB = true;
      vis.CA = false; // base edge behind it is dashed
    } else {
      vis.SC = true;
      vis.AB = false; // base edge behind it is dashed
    }
  }
  // Case 2: Hull has 3 vertices (one vertex is strictly inside the triangle of the other 3)
  else if (hull.length === 3) {
    // Determine which vertex is inside
    const checkInside = (testPt: Point, p1: Point, p2: Point, p3: Point) => isPointInTriangle(testPt, p1, p2, p3);

    // If S is inside triangle ABC (viewed directly from above)
    if (checkInside(S, A, B, C)) {
      vis.AB = true;
      vis.BC = true;
      vis.CA = true;
      vis.SA = true;
      vis.SB = true;
      vis.SC = true;
    }
    // If A is inside triangle SBC (the exact case when A is behind face SBC)
    else if (checkInside(A, S, B, C)) {
      // S, B, C form the front silhouette
      vis.SB = true;
      vis.BC = true;
      vis.SC = true;
      // All 3 edges connected to A are occluded behind face SBC
      vis.SA = false;
      vis.AB = false;
      vis.CA = false;
    }
    // If B is inside triangle SCA
    else if (checkInside(B, S, C, A)) {
      vis.SC = true;
      vis.CA = true;
      vis.SA = true;
      vis.SB = false;
      vis.AB = false;
      vis.BC = false;
    }
    // If C is inside triangle SAB
    else if (checkInside(C, S, A, B)) {
      vis.SA = true;
      vis.AB = true;
      vis.SB = true;
      vis.SC = false;
      vis.BC = false;
      vis.CA = false;
    }
  }

  return vis;
}

/**
 * DYNAMIC 3D VISIBILITY ALGORITHM FOR QUADRILATERAL PYRAMID S.ABCD
 */
export function getQuadPyramidVisibility(S: Point, A: Point, B: Point, C: Point, D: Point): Record<string, boolean> {
  const hull = get2DConvexHull([S, A, B, C, D]);
  const onHull = (p1: Point, p2: Point) => isSegmentOnHull(p1, p2, hull);

  // Compute base orientation
  const baseArea = getSignedArea2D(A, B, C);
  const baseSign = baseArea >= 0 ? 1 : -1;

  // Face front-facing test: in screen coordinates (y-down), a face is front-facing when its winding sign opposes base
  const isFront = (p1: Point, p2: Point) => {
    const area = getSignedArea2D(S, p1, p2);
    const faceSign = area >= 0 ? 1 : -1;
    return faceSign !== baseSign;
  };

  const fAB = isFront(A, B);
  const fBC = isFront(B, C);
  const fCD = isFront(C, D);
  const fDA = isFront(D, A);

  return {
    // Lateral edges: solid if on hull OR if at least one adjacent face is front-facing
    SA: onHull(S, A) || (fDA || fAB),
    SB: onHull(S, B) || (fAB || fBC),
    SC: onHull(S, C) || (fBC || fCD),
    SD: onHull(S, D) || (fCD || fDA),
    // Base edges: solid if on hull OR if their lateral face is front-facing
    AB: onHull(A, B) || fAB,
    BC: onHull(B, C) || fBC,
    CD: onHull(C, D) || fCD,
    DA: onHull(D, A) || fDA
  };
}

/**
 * DYNAMIC 3D VISIBILITY ALGORITHM FOR PRISMS & BOXES
 */
export function getPrismVisibility(
  bottomPts: Point[],
  topPts: Point[]
): { baseEdges: boolean[]; lateralEdges: boolean[] } {
  const allPts = [...bottomPts, ...topPts];
  const hull = get2DConvexHull(allPts);
  const onHull = (p1: Point, p2: Point) => isSegmentOnHull(p1, p2, hull);

  const n = bottomPts.length;
  const baseEdges: boolean[] = [];
  const lateralEdges: boolean[] = [];

  // Face front-facing test for each lateral rectangle: (V1, V2, V2t, V1t)
  const isFaceFront: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = bottomPts[i];
    const p2 = bottomPts[(i + 1) % n];
    const p1t = topPts[i];
    // In screen coordinates with height upwards (p1t.y < p1.y), front face has signedArea < 0
    const area = getSignedArea2D(p1, p2, p1t);
    isFaceFront.push(area < 0);
  }

  // Bottom base edges: visible if face is front OR on hull
  for (let i = 0; i < n; i++) {
    const p1 = bottomPts[i];
    const p2 = bottomPts[(i + 1) % n];
    baseEdges.push(onHull(p1, p2) || isFaceFront[i]);
  }

  // Lateral edges: visible if on hull OR at least one adjacent face is front
  for (let i = 0; i < n; i++) {
    const p1 = bottomPts[i];
    const p1t = topPts[i];
    const prevFace = isFaceFront[(i - 1 + n) % n];
    const curFace = isFaceFront[i];
    lateralEdges.push(onHull(p1, p1t) || prevFace || curFace);
  }

  return { baseEdges, lateralEdges };
}

/**
 * GEOMETRIC CONSTRAINT PROPAGATION ENGINE FOR 3D SHAPES
 * Ensures parallel, perpendicular, and congruence invariants are strictly maintained when vertices are dragged.
 */
export function calculateSpaceConstraints(
  category: string,
  shapeType: string,
  dragId: string,
  newPt: Point,
  currentPoints: Record<string, Point>,
  defaults: Record<string, Point>
): Record<string, Point> {
  const getP = (id: string) => currentPoints[id] || defaults[id] || { x: 100, y: 100 };

  // ==========================================
  // 1. PRISMS & BOXES (Hình hộp chữ nhật, lập phương, lăng trụ)
  // Invariant: Top base is a parallel translation of bottom base by lateral vector v.
  // ==========================================
  if (category === 'prisms') {
    if (shapeType === 'prism_rect' || shapeType === 'cube') {
      const pA = getP('A');
      const pB = getP('B');
      const pC = getP('C');
      const pD = getP('D');
      const pAt = getP('At');

      // Current lateral vector from A to At (or default offset)
      const v = { x: pAt.x - pA.x, y: pAt.y - pA.y };

      // Case 1: Dragging any TOP vertex (At, Bt, Ct, Dt)
      // Tilts/scales the entire top face in parallel lockstep!
      if (['At', 'Bt', 'Ct', 'Dt'].includes(dragId)) {
        let vNew = { ...v };
        if (dragId === 'At') vNew = { x: newPt.x - pA.x, y: newPt.y - pA.y };
        else if (dragId === 'Bt') vNew = { x: newPt.x - pB.x, y: newPt.y - pB.y };
        else if (dragId === 'Ct') vNew = { x: newPt.x - pC.x, y: newPt.y - pC.y };
        else if (dragId === 'Dt') vNew = { x: newPt.x - pD.x, y: newPt.y - pD.y };

        return {
          ...currentPoints,
          At: { x: Math.round(pA.x + vNew.x), y: Math.round(pA.y + vNew.y) },
          Bt: { x: Math.round(pB.x + vNew.x), y: Math.round(pB.y + vNew.y) },
          Ct: { x: Math.round(pC.x + vNew.x), y: Math.round(pC.y + vNew.y) },
          Dt: { x: Math.round(pD.x + vNew.x), y: Math.round(pD.y + vNew.y) }
        };
      }

      // Case 2: Dragging a BOTTOM vertex (A, B, C, D)
      // Maintains parallelogram base (C = B + D - A) and translates corresponding top vertices
      if (dragId === 'D') {
        const nD = newPt;
        const nC = { x: Math.round(pB.x + nD.x - pA.x), y: Math.round(pB.y + nD.y - pA.y) };
        return {
          ...currentPoints,
          D: nD,
          C: nC,
          Dt: { x: Math.round(nD.x + v.x), y: Math.round(nD.y + v.y) },
          Ct: { x: Math.round(nC.x + v.x), y: Math.round(nC.y + v.y) }
        };
      }

      if (dragId === 'B') {
        const nB = newPt;
        const nC = { x: Math.round(nB.x + pD.x - pA.x), y: Math.round(nB.y + pD.y - pA.y) };
        return {
          ...currentPoints,
          B: nB,
          C: nC,
          Bt: { x: Math.round(nB.x + v.x), y: Math.round(nB.y + v.y) },
          Ct: { x: Math.round(nC.x + v.x), y: Math.round(nC.y + v.y) }
        };
      }

      if (dragId === 'C') {
        const nC = newPt;
        const nD = { x: Math.round(pA.x + nC.x - pB.x), y: Math.round(pA.y + nC.y - pB.y) };
        return {
          ...currentPoints,
          C: nC,
          D: nD,
          Ct: { x: Math.round(nC.x + v.x), y: Math.round(nC.y + v.y) },
          Dt: { x: Math.round(nD.x + v.x), y: Math.round(nD.y + v.y) }
        };
      }

      if (dragId === 'A') {
        const nA = newPt;
        const nC = { x: Math.round(pB.x + pD.x - nA.x), y: Math.round(pB.y + pD.y - nA.y) };
        return {
          ...currentPoints,
          A: nA,
          C: nC,
          At: { x: Math.round(nA.x + v.x), y: Math.round(nA.y + v.y) },
          Ct: { x: Math.round(nC.x + v.x), y: Math.round(nC.y + v.y) }
        };
      }
    }

    if (shapeType === 'prism_tri' || shapeType === 'prism_tri_oblique') {
      const pA = getP('A');
      const pB = getP('B');
      const pC = getP('C');
      const pAt = getP('At');
      const v = { x: pAt.x - pA.x, y: pAt.y - pA.y };

      // Dragging any top vertex moves all top vertices in lockstep
      if (['At', 'Bt', 'Ct'].includes(dragId)) {
        let vNew = { ...v };
        if (dragId === 'At') vNew = { x: newPt.x - pA.x, y: newPt.y - pA.y };
        else if (dragId === 'Bt') vNew = { x: newPt.x - pB.x, y: newPt.y - pB.y };
        else if (dragId === 'Ct') vNew = { x: newPt.x - pC.x, y: newPt.y - pC.y };

        return {
          ...currentPoints,
          At: { x: Math.round(pA.x + vNew.x), y: Math.round(pA.y + vNew.y) },
          Bt: { x: Math.round(pB.x + vNew.x), y: Math.round(pB.y + vNew.y) },
          Ct: { x: Math.round(pC.x + vNew.x), y: Math.round(pC.y + vNew.y) }
        };
      }

      // Dragging a bottom vertex moves corresponding top vertex along
      if (['A', 'B', 'C'].includes(dragId)) {
        const nV = newPt;
        const nVt = { x: Math.round(nV.x + v.x), y: Math.round(nV.y + v.y) };
        return {
          ...currentPoints,
          [dragId]: nV,
          [dragId + 't']: nVt
        };
      }
    }
  }

  // ==========================================
  // 2. KHỐI CHÓP (PYRAMIDS)
  // Invariant: Regular apex centered at base center; SA perp base stays strictly vertical.
  // ==========================================
  if (category === 'pyramids') {
    if (shapeType === 'pyramid_tri_reg') {
      const pA = getP('A');
      const pB = getP('B');
      const pC = getP('C');
      const pS = getP('S');

      if (dragId === 'S') {
        const Ox = (pA.x + pB.x + pC.x) / 3;
        return {
          ...currentPoints,
          S: { x: Math.round(Ox), y: newPt.y }
        };
      }

      const nA = dragId === 'A' ? newPt : pA;
      const nB = dragId === 'B' ? newPt : pB;
      const nC = dragId === 'C' ? newPt : pC;
      const newOx = (nA.x + nB.x + nC.x) / 3;

      return {
        ...currentPoints,
        [dragId]: newPt,
        S: { x: Math.round(newOx), y: pS.y }
      };
    }

    if (shapeType === 'pyramid_quad_reg') {
      const pA = getP('A');
      const pB = getP('B');
      const pC = getP('C');
      const pD = getP('D');
      const pS = getP('S');

      let nA = pA, nB = pB, nC = pC, nD = pD;
      if (dragId === 'S') {
        const Ox = (pA.x + pC.x) / 2;
        return {
          ...currentPoints,
          S: { x: Math.round(Ox), y: newPt.y }
        };
      }

      if (dragId === 'D') {
        nD = newPt;
        nC = { x: Math.round(pB.x + nD.x - pA.x), y: Math.round(pB.y + nD.y - pA.y) };
      } else if (dragId === 'B') {
        nB = newPt;
        nC = { x: Math.round(nB.x + pD.x - pA.x), y: Math.round(nB.y + pD.y - pA.y) };
      } else if (dragId === 'C') {
        nC = newPt;
        nD = { x: Math.round(pA.x + nC.x - pB.x), y: Math.round(pA.y + nC.y - pB.y) };
      } else if (dragId === 'A') {
        nA = newPt;
        nC = { x: Math.round(pB.x + pD.x - nA.x), y: Math.round(pB.y + pD.y - nA.y) };
      }

      const newOx = (nA.x + nC.x) / 2;
      return {
        ...currentPoints,
        A: nA,
        B: nB,
        C: nC,
        D: nD,
        S: { x: Math.round(newOx), y: pS.y }
      };
    }

    if (shapeType === 'pyramid_tri_sa') {
      const pA = getP('A');
      const pS = getP('S');

      if (dragId === 'S') {
        return {
          ...currentPoints,
          S: { x: pA.x, y: newPt.y }
        };
      }

      if (dragId === 'A') {
        return {
          ...currentPoints,
          A: newPt,
          S: { x: newPt.x, y: pS.y }
        };
      }

      return { ...currentPoints, [dragId]: newPt };
    }

    if (shapeType === 'pyramid_quad_sa') {
      const pA = getP('A');
      const pB = getP('B');
      const pD = getP('D');
      const pS = getP('S');

      if (dragId === 'S') {
        return {
          ...currentPoints,
          S: { x: pA.x, y: newPt.y }
        };
      }

      if (dragId === 'A') {
        const nA = newPt;
        const nC = { x: Math.round(pB.x + pD.x - nA.x), y: Math.round(pB.y + pD.y - nA.y) };
        return {
          ...currentPoints,
          A: nA,
          C: nC,
          S: { x: nA.x, y: pS.y }
        };
      }

      if (dragId === 'D') {
        const nD = newPt;
        const nC = { x: Math.round(pB.x + nD.x - pA.x), y: Math.round(pB.y + nD.y - pA.y) };
        return { ...currentPoints, D: nD, C: nC };
      }

      if (dragId === 'B') {
        const nB = newPt;
        const nC = { x: Math.round(nB.x + pD.x - pA.x), y: Math.round(nB.y + pD.y - pA.y) };
        return { ...currentPoints, B: nB, C: nC };
      }

      if (dragId === 'C') {
        const nC = newPt;
        const nD = { x: Math.round(pA.x + nC.x - pB.x), y: Math.round(pA.y + nC.y - pB.y) };
        return { ...currentPoints, C: nC, D: nD };
      }
    }

    if (shapeType === 'tetrahedron_ortho') {
      const pO = getP('O');
      const pA = getP('A');

      if (dragId === 'A') {
        return {
          ...currentPoints,
          A: { x: pO.x, y: newPt.y }
        };
      }

      if (dragId === 'O') {
        return {
          ...currentPoints,
          O: newPt,
          A: { x: newPt.x, y: pA.y }
        };
      }

      return { ...currentPoints, [dragId]: newPt };
    }
  }

  // ==========================================
  // 3. KHỐI TRÒN XOAY (SOLIDS OF REVOLUTION)
  // ==========================================
  if (category === 'solids_rev') {
    if (shapeType === 'cone') {
      const pO = getP('O');
      if (dragId === 'S') {
        return { ...currentPoints, S: { x: pO.x, y: newPt.y } };
      }
      if (dragId === 'O') {
        const pS = getP('S');
        return { ...currentPoints, O: newPt, S: { x: newPt.x, y: pS.y } };
      }
      if (dragId === 'A') {
        return { ...currentPoints, A: { x: newPt.x, y: pO.y } };
      }
    }
    if (shapeType === 'cylinder') {
      const pO2 = getP('O2');
      if (dragId === 'O1') {
        return { ...currentPoints, O1: { x: pO2.x, y: newPt.y } };
      }
      if (dragId === 'O2') {
        const pO1 = getP('O1');
        return { ...currentPoints, O2: newPt, O1: { x: newPt.x, y: pO1.y } };
      }
    }
  }

  // ==========================================
  // 4. KHÁI NIỆM HÌNH KHÔNG GIAN SGK
  // ==========================================
  if (category === 'spatial_concepts') {
    if (shapeType === 'line_perp_plane') {
      if (dragId === 'H') return { ...currentPoints, H: newPt };
    }
    if (shapeType === 'line_plane_angle') {
      const pH = getP('H');
      if (dragId === 'S') return { ...currentPoints, S: { x: pH.x, y: newPt.y } };
      if (dragId === 'H') {
        const pS = getP('S');
        return { ...currentPoints, H: newPt, S: { x: newPt.x, y: pS.y } };
      }
      if (dragId === 'A') return { ...currentPoints, A: newPt };
    }
    if (shapeType === 'point_plane_dist') {
      const pH = getP('H');
      if (dragId === 'M') return { ...currentPoints, M: { x: pH.x, y: newPt.y } };
      if (dragId === 'H') {
        const pM = getP('M');
        return { ...currentPoints, H: newPt, M: { x: newPt.x, y: pM.y } };
      }
    }
  }

  // Default fallback for unconstrained 3D shapes
  return { ...currentPoints, [dragId]: newPt };
}

/**
 * GEOMETRIC CONSTRAINT PROPAGATION ENGINE FOR 2D SHAPES
 * Guarantees mathematical invariants for parallelograms, rectangles, squares, rhombuses, isosceles/right triangles.
 */
export function calculatePlaneConstraints(
  category: string,
  shapeType: string,
  dragId: string,
  newPt: Point,
  currentPoints: Record<string, Point>,
  defaults: Record<string, Point>
): Record<string, Point> {
  const getP = (id: string) => currentPoints[id] || defaults[id] || { x: 100, y: 100 };

  // ==========================================
  // 1. TỨ GIÁC (QUADRILATERALS)
  // ==========================================
  if (category === 'quads') {
    const pA = getP('A');
    const pB = getP('B');
    const pC = getP('C');
    const pD = getP('D');

    if (shapeType === 'parallelogram') {
      if (dragId === 'A') {
        const nA = newPt;
        const nD = { x: Math.round(nA.x + pC.x - pB.x), y: Math.round(nA.y + pC.y - pB.y) };
        return { ...currentPoints, A: nA, D: nD };
      }
      if (dragId === 'B') {
        const nB = newPt;
        const nC = { x: Math.round(nB.x + pD.x - pA.x), y: Math.round(nB.y + pD.y - pA.y) };
        return { ...currentPoints, B: nB, C: nC };
      }
      if (dragId === 'C') {
        const nC = newPt;
        const nD = { x: Math.round(pA.x + nC.x - pB.x), y: Math.round(pA.y + nC.y - pB.y) };
        return { ...currentPoints, C: nC, D: nD };
      }
      if (dragId === 'D') {
        const nD = newPt;
        const nC = { x: Math.round(pB.x + nD.x - pA.x), y: Math.round(pB.y + nD.y - pA.y) };
        return { ...currentPoints, D: nD, C: nC };
      }
    }

    if (shapeType === 'rectangle') {
      const dx = pC.x - pB.x;
      const dy = pC.y - pB.y;
      const len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len;
      let ny = dx / len;
      if (ny > 0) { nx = -nx; ny = -ny; }

      const curH = Math.max(30, (pB.x - pA.x) * nx + (pB.y - pA.y) * ny);

      if (dragId === 'A' || dragId === 'D') {
        const basePt = dragId === 'A' ? pB : pC;
        const rawH = (basePt.x - newPt.x) * nx + (basePt.y - newPt.y) * ny;
        const newH = Math.max(25, rawH);
        return {
          ...currentPoints,
          A: { x: Math.round(pB.x - newH * nx), y: Math.round(pB.y - newH * ny) },
          D: { x: Math.round(pC.x - newH * nx), y: Math.round(pC.y - newH * ny) }
        };
      }

      if (dragId === 'B') {
        const nB = newPt;
        return {
          ...currentPoints,
          B: nB,
          A: { x: Math.round(nB.x - curH * nx), y: Math.round(nB.y - curH * ny) }
        };
      }

      if (dragId === 'C') {
        const nC = newPt;
        return {
          ...currentPoints,
          C: nC,
          D: { x: Math.round(nC.x - curH * nx), y: Math.round(nC.y - curH * ny) }
        };
      }
    }

    if (shapeType === 'square') {
      if (dragId === 'C') {
        const nC = newPt;
        const dx = nC.x - pB.x;
        const dy = nC.y - pB.y;
        const s = Math.hypot(dx, dy) || 1;
        let nx = -dy / s;
        let ny = dx / s;
        if (ny > 0) { nx = -nx; ny = -ny; }
        return {
          ...currentPoints,
          C: nC,
          A: { x: Math.round(pB.x - s * nx), y: Math.round(pB.y - s * ny) },
          D: { x: Math.round(nC.x - s * nx), y: Math.round(nC.y - s * ny) }
        };
      }

      if (dragId === 'B') {
        const nB = newPt;
        const dx = pC.x - nB.x;
        const dy = pC.y - nB.y;
        const s = Math.hypot(dx, dy) || 1;
        let nx = -dy / s;
        let ny = dx / s;
        if (ny > 0) { nx = -nx; ny = -ny; }
        return {
          ...currentPoints,
          B: nB,
          A: { x: Math.round(nB.x - s * nx), y: Math.round(nB.y - s * ny) },
          D: { x: Math.round(pC.x - s * nx), y: Math.round(pC.y - s * ny) }
        };
      }

      if (dragId === 'A' || dragId === 'D') {
        const dx = pC.x - pB.x;
        const dy = pC.y - pB.y;
        const s = Math.hypot(dx, dy) || 1;
        let nx = -dy / s;
        let ny = dx / s;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const rawH = Math.max(30, (pB.x - newPt.x) * nx + (pB.y - newPt.y) * ny);
        // Scale square proportionally
        const ratio = rawH / s;
        const nC = { x: Math.round(pB.x + dx * ratio), y: Math.round(pB.y + dy * ratio) };
        return {
          ...currentPoints,
          C: nC,
          A: { x: Math.round(pB.x - rawH * nx), y: Math.round(pB.y - rawH * ny) },
          D: { x: Math.round(nC.x - rawH * nx), y: Math.round(nC.y - rawH * ny) }
        };
      }
    }

    if (shapeType === 'rhombus') {
      const Ox = 130;
      const Oy = 115;
      if (dragId === 'A') {
        return {
          ...currentPoints,
          A: newPt,
          C: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
      if (dragId === 'C') {
        return {
          ...currentPoints,
          C: newPt,
          A: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
      if (dragId === 'B') {
        return {
          ...currentPoints,
          B: newPt,
          D: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
      if (dragId === 'D') {
        return {
          ...currentPoints,
          D: newPt,
          B: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
    }

    if (shapeType === 'trapezoid') {
      if (dragId === 'A') {
        const shiftX = newPt.x - pA.x;
        return {
          ...currentPoints,
          A: newPt,
          D: { x: Math.round(pD.x + shiftX), y: newPt.y }
        };
      }
      if (dragId === 'D') {
        return {
          ...currentPoints,
          D: { x: newPt.x, y: pA.y }
        };
      }
    }

    if (shapeType === 'iso_trapezoid') {
      const Mx = (pB.x + pC.x) / 2;
      if (dragId === 'A') {
        const dist = Math.abs(newPt.x - Mx);
        return {
          ...currentPoints,
          A: newPt,
          D: { x: Math.round(Mx + dist), y: newPt.y }
        };
      }
      if (dragId === 'D') {
        const dist = Math.abs(newPt.x - Mx);
        return {
          ...currentPoints,
          D: newPt,
          A: { x: Math.round(Mx - dist), y: newPt.y }
        };
      }
    }

    if (shapeType === 'right_trapezoid') {
      if (dragId === 'A') {
        return {
          ...currentPoints,
          A: { x: pB.x, y: newPt.y },
          D: { x: pD.x, y: newPt.y }
        };
      }
      if (dragId === 'D') {
        return {
          ...currentPoints,
          D: { x: newPt.x, y: pA.y }
        };
      }
    }

    if (shapeType === 'regular_pentagon' || shapeType === 'regular_hexagon') {
      const Ox = 155;
      const Oy = 115;
      const R = Math.max(35, Math.min(95, Math.hypot(newPt.x - Ox, newPt.y - Oy)));
      const baseAngle = Math.atan2(newPt.y - Oy, newPt.x - Ox);
      const isHex = shapeType === 'regular_hexagon';
      const nSides = isHex ? 6 : 5;
      const labels = isHex ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['A', 'B', 'C', 'D', 'E'];
      const dragIdx = Math.max(0, labels.indexOf(dragId));
      const updates: Record<string, Point> = {};
      for (let i = 0; i < nSides; i++) {
        const theta = baseAngle + ((i - dragIdx) * 2 * Math.PI) / nSides;
        updates[labels[i]] = {
          x: Math.round(Ox + R * Math.cos(theta)),
          y: Math.round(Oy + R * Math.sin(theta))
        };
      }
      return { ...currentPoints, ...updates };
    }
  }

  // ==========================================
  // 2. KHÁI NIỆM HÌNH HỌC PHẲNG THCS
  // ==========================================
  if (category === 'thcs_concepts') {
    if (shapeType === 'cyclic_quad') {
      const Ox = 150;
      const Oy = 115;
      const R = 80;
      // Khóa chặt 4 đỉnh luôn trượt trên đường tròn (O, R)
      if (['A', 'B', 'C', 'D'].includes(dragId)) {
        const angle = Math.atan2(newPt.y - Oy, newPt.x - Ox);
        return {
          ...currentPoints,
          [dragId]: {
            x: Math.round(Ox + R * Math.cos(angle)),
            y: Math.round(Oy + R * Math.sin(angle))
          }
        };
      }
    }

    if (shapeType === 'tangent_circle') {
      const Ox = 130;
      const Oy = 115;
      const R = 65;
      // Tiếp điểm A luôn nằm trên đường tròn (O, R)
      if (dragId === 'A') {
        const angle = Math.atan2(newPt.y - Oy, newPt.x - Ox);
        return {
          ...currentPoints,
          A: {
            x: Math.round(Ox + R * Math.cos(angle)),
            y: Math.round(Oy + R * Math.sin(angle))
          }
        };
      }
      if (dragId === 'O') {
        return {
          ...currentPoints,
          O: newPt
        };
      }
    }

    if (shapeType === 'opposite_angles') {
      const Ox = 150;
      const Oy = 110;
      // Hai đường thẳng thẳng hàng qua O
      if (dragId === 'A') {
        return {
          ...currentPoints,
          A: newPt,
          B: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
      if (dragId === 'B') {
        return {
          ...currentPoints,
          B: newPt,
          A: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
      if (dragId === 'C') {
        return {
          ...currentPoints,
          C: newPt,
          D: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
      if (dragId === 'D') {
        return {
          ...currentPoints,
          D: newPt,
          C: { x: 2 * Ox - newPt.x, y: 2 * Oy - newPt.y }
        };
      }
    }

    if (shapeType === 'inscribed_angle') {
      const Ox = 150;
      const Oy = 120;
      const R = 75;
      // 3 đỉnh A, B, C luôn nằm trên đường tròn (O, R)
      if (['A', 'B', 'C'].includes(dragId)) {
        const angle = Math.atan2(newPt.y - Oy, newPt.x - Ox);
        return {
          ...currentPoints,
          [dragId]: {
            x: Math.round(Ox + R * Math.cos(angle)),
            y: Math.round(Oy + R * Math.sin(angle))
          }
        };
      }
    }
  }

  // ==========================================
  // 2. TAM GIÁC (TRIANGLES)
  // ==========================================
  if (category === 'triangles') {
    const pB = getP('B');
    const pC = getP('C');

    const Mx = (pB.x + pC.x) / 2;
    const My = (pB.y + pC.y) / 2;
    const dx = pC.x - pB.x;
    const dy = pC.y - pB.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; }

    if (shapeType === 'equilateral') {
      if (dragId === 'A') {
        // Dragging A scales equilateral triangle symmetrically from M
        const rawH = (Mx - newPt.x) * nx + (My - newPt.y) * ny;
        const newH = Math.max(30, rawH);
        const newSide = newH / (Math.sqrt(3) / 2);
        const ux = dx / len;
        const uy = dy / len;
        return {
          ...currentPoints,
          A: { x: Math.round(Mx - newH * nx), y: Math.round(My - newH * ny) },
          B: { x: Math.round(Mx - (newSide / 2) * ux), y: Math.round(My - (newSide / 2) * uy) },
          C: { x: Math.round(Mx + (newSide / 2) * ux), y: Math.round(My + (newSide / 2) * uy) }
        };
      }
      if (dragId === 'B' || dragId === 'C') {
        const nB = dragId === 'B' ? newPt : pB;
        const nC = dragId === 'C' ? newPt : pC;
        const nMx = (nB.x + nC.x) / 2;
        const nMy = (nB.y + nC.y) / 2;
        const nDx = nC.x - nB.x;
        const nDy = nC.y - nB.y;
        const nLen = Math.hypot(nDx, nDy) || 1;
        let nNx = -nDy / nLen;
        let nNy = nDx / nLen;
        if (nNy > 0) { nNx = -nNx; nNy = -nNy; }
        const nReqH = (Math.sqrt(3) / 2) * nLen;
        return {
          ...currentPoints,
          [dragId]: newPt,
          A: { x: Math.round(nMx - nReqH * nNx), y: Math.round(nMy - nReqH * nNy) }
        };
      }
    }

    if (shapeType === 'isosceles') {
      if (dragId === 'A') {
        // Project A onto perpendicular bisector of BC so AB = AC strictly holds
        const rawH = (Mx - newPt.x) * nx + (My - newPt.y) * ny;
        const newH = Math.max(20, rawH);
        return {
          ...currentPoints,
          A: { x: Math.round(Mx - newH * nx), y: Math.round(My - newH * ny) }
        };
      }
    }

    if (shapeType === 'right_B') {
      if (dragId === 'A') {
        // Project A onto line perpendicular to BC passing through B
        const rawH = (pB.x - newPt.x) * nx + (pB.y - newPt.y) * ny;
        const newH = Math.max(20, rawH);
        return {
          ...currentPoints,
          A: { x: Math.round(pB.x - newH * nx), y: Math.round(pB.y - newH * ny) }
        };
      }
    }

    if (shapeType === 'right_A') {
      if (dragId === 'A') {
        // Thales circle with diameter BC: angle A is mathematically guaranteed 90 deg
        const R = len / 2;
        const dist = Math.hypot(newPt.x - Mx, newPt.y - My) || 1;
        let ax = Math.round(Mx + R * ((newPt.x - Mx) / dist));
        let ay = Math.round(My + R * ((newPt.y - My) / dist));
        if (ay > My - 10) ay = Math.round(My - Math.abs(ay - My) - 10);
        return {
          ...currentPoints,
          A: { x: ax, y: ay }
        };
      }
    }

    if (shapeType === 'right_isosceles') {
      if (dragId === 'A') {
        const R = len / 2;
        return {
          ...currentPoints,
          A: { x: Math.round(Mx - R * nx), y: Math.round(My - R * ny) }
        };
      }
    }
  }

  // Default fallback for unconstrained 2D shapes
  return { ...currentPoints, [dragId]: newPt };
}

/**
 * DEFAULT POINT GENERATOR FOR 3D SHAPES
 */
export function getDefaultSpacePoints(
  category: string,
  shapeType: string,
  shapeHeight: number,
  baseWidth: number,
  skewAngle: number
): Record<string, Point> {
  const cx = 155;
  const baseY = 195;
  const h = shapeHeight;
  const bw = baseWidth;

  const radSkew = (skewAngle * Math.PI) / 180;
  const depthY = bw * 0.45 * Math.sin(radSkew);
  const depthX = bw * 0.48 * Math.cos(radSkew);

  if (category === 'prisms') {
    if (shapeType === 'prism_rect' || shapeType === 'cube') {
      const defA = { x: Math.round(cx - bw / 2 + depthX), y: Math.round(baseY - depthY) };
      const defD = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY) };
      const defB = { x: Math.round(cx - bw / 2), y: Math.round(baseY) };
      const defC = { x: Math.round(cx + bw / 2 - depthX), y: Math.round(baseY) };
      return {
        A: defA,
        B: defB,
        C: defC,
        D: defD,
        At: { x: defA.x, y: defA.y - h },
        Bt: { x: defB.x, y: defB.y - h },
        Ct: { x: defC.x, y: defC.y - h },
        Dt: { x: defD.x, y: defD.y - h }
      };
    }
    if (shapeType === 'prism_tri') {
      const defA = { x: Math.round(cx - bw / 2), y: Math.round(baseY - depthY) };
      const defC = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY * 0.6) };
      const defB = { x: Math.round(cx - depthX * 0.25), y: Math.round(baseY) };
      return {
        A: defA,
        B: defB,
        C: defC,
        At: { x: defA.x, y: defA.y - h },
        Bt: { x: defB.x, y: defB.y - h },
        Ct: { x: defC.x, y: defC.y - h }
      };
    }
    if (shapeType === 'prism_tri_oblique') {
      const slantOffset = 38;
      const defA = { x: Math.round(cx - bw / 2), y: Math.round(baseY - depthY) };
      const defC = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY * 0.6) };
      const defB = { x: Math.round(cx - depthX * 0.25), y: Math.round(baseY) };
      return {
        A: defA,
        B: defB,
        C: defC,
        At: { x: defA.x + slantOffset, y: defA.y - h },
        Bt: { x: defB.x + slantOffset, y: defB.y - h },
        Ct: { x: defC.x + slantOffset, y: defC.y - h }
      };
    }
  }

  if (category === 'pyramids') {
    if (shapeType === 'pyramid_tri_reg') {
      const defA = { x: Math.round(cx - bw / 2), y: Math.round(baseY - depthY) };
      const defC = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY * 0.7) };
      const defB = { x: Math.round(cx - depthX * 0.25), y: Math.round(baseY) };
      const Ox = (defA.x + defB.x + defC.x) / 3;
      const Oy = (defA.y + defB.y + defC.y) / 3;
      return {
        A: defA,
        B: defB,
        C: defC,
        S: { x: Math.round(Ox), y: Math.round(Oy - h) }
      };
    }
    if (shapeType === 'pyramid_tri_sa') {
      const defA = { x: Math.round(cx - bw / 2), y: Math.round(baseY - depthY) };
      const defB = { x: Math.round(cx - bw / 4 + depthX * 0.2), y: Math.round(baseY) };
      const defC = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY * 0.3) };
      return {
        A: defA,
        B: defB,
        C: defC,
        S: { x: defA.x, y: defA.y - h }
      };
    }
    if (shapeType === 'pyramid_tri_sh') {
      const defA = { x: Math.round(cx - bw / 2), y: Math.round(baseY - depthY) };
      const defB = { x: Math.round(cx - bw / 5), y: Math.round(baseY) };
      const defC = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY * 0.4) };
      const Hx = (defA.x + defB.x) / 2;
      const Hy = (defA.y + defB.y) / 2;
      return {
        A: defA,
        B: defB,
        C: defC,
        S: { x: Math.round(Hx), y: Math.round(Hy - h) }
      };
    }
    if (shapeType === 'pyramid_quad_reg') {
      const defA = { x: Math.round(cx - bw / 2 + depthX), y: Math.round(baseY - depthY) };
      const defD = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY) };
      const defB = { x: Math.round(cx - bw / 2), y: Math.round(baseY) };
      const defC = { x: Math.round(cx + bw / 2 - depthX), y: Math.round(baseY) };
      const Ox = (defA.x + defC.x) / 2;
      const Oy = (defA.y + defC.y) / 2;
      return {
        A: defA,
        B: defB,
        C: defC,
        D: defD,
        S: { x: Math.round(Ox), y: Math.round(Oy - h) }
      };
    }
    if (shapeType === 'pyramid_quad_sa') {
      const defA = { x: Math.round(cx - bw / 2 + depthX), y: Math.round(baseY - depthY) };
      const defD = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY) };
      const defB = { x: Math.round(cx - bw / 2), y: Math.round(baseY) };
      const defC = { x: Math.round(cx + bw / 2 - depthX), y: Math.round(baseY) };
      return {
        A: defA,
        B: defB,
        C: defC,
        D: defD,
        S: { x: defA.x, y: defA.y - h }
      };
    }
    if (shapeType === 'tetrahedron_ortho') {
      const defO = { x: Math.round(cx - bw / 4), y: Math.round(baseY - depthY * 0.5) };
      const defA = { x: defO.x, y: defO.y - h };
      const defB = { x: Math.round(cx - bw / 2), y: Math.round(baseY) };
      const defC = { x: Math.round(cx + bw / 2), y: Math.round(baseY - depthY * 0.2) };
      return {
        O: defO,
        A: defA,
        B: defB,
        C: defC
      };
    }
  }

  return {};
}

/**
 * DEFAULT POINT GENERATOR FOR 2D SHAPES
 */
export function getDefaultPlanePoints(
  category: string,
  shapeType: string,
  customAngle: number = 65,
  sideLength: number = 140,
  skewVal: number = 35
): Record<string, Point> {
  if (category === 'triangles') {
    const defB: Point = { x: 45, y: 175 };
    const defC: Point = { x: 45 + sideLength, y: 175 };
    const aLen = sideLength * 0.9;

    switch (shapeType) {
      case 'acute':
        return { A: { x: 135, y: 45 }, B: defB, C: defC };
      case 'right_B':
        return { A: { x: defB.x, y: Math.round(defB.y - aLen) }, B: defB, C: defC };
      case 'right_A': {
        const midX = (defB.x + defC.x) / 2;
        const rad = (defC.x - defB.x) / 2;
        return { A: { x: Math.round(midX - rad * 0.35), y: Math.round(defB.y - rad * 0.93) }, B: defB, C: defC };
      }
      case 'obtuse':
        return { A: { x: 95, y: 65 }, B: defB, C: defC };
      case 'isosceles':
        return { A: { x: Math.round((defB.x + defC.x) / 2), y: 45 }, B: defB, C: defC };
      case 'equilateral': {
        const h = Math.round((defC.x - defB.x) * (Math.sqrt(3) / 2));
        return { A: { x: Math.round((defB.x + defC.x) / 2), y: defB.y - h }, B: defB, C: defC };
      }
      case 'right_isosceles': {
        const h = Math.round((defC.x - defB.x) / 2);
        return { A: { x: Math.round((defB.x + defC.x) / 2), y: defB.y - h }, B: defB, C: defC };
      }
      case 'custom': {
        const rad = (customAngle * Math.PI) / 180;
        return {
          A: { x: Math.round(defB.x + aLen * Math.cos(rad)), y: Math.round(defB.y - aLen * Math.sin(rad)) },
          B: defB,
          C: defC
        };
      }
      default:
        return { A: { x: 135, y: 45 }, B: defB, C: defC };
    }
  }

  if (category === 'quads') {
    switch (shapeType) {
      case 'parallelogram':
        return {
          A: { x: 45 + skewVal, y: 65 },
          B: { x: 45, y: 170 },
          C: { x: 205, y: 170 },
          D: { x: 205 + skewVal, y: 65 }
        };
      case 'rectangle':
        return {
          A: { x: 55, y: 65 },
          B: { x: 55, y: 170 },
          C: { x: 215, y: 170 },
          D: { x: 215, y: 65 }
        };
      case 'rhombus':
        return {
          A: { x: 130, y: 45 },
          B: { x: 50, y: 115 },
          C: { x: 130, y: 185 },
          D: { x: 210, y: 115 }
        };
      case 'square':
        return {
          A: { x: 75, y: 55 },
          B: { x: 75, y: 175 },
          C: { x: 195, y: 175 },
          D: { x: 195, y: 55 }
        };
      case 'trapezoid':
        return {
          A: { x: 85, y: 65 },
          B: { x: 45, y: 170 },
          C: { x: 225, y: 170 },
          D: { x: 185, y: 65 }
        };
      case 'iso_trapezoid':
        return {
          A: { x: 85, y: 65 },
          B: { x: 45, y: 170 },
          C: { x: 215, y: 170 },
          D: { x: 175, y: 65 }
        };
      case 'right_trapezoid':
        return {
          A: { x: 55, y: 65 },
          B: { x: 55, y: 170 },
          C: { x: 220, y: 170 },
          D: { x: 165, y: 65 }
        };
      case 'arbitrary_quad':
        return {
          A: { x: 80, y: 50 },
          B: { x: 35, y: 160 },
          C: { x: 200, y: 180 },
          D: { x: 230, y: 80 }
        };
      case 'regular_pentagon': {
        const Ox = 155, Oy = 115, R = 75;
        const pts: Record<string, Point> = {};
        const labels = ['A', 'B', 'C', 'D', 'E'];
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          pts[labels[i]] = { x: Math.round(Ox + R * Math.cos(angle)), y: Math.round(Oy + R * Math.sin(angle)) };
        }
        return pts;
      }
      case 'regular_hexagon': {
        const Ox = 155, Oy = 115, R = 75;
        const pts: Record<string, Point> = {};
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        for (let i = 0; i < 6; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          pts[labels[i]] = { x: Math.round(Ox + R * Math.cos(angle)), y: Math.round(Oy + R * Math.sin(angle)) };
        }
        return pts;
      }
      default:
        return {
          A: { x: 80, y: 65 },
          B: { x: 40, y: 170 },
          C: { x: 185, y: 170 },
          D: { x: 225, y: 65 }
        };
    }
  }

  if (category === 'special_lines') {
    return {
      A: { x: 135, y: 45 },
      B: { x: 45, y: 175 },
      C: { x: 235, y: 175 }
    };
  }

  if (category === 'thcs_concepts') {
    switch (shapeType) {
      case 'cyclic_quad': {
        const Ox = 150, Oy = 115, R = 80;
        return {
          O: { x: Ox, y: Oy },
          A: { x: Math.round(Ox + R * Math.cos(-2.2)), y: Math.round(Oy + R * Math.sin(-2.2)) },
          B: { x: Math.round(Ox + R * Math.cos(2.4)), y: Math.round(Oy + R * Math.sin(2.4)) },
          C: { x: Math.round(Ox + R * Math.cos(0.9)), y: Math.round(Oy + R * Math.sin(0.9)) },
          D: { x: Math.round(Ox + R * Math.cos(-0.5)), y: Math.round(Oy + R * Math.sin(-0.5)) }
        };
      }
      case 'tangent_circle': {
        return {
          O: { x: 130, y: 115 },
          A: { x: 130, y: 50 }
        };
      }
      case 'opposite_angles': {
        return {
          O: { x: 150, y: 110 },
          A: { x: 45, y: 55 },
          B: { x: 255, y: 165 },
          C: { x: 55, y: 165 },
          D: { x: 245, y: 55 }
        };
      }
      case 'inscribed_angle': {
        const Ox = 150, Oy = 120, R = 75;
        return {
          O: { x: Ox, y: Oy },
          A: { x: Math.round(Ox + R * Math.cos(-2.0)), y: Math.round(Oy + R * Math.sin(-2.0)) },
          B: { x: Math.round(Ox + R * Math.cos(2.5)), y: Math.round(Oy + R * Math.sin(2.5)) },
          C: { x: Math.round(Ox + R * Math.cos(0.6)), y: Math.round(Oy + R * Math.sin(0.6)) }
        };
      }
      default:
        return {};
    }
  }

  return {};
}
