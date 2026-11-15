import React, { useState, useRef } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Field,
  Input,
  Select,
  Slider,
  Switch,
  Badge,
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Cube24Regular,
  Add20Regular,
  ArrowReset20Regular
} from '@fluentui/react-icons';
import { insertSvgAtCursor } from '../services/wordService';
import {
  Point,
  getTriPyramidVisibility,
  getQuadPyramidVisibility,
  getPrismVisibility,
  calculateSpaceConstraints,
  getDefaultSpacePoints
} from '../services/geometryUtils';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('4px')
  },
  tabNav: {
    marginBottom: '8px',
    overflowX: 'auto',
    whiteSpace: 'nowrap'
  },
  hintBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('6px', '10px'),
    backgroundColor: '#eff6ff',
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'dashed', '#0f6cbd'),
    fontSize: '12px',
    color: '#0f6cbd',
    marginBottom: '6px'
  },
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding('12px'),
    backgroundColor: '#ffffff',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', '#0f6cbd'),
    minHeight: '270px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
    overflowX: 'auto',
    userSelect: 'none'
  },
  sliderBox: {
    backgroundColor: '#f0f6ff',
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('6px'),
    marginBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px')
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    ...shorthands.gap('6px'),
    marginTop: '6px'
  },
  row: {
    display: 'flex',
    ...shorthands.gap('8px'),
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  actions: {
    display: 'flex',
    ...shorthands.gap('8px'),
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px'
  }
});

interface DraggableVertex3D {
  id: string;
  pt: Point;
  label: string;
  labelOffset: { x: number; y: number };
  color?: string;
}

export const SpaceGeometryEditor: React.FC = () => {
  const styles = useStyles();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Tab categories
  const [category, setCategory] = useState<string>('pyramids');

  // Shapes in categories
  const [pyramidType, setPyramidType] = useState<string>('pyramid_tri_reg');
  const [prismType, setPrismType] = useState<string>('prism_rect');
  const [solidRevType, setSolidRevType] = useState<string>('cone');
  const [conceptType, setConceptType] = useState<string>('line_perp_plane');

  // Dynamic parameters for height, width, and perspective viewing angle
  const [shapeHeight, setShapeHeight] = useState<number>(120); // Height in pixels (60 - 160)
  const [baseWidth, setBaseWidth] = useState<number>(140); // Base width (80 - 190)
  const [skewAngle, setSkewAngle] = useState<number>(32); // Perspective angle in degrees (15° - 55°)

  // Options
  const [showDashed, setShowDashed] = useState<boolean>(true);
  const [showRightAngles, setShowRightAngles] = useState<boolean>(true);

  // Labels
  const [lblS, setLblS] = useState<string>('S');
  const [lblA, setLblA] = useState<string>('A');
  const [lblB, setLblB] = useState<string>('B');
  const [lblC, setLblC] = useState<string>('C');
  const [lblD, setLblD] = useState<string>('D');

  const [status, setStatus] = useState<string>('');

  // Interactive Drag & Drop State for Vertices
  const [customPoints, setCustomPoints] = useState<Record<string, Point>>({});
  const [activeDrag, setActiveDrag] = useState<string | null>(null);

  const getPoint = (id: string, defaultPt: Point): Point => {
    return customPoints[id] || defaultPt;
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setActiveDrag(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scaleX = vb.width / rect.width;
    const scaleY = vb.height / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    // Clamp within SVG canvas bounds
    const clampedX = Math.round(Math.max(14, Math.min(vb.width - 14, rawX)));
    const clampedY = Math.round(Math.max(14, Math.min(vb.height - 14, rawY)));

    const activeShapeType =
      category === 'prisms'
        ? prismType
        : category === 'pyramids'
        ? pyramidType
        : category === 'solids_rev'
        ? solidRevType
        : conceptType;
    const defaults = getDefaultSpacePoints(category, activeShapeType, shapeHeight, baseWidth, skewAngle);

    // Apply geometric constraint propagation (maintaining parallel edges, perpendicular heights, congruence)
    const updatedPoints = calculateSpaceConstraints(
      category,
      activeShapeType,
      activeDrag,
      { x: clampedX, y: clampedY },
      customPoints,
      defaults
    );

    setCustomPoints(updatedPoints);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveDrag(null);
    }
  };

  const handleResetPoints = () => {
    setCustomPoints({});
  };

  // 3D Perspective Right-Angle Symbol Helper
  const get3DRightAngle = (
    V: Point,
    p1: Point,
    p2: Point,
    size = 10,
    color = '#d13438'
  ) => {
    const len1 = Math.hypot(p1.x - V.x, p1.y - V.y) || 1;
    const len2 = Math.hypot(p2.x - V.x, p2.y - V.y) || 1;
    const d1x = (p1.x - V.x) / len1;
    const d1y = (p1.y - V.y) / len1;
    const d2x = (p2.x - V.x) / len2;
    const d2y = (p2.y - V.y) / len2;

    const a1x = V.x + size * d1x;
    const a1y = V.y + size * d1y;
    const a2x = a1x + size * d2x;
    const a2y = a1y + size * d2y;
    const a3x = V.x + size * d2x;
    const a3y = V.y + size * d2y;

    return `<polyline points="${a1x.toFixed(1)},${a1y.toFixed(1)} ${a2x.toFixed(1)},${a2y.toFixed(1)} ${a3x.toFixed(1)},${a3y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.3" />`;
  };

  // Compute 3D Scene Data with Dynamic Visibility
  const getSceneData = () => {
    const strokeColor = '#0f6cbd';
    const accentColor = '#d13438';
    const auxColor = '#605e5c';

    const cx = 155;
    const baseY = 195;
    const h = shapeHeight;
    const bw = baseWidth;

    // Perspective depth offsets driven dynamically by skewAngle (15° - 55°)
    const radSkew = (skewAngle * Math.PI) / 180;
    const depthY = bw * 0.45 * Math.sin(radSkew);
    const depthX = bw * 0.48 * Math.cos(radSkew);

    let content = '';
    let caption = '';
    let draggableVertices: DraggableVertex3D[] = [];

    // ==========================================
    // 1. KHỐI CHÓP (PYRAMIDS)
    // ==========================================
    if (category === 'pyramids') {
      switch (pyramidType) {
        case 'pyramid_tri_reg': {
          // Chóp tam giác đều S.ABC:
          const defA = { x: cx - bw / 2, y: baseY - depthY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.7 };
          const defB = { x: cx - depthX * 0.25, y: baseY };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);

          const O = {
            x: (A.x + B.x + C.x) / 3,
            y: (A.y + B.y + C.y) / 3
          };
          const defS = { x: O.x, y: O.y - h };
          const S = getPoint('S', defS);

          // DYNAMIC VISIBILITY CALCULATION
          const vis = getTriPyramidVisibility(S, A, B, C);
          const dash = (k: string) => (!showDashed || vis[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const width = (k: string) => vis[k] ? '2' : '1.8';

          caption = `Hình chóp tam giác đều ${lblS}.${lblA}${lblB}${lblC} (đáy đều, SO ⊥ đáy tại trọng tâm O)`;
          content = `
            <!-- 3 Cạnh đáy: động nét đứt / nét liền theo vị trí thực -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('AB')}" ${dash('AB')} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('BC')}" ${dash('BC')} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('CA')}" ${dash('CA')} />
            <!-- 3 Cạnh bên: động nét đứt / nét liền theo vị trí thực -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SA')}" ${dash('SA')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SB')}" ${dash('SB')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SC')}" ${dash('SC')} />
            <!-- Đường cao SO: luôn nét đứt trong lòng chóp -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${O.x.toFixed(1)}" y2="${O.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            ${showRightAngles ? get3DRightAngle(O, S, C, 9, accentColor) : ''}
            <!-- Trọng tâm O -->
            <circle cx="${O.x.toFixed(1)}" cy="${O.y.toFixed(1)}" r="2.5" fill="${accentColor}" />
            <text x="${(O.x + 5).toFixed(1)}" y="${(O.y + 4).toFixed(1)}" font-size="11" fill="${accentColor}">O</text>
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -4, y: 16 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 6 } }
          ];
          break;
        }

        case 'pyramid_tri_sa': {
          // Chóp tam giác S.ABC có SA ⊥ (ABC)
          const defA = { x: cx - bw / 2, y: baseY - depthY };
          const defB = { x: cx - bw / 4 + depthX * 0.2, y: baseY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.3 };
          const defS = { x: defA.x, y: defA.y - h };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);
          const S = getPoint('S', defS);

          // DYNAMIC VISIBILITY CALCULATION
          const vis = getTriPyramidVisibility(S, A, B, C);
          const dash = (k: string) => (!showDashed || vis[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const width = (k: string) => vis[k] ? '2' : '1.8';

          caption = `Hình chóp tam giác ${lblS}.${lblA}${lblB}${lblC} có ${lblS}${lblA} ⊥ (${lblA}${lblB}${lblC})`;
          content = `
            <!-- 3 Cạnh đáy: động nét đứt / nét liền -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('AB')}" ${dash('AB')} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('BC')}" ${dash('BC')} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('CA')}" ${dash('CA')} />
            <!-- Cạnh đường cao SA: màu đỏ làm nổi bật, động nét đứt/nét liền -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${accentColor}" stroke-width="${width('SA')}" ${dash('SA')} />
            <!-- 2 Cạnh bên còn lại: động nét đứt / nét liền -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SB')}" ${dash('SB')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SC')}" ${dash('SC')} />
            ${showRightAngles ? get3DRightAngle(A, S, B, 11, accentColor) : ''}
            ${showRightAngles ? get3DRightAngle(A, S, C, 11, accentColor) : ''}
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -12, y: 16 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 6 } }
          ];
          break;
        }

        case 'pyramid_tri_sh': {
          // Chóp tam giác S.ABC có mặt bên (SAB) ⊥ đáy, SH ⊥ AB
          const defA = { x: cx - bw / 2, y: baseY - depthY };
          const defB = { x: cx - bw / 5, y: baseY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.4 };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);

          const H = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
          const defS = { x: H.x, y: H.y - h };
          const S = getPoint('S', defS);

          const vis = getTriPyramidVisibility(S, A, B, C);
          const dash = (k: string) => (!showDashed || vis[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const width = (k: string) => vis[k] ? '2' : '1.8';

          caption = `Hình chóp tam giác ${lblS}.${lblA}${lblB}${lblC} có mặt bên (${lblS}${lblA}${lblB}) ⊥ đáy, đường cao SH ⊥ AB`;
          content = `
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('AB')}" ${dash('AB')} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('BC')}" ${dash('BC')} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('CA')}" ${dash('CA')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SA')}" ${dash('SA')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SB')}" ${dash('SB')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SC')}" ${dash('SC')} />
            <!-- Đường cao SH: luôn nét đứt trong lòng khối -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${H.x.toFixed(1)}" y2="${H.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            ${showRightAngles ? get3DRightAngle(H, S, B, 9, accentColor) : ''}
            <circle cx="${H.x.toFixed(1)}" cy="${H.y.toFixed(1)}" r="2.5" fill="${accentColor}" />
            <text x="${(H.x - 12).toFixed(1)}" y="${(H.y + 12).toFixed(1)}" font-size="11" fill="${accentColor}">H</text>
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -4, y: 16 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 6 } }
          ];
          break;
        }

        case 'pyramid_quad_reg': {
          // Chóp tứ giác đều S.ABCD (đáy hình vuông, SO ⊥ đáy)
          const defA = { x: cx - bw / 2 + depthX, y: baseY - depthY };
          const defD = { x: cx + bw / 2, y: baseY - depthY };
          const defB = { x: cx - bw / 2, y: baseY };
          const defC = { x: cx + bw / 2 - depthX, y: baseY };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);
          const D = getPoint('D', defD);

          const O = {
            x: (A.x + C.x) / 2,
            y: (A.y + C.y) / 2
          };
          const defS = { x: O.x, y: O.y - h };
          const S = getPoint('S', defS);

          // DYNAMIC VISIBILITY CALCULATION
          const visQ = getQuadPyramidVisibility(S, A, B, C, D);
          const dashQ = (k: string) => (!showDashed || visQ[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthQ = (k: string) => visQ[k] ? '2' : '1.8';

          caption = `Hình chóp tứ giác đều ${lblS}.${lblA}${lblB}${lblC}${lblD} (đáy hình vuông, SO ⊥ đáy tại O)`;
          content = `
            <!-- 4 Cạnh đáy: động nét đứt / nét liền theo hình chiếu -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('AB')}" ${dashQ('AB')} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('BC')}" ${dashQ('BC')} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('CD')}" ${dashQ('CD')} />
            <line x1="${D.x.toFixed(1)}" y1="${D.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('DA')}" ${dashQ('DA')} />
            <!-- 2 Đường chéo đáy AC, BD: luôn nét đứt mảnh -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${auxColor}" stroke-width="1.2" stroke-dasharray="2 2" />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="${auxColor}" stroke-width="1.2" stroke-dasharray="2 2" />
            <!-- Trục đường cao SO: luôn nét đứt trong khối -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${O.x.toFixed(1)}" y2="${O.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            ${showRightAngles ? get3DRightAngle(O, S, C, 9, accentColor) : ''}
            <!-- 4 Cạnh bên: động nét đứt / nét liền -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SA')}" ${dashQ('SA')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SB')}" ${dashQ('SB')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SC')}" ${dashQ('SC')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SD')}" ${dashQ('SD')} />
            <circle cx="${O.x.toFixed(1)}" cy="${O.y.toFixed(1)}" r="2.5" fill="${accentColor}" />
            <text x="${(O.x + 5).toFixed(1)}" y="${(O.y + 4).toFixed(1)}" font-size="11" fill="${accentColor}">O</text>
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: -4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 15 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 6, y: 15 } },
            { id: 'D', pt: D, label: lblD, labelOffset: { x: 8, y: -2 } }
          ];
          break;
        }

        case 'pyramid_quad_sa': {
          // Chóp tứ giác S.ABCD có SA ⊥ (ABCD)
          const defA = { x: cx - bw / 2 + depthX, y: baseY - depthY };
          const defD = { x: cx + bw / 2, y: baseY - depthY };
          const defB = { x: cx - bw / 2, y: baseY };
          const defC = { x: cx + bw / 2 - depthX, y: baseY };
          const defS = { x: defA.x, y: defA.y - h };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);
          const D = getPoint('D', defD);
          const S = getPoint('S', defS);

          // DYNAMIC VISIBILITY CALCULATION
          const visQ = getQuadPyramidVisibility(S, A, B, C, D);
          const dashQ = (k: string) => (!showDashed || visQ[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthQ = (k: string) => visQ[k] ? '2' : '1.8';

          caption = `Hình chóp tứ giác ${lblS}.${lblA}${lblB}${lblC}${lblD} có ${lblS}${lblA} ⊥ (${lblA}${lblB}${lblC}${lblD})`;
          content = `
            <!-- 4 Cạnh đáy: động nét đứt / nét liền -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('AB')}" ${dashQ('AB')} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('BC')}" ${dashQ('BC')} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('CD')}" ${dashQ('CD')} />
            <line x1="${D.x.toFixed(1)}" y1="${D.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('DA')}" ${dashQ('DA')} />
            <!-- Cạnh đường cao SA: màu đỏ, động nét đứt / nét liền -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${accentColor}" stroke-width="${widthQ('SA')}" ${dashQ('SA')} />
            <!-- 3 Cạnh bên còn lại: động nét đứt / nét liền -->
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SB')}" ${dashQ('SB')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SC')}" ${dashQ('SC')} />
            <line x1="${S.x.toFixed(1)}" y1="${S.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthQ('SD')}" ${dashQ('SD')} />
            ${showRightAngles ? get3DRightAngle(A, S, B, 10, accentColor) : ''}
            ${showRightAngles ? get3DRightAngle(A, S, D, 10, accentColor) : ''}
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: -4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 15 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 6, y: 15 } },
            { id: 'D', pt: D, label: lblD, labelOffset: { x: 8, y: -2 } }
          ];
          break;
        }

        case 'tetrahedron_ortho': {
          // Tứ diện vuông O.ABC (OA, OB, OC đôi một vuông góc tại O)
          const defO = { x: cx - bw / 4, y: baseY - depthY * 0.5 };
          const defA = { x: defO.x, y: defO.y - h };
          const defB = { x: cx - bw / 2, y: baseY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.2 };

          const O = getPoint('O', defO);
          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);

          const vis = getTriPyramidVisibility(A, O, B, C);
          const dash = (k: string) => (!showDashed || vis[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const width = (k: string) => vis[k] ? '2' : '1.8';

          caption = `Tứ diện vuông O.ABC có OA, OB, OC đôi một vuông góc tại O`;
          content = `
            <!-- 3 Cạnh trục xuất phát từ O: động nét đứt / nét liền -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${O.x.toFixed(1)}" y2="${O.y.toFixed(1)}" stroke="${accentColor}" stroke-width="${width('SA')}" ${dash('SA')} />
            <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${accentColor}" stroke-width="${width('AB')}" ${dash('AB')} />
            <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${accentColor}" stroke-width="${width('CA')}" ${dash('CA')} />
            ${showRightAngles ? get3DRightAngle(O, A, B, 9, accentColor) : ''}
            ${showRightAngles ? get3DRightAngle(O, A, C, 9, accentColor) : ''}
            ${showRightAngles ? get3DRightAngle(O, B, C, 9, accentColor) : ''}
            <!-- 3 Cạnh đáy ngoài AB, BC, CA: động nét đứt / nét liền -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SB')}" ${dash('SB')} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('BC')}" ${dash('BC')} />
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${width('SC')}" ${dash('SC')} />
          `;

          draggableVertices = [
            { id: 'O', pt: O, label: 'O', labelOffset: { x: -14, y: 4 }, color: accentColor },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -4, y: -10 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 15 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 6 } }
          ];
          break;
        }

        default: {
          const defA = { x: cx - bw / 2, y: baseY - depthY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.7 };
          const defB = { x: cx - depthX * 0.25, y: baseY };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);
          const O = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
          const defS = { x: O.x, y: O.y - h };
          const S = getPoint('S', defS);

          const vis = getTriPyramidVisibility(S, A, B, C);
          const dash = (k: string) => (!showDashed || vis[k]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const width = (k: string) => vis[k] ? '2' : '1.8';

          caption = `Hình chóp ${lblS}.${lblA}${lblB}${lblC}`;
          content = `
            <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${strokeColor}" stroke-width="${width('AB')}" ${dash('AB')} />
            <line x1="${B.x}" y1="${B.y}" x2="${C.x}" y2="${C.y}" stroke="${strokeColor}" stroke-width="${width('BC')}" ${dash('BC')} />
            <line x1="${C.x}" y1="${C.y}" x2="${A.x}" y2="${A.y}" stroke="${strokeColor}" stroke-width="${width('CA')}" ${dash('CA')} />
            <line x1="${S.x}" y1="${S.y}" x2="${A.x}" y2="${A.y}" stroke="${strokeColor}" stroke-width="${width('SA')}" ${dash('SA')} />
            <line x1="${S.x}" y1="${S.y}" x2="${B.x}" y2="${B.y}" stroke="${strokeColor}" stroke-width="${width('SB')}" ${dash('SB')} />
            <line x1="${S.x}" y1="${S.y}" x2="${C.x}" y2="${C.y}" stroke="${strokeColor}" stroke-width="${width('SC')}" ${dash('SC')} />
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 } },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -4, y: 16 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 6 } }
          ];
          break;
        }
      }
    }

    // ==========================================
    // 2. LĂNG TRỤ & KHỐI HỘP (PRISMS & BOXES)
    // ==========================================
    else if (category === 'prisms') {
      switch (prismType) {
        case 'prism_tri': {
          // Lăng trụ đứng tam giác ABC.A'B'C'
          const defA = { x: cx - bw / 2, y: baseY - depthY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.6 };
          const defB = { x: cx - depthX * 0.25, y: baseY };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);

          const defAt = { x: A.x, y: A.y - h };
          const defBt = { x: B.x, y: B.y - h };
          const defCt = { x: C.x, y: C.y - h };

          const At = getPoint('At', defAt);
          const Bt = getPoint('Bt', defBt);
          const Ct = getPoint('Ct', defCt);

          // DYNAMIC VISIBILITY CALCULATION FOR PRISM
          const visP = getPrismVisibility([A, B, C], [At, Bt, Ct]);
          const dashB = (idx: number) => (!showDashed || visP.baseEdges[idx]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthB = (idx: number) => visP.baseEdges[idx] ? '2' : '1.8';
          const dashL = (idx: number) => (!showDashed || visP.lateralEdges[idx]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthL = (idx: number) => visP.lateralEdges[idx] ? '2' : '1.8';

          caption = `Hình lăng trụ tam giác ${lblA}${lblB}${lblC}.${lblA}'${lblB}'${lblC}'`;
          content = `
            <!-- Cạnh đáy dưới động nét đứt / nét liền: AB (0), BC (1), CA (2) -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(0)}" ${dashB(0)} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(1)}" ${dashB(1)} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(2)}" ${dashB(2)} />
            <!-- Đáy trên thấy toàn bộ (NÉT LIỀN) -->
            <polygon points="${At.x.toFixed(1)},${At.y.toFixed(1)} ${Bt.x.toFixed(1)},${Bt.y.toFixed(1)} ${Ct.x.toFixed(1)},${Ct.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <!-- 3 Cạnh bên động nét đứt / nét liền: AA' (0), BB' (1), CC' (2) -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${At.x.toFixed(1)}" y2="${At.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(0)}" ${dashL(0)} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${Bt.x.toFixed(1)}" y2="${Bt.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(1)}" ${dashL(1)} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${Ct.x.toFixed(1)}" y2="${Ct.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(2)}" ${dashL(2)} />
          `;

          draggableVertices = [
            { id: 'At', pt: At, label: `${lblA}'`, labelOffset: { x: -16, y: -6 } },
            { id: 'Bt', pt: Bt, label: `${lblB}'`, labelOffset: { x: -6, y: -8 } },
            { id: 'Ct', pt: Ct, label: `${lblC}'`, labelOffset: { x: 8, y: -6 } },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 10 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -4, y: 15 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 10 } }
          ];
          break;
        }

        case 'prism_tri_oblique': {
          // Lăng trụ xiên tam giác ABC.A'B'C'
          const slantOffset = 38;
          const defA = { x: cx - bw / 2, y: baseY - depthY };
          const defC = { x: cx + bw / 2, y: baseY - depthY * 0.6 };
          const defB = { x: cx - depthX * 0.25, y: baseY };

          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);

          const defAt = { x: A.x + slantOffset, y: A.y - h };
          const defBt = { x: B.x + slantOffset, y: B.y - h };
          const defCt = { x: C.x + slantOffset, y: C.y - h };

          const At = getPoint('At', defAt);
          const Bt = getPoint('Bt', defBt);
          const Ct = getPoint('Ct', defCt);

          const H = { x: At.x, y: A.y };

          const visP = getPrismVisibility([A, B, C], [At, Bt, Ct]);
          const dashB = (idx: number) => (!showDashed || visP.baseEdges[idx]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthB = (idx: number) => visP.baseEdges[idx] ? '2' : '1.8';
          const dashL = (idx: number) => (!showDashed || visP.lateralEdges[idx]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthL = (idx: number) => visP.lateralEdges[idx] ? '2' : '1.8';

          caption = `Hình lăng trụ xiên tam giác ${lblA}${lblB}${lblC}.${lblA}'${lblB}'${lblC}' (A'H ⊥ đáy)`;
          content = `
            <!-- Cạnh đáy dưới động -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(0)}" ${dashB(0)} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(1)}" ${dashB(1)} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(2)}" ${dashB(2)} />
            <!-- Đường cao A'H: NÉT ĐỨT ĐỎ -->
            <line x1="${At.x.toFixed(1)}" y1="${At.y.toFixed(1)}" x2="${H.x.toFixed(1)}" y2="${H.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${H.x.toFixed(1)}" y2="${H.y.toFixed(1)}" stroke="${auxColor}" stroke-width="1.3" stroke-dasharray="2 2" />
            ${showRightAngles ? get3DRightAngle(H, At, C, 9, accentColor) : ''}
            <!-- Đáy trên thấy toàn bộ -->
            <polygon points="${At.x.toFixed(1)},${At.y.toFixed(1)} ${Bt.x.toFixed(1)},${Bt.y.toFixed(1)} ${Ct.x.toFixed(1)},${Ct.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <!-- 3 Cạnh bên xiên động -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${At.x.toFixed(1)}" y2="${At.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(0)}" ${dashL(0)} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${Bt.x.toFixed(1)}" y2="${Bt.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(1)}" ${dashL(1)} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${Ct.x.toFixed(1)}" y2="${Ct.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(2)}" ${dashL(2)} />
            <circle cx="${H.x.toFixed(1)}" cy="${H.y.toFixed(1)}" r="2.5" fill="${accentColor}" />
            <text x="${(H.x + 4).toFixed(1)}" y="${(H.y + 12).toFixed(1)}" font-size="11" fill="${accentColor}">H</text>
          `;

          draggableVertices = [
            { id: 'At', pt: At, label: `${lblA}'`, labelOffset: { x: -14, y: -6 } },
            { id: 'Bt', pt: Bt, label: `${lblB}'`, labelOffset: { x: -6, y: -8 } },
            { id: 'Ct', pt: Ct, label: `${lblC}'`, labelOffset: { x: 8, y: -6 } },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 10 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -4, y: 15 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 10 } }
          ];
          break;
        }

        case 'cube':
        case 'prism_rect':
        default: {
          // Hình hộp chữ nhật / Hình lập phương ABCD.A'B'C'D'
          const defaults = getDefaultSpacePoints(category, prismType, h, bw, skewAngle);
          const A = getPoint('A', defaults.A);
          const B = getPoint('B', defaults.B);
          const C = getPoint('C', defaults.C);
          const D = getPoint('D', defaults.D);

          const At = getPoint('At', defaults.At);
          const Bt = getPoint('Bt', defaults.Bt);
          const Ct = getPoint('Ct', defaults.Ct);
          const Dt = getPoint('Dt', defaults.Dt);

          // DYNAMIC VISIBILITY CALCULATION FOR BOX
          const visBox = getPrismVisibility([A, B, C, D], [At, Bt, Ct, Dt]);
          const dashB = (idx: number) => (!showDashed || visBox.baseEdges[idx]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthB = (idx: number) => visBox.baseEdges[idx] ? '2' : '1.8';
          const dashL = (idx: number) => (!showDashed || visBox.lateralEdges[idx]) ? 'stroke-dasharray="0"' : 'stroke-dasharray="4 4"';
          const widthL = (idx: number) => visBox.lateralEdges[idx] ? '2' : '1.8';

          caption = prismType === 'cube'
            ? `Hình lập phương ${lblA}${lblB}${lblC}${lblD}.${lblA}'${lblB}'${lblC}'${lblD}' (6 mặt hình vuông, 12 cạnh bằng nhau)`
            : `Hình hộp chữ nhật ${lblA}${lblB}${lblC}${lblD}.${lblA}'${lblB}'${lblC}'${lblD}' (12 cạnh chuẩn)`;
          content = `
            <!-- Đáy dưới động nét đứt / nét liền: AB (0), BC (1), CD (2), DA (3) -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(0)}" ${dashB(0)} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(1)}" ${dashB(1)} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(2)}" ${dashB(2)} />
            <line x1="${D.x.toFixed(1)}" y1="${D.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthB(3)}" ${dashB(3)} />
            <!-- Đáy trên thấy toàn bộ (NÉT LIỀN) -->
            <polygon points="${At.x.toFixed(1)},${At.y.toFixed(1)} ${Bt.x.toFixed(1)},${Bt.y.toFixed(1)} ${Ct.x.toFixed(1)},${Ct.y.toFixed(1)} ${Dt.x.toFixed(1)},${Dt.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <!-- 4 Cạnh bên động nét đứt / nét liền: AA' (0), BB' (1), CC' (2), DD' (3) -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${At.x.toFixed(1)}" y2="${At.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(0)}" ${dashL(0)} />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${Bt.x.toFixed(1)}" y2="${Bt.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(1)}" ${dashL(1)} />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${Ct.x.toFixed(1)}" y2="${Ct.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(2)}" ${dashL(2)} />
            <line x1="${D.x.toFixed(1)}" y1="${D.y.toFixed(1)}" x2="${Dt.x.toFixed(1)}" y2="${Dt.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${widthL(3)}" ${dashL(3)} />
          `;

          draggableVertices = [
            { id: 'At', pt: At, label: `${lblA}'`, labelOffset: { x: -16, y: -6 } },
            { id: 'Bt', pt: Bt, label: `${lblB}'`, labelOffset: { x: -14, y: -6 } },
            { id: 'Ct', pt: Ct, label: `${lblC}'`, labelOffset: { x: 6, y: -6 } },
            { id: 'Dt', pt: Dt, label: `${lblD}'`, labelOffset: { x: 8, y: -6 } },
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -16, y: 4 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 14 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 6, y: 14 } },
            { id: 'D', pt: D, label: lblD, labelOffset: { x: 8, y: 4 } }
          ];
          break;
        }
      }
    }

    // ==========================================
    // 3. KHỐI TRÒN XOAY (NÓN, TRỤ, CẦU)
    // ==========================================
    else if (category === 'solids_rev') {
      switch (solidRevType) {
        case 'cone': {
          const defO = { x: cx, y: baseY - 15 };
          const defRx = bw * 0.48;
          const defRy = defRx * Math.sin(radSkew) * 0.75;
          const defS = { x: defO.x, y: defO.y - h };
          const defA = { x: defO.x + defRx, y: defO.y };

          const O = getPoint('O', defO);
          const S = getPoint('S', defS);
          const A = getPoint('A', defA);

          const currentRx = Math.abs(A.x - O.x) || defRx;
          const currentRy = currentRx * Math.sin(radSkew) * 0.75 || defRy;
          const dashedAttr = showDashed ? 'stroke-dasharray="4 4"' : 'stroke-dasharray="0"';

          caption = `Hình nón tròn xoay (đỉnh ${lblS}, trục SO ⊥ đáy, bán kính R, đường sinh l)`;
          content = `
            <!-- Nửa sau elip đáy khuất: NÉT ĐỨT -->
            <path d="M ${(O.x - currentRx).toFixed(1)},${O.y} A ${currentRx.toFixed(1)} ${currentRy.toFixed(1)} 0 0 1 ${(O.x + currentRx).toFixed(1)},${O.y}" fill="none" stroke="${strokeColor}" stroke-width="1.8" ${dashedAttr} />
            <!-- Nửa trước elip đáy thấy: NÉT LIỀN -->
            <path d="M ${(O.x - currentRx).toFixed(1)},${O.y} A ${currentRx.toFixed(1)} ${currentRy.toFixed(1)} 0 0 0 ${(O.x + currentRx).toFixed(1)},${O.y}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <!-- Đường cao SO nét đứt -->
            <line x1="${S.x}" y1="${S.y.toFixed(1)}" x2="${O.x}" y2="${O.y}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            <!-- Bán kính OA nét đứt -->
            <line x1="${O.x}" y1="${O.y}" x2="${A.x.toFixed(1)}" y2="${A.y}" stroke="${auxColor}" stroke-width="1.5" stroke-dasharray="3 3" />
            <polyline points="${O.x + 9},${O.y} ${O.x + 9},${O.y - 9} ${O.x},${O.y - 9}" fill="none" stroke="${accentColor}" stroke-width="1.3" />
            <!-- Hai đường sinh biên: NÉT LIỀN -->
            <line x1="${S.x}" y1="${S.y.toFixed(1)}" x2="${(O.x - currentRx).toFixed(1)}" y2="${O.y}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${S.x}" y1="${S.y.toFixed(1)}" x2="${(O.x + currentRx).toFixed(1)}" y2="${O.y}" stroke="${strokeColor}" stroke-width="2" />
            <text x="${(O.x + A.x) / 2}" y="${O.y - 4}" font-size="11" fill="${auxColor}">R</text>
            <text x="${O.x + 5}" y="${(S.y + O.y) / 2}" font-size="11" fill="${accentColor}">h</text>
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: lblS, labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'O', pt: O, label: 'O', labelOffset: { x: -14, y: 4 } },
            { id: 'A', pt: A, label: 'A', labelOffset: { x: 8, y: 4 } }
          ];
          break;
        }

        case 'cylinder':
        default: {
          const defO2 = { x: cx, y: baseY - 15 };
          const defRx = bw * 0.46;
          const defRy = defRx * Math.sin(radSkew) * 0.75;
          const defO1 = { x: defO2.x, y: defO2.y - h };

          const O2 = getPoint('O2', defO2);
          const O1 = getPoint('O1', defO1);
          const dashedAttr = showDashed ? 'stroke-dasharray="4 4"' : 'stroke-dasharray="0"';

          caption = `Hình trụ tròn xoay (trục OO', chiều cao h, bán kính đáy R)`;
          content = `
            <ellipse cx="${O1.x}" cy="${O1.y.toFixed(1)}" rx="${defRx.toFixed(1)}" ry="${defRy.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M ${(O2.x - defRx).toFixed(1)},${O2.y} A ${defRx.toFixed(1)} ${defRy.toFixed(1)} 0 0 1 ${(O2.x + defRx).toFixed(1)},${O2.y}" fill="none" stroke="${strokeColor}" stroke-width="1.8" ${dashedAttr} />
            <path d="M ${(O2.x - defRx).toFixed(1)},${O2.y} A ${defRx.toFixed(1)} ${defRy.toFixed(1)} 0 0 0 ${(O2.x + defRx).toFixed(1)},${O2.y}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${O1.x}" y1="${O1.y.toFixed(1)}" x2="${O2.x}" y2="${O2.y}" stroke="${accentColor}" stroke-width="1.6" stroke-dasharray="3 3" />
            <line x1="${(O1.x - defRx).toFixed(1)}" y1="${O1.y.toFixed(1)}" x2="${(O2.x - defRx).toFixed(1)}" y2="${O2.y}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${(O1.x + defRx).toFixed(1)}" y1="${O1.y.toFixed(1)}" x2="${(O2.x + defRx).toFixed(1)}" y2="${O2.y}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${O1.x}" y1="${O1.y.toFixed(1)}" x2="${(O1.x + defRx).toFixed(1)}" y2="${O1.y.toFixed(1)}" stroke="${auxColor}" stroke-width="1.3" stroke-dasharray="2 2" />
            <text x="${(O1.x + defRx / 2).toFixed(1)}" y="${(O1.y - 4).toFixed(1)}" font-size="11" fill="${auxColor}">R</text>
            <text x="${O2.x + 5}" y="${((O1.y + O2.y) / 2).toFixed(1)}" font-size="11" fill="${accentColor}">h</text>
          `;

          draggableVertices = [
            { id: 'O1', pt: O1, label: "O'", labelOffset: { x: -14, y: 4 }, color: accentColor },
            { id: 'O2', pt: O2, label: 'O', labelOffset: { x: -14, y: 4 } }
          ];
          break;
        }
      }
    }

    // ==========================================
    // 4. KHÁI NIỆM KHÔNG GIAN SGK
    // ==========================================
    else {
      switch (conceptType) {
        case 'line_perp_plane': {
          const p1 = { x: cx - bw / 2 + depthX, y: baseY - depthY };
          const p2 = { x: cx + bw / 2, y: baseY - depthY };
          const p3 = { x: cx + bw / 2 - depthX, y: baseY };
          const p4 = { x: cx - bw / 2, y: baseY };

          const defH = { x: cx, y: (p1.y + p4.y) / 2 };
          const H = getPoint('H', defH);

          caption = 'Đường thẳng d vuông góc với mặt phẳng (P) tại H: d ⊥ a, d ⊥ b';
          content = `
            <polygon points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)} ${p4.x.toFixed(1)},${p4.y.toFixed(1)}" fill="#f8fafc" stroke="${strokeColor}" stroke-width="2" />
            <text x="${(p4.x + 10).toFixed(1)}" y="${(p4.y - 8).toFixed(1)}" font-size="13" font-style="italic" font-weight="bold" fill="${strokeColor}">(P)</text>
            <line x1="${(H.x - 55).toFixed(1)}" y1="${(H.y + 10).toFixed(1)}" x2="${(H.x + 55).toFixed(1)}" y2="${(H.y - 10).toFixed(1)}" stroke="${auxColor}" stroke-width="1.5" />
            <line x1="${(H.x - 25).toFixed(1)}" y1="${(H.y - 20).toFixed(1)}" x2="${(H.x + 25).toFixed(1)}" y2="${(H.y + 20).toFixed(1)}" stroke="${auxColor}" stroke-width="1.5" />
            <line x1="${H.x}" y1="35" x2="${H.x}" y2="${H.y.toFixed(1)}" stroke="${accentColor}" stroke-width="2" />
            <line x1="${H.x}" y1="${H.y.toFixed(1)}" x2="${H.x}" y2="${baseY + 15}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            <polyline points="${H.x},${(H.y - 10).toFixed(1)} ${H.x + 8},${(H.y - 10).toFixed(1)} ${H.x + 8},${H.y.toFixed(1)}" fill="none" stroke="${accentColor}" stroke-width="1.3" />
            <text x="${H.x + 8}" y="45" font-size="12" fill="${accentColor}" font-weight="bold">d</text>
          `;

          draggableVertices = [
            { id: 'H', pt: H, label: 'H', labelOffset: { x: 8, y: 14 }, color: accentColor }
          ];
          break;
        }

        case 'line_plane_angle': {
          const p1 = { x: cx - bw / 2 + depthX, y: baseY - depthY };
          const p2 = { x: cx + bw / 2, y: baseY - depthY };
          const p3 = { x: cx + bw / 2 - depthX, y: baseY };
          const p4 = { x: cx - bw / 2, y: baseY };

          const defH = { x: cx - 25, y: (p1.y + p4.y) / 2 };
          const H = getPoint('H', defH);
          const defS = { x: H.x, y: H.y - h };
          const S = getPoint('S', defS);
          const defA = { x: cx + 55, y: H.y };
          const A = getPoint('A', defA);

          caption = 'Góc giữa đường thẳng d và mặt phẳng (P): Góc φ = ∠(d, (P)) = ∠SAH';
          content = `
            <polygon points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)} ${p4.x.toFixed(1)},${p4.y.toFixed(1)}" fill="#f8fafc" stroke="${strokeColor}" stroke-width="2" />
            <text x="${(p4.x + 10).toFixed(1)}" y="${(p4.y - 8).toFixed(1)}" font-size="13" font-style="italic" font-weight="bold" fill="${strokeColor}">(P)</text>
            <line x1="${S.x}" y1="${S.y.toFixed(1)}" x2="${H.x}" y2="${H.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
            <line x1="${S.x}" y1="${S.y.toFixed(1)}" x2="${A.x}" y2="${A.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${H.x}" y1="${H.y.toFixed(1)}" x2="${A.x}" y2="${A.y.toFixed(1)}" stroke="${auxColor}" stroke-width="1.6" stroke-dasharray="3 3" />
            <polyline points="${H.x},${(H.y - 9).toFixed(1)} ${H.x + 8},${(H.y - 9).toFixed(1)} ${H.x + 8},${H.y.toFixed(1)}" fill="none" stroke="${accentColor}" stroke-width="1.3" />
            <path d="M ${(A.x - 22).toFixed(1)},${A.y.toFixed(1)} A 22 22 0 0 0 ${(A.x - 17).toFixed(1)},${(A.y - 14).toFixed(1)}" fill="none" stroke="${accentColor}" stroke-width="1.8" />
            <text x="${(A.x - 30).toFixed(1)}" y="${(A.y - 6).toFixed(1)}" font-size="11" fill="${accentColor}" font-weight="bold">φ</text>
          `;

          draggableVertices = [
            { id: 'S', pt: S, label: 'S', labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'H', pt: H, label: 'H', labelOffset: { x: -14, y: 14 } },
            { id: 'A', pt: A, label: 'A', labelOffset: { x: 8, y: 4 } }
          ];
          break;
        }

        default: {
          const defH = { x: cx, y: baseY - 40 };
          const H = getPoint('H', defH);
          const defM = { x: H.x, y: H.y - h * 0.85 };
          const M = getPoint('M', defM);

          caption = 'Khoảng cách từ điểm M đến mặt phẳng (P): d(M, (P)) = MH';
          content = `
            <polygon points="${cx - 80},${baseY - 70} ${cx + 80},${baseY - 70} ${cx + 50},${baseY} ${cx - 110},${baseY}" fill="#f8fafc" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${M.x}" y1="${M.y}" x2="${H.x}" y2="${H.y}" stroke="${accentColor}" stroke-width="2" stroke-dasharray="3 3" />
            <polyline points="${H.x},${H.y - 8} ${H.x + 8},${H.y - 8} ${H.x + 8},${H.y}" fill="none" stroke="${accentColor}" stroke-width="1.3" />
          `;

          draggableVertices = [
            { id: 'M', pt: M, label: 'M', labelOffset: { x: -4, y: -10 }, color: accentColor },
            { id: 'H', pt: H, label: 'H', labelOffset: { x: 8, y: 14 } }
          ];
          break;
        }
      }
    }

    return { content, caption, draggableVertices };
  };

  const scene = getSceneData();

  // Clean SVG for Word Document insertion (without interactive rings)
  const getCleanSvgString = () => {
    const textStyle = 'font-family="Cambria Math, Times New Roman, serif" font-size="13" font-style="italic" font-weight="bold" fill="#242424"';
    let dots = '';
    scene.draggableVertices.forEach(v => {
      dots += `
        <circle cx="${v.pt.x.toFixed(1)}" cy="${v.pt.y.toFixed(1)}" r="2.8" fill="${v.color || '#0f6cbd'}" />
        <text x="${(v.pt.x + v.labelOffset.x).toFixed(1)}" y="${(v.pt.y + v.labelOffset.y).toFixed(1)}" ${textStyle}>${v.label}</text>
      `;
    });

    return `
      <svg width="310" height="250" viewBox="0 0 310 250" xmlns="http://www.w3.org/2000/svg">
        ${scene.content}
        ${dots}
      </svg>
    `;
  };

  const handleInsert = async () => {
    setStatus('Đang chèn hình không gian vào Word...');
    const svgCode = getCleanSvgString();
    const res = await insertSvgAtCursor(svgCode, scene.caption);
    setStatus(res.message);
  };

  const handleReset = () => {
    setShapeHeight(120);
    setBaseWidth(140);
    setSkewAngle(32);
    setLblS('S');
    setLblA('A');
    setLblB('B');
    setLblC('C');
    setLblD('D');
    setCustomPoints({});
  };

  return (
    <div className={styles.container}>
      <Card>
        <CardHeader
          image={<Cube24Regular style={{ color: '#0f6cbd' }} />}
          header={<Text weight="semibold" size={400}>Hình học không gian tương tác (THCS &amp; THPT)</Text>}
          description={<Text size={200}>Bấm giữ chuột vào đỉnh bất kỳ (S, A, B, C...) và kéo thả để di chuyển vị trí tự do</Text>}
        />

        {/* Categories Tab Navigation */}
        <div className={styles.tabNav}>
          <TabList
            selectedValue={category}
            onTabSelect={(_: SelectTabEvent, data: SelectTabData) => {
              setCategory(data.value as string);
              setCustomPoints({});
            }}
            size="small"
          >
            <Tab value="pyramids">1. Khối chóp</Tab>
            <Tab value="prisms">2. Lăng trụ &amp; Hộp</Tab>
            <Tab value="solids_rev">3. Nón - Trụ - Cầu</Tab>
            <Tab value="spatial_concepts">4. Khái niệm SGK</Tab>
          </TabList>
        </div>

        {/* Category Shape Selectors */}
        {category === 'pyramids' && (
          <Field label="Chọn mô hình khối chóp:">
            <Select
              value={pyramidType}
              onChange={(_, data) => {
                setPyramidType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="pyramid_tri_reg">Chóp tam giác đều S.ABC (đáy đều, SO ⊥ đáy)</option>
              <option value="pyramid_tri_sa">Chóp tam giác S.ABC có SA ⊥ (ABC)</option>
              <option value="pyramid_tri_sh">Chóp tam giác S.ABC có (SAB) ⊥ (ABC)</option>
              <option value="pyramid_quad_reg">Chóp tứ giác đều S.ABCD (đáy hình vuông, SO ⊥ đáy)</option>
              <option value="pyramid_quad_sa">Chóp tứ giác S.ABCD có SA ⊥ (ABCD)</option>
              <option value="tetrahedron_ortho">Tứ diện vuông O.ABC (OA, OB, OC đôi một vuông góc)</option>
            </Select>
          </Field>
        )}

        {category === 'prisms' && (
          <Field label="Chọn mô hình khối lăng trụ &amp; đa diện:">
            <Select
              value={prismType}
              onChange={(_, data) => {
                setPrismType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="prism_rect">Hình hộp chữ nhật ABCD.A'B'C'D' (12 cạnh chuẩn)</option>
              <option value="cube">Hình lập phương ABCD.A'B'C'D' (6 mặt vuông bằng nhau)</option>
              <option value="prism_tri">Hình lăng trụ tam giác ABC.A'B'C'</option>
              <option value="prism_tri_oblique">Hình lăng trụ xiên tam giác ABC.A'B'C' (A'H ⊥ đáy)</option>
            </Select>
          </Field>
        )}

        {category === 'solids_rev' && (
          <Field label="Chọn khối tròn xoay:">
            <Select
              value={solidRevType}
              onChange={(_, data) => {
                setSolidRevType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="cone">Hình nón tròn xoay (đỉnh S, trục SO, bán kính R)</option>
              <option value="cylinder">Hình trụ tròn xoay (trục OO', chiều cao h, bán kính R)</option>
            </Select>
          </Field>
        )}

        {category === 'spatial_concepts' && (
          <Field label="Khái niệm hình không gian trọng tâm SGK:">
            <Select
              value={conceptType}
              onChange={(_, data) => {
                setConceptType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="line_perp_plane">Đường thẳng vuông góc mặt phẳng: d ⊥ (P) tại H</option>
              <option value="line_plane_angle">Góc giữa đường thẳng và mặt phẳng: φ = ∠(d, (P))</option>
            </Select>
          </Field>
        )}

        {/* Dynamic Sliders for Dimension & Angle Customization */}
        <div className={styles.sliderBox}>
          <Field label={`Chiều cao hình học (h): ${shapeHeight} px`}>
            <Slider
              min={60}
              max={150}
              value={shapeHeight}
              onChange={(_, data) => setShapeHeight(data.value)}
            />
          </Field>
          <Field label={`Độ rộng đáy / Bán kính (w): ${baseWidth} px`}>
            <Slider
              min={90}
              max={180}
              value={baseWidth}
              onChange={(_, data) => setBaseWidth(data.value)}
            />
          </Field>
          <Field label={`Góc nghiêng phối cảnh đáy: ${skewAngle}° (thay đổi độ sâu/nghiêng 3D)`}>
            <Slider
              min={15}
              max={55}
              value={skewAngle}
              onChange={(_, data) => setSkewAngle(data.value)}
            />
          </Field>
        </div>

        {/* Interactive Drag & Drop Hint Bar */}
        <div className={styles.hintBar}>
          <span>🖐️ <strong>Kéo thả đỉnh 3D tự động bảo toàn tính chất song song &amp; nét khuất:</strong> Kéo đỉnh trên hình hộp thì các đỉnh liên quan tự động di chuyển theo chuẩn hình học không gian.</span>
          {Object.keys(customPoints).length > 0 && (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowReset20Regular />}
              onClick={handleResetPoints}
            >
              Đặt lại vị trí
            </Button>
          )}
        </div>

        {/* Interactive Live SVG Preview */}
        <Field label="Hình vẽ không gian 3D tương tác (Nét đứt / Nét liền động chuẩn Bộ Giáo Dục):">
          <div className={styles.previewContainer}>
            <svg
              ref={svgRef}
              width="310"
              height="250"
              viewBox="0 0 310 250"
              xmlns="http://www.w3.org/2000/svg"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ touchAction: 'none' }}
            >
              {/* Geometric lines and polygons */}
              <g dangerouslySetInnerHTML={{ __html: scene.content }} />

              {/* Draggable vertex handles */}
              {scene.draggableVertices.map(v => {
                const isCurrentDrag = activeDrag === v.id;
                const pointColor = v.color || '#0f6cbd';
                return (
                  <g
                    key={v.id}
                    transform={`translate(${v.pt.x.toFixed(1)}, ${v.pt.y.toFixed(1)})`}
                    onPointerDown={(e) => handlePointerDown(v.id, e)}
                    style={{
                      cursor: isCurrentDrag ? 'grabbing' : 'grab',
                      touchAction: 'none'
                    }}
                  >
                    {/* Transparent hit area */}
                    <circle r="14" fill="transparent" />

                    {/* Outer glowing halo ring */}
                    <circle
                      r={isCurrentDrag ? 10 : 7}
                      fill={isCurrentDrag ? 'rgba(209, 52, 56, 0.25)' : 'rgba(15, 108, 189, 0.18)'}
                      stroke={isCurrentDrag ? '#d13438' : pointColor}
                      strokeWidth="1.5"
                    />

                    {/* Center point */}
                    <circle r="3.5" fill={isCurrentDrag ? '#d13438' : pointColor} />

                    {/* Vertex Label */}
                    <text
                      x={v.labelOffset.x}
                      y={v.labelOffset.y}
                      fontFamily="Cambria Math, Times New Roman, serif"
                      fontSize="13"
                      fontStyle="italic"
                      fontWeight="bold"
                      fill="#242424"
                      style={{ pointerEvents: 'none' }}
                    >
                      {v.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Field>
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
          {scene.caption}
        </div>

        {/* Vertex Label Customizer */}
        <div className={styles.controlsGrid}>
          <Field label="Đỉnh (S):">
            <Input size="small" value={lblS} onChange={(e) => setLblS(e.target.value)} />
          </Field>
          <Field label="Đỉnh (A):">
            <Input size="small" value={lblA} onChange={(e) => setLblA(e.target.value)} />
          </Field>
          <Field label="Đỉnh (B):">
            <Input size="small" value={lblB} onChange={(e) => setLblB(e.target.value)} />
          </Field>
          <Field label="Đỉnh (C):">
            <Input size="small" value={lblC} onChange={(e) => setLblC(e.target.value)} />
          </Field>
          <Field label="Đỉnh (D):">
            <Input size="small" value={lblD} onChange={(e) => setLblD(e.target.value)} />
          </Field>
        </div>

        <div className={styles.row}>
          <Switch
            checked={showDashed}
            onChange={(_, data) => setShowDashed(data.checked)}
            label="Hiển thị nét đứt khuất"
          />
          <Switch
            checked={showRightAngles}
            onChange={(_, data) => setShowRightAngles(data.checked)}
            label="Ký hiệu vuông góc 3D"
          />
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            size="small"
            appearance="subtle"
            icon={<ArrowReset20Regular />}
            onClick={handleReset}
          >
            Đặt lại mặc định
          </Button>

          <Button
            appearance="primary"
            size="medium"
            icon={<Add20Regular />}
            onClick={handleInsert}
          >
            Chèn hình 3D vào Word
          </Button>
        </div>

        {status && (
          <Badge appearance="tint" color="informative" style={{ marginTop: '4px' }}>
            {status}
          </Badge>
        )}
      </Card>
    </div>
  );
};
