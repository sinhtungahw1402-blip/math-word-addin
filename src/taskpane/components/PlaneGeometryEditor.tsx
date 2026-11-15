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
  Shapes24Regular,
  Add20Regular,
  ArrowReset20Regular
} from '@fluentui/react-icons';
import { insertSvgAtCursor } from '../services/wordService';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  ConicType,
  generateConicScene,
  ConicSceneResult
} from '../services/conicUtils';
import {
  Point,
  getRightAngleMark,
  getAngleArc,
  getSegmentTicks,
  getProjection,
  getLineIntersection,
  calculatePlaneConstraints,
  getDefaultPlanePoints
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
    minHeight: '260px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
    overflowX: 'auto',
    userSelect: 'none'
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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

interface DraggableVertex {
  id: string;
  pt: Point;
  label: string;
  labelOffset: { x: number; y: number };
  color?: string;
}

interface SceneData {
  content: string;
  caption: string;
  draggableVertices: DraggableVertex[];
  conicExtra?: ConicSceneResult;
}

export const PlaneGeometryEditor: React.FC = () => {
  const styles = useStyles();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Tab categories
  const [category, setCategory] = useState<string>('triangles');

  // Sub-shape selection
  const [triangleType, setTriangleType] = useState<string>('acute');
  const [quadType, setQuadType] = useState<string>('parallelogram');
  const [specialLineType, setSpecialLineType] = useState<string>('altitudes_H');
  const [conceptType, setConceptType] = useState<string>('opposite_angles');

  // Customization parameters
  const [customAngle, setCustomAngle] = useState<number>(65); // Angle in degrees
  const [sideLength, setSideLength] = useState<number>(140);
  const [skewVal, setSkewVal] = useState<number>(35); // Skew for parallelogram
  const [showRightAngles, setShowRightAngles] = useState<boolean>(true);
  const [showTicks, setShowTicks] = useState<boolean>(true);

  // Labels
  const [lblA, setLblA] = useState<string>('A');
  const [lblB, setLblB] = useState<string>('B');
  const [lblC, setLblC] = useState<string>('C');
  const [lblD, setLblD] = useState<string>('D');

  // 3 Conic Sections State (SGK Toán 10)
  const [conicType, setConicType] = useState<ConicType>('ellipse');
  const [conicA, setConicA] = useState<number>(5);
  const [conicB, setConicB] = useState<number>(3);
  const [conicP, setConicP] = useState<number>(2);
  const [conicTM, setConicTM] = useState<number>(50); // angle in deg for ellipse, y-factor for hyperbola/parabola

  const [conicShowPointM, setConicShowPointM] = useState<boolean>(true);
  const [conicShowFoci, setConicShowFoci] = useState<boolean>(true);
  const [conicShowVertices, setConicShowVertices] = useState<boolean>(true);
  const [conicShowAsymptotes, setConicShowAsymptotes] = useState<boolean>(true);
  const [conicShowFundamentalRect, setConicShowFundamentalRect] = useState<boolean>(false);
  const [conicShowDirectrix, setConicShowDirectrix] = useState<boolean>(true);
  const [conicShowFocalRadii, setConicShowFocalRadii] = useState<boolean>(true);

  // Custom Conic Labels
  const [lblF1, setLblF1] = useState<string>('F₁');
  const [lblF2, setLblF2] = useState<string>('F₂');
  const [lblM, setLblM] = useState<string>('M');
  const [lblH, setLblH] = useState<string>('H');
  const [lblA1, setLblA1] = useState<string>('A₁');
  const [lblA2, setLblA2] = useState<string>('A₂');
  const [lblB1, setLblB1] = useState<string>('B₁');
  const [lblB2, setLblB2] = useState<string>('B₂');
  const [lblDelta, setLblDelta] = useState<string>('Δ');
  const [lblCurve, setLblCurve] = useState<string>('(E)');

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

    // Conic interactive point M drag handler
    if (category === 'conics') {
      if (activeDrag === 'M') {
        if (conicType === 'ellipse') {
          const originX = 170;
          const originY = 120;
          const dx = rawX - originX;
          const dy = -(rawY - originY);
          let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          setConicTM(Math.round(deg));
        } else if (conicType === 'hyperbola') {
          const originY = 120;
          const c = Math.sqrt(conicA * conicA + conicB * conicB);
          const S = 90 / (c || 1);
          const yMath = -(rawY - originY) / S;
          const nextTM = Math.max(-2.5, Math.min(2.5, +(yMath / (0.8 * (conicB || 1))).toFixed(2)));
          setConicTM(nextTM);
        } else if (conicType === 'parabola') {
          const originY = 120;
          const S = 80 / (conicP || 1);
          const yMath = -(rawY - originY) / S;
          const nextTM = Math.max(-2.5, Math.min(2.5, +(yMath / (0.9 * (conicP || 1))).toFixed(2)));
          setConicTM(nextTM);
        }
      }
      return;
    }

    // Clamp within SVG canvas bounds
    const clampedX = Math.round(Math.max(14, Math.min(vb.width - 14, rawX)));
    const clampedY = Math.round(Math.max(14, Math.min(vb.height - 14, rawY)));

    const activeShapeType =
      category === 'quads'
        ? quadType
        : category === 'triangles'
        ? triangleType
        : category === 'special_lines'
        ? specialLineType
        : conceptType;
    const defaults = getDefaultPlanePoints(category, activeShapeType, customAngle, sideLength, skewVal);

    // Apply geometric constraint propagation (maintaining parallel edges, perpendicular angles, equality)
    const updatedPoints = calculatePlaneConstraints(
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

  // Compute Scene Data
  const getSceneData = (): SceneData => {
    const strokeColor = '#0f6cbd';
    const accentColor = '#d13438';
    const auxColor = '#605e5c';
    const textStyle = 'font-family="Cambria Math, Times New Roman, serif" font-size="13" font-style="italic" font-weight="bold" fill="#242424"';

    let content = '';
    let caption = '';
    let draggableVertices: DraggableVertex[] = [];

    // ==========================================
    // 0. BA ĐƯỜNG CONIC (ELIP, HYPEBOL, PARABOL)
    // ==========================================
    if (category === 'conics') {
      const conicRes = generateConicScene({
        type: conicType,
        a: conicA,
        b: conicB,
        p: conicP,
        tM: conicTM,
        showPointM: conicShowPointM,
        showFoci: conicShowFoci,
        showVertices: conicShowVertices,
        showAsymptotes: conicShowAsymptotes,
        showFundamentalRect: conicShowFundamentalRect,
        showDirectrix: conicShowDirectrix,
        showFocalRadii: conicShowFocalRadii,
        lblF1,
        lblF2,
        lblM,
        lblH,
        lblA1,
        lblA2,
        lblB1,
        lblB2,
        lblDelta,
        lblCurve
      });
      return {
        content: conicRes.content,
        caption: conicRes.caption,
        draggableVertices: conicRes.draggableVertices,
        conicExtra: conicRes
      };
    }

    // ==========================================
    // 1. TAM GIÁC (TRIANGLES)
    // ==========================================
    if (category === 'triangles') {
      let defA: Point = { x: 135, y: 45 };
      let defB: Point = { x: 45, y: 175 };
      let defC: Point = { x: 225, y: 175 };
      caption = `Tam giác ${lblA}${lblB}${lblC}`;
      let extra = '';

      switch (triangleType) {
        case 'acute':
          defA = { x: 135, y: 45 };
          defB = { x: 45, y: 175 };
          defC = { x: 225, y: 175 };
          caption = `Tam giác nhọn ${lblA}${lblB}${lblC}`;
          break;

        case 'right_B':
          defB = { x: 55, y: 175 };
          defC = { x: 225, y: 175 };
          defA = { x: 55, y: 45 };
          caption = `Tam giác ${lblA}${lblB}${lblC} vuông tại ${lblB}`;
          break;

        case 'right_A':
          defB = { x: 45, y: 175 };
          defC = { x: 225, y: 175 };
          defA = {
            x: 135 + 90 * Math.cos((125 * Math.PI) / 180),
            y: 175 - 90 * Math.sin((125 * Math.PI) / 180)
          };
          caption = `Tam giác ${lblA}${lblB}${lblC} vuông tại ${lblA}`;
          break;

        case 'obtuse':
          defB = { x: 35, y: 175 };
          defC = { x: 235, y: 175 };
          defA = { x: 115, y: 120 };
          caption = `Tam giác tù ${lblA}${lblB}${lblC} (Â > 90°)`;
          break;

        case 'isosceles':
          defB = { x: 50, y: 175 };
          defC = { x: 210, y: 175 };
          defA = { x: 130, y: 45 };
          caption = `Tam giác ${lblA}${lblB}${lblC} cân tại ${lblA} (${lblA}${lblB} = ${lblA}${lblC})`;
          break;

        case 'equilateral':
          defB = { x: 55, y: 175 };
          defC = { x: 205, y: 175 };
          defA = { x: 130, y: 175 - 129.9 };
          caption = `Tam giác đều ${lblA}${lblB}${lblC} (${lblA}${lblB} = ${lblB}${lblC} = ${lblC}${lblA})`;
          break;

        case 'right_isosceles':
          defB = { x: 45, y: 175 };
          defC = { x: 225, y: 175 };
          defA = { x: 135, y: 85 };
          caption = `Tam giác ${lblA}${lblB}${lblC} vuông cân tại ${lblA}`;
          break;

        case 'custom':
          defB = { x: 45, y: 175 };
          defC = { x: 45 + sideLength, y: 175 };
          const rad = (customAngle * Math.PI) / 180;
          const aLen = 110;
          defA = {
            x: Math.round(defB.x + aLen * Math.cos(rad)),
            y: Math.round(defB.y - aLen * Math.sin(rad))
          };
          caption = `Tam giác ${lblA}${lblB}${lblC} tuỳ ý (∠B = ${customAngle}°)`;
          break;
      }

      const A = getPoint('A', defA);
      const B = getPoint('B', defB);
      const C = getPoint('C', defC);

      if (triangleType === 'right_B' && showRightAngles) {
        extra += getRightAngleMark(B, A, C, 14, accentColor);
      } else if ((triangleType === 'right_A' || triangleType === 'right_isosceles') && showRightAngles) {
        extra += getRightAngleMark(A, B, C, 14, accentColor);
      }

      if (triangleType === 'obtuse') {
        extra += getAngleArc(A, B, C, 22, accentColor);
      } else if (triangleType === 'custom') {
        extra += getAngleArc(B, C, A, 22, accentColor);
      }

      if (showTicks) {
        if (triangleType === 'isosceles' || triangleType === 'right_isosceles') {
          extra += getSegmentTicks(A, B, 1, 6, accentColor);
          extra += getSegmentTicks(A, C, 1, 6, accentColor);
        } else if (triangleType === 'equilateral') {
          extra += getSegmentTicks(A, B, 1, 6, accentColor);
          extra += getSegmentTicks(A, C, 1, 6, accentColor);
          extra += getSegmentTicks(B, C, 1, 6, accentColor);
        }
      }

      content = `
        <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
        ${extra}
      `;

      draggableVertices = [
        { id: 'A', pt: A, label: lblA, labelOffset: { x: -4, y: -10 } },
        { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 15 } },
        { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 15 } }
      ];
    }

    // ==========================================
    // 2. TỨ GIÁC & ĐA GIÁC ĐỀU (QUADS & POLYGONS)
    // ==========================================
    else if (category === 'quads') {
      let defA: Point = { x: 80, y: 65 };
      let defB: Point = { x: 40, y: 170 };
      let defC: Point = { x: 185, y: 170 };
      let defD: Point = { x: 225, y: 65 };
      caption = `Tứ giác ${lblA}${lblB}${lblC}${lblD}`;
      let extra = '';

      switch (quadType) {
        case 'parallelogram':
          defA = { x: 45 + skewVal, y: 65 };
          defB = { x: 45, y: 170 };
          defC = { x: 205, y: 170 };
          defD = { x: 205 + skewVal, y: 65 };
          caption = `Hình bình hành ${lblA}${lblB}${lblC}${lblD} (${lblA}${lblB} // ${lblC}${lblD}, ${lblA}${lblD} // ${lblB}${lblC})`;
          break;

        case 'rectangle':
          defA = { x: 55, y: 65 };
          defB = { x: 55, y: 170 };
          defC = { x: 215, y: 170 };
          defD = { x: 215, y: 65 };
          caption = `Hình chữ nhật ${lblA}${lblB}${lblC}${lblD} (4 góc vuông 90°)`;
          break;

        case 'rhombus':
          defA = { x: 130, y: 45 };
          defB = { x: 50, y: 115 };
          defC = { x: 130, y: 185 };
          defD = { x: 210, y: 115 };
          caption = `Hình thoi ${lblA}${lblB}${lblC}${lblD} (4 cạnh bằng nhau, 2 đường chéo vuông góc)`;
          break;

        case 'square':
          defA = { x: 75, y: 55 };
          defB = { x: 75, y: 175 };
          defC = { x: 195, y: 175 };
          defD = { x: 195, y: 55 };
          caption = `Hình vuông ${lblA}${lblB}${lblC}${lblD} (4 cạnh bằng nhau, 4 góc vuông)`;
          break;

        case 'trapezoid':
          defA = { x: 85, y: 65 };
          defB = { x: 45, y: 170 };
          defC = { x: 225, y: 170 };
          defD = { x: 185, y: 65 };
          caption = `Hình thang ${lblA}${lblB}${lblC}${lblD} (đáy ${lblA}${lblD} // ${lblB}${lblC})`;
          break;

        case 'iso_trapezoid':
          defA = { x: 85, y: 65 };
          defB = { x: 45, y: 170 };
          defC = { x: 215, y: 170 };
          defD = { x: 175, y: 65 };
          caption = `Hình thang cân ${lblA}${lblB}${lblC}${lblD} (${lblA}${lblB} = ${lblC}${lblD}, 2 góc kề một đáy bằng nhau)`;
          break;

        case 'right_trapezoid':
          defA = { x: 55, y: 65 };
          defB = { x: 55, y: 170 };
          defC = { x: 220, y: 170 };
          defD = { x: 165, y: 65 };
          caption = `Hình thang vuông ${lblA}${lblB}${lblC}${lblD} (vuông tại ${lblA} và ${lblB})`;
          break;

        case 'arbitrary_quad':
          defA = { x: 80, y: 50 };
          defB = { x: 35, y: 160 };
          defC = { x: 200, y: 180 };
          defD = { x: 230, y: 80 };
          caption = `Tứ giác lồi ${lblA}${lblB}${lblC}${lblD} (bấm kéo thả đỉnh tự do)`;
          break;

        case 'regular_pentagon': {
          const defaults = getDefaultPlanePoints(category, 'regular_pentagon');
          const A = getPoint('A', defaults.A);
          const B = getPoint('B', defaults.B);
          const C = getPoint('C', defaults.C);
          const D = getPoint('D', defaults.D);
          const E = getPoint('E', defaults.E);
          caption = `Ngũ giác đều ABCDE (5 cạnh bằng nhau, 5 góc bằng 108°)`;
          content = `
            <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)} ${D.x.toFixed(1)},${D.y.toFixed(1)} ${E.x.toFixed(1)},${E.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
          `;
          draggableVertices = [
            { id: 'A', pt: A, label: 'A', labelOffset: { x: -4, y: -10 } },
            { id: 'B', pt: B, label: 'B', labelOffset: { x: 10, y: -2 } },
            { id: 'C', pt: C, label: 'C', labelOffset: { x: 8, y: 14 } },
            { id: 'D', pt: D, label: 'D', labelOffset: { x: -14, y: 14 } },
            { id: 'E', pt: E, label: 'E', labelOffset: { x: -16, y: -2 } }
          ];
          break;
        }

        case 'regular_hexagon': {
          const defaults = getDefaultPlanePoints(category, 'regular_hexagon');
          const A = getPoint('A', defaults.A);
          const B = getPoint('B', defaults.B);
          const C = getPoint('C', defaults.C);
          const D = getPoint('D', defaults.D);
          const E = getPoint('E', defaults.E);
          const F = getPoint('F', defaults.F);
          caption = `Lục giác đều ABCDEF (6 cạnh bằng nhau, 6 góc bằng 120°)`;
          content = `
            <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)} ${D.x.toFixed(1)},${D.y.toFixed(1)} ${E.x.toFixed(1)},${E.y.toFixed(1)} ${F.x.toFixed(1)},${F.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${A.x}" y1="${A.y}" x2="${D.x}" y2="${D.y}" stroke="${auxColor}" stroke-dasharray="2 2" stroke-width="1.2" />
            <line x1="${B.x}" y1="${B.y}" x2="${E.x}" y2="${E.y}" stroke="${auxColor}" stroke-dasharray="2 2" stroke-width="1.2" />
            <line x1="${C.x}" y1="${C.y}" x2="${F.x}" y2="${F.y}" stroke="${auxColor}" stroke-dasharray="2 2" stroke-width="1.2" />
          `;
          draggableVertices = [
            { id: 'A', pt: A, label: 'A', labelOffset: { x: -4, y: -10 } },
            { id: 'B', pt: B, label: 'B', labelOffset: { x: 10, y: -4 } },
            { id: 'C', pt: C, label: 'C', labelOffset: { x: 10, y: 10 } },
            { id: 'D', pt: D, label: 'D', labelOffset: { x: -4, y: 15 } },
            { id: 'E', pt: E, label: 'E', labelOffset: { x: -16, y: 10 } },
            { id: 'F', pt: F, label: 'F', labelOffset: { x: -16, y: -4 } }
          ];
          break;
        }
      }

      if (quadType !== 'regular_pentagon' && quadType !== 'regular_hexagon') {
        const A = getPoint('A', defA);
        const B = getPoint('B', defB);
        const C = getPoint('C', defC);
        const D = getPoint('D', defD);

        if (quadType === 'rectangle' && showRightAngles) {
          extra += getRightAngleMark(A, B, D, 11, accentColor);
          extra += getRightAngleMark(B, A, C, 11, accentColor);
          extra += getRightAngleMark(C, B, D, 11, accentColor);
          extra += getRightAngleMark(D, C, A, 11, accentColor);
        } else if (quadType === 'square' && showRightAngles) {
          extra += getRightAngleMark(A, B, D, 11, accentColor);
          extra += getRightAngleMark(B, A, C, 11, accentColor);
          extra += getRightAngleMark(C, B, D, 11, accentColor);
          extra += getRightAngleMark(D, C, A, 11, accentColor);
        } else if (quadType === 'right_trapezoid' && showRightAngles) {
          extra += getRightAngleMark(A, B, D, 12, accentColor);
          extra += getRightAngleMark(B, A, C, 12, accentColor);
        } else if (quadType === 'rhombus') {
          extra += `<line x1="${A.x}" y1="${A.y}" x2="${C.x}" y2="${C.y}" stroke="${auxColor}" stroke-dasharray="3 3" />`;
          extra += `<line x1="${B.x}" y1="${B.y}" x2="${D.x}" y2="${D.y}" stroke="${auxColor}" stroke-dasharray="3 3" />`;
          const midR = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
          if (showRightAngles) {
            extra += getRightAngleMark(midR, A, D, 10, accentColor);
          }
        }

        content = `
          <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)} ${D.x.toFixed(1)},${D.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
          ${extra}
        `;

        draggableVertices = [
          { id: 'A', pt: A, label: lblA, labelOffset: { x: -14, y: -8 } },
          { id: 'B', pt: B, label: lblB, labelOffset: { x: -16, y: 15 } },
          { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 15 } },
          { id: 'D', pt: D, label: lblD, labelOffset: { x: 8, y: -8 } }
        ];
      }
    }

    // ==========================================
    // 3. ĐƯỜNG ĐẶC BIỆT & CÁC TÂM TAM GIÁC
    // ==========================================
    else if (category === 'special_lines') {
      const defA: Point = { x: 135, y: 45 };
      const defB: Point = { x: 45, y: 175 };
      const defC: Point = { x: 235, y: 175 };

      const A = getPoint('A', defA);
      const B = getPoint('B', defB);
      const C = getPoint('C', defC);

      let extra = '';

      switch (specialLineType) {
        case 'medians_G': {
          const M = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
          const N = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
          const P = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
          const G = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };

          caption = `3 đường trung tuyến cắt nhau tại trọng tâm G của tam giác ${lblA}${lblB}${lblC}`;
          extra = `
            <line x1="${A.x}" y1="${A.y}" x2="${M.x}" y2="${M.y}" stroke="${accentColor}" stroke-width="1.8" />
            <line x1="${B.x}" y1="${B.y}" x2="${N.x}" y2="${N.y}" stroke="${accentColor}" stroke-width="1.8" />
            <line x1="${C.x}" y1="${C.y}" x2="${P.x}" y2="${P.y}" stroke="${accentColor}" stroke-width="1.8" />
            <circle cx="${G.x}" cy="${G.y}" r="3.5" fill="${accentColor}" />
            <text x="${G.x + 6}" y="${G.y - 6}" ${textStyle} fill="${accentColor}">G</text>
            <text x="${M.x - 4}" y="${M.y + 14}" font-size="11">M</text>
            <text x="${N.x + 8}" y="${N.y}" font-size="11">N</text>
            <text x="${P.x - 14}" y="${P.y}" font-size="11">P</text>
          `;
          break;
        }

        case 'altitudes_H': {
          const D_pt = getProjection(A, B, C);
          const E_pt = getProjection(B, A, C);
          const F_pt = getProjection(C, A, B);
          const H_pt = getLineIntersection(A, D_pt, B, E_pt) || { x: 135, y: 135 };

          caption = `3 đường cao cắt nhau tại trực tâm H của tam giác ${lblA}${lblB}${lblC}`;
          extra = `
            <line x1="${A.x}" y1="${A.y}" x2="${D_pt.x}" y2="${D_pt.y}" stroke="${accentColor}" stroke-width="1.8" />
            <line x1="${B.x}" y1="${B.y}" x2="${E_pt.x}" y2="${E_pt.y}" stroke="${accentColor}" stroke-width="1.8" />
            <line x1="${C.x}" y1="${C.y}" x2="${F_pt.x}" y2="${F_pt.y}" stroke="${accentColor}" stroke-width="1.8" />
            ${getRightAngleMark(D_pt, A, C, 9, accentColor)}
            ${getRightAngleMark(E_pt, B, A, 9, accentColor)}
            ${getRightAngleMark(F_pt, C, B, 9, accentColor)}
            <circle cx="${H_pt.x}" cy="${H_pt.y}" r="3.5" fill="${accentColor}" />
            <text x="${H_pt.x + 6}" y="${H_pt.y - 6}" ${textStyle} fill="${accentColor}">H</text>
          `;
          break;
        }

        case 'angle_bisectors_I': {
          const a = Math.hypot(B.x - C.x, B.y - C.y) || 1;
          const b = Math.hypot(A.x - C.x, A.y - C.y) || 1;
          const c = Math.hypot(A.x - B.x, A.y - B.y) || 1;
          const perim = a + b + c;
          const I = {
            x: (a * A.x + b * B.x + c * C.x) / perim,
            y: (a * A.y + b * B.y + c * C.y) / perim
          };
          const D_bis = { x: (b * B.x + c * C.x) / (b + c), y: (b * B.y + c * C.y) / (b + c) };
          const E_bis = { x: (a * A.x + c * C.x) / (a + c), y: (a * A.y + c * C.y) / (a + c) };
          const F_bis = { x: (a * A.x + b * B.x) / (a + b), y: (a * A.y + b * B.y) / (a + b) };
          const s = perim / 2;
          const area = Math.abs((A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2);
          const r = area / s;

          caption = `3 đường phân giác cắt nhau tại tâm đường tròn nội tiếp I của tam giác ${lblA}${lblB}${lblC}`;
          extra = `
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${D_bis.x.toFixed(1)}" y2="${D_bis.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" />
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${E_bis.x.toFixed(1)}" y2="${E_bis.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" />
            <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${F_bis.x.toFixed(1)}" y2="${F_bis.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.8" />
            <circle cx="${I.x.toFixed(1)}" cy="${I.y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${auxColor}" stroke-width="1.3" stroke-dasharray="3 3" />
            <circle cx="${I.x.toFixed(1)}" cy="${I.y.toFixed(1)}" r="3.5" fill="${accentColor}" />
            <text x="${(I.x + 6).toFixed(1)}" y="${(I.y - 6).toFixed(1)}" ${textStyle} fill="${accentColor}">I</text>
          `;
          break;
        }

        case 'midline': {
          const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
          const N = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };

          caption = `Đường trung bình MN của tam giác ${lblA}${lblB}${lblC} (MN // BC, MN = 1/2 BC)`;
          extra = `
            <line x1="${M.x.toFixed(1)}" y1="${M.y.toFixed(1)}" x2="${N.x.toFixed(1)}" y2="${N.y.toFixed(1)}" stroke="${accentColor}" stroke-width="2" />
            ${getSegmentTicks(A, M, 1, 6, accentColor)}
            ${getSegmentTicks(M, B, 1, 6, accentColor)}
            ${getSegmentTicks(A, N, 2, 6, accentColor)}
            ${getSegmentTicks(N, C, 2, 6, accentColor)}
            <circle cx="${M.x.toFixed(1)}" cy="${M.y.toFixed(1)}" r="2.5" fill="${accentColor}" />
            <circle cx="${N.x.toFixed(1)}" cy="${N.y.toFixed(1)}" r="2.5" fill="${accentColor}" />
            <text x="${(M.x - 16).toFixed(1)}" y="${(M.y + 4).toFixed(1)}" ${textStyle} fill="${accentColor}">M</text>
            <text x="${(N.x + 6).toFixed(1)}" y="${(N.y + 4).toFixed(1)}" ${textStyle} fill="${accentColor}">N</text>
          `;
          break;
        }
      }

      content = `
        <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
        ${extra}
      `;

      draggableVertices = [
        { id: 'A', pt: A, label: lblA, labelOffset: { x: -4, y: -10 } },
        { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 15 } },
        { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 15 } }
      ];
    }

    // ==========================================
    // 4. KHÁI NIỆM HÌNH HỌC PHẲNG THCS
    // ==========================================
    else {
      switch (conceptType) {
        case 'opposite_angles': {
          const defO: Point = { x: 150, y: 110 };
          const defA: Point = { x: 45, y: 55 };
          const defB: Point = { x: 255, y: 165 };
          const defC: Point = { x: 55, y: 165 };
          const defD: Point = { x: 245, y: 55 };

          const O = getPoint('O', defO);
          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);
          const D = getPoint('D', defD);

          caption = 'Hai góc đối đỉnh bằng nhau (∠xOy = ∠x\'Oy\')';
          content = `
            <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${C.x}" y1="${C.y}" x2="${D.x}" y2="${D.y}" stroke="${strokeColor}" stroke-width="2" />
            ${getAngleArc(O, A, D, 20, accentColor)}
            ${getAngleArc(O, C, B, 20, accentColor)}
            <circle cx="${O.x}" cy="${O.y}" r="3" fill="${accentColor}" />
            <text x="${O.x - 4}" y="${O.y - 8}" ${textStyle}>O</text>
          `;

          draggableVertices = [
            { id: 'A', pt: A, label: 'x', labelOffset: { x: -14, y: -4 } },
            { id: 'B', pt: B, label: "x'", labelOffset: { x: 8, y: 14 } },
            { id: 'C', pt: C, label: "y'", labelOffset: { x: -14, y: 14 } },
            { id: 'D', pt: D, label: 'y', labelOffset: { x: 8, y: -4 } }
          ];
          break;
        }

        case 'tangent_circle': {
          const defO: Point = { x: 130, y: 115 };
          const defA: Point = { x: 130, y: 50 };

          const O = getPoint('O', defO);
          const A = getPoint('A', defA);
          const R = Math.hypot(A.x - O.x, A.y - O.y) || 65;

          const dx = A.x - O.x;
          const dy = A.y - O.y;
          const u_tan = { x: -dy / R, y: dx / R };

          const t1 = { x: A.x - 85 * u_tan.x, y: A.y - 85 * u_tan.y };
          const t2 = { x: A.x + 85 * u_tan.x, y: A.y + 85 * u_tan.y };

          caption = 'Tiếp tuyến của đường tròn vuông góc với bán kính tại tiếp điểm A (d ⊥ OA)';
          content = `
            <circle cx="${O.x}" cy="${O.y}" r="${R.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${O.x}" y1="${O.y}" x2="${A.x}" y2="${A.y}" stroke="${auxColor}" stroke-width="1.8" />
            <line x1="${t1.x.toFixed(1)}" y1="${t1.y.toFixed(1)}" x2="${t2.x.toFixed(1)}" y2="${t2.y.toFixed(1)}" stroke="${accentColor}" stroke-width="2" />
            ${getRightAngleMark(A, O, t2, 10, accentColor)}
            <circle cx="${O.x}" cy="${O.y}" r="3" fill="#242424" />
            <text x="${O.x - 14}" y="${O.y + 4}" ${textStyle}>O</text>
            <text x="${t2.x + 6}" y="${t2.y + 4}" font-size="12" fill="${accentColor}" font-weight="bold">d</text>
          `;

          draggableVertices = [
            { id: 'O', pt: O, label: 'O', labelOffset: { x: -14, y: 4 } },
            { id: 'A', pt: A, label: 'A', labelOffset: { x: 8, y: -4 }, color: accentColor }
          ];
          break;
        }

        case 'cyclic_quad': {
          const defaults = getDefaultPlanePoints('thcs_concepts', 'cyclic_quad');
          const O = defaults.O || { x: 150, y: 115 };
          const R = 80;

          const A = getPoint('A', defaults.A);
          const B = getPoint('B', defaults.B);
          const C = getPoint('C', defaults.C);
          const D = getPoint('D', defaults.D);

          caption = `Tứ giác ${lblA}${lblB}${lblC}${lblD} nội tiếp đường tròn (O): 4 đỉnh luôn thuộc đường tròn, ∠${lblA} + ∠${lblC} = 180°`;
          content = `
            <!-- Đường tròn ngoại tiếp (O, R) -->
            <circle cx="${O.x}" cy="${O.y}" r="${R}" fill="none" stroke="${strokeColor}" stroke-width="1.8" />
            <!-- Tứ giác nội tiếp ABCD -->
            <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)} ${D.x.toFixed(1)},${D.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <!-- Cung đánh dấu góc đối diện A và C (tổng 180 độ) -->
            ${getAngleArc(A, B, D, 18, accentColor)}
            ${getAngleArc(C, D, B, 18, accentColor)}
            <!-- Tâm O -->
            <circle cx="${O.x}" cy="${O.y}" r="3" fill="#242424" />
            <text x="${O.x - 4}" y="${O.y - 8}" ${textStyle}>O</text>
          `;

          draggableVertices = [
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -14, y: -6 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 14 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 14 } },
            { id: 'D', pt: D, label: lblD, labelOffset: { x: 8, y: -6 } }
          ];
          break;
        }

        case 'inscribed_angle': {
          const defaults = getDefaultPlanePoints('thcs_concepts', 'inscribed_angle');
          const O = defaults.O || { x: 150, y: 120 };
          const R = 75;

          const A = getPoint('A', defaults.A);
          const B = getPoint('B', defaults.B);
          const C = getPoint('C', defaults.C);

          caption = `Góc nội tiếp ∠${lblA} và góc ở tâm ∠BOC cùng chắn cung BC (∠BOC = 2∠${lblA})`;
          content = `
            <circle cx="${O.x}" cy="${O.y}" r="${R}" fill="none" stroke="${strokeColor}" stroke-width="1.8" />
            <!-- Các cạnh góc nội tiếp AB, AC -->
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="2" />
            <!-- Bán kính OB, OC của góc ở tâm -->
            <line x1="${O.x}" y1="${O.y}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.6" stroke-dasharray="3 3" />
            <line x1="${O.x}" y1="${O.y}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${accentColor}" stroke-width="1.6" stroke-dasharray="3 3" />
            <!-- Dây cung BC -->
            <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${auxColor}" stroke-width="1.3" stroke-dasharray="2 2" />
            ${getAngleArc(A, B, C, 22, strokeColor)}
            ${getAngleArc(O, B, C, 18, accentColor)}
            <circle cx="${O.x}" cy="${O.y}" r="3" fill="#242424" />
            <text x="${O.x - 4}" y="${O.y - 8}" ${textStyle}>O</text>
          `;

          draggableVertices = [
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -4, y: -10 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 14 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 14 } }
          ];
          break;
        }

        default: {
          const defA: Point = { x: 135, y: 45 };
          const defB: Point = { x: 45, y: 175 };
          const defC: Point = { x: 225, y: 175 };
          const A = getPoint('A', defA);
          const B = getPoint('B', defB);
          const C = getPoint('C', defC);

          caption = `Tam giác ${lblA}${lblB}${lblC}`;
          content = `<polygon points="${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}" fill="none" stroke="${strokeColor}" stroke-width="2" />`;
          draggableVertices = [
            { id: 'A', pt: A, label: lblA, labelOffset: { x: -4, y: -10 } },
            { id: 'B', pt: B, label: lblB, labelOffset: { x: -14, y: 15 } },
            { id: 'C', pt: C, label: lblC, labelOffset: { x: 8, y: 15 } }
          ];
          break;
        }
      }
    }

    return { content, caption, draggableVertices };
  };

  const scene = getSceneData();

  // Generate Clean SVG String for Word Insertion (without interactive drag rings)
  const getCleanSvgString = () => {
    const textStyle = 'font-family="Cambria Math, Times New Roman, serif" font-size="13" font-style="italic" font-weight="bold" fill="#242424"';
    let dots = '';
    scene.draggableVertices.forEach(v => {
      dots += `
        <circle cx="${v.pt.x.toFixed(1)}" cy="${v.pt.y.toFixed(1)}" r="2.8" fill="${v.color || '#0f6cbd'}" />
        <text x="${(v.pt.x + v.labelOffset.x).toFixed(1)}" y="${(v.pt.y + v.labelOffset.y).toFixed(1)}" ${textStyle}>${v.label}</text>
      `;
    });

    const isConic = category === 'conics';
    const vb = isConic ? '0 0 340 240' : '0 0 310 230';
    const w = isConic ? '340' : '310';
    const h = isConic ? '240' : '230';

    return `
      <svg width="${w}" height="${h}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
        ${scene.content}
        ${dots}
      </svg>
    `;
  };

  const handleInsert = async () => {
    setStatus('Đang chèn hình phẳng vào Word...');
    const svgCode = getCleanSvgString();
    const res = await insertSvgAtCursor(svgCode, scene.caption);
    setStatus(res.message);
  };

  const handleResetLabels = () => {
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
          image={<Shapes24Regular style={{ color: '#0f6cbd' }} />}
          header={<Text weight="semibold" size={400}>Hình học phẳng tương tác (THCS &amp; THPT)</Text>}
          description={<Text size={200}>Bấm giữ chuột vào đỉnh bất kỳ và kéo thả để điều chỉnh hình dạng tự do</Text>}
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
            <Tab value="triangles">1. Tam giác</Tab>
            <Tab value="quads">2. Tứ giác &amp; Đa giác</Tab>
            <Tab value="special_lines">3. Đường đặc biệt &amp; Tâm</Tab>
            <Tab value="thcs_concepts">4. Khái niệm THCS</Tab>
            <Tab value="conics">5. Ba đường conic (SGK Toán 10)</Tab>
          </TabList>
        </div>

        {/* Category Sub-Selectors */}
        {category === 'triangles' && (
          <Field label="Chọn loại tam giác:">
            <Select
              value={triangleType}
              onChange={(_, data) => {
                setTriangleType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="acute">Tam giác nhọn (3 góc &lt; 90°)</option>
              <option value="right_B">Tam giác vuông tại B (Góc B = 90°)</option>
              <option value="right_A">Tam giác vuông tại A (Góc A = 90°)</option>
              <option value="obtuse">Tam giác tù (Góc A &gt; 90°)</option>
              <option value="isosceles">Tam giác cân tại A (AB = AC)</option>
              <option value="equilateral">Tam giác đều (AB = BC = CA)</option>
              <option value="right_isosceles">Tam giác vuông cân tại A</option>
              <option value="custom">Tam giác tuỳ chỉnh góc B và cạnh BC</option>
            </Select>
          </Field>
        )}

        {category === 'quads' && (
          <Field label="Chọn loại tứ giác / đa giác:">
            <Select
              value={quadType}
              onChange={(_, data) => {
                setQuadType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="parallelogram">Hình bình hành (2 cặp cạnh song song)</option>
              <option value="rectangle">Hình chữ nhật (4 góc vuông)</option>
              <option value="rhombus">Hình thoi (4 cạnh bằng nhau, 2 đường chéo vuông góc)</option>
              <option value="square">Hình vuông (4 cạnh bằng nhau, 4 góc vuông)</option>
              <option value="trapezoid">Hình thang thường (AD // BC)</option>
              <option value="iso_trapezoid">Hình thang cân (2 cạnh bên bằng nhau)</option>
              <option value="right_trapezoid">Hình thang vuông (2 góc vuông kề cạnh bên)</option>
              <option value="arbitrary_quad">Tứ giác lồi tuỳ ý (bấm kéo thả tự do)</option>
              <option value="regular_pentagon">Ngũ giác đều (5 cạnh &amp; 5 góc bằng nhau)</option>
              <option value="regular_hexagon">Lục giác đều (6 cạnh bằng nhau, 3 đường chéo chính)</option>
            </Select>
          </Field>
        )}

        {category === 'special_lines' && (
          <Field label="Chọn đường đặc biệt &amp; các tâm của tam giác:">
            <Select
              value={specialLineType}
              onChange={(_, data) => {
                setSpecialLineType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="medians_G">3 đường trung tuyến cắt nhau tại Trọng tâm G</option>
              <option value="altitudes_H">3 đường cao cắt nhau tại Trực tâm H</option>
              <option value="angle_bisectors_I">3 đường phân giác cắt nhau tại Tâm nội tiếp I</option>
              <option value="midline">Đường trung bình MN (MN // BC, MN = 1/2 BC)</option>
            </Select>
          </Field>
        )}

        {category === 'thcs_concepts' && (
          <Field label="Khái niệm hình học phẳng THCS:">
            <Select
              value={conceptType}
              onChange={(_, data) => {
                setConceptType(data.value);
                setCustomPoints({});
              }}
            >
              <option value="opposite_angles">Hai góc đối đỉnh bằng nhau (∠xOy = ∠x'Oy')</option>
              <option value="tangent_circle">Tiếp tuyến của đường tròn (d ⊥ OA tại tiếp điểm A)</option>
              <option value="cyclic_quad">Tứ giác nội tiếp đường tròn (4 đỉnh luôn thuộc (O), ∠A + ∠C = 180°)</option>
              <option value="inscribed_angle">Góc nội tiếp và góc ở tâm cùng chắn cung BC (∠BOC = 2∠BAC)</option>
            </Select>
          </Field>
        )}

        {/* 5. Ba đường conic (SGK Toán 10) */}
        {category === 'conics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Field label="Chọn đường conic (SGK Hình học 10):">
              <Select
                value={conicType}
                onChange={(_, data) => {
                  const t = data.value as ConicType;
                  setConicType(t);
                  if (t === 'ellipse') {
                    setLblCurve('(E)');
                    setConicTM(50);
                  } else if (t === 'hyperbola') {
                    setLblCurve('(H)');
                    setConicTM(1.2);
                  } else if (t === 'parabola') {
                    setLblCurve('(P)');
                    setConicTM(1.4);
                  }
                }}
              >
                <option value="ellipse">1. Đường Elip (E): x²/a² + y²/b² = 1 (a &gt; b &gt; 0)</option>
                <option value="hyperbola">2. Đường Hypebol (H): x²/a² - y²/b² = 1 (a &gt; 0, b &gt; 0)</option>
                <option value="parabola">3. Đường Parabol (P): y² = 2px (p &gt; 0)</option>
              </Select>
            </Field>

            {/* Presets Row */}
            <div>
              <Text size={200} weight="semibold" style={{ color: '#0f6cbd' }}>
                ⚡ Mẫu bài tập chuẩn SGK Toán 10:
              </Text>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {conicType === 'ellipse' && (
                  <>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(5); setConicB(3); }}>
                      x²/25 + y²/9 = 1 (a=5, b=3, c=4)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(4); setConicB(2.65); }}>
                      x²/16 + y²/7 = 1 (a=4, b=√7, c=3)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(3); setConicB(2); }}>
                      x²/9 + y²/4 = 1 (a=3, b=2, c=√5)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(4); setConicB(3); }}>
                      x²/16 + y²/9 = 1 (a=4, b=3)
                    </Button>
                  </>
                )}
                {conicType === 'hyperbola' && (
                  <>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(3); setConicB(4); }}>
                      x²/9 - y²/16 = 1 (a=3, b=4, c=5)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(4); setConicB(3); }}>
                      x²/16 - y²/9 = 1 (a=4, b=3, c=5)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(2); setConicB(2.24); }}>
                      x²/4 - y²/5 = 1 (a=2, b=√5, c=3)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicA(3); setConicB(3); }}>
                      x²/9 - y²/9 = 1 (Hypebol đều a=b=3)
                    </Button>
                  </>
                )}
                {conicType === 'parabola' && (
                  <>
                    <Button size="small" appearance="subtle" onClick={() => { setConicP(2); }}>
                      y² = 4x (p=2, F(1; 0), Δ: x=-1)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicP(4); }}>
                      y² = 8x (p=4, F(2; 0), Δ: x=-2)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicP(1); }}>
                      y² = 2x (p=1, F(0.5; 0), Δ: x=-0.5)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicP(3); }}>
                      y² = 6x (p=3, F(1.5; 0), Δ: x=-1.5)
                    </Button>
                    <Button size="small" appearance="subtle" onClick={() => { setConicP(6); }}>
                      y² = 12x (p=6, F(3; 0), Δ: x=-3)
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* KaTeX Equation Display Box */}
            <div style={{ backgroundColor: '#f0f6ff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #c7dcff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                  Phương trình chính tắc hiển thị chuẩn KaTeX:
                </Text>
                <Badge appearance="tint" color="brand">Toán 10 - Bộ Giáo Dục</Badge>
              </div>
              <div
                style={{ fontSize: '18px', textAlign: 'center', padding: '4px 0' }}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(
                    scene.conicExtra ? `${scene.conicExtra.equationLatex} \\iff ${scene.conicExtra.equationSimplifiedLatex}` : '',
                    { displayMode: true, throwOnError: false }
                  )
                }}
              />
            </div>
          </div>
        )}

        {/* Dynamic Controls for Custom Triangle */}
        {category === 'triangles' && triangleType === 'custom' && (
          <div style={{ backgroundColor: '#f0f6ff', padding: '10px', borderRadius: '6px' }}>
            <Field label={`Số đo góc đỉnh B: ${customAngle}° (hiển thị cung góc chuẩn)`}>
              <Slider
                min={25}
                max={140}
                value={customAngle}
                onChange={(_, data) => setCustomAngle(data.value)}
              />
            </Field>
            <Field label={`Độ dài cạnh đáy BC: ${sideLength} px`}>
              <Slider
                min={80}
                max={170}
                value={sideLength}
                onChange={(_, data) => setSideLength(data.value)}
              />
            </Field>
          </div>
        )}

        {/* Dynamic Controls for Parallelogram Skew */}
        {category === 'quads' && quadType === 'parallelogram' && (
          <div style={{ backgroundColor: '#f0f6ff', padding: '10px', borderRadius: '6px' }}>
            <Field label={`Độ nghiêng hình bình hành: ${skewVal} px`}>
              <Slider
                min={10}
                max={60}
                value={skewVal}
                onChange={(_, data) => setSkewVal(data.value)}
              />
            </Field>
          </div>
        )}

        {/* Interactive Drag & Drop Hint Bar */}
        <div className={styles.hintBar}>
          {category === 'conics' ? (
            <span>💡 <strong>Tương tác trên hình vẽ Conic:</strong> Bấm giữ chuột vào điểm <strong>M</strong> trên đồ thị và kéo trượt tự do dọc theo đường cong để kiểm chứng tức thời định nghĩa tiêu điểm &amp; đường chuẩn theo SGK!</span>
          ) : (
            <span>🖐️ <strong>Kéo thả đỉnh tự động bảo toàn tính chất hình học:</strong> Các quan hệ song song (hình bình hành, hình thang), góc vuông 90° (hình chữ nhật, tam giác vuông), cạnh bằng nhau (hình thoi, hình vuông, tam giác cân/đều) được tự động bảo toàn chính xác.</span>
          )}
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
        <Field label={category === 'conics' ? "Hình vẽ trực quan tương tác (Bấm & kéo điểm M trên đường conic):" : "Hình vẽ trực quan tương tác (Bấm & kéo đỉnh trên hình):"}>
          <div className={styles.previewContainer}>
            <svg
              ref={svgRef}
              width={category === 'conics' ? 340 : 310}
              height={category === 'conics' ? 240 : 230}
              viewBox={category === 'conics' ? "0 0 340 240" : "0 0 310 230"}
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
                    {/* Large transparent hit area for easy grabbing */}
                    <circle r="14" fill="transparent" />

                    {/* Outer glowing halo ring */}
                    <circle
                      r={isCurrentDrag ? 10 : 7}
                      fill={isCurrentDrag ? 'rgba(209, 52, 56, 0.25)' : 'rgba(15, 108, 189, 0.18)'}
                      stroke={isCurrentDrag ? '#d13438' : pointColor}
                      strokeWidth="1.5"
                    />

                    {/* Center solid point */}
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
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#555', fontStyle: 'italic', margin: '4px 0' }}>
          {scene.caption}
        </div>

        {/* Conic Properties Card */}
        {category === 'conics' && scene.conicExtra && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d1d1d1', borderRadius: '6px', padding: '10px 14px', marginTop: '6px' }}>
            <Text weight="semibold" size={300} style={{ color: '#0f6cbd', marginBottom: '4px', display: 'block' }}>
              📊 Các yếu tố hình học &amp; Bán kính qua tiêu (Chuẩn SGK):
            </Text>
            <div dangerouslySetInnerHTML={{ __html: scene.conicExtra.propertiesHtml }} />
          </div>
        )}

        {category === 'conics' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {/* Sliders for Coefficients */}
            {conicType === 'ellipse' && (
              <div style={{ backgroundColor: '#f0f6ff', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Field label={`Bán trục lớn a = ${conicA} (a² = ${+(conicA * conicA).toFixed(2)})`}>
                    <Slider
                      min={1.5}
                      max={10}
                      step={0.1}
                      value={conicA}
                      onChange={(_, d) => {
                        const val = +d.value.toFixed(1);
                        setConicA(val);
                        if (conicB >= val) {
                          setConicB(+(val * 0.7).toFixed(1));
                        }
                      }}
                    />
                  </Field>
                  <Field label={`Bán trục bé b = ${conicB} (b² = ${+(conicB * conicB).toFixed(2)})`}>
                    <Slider
                      min={0.8}
                      max={Math.max(1, conicA - 0.2)}
                      step={0.1}
                      value={conicB}
                      onChange={(_, d) => setConicB(+d.value.toFixed(1))}
                    />
                  </Field>
                </div>
                <Field label={`Vị trí điểm M trên Elip: góc t = ${conicTM}°`}>
                  <Slider
                    min={0}
                    max={360}
                    step={1}
                    value={conicTM}
                    onChange={(_, d) => setConicTM(d.value)}
                  />
                </Field>
              </div>
            )}

            {conicType === 'hyperbola' && (
              <div style={{ backgroundColor: '#f0f6ff', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Field label={`Bán trục thực a = ${conicA} (a² = ${+(conicA * conicA).toFixed(2)})`}>
                    <Slider
                      min={1}
                      max={9}
                      step={0.1}
                      value={conicA}
                      onChange={(_, d) => setConicA(+d.value.toFixed(1))}
                    />
                  </Field>
                  <Field label={`Bán trục ảo b = ${conicB} (b² = ${+(conicB * conicB).toFixed(2)})`}>
                    <Slider
                      min={0.8}
                      max={9}
                      step={0.1}
                      value={conicB}
                      onChange={(_, d) => setConicB(+d.value.toFixed(1))}
                    />
                  </Field>
                </div>
                <Field label={`Vị trí điểm M trên Hypebol: tung độ y_M ~ ${+(conicTM * 0.8 * conicB).toFixed(1)}`}>
                  <Slider
                    min={-2.2}
                    max={2.2}
                    step={0.05}
                    value={conicTM}
                    onChange={(_, d) => setConicTM(+d.value.toFixed(2))}
                  />
                </Field>
              </div>
            )}

            {conicType === 'parabola' && (
              <div style={{ backgroundColor: '#f0f6ff', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Field label={`Tham số tiêu p = ${conicP} (Khoảng cách FH)`}>
                    <Slider
                      min={0.5}
                      max={8}
                      step={0.25}
                      value={conicP}
                      onChange={(_, d) => setConicP(+d.value.toFixed(2))}
                    />
                  </Field>
                  <Field label="Hệ số 2p (trong y² = 2px):">
                    <Input
                      size="small"
                      type="number"
                      value={(conicP * 2).toString()}
                      onChange={(_, d) => {
                        const val = parseFloat(d.value);
                        if (!isNaN(val) && val > 0) {
                          setConicP(+(val / 2).toFixed(2));
                        }
                      }}
                    />
                  </Field>
                </div>
                <Field label={`Vị trí điểm M trên Parabol: tung độ y_M ~ ${+(conicTM * 0.9 * conicP).toFixed(1)}`}>
                  <Slider
                    min={-2.2}
                    max={2.2}
                    step={0.05}
                    value={conicTM}
                    onChange={(_, d) => setConicTM(+d.value.toFixed(2))}
                  />
                </Field>
              </div>
            )}

            {/* Feature Switches for Conics */}
            <div className={styles.row}>
              <Switch
                checked={conicShowPointM && conicShowFocalRadii}
                onChange={(_, d) => {
                  setConicShowPointM(d.checked);
                  setConicShowFocalRadii(d.checked);
                }}
                label={conicType === 'parabola' ? 'Hiện điểm M, đoạn MF và MH ⊥ Δ' : 'Hiện điểm M và bán kính qua tiêu MF₁, MF₂'}
              />
              <Switch
                checked={conicShowFoci}
                onChange={(_, d) => setConicShowFoci(d.checked)}
                label="Hiện tiêu điểm"
              />
              <Switch
                checked={conicShowVertices}
                onChange={(_, d) => setConicShowVertices(d.checked)}
                label="Hiện các đỉnh"
              />
              {conicType === 'hyperbola' && (
                <>
                  <Switch
                    checked={conicShowAsymptotes}
                    onChange={(_, d) => setConicShowAsymptotes(d.checked)}
                    label="Hiện 2 tiệm cận xiên"
                  />
                  <Switch
                    checked={conicShowFundamentalRect}
                    onChange={(_, d) => setConicShowFundamentalRect(d.checked)}
                    label="Hiện HCN cơ sở"
                  />
                </>
              )}
              {conicType === 'parabola' && (
                <Switch
                  checked={conicShowDirectrix}
                  onChange={(_, d) => setConicShowDirectrix(d.checked)}
                  label="Hiện đường chuẩn Δ (x = -p/2) & góc vuông"
                />
              )}
            </div>

            {/* Conic Label Customization */}
            <div className={styles.controlsGrid}>
              {conicType === 'ellipse' && (
                <>
                  <Field label="Tiêu điểm 1:">
                    <Input size="small" value={lblF1} onChange={(e) => setLblF1(e.target.value)} />
                  </Field>
                  <Field label="Tiêu điểm 2:">
                    <Input size="small" value={lblF2} onChange={(e) => setLblF2(e.target.value)} />
                  </Field>
                  <Field label="Đỉnh A₁:">
                    <Input size="small" value={lblA1} onChange={(e) => setLblA1(e.target.value)} />
                  </Field>
                  <Field label="Đỉnh A₂:">
                    <Input size="small" value={lblA2} onChange={(e) => setLblA2(e.target.value)} />
                  </Field>
                  <Field label="Đỉnh B₁:">
                    <Input size="small" value={lblB1} onChange={(e) => setLblB1(e.target.value)} />
                  </Field>
                  <Field label="Đỉnh B₂:">
                    <Input size="small" value={lblB2} onChange={(e) => setLblB2(e.target.value)} />
                  </Field>
                  <Field label="Điểm trên elip:">
                    <Input size="small" value={lblM} onChange={(e) => setLblM(e.target.value)} />
                  </Field>
                  <Field label="Tên Elip:">
                    <Input size="small" value={lblCurve} onChange={(e) => setLblCurve(e.target.value)} />
                  </Field>
                </>
              )}
              {conicType === 'hyperbola' && (
                <>
                  <Field label="Tiêu điểm 1:">
                    <Input size="small" value={lblF1} onChange={(e) => setLblF1(e.target.value)} />
                  </Field>
                  <Field label="Tiêu điểm 2:">
                    <Input size="small" value={lblF2} onChange={(e) => setLblF2(e.target.value)} />
                  </Field>
                  <Field label="Đỉnh A₁:">
                    <Input size="small" value={lblA1} onChange={(e) => setLblA1(e.target.value)} />
                  </Field>
                  <Field label="Đỉnh A₂:">
                    <Input size="small" value={lblA2} onChange={(e) => setLblA2(e.target.value)} />
                  </Field>
                  <Field label="Điểm trên hypebol:">
                    <Input size="small" value={lblM} onChange={(e) => setLblM(e.target.value)} />
                  </Field>
                  <Field label="Tên Hypebol:">
                    <Input size="small" value={lblCurve} onChange={(e) => setLblCurve(e.target.value)} />
                  </Field>
                </>
              )}
              {conicType === 'parabola' && (
                <>
                  <Field label="Tiêu điểm:">
                    <Input size="small" value={lblF1} onChange={(e) => setLblF1(e.target.value)} />
                  </Field>
                  <Field label="Đường chuẩn:">
                    <Input size="small" value={lblDelta} onChange={(e) => setLblDelta(e.target.value)} />
                  </Field>
                  <Field label="Điểm M:">
                    <Input size="small" value={lblM} onChange={(e) => setLblM(e.target.value)} />
                  </Field>
                  <Field label="Điểm H trên Δ:">
                    <Input size="small" value={lblH} onChange={(e) => setLblH(e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Customization Options & Label Customizer */}
            <div className={styles.controlsGrid}>
              <Field label="Đỉnh 1 (A):">
                <Input size="small" value={lblA} onChange={(e) => setLblA(e.target.value)} />
              </Field>
              <Field label="Đỉnh 2 (B):">
                <Input size="small" value={lblB} onChange={(e) => setLblB(e.target.value)} />
              </Field>
              <Field label="Đỉnh 3 (C):">
                <Input size="small" value={lblC} onChange={(e) => setLblC(e.target.value)} />
              </Field>
              <Field label="Đỉnh 4 (D):">
                <Input size="small" value={lblD} onChange={(e) => setLblD(e.target.value)} />
              </Field>
            </div>

            <div className={styles.row}>
              <Switch
                checked={showRightAngles}
                onChange={(_, data) => setShowRightAngles(data.checked)}
                label="Ký hiệu góc vuông (∟)"
              />
              <Switch
                checked={showTicks}
                onChange={(_, data) => setShowTicks(data.checked)}
                label="Ký hiệu cạnh bằng nhau"
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {category === 'conics' ? (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowReset20Regular />}
              onClick={() => {
                if (conicType === 'ellipse') {
                  setConicA(5);
                  setConicB(3);
                  setConicTM(50);
                  setLblCurve('(E)');
                } else if (conicType === 'hyperbola') {
                  setConicA(3);
                  setConicB(4);
                  setConicTM(1.2);
                  setLblCurve('(H)');
                } else if (conicType === 'parabola') {
                  setConicP(2);
                  setConicTM(1.4);
                  setLblCurve('(P)');
                }
                setLblF1('F₁');
                setLblF2('F₂');
                setLblA1('A₁');
                setLblA2('A₂');
                setLblB1('B₁');
                setLblB2('B₂');
                setLblM('M');
                setLblH('H');
                setLblDelta('Δ');
              }}
            >
              Mặc định hệ số
            </Button>
          ) : (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowReset20Regular />}
              onClick={handleResetLabels}
            >
              Mặc định A, B, C, D
            </Button>
          )}

          <Button
            appearance="primary"
            size="medium"
            icon={<Add20Regular />}
            onClick={handleInsert}
          >
            Chèn hình vẽ vào Word
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
