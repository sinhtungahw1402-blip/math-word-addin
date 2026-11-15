import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Input,
  Field,
  Select,
  Badge,
  makeStyles,
  shorthands,
  tokens,
  Checkbox,
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent
} from '@fluentui/react-components';
import {
  DataArea24Regular,
  Add20Regular,
  Delete20Regular,
  Copy20Regular,
  Checkmark20Regular,
  ArrowReset20Regular,
  Sparkle20Regular,
  Line20Regular
} from '@fluentui/react-icons';
import { insertSvgAtCursor } from '../services/wordService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('14px'),
    ...shorthands.padding('4px')
  },
  tabNav: {
    marginBottom: '8px'
  },
  presetsRow: {
    display: 'flex',
    ...shorthands.gap('6px'),
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  previewCard: {
    backgroundColor: '#ffffff',
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', '#d1d1d1'),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflowX: 'auto',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
  },
  configSection: {
    backgroundColor: '#ffffff',
    ...shorthands.padding('14px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', '#e0e0e0'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px')
  },
  paramsRow: {
    display: 'flex',
    ...shorthands.gap('10px'),
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  pointsList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px')
  },
  pointItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('6px 10px'),
    backgroundColor: '#f8f9fa',
    ...shorthands.borderRadius('4px'),
    ...shorthands.border('1px', 'solid', '#e9ecef'),
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

export type FunctionFamily =
  | 'cubic'
  | 'rational11'
  | 'rational21'
  | 'quartic'
  | 'quadratic'
  | 'linear'
  | 'line_x'
  | 'line_y';

export type PointType = 'max' | 'min' | 'pass';

export interface SketchPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  type: PointType;
  dashX: boolean;
  dashY: boolean;
}

export interface SpecialPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  labelX?: string;
  labelY?: string;
  showDot: boolean;
  dashToX: boolean;
  dashToY: boolean;
}

export interface GraphPreset {
  name: string;
  desc: string;
  family: FunctionFamily;
  params: Record<string, number>;
  xRange: [number, number];
  yRange: [number, number];
  extraPoints?: SpecialPoint[];
}

const ANALYTIC_PRESETS: GraphPreset[] = [
  {
    name: 'Mẫu 1: Hàm bậc 3 (Chuẩn Hình minh họa)',
    desc: 'y = 2x³ - 6x - 1 (Cực đại (-1,3), Cực tiểu (1,-5), Điểm phụ (-2,-5), (2,3))',
    family: 'cubic',
    params: { a: 2, b: 0, c: -6, d: -1 },
    xRange: [-2.6, 2.6],
    yRange: [-6.5, 4.5],
    extraPoints: [
      { id: 'ep1', name: 'Điểm (-2, -5)', x: -2, y: -5, labelX: '-2', labelY: '', showDot: true, dashToX: true, dashToY: true },
      { id: 'ep2', name: 'Điểm (2, 3)', x: 2, y: 3, labelX: '2', labelY: '', showDot: true, dashToX: true, dashToY: true }
    ]
  },
  {
    name: 'Mẫu 2: Phân thức bậc 1/1 (TCĐ & TCN)',
    desc: 'y = (2x - 1)/(x + 1) (TCĐ x = -1, TCN y = 2)',
    family: 'rational11',
    params: { a: 2, b: -1, c: 1, d: 1 },
    xRange: [-5, 4],
    yRange: [-4, 6]
  },
  {
    name: 'Mẫu 3: Phân thức bậc 2/1 (TCĐ & TCX)',
    desc: 'y = (x² - x + 1)/(x - 1) (TCĐ x = 1, TCX y = x, Cực trị (0,-1), (2,3))',
    family: 'rational21',
    params: { a: 1, b: -1, c: 1, d: 1, e: -1 },
    xRange: [-3, 5],
    yRange: [-4, 6]
  },
  {
    name: 'Mẫu 4: Hàm số bậc nhất (Đường thẳng)',
    desc: 'y = 2x - 3 (Giao Oy (0,-3), Giao Ox (1.5, 0))',
    family: 'linear',
    params: { a: 2, b: -3 },
    xRange: [-3, 4],
    yRange: [-5, 5]
  },
  {
    name: 'Mẫu 5: Đường thẳng đứng x = a',
    desc: 'Đường thẳng đứng x = 2 (Song song với trục Oy)',
    family: 'line_x',
    params: { a: 2 },
    xRange: [-3, 5],
    yRange: [-4, 4]
  },
  {
    name: 'Mẫu 6: Đường thẳng ngang y = b',
    desc: 'Đường thẳng nằm ngang y = 3 (Song song với trục Ox)',
    family: 'line_y',
    params: { b: 3 },
    xRange: [-4, 4],
    yRange: [-2, 5]
  },
  {
    name: 'Mẫu 7: Parabol bậc hai',
    desc: 'y = x² - 4x + 3 (Đỉnh (2,-1), Giao Oy (0,3), Giao Ox (1,0), (3,0))',
    family: 'quadratic',
    params: { a: 1, b: -4, c: 3 },
    xRange: [-1, 5],
    yRange: [-2, 5]
  },
  {
    name: 'Mẫu 8: Trùng phương bậc 4 (3 cực trị)',
    desc: 'y = x⁴ - 2x² - 1 (Cực tiểu (-1,-2), (1,-2), Cực đại (0,-1))',
    family: 'quartic',
    params: { a: 1, b: -2, c: -1 },
    xRange: [-2.2, 2.2],
    yRange: [-3, 3]
  }
];

const SKETCH_PRESETS: { name: string; desc: string; points: SketchPoint[]; xR: [number, number]; yR: [number, number] }[] = [
  {
    name: 'Phác thảo bậc 3 chữ N (a > 0)',
    desc: 'Cực đại (-1; 3), Cực tiểu (1; -1)',
    points: [
      { id: 'sp1', name: 'Cực đại', x: -1, y: 3, type: 'max', dashX: true, dashY: true },
      { id: 'sp2', name: 'Cực tiểu', x: 1, y: -1, type: 'min', dashX: true, dashY: true }
    ],
    xR: [-2.8, 2.8],
    yR: [-4, 5]
  },
  {
    name: 'Phác thảo bậc 3 chữ N ngược (a < 0)',
    desc: 'Cực tiểu (-1; -2), Cực đại (1; 2)',
    points: [
      { id: 'sp1', name: 'Cực tiểu', x: -1, y: -2, type: 'min', dashX: true, dashY: true },
      { id: 'sp2', name: 'Cực đại', x: 1, y: 2, type: 'max', dashX: true, dashY: true }
    ],
    xR: [-2.8, 2.8],
    yR: [-4, 4]
  },
  {
    name: 'Phác thảo bậc 4 chữ W (a > 0)',
    desc: 'Cực tiểu (-1.5; -2), Cực đại (0; 1), Cực tiểu (1.5; -2)',
    points: [
      { id: 'sp1', name: 'Cực tiểu 1', x: -1.5, y: -2, type: 'min', dashX: true, dashY: true },
      { id: 'sp2', name: 'Cực đại', x: 0, y: 1, type: 'max', dashX: true, dashY: true },
      { id: 'sp3', name: 'Cực tiểu 2', x: 1.5, y: -2, type: 'min', dashX: true, dashY: true }
    ],
    xR: [-2.8, 2.8],
    yR: [-4, 3]
  },
  {
    name: 'Phác thảo bậc 4 chữ M (a < 0)',
    desc: 'Cực đại (-1.5; 2), Cực tiểu (0; -1), Cực đại (1.5; 2)',
    points: [
      { id: 'sp1', name: 'Cực đại 1', x: -1.5, y: 2, type: 'max', dashX: true, dashY: true },
      { id: 'sp2', name: 'Cực tiểu', x: 0, y: -1, type: 'min', dashX: true, dashY: true },
      { id: 'sp3', name: 'Cực đại 2', x: 1.5, y: 2, type: 'max', dashX: true, dashY: true }
    ],
    xR: [-2.8, 2.8],
    yR: [-3, 4]
  }
];

export const GraphPlotter: React.FC = () => {
  const styles = useStyles();

  // Mode: 'analytic' (by algebraic formula) or 'sketch' (by interpolating critical points)
  const [activeTab, setActiveTab] = useState<'analytic' | 'sketch'>('analytic');

  // Analytic Mode State
  const [selectedFamily, setSelectedFamily] = useState<FunctionFamily>('cubic');
  const [params, setParams] = useState<Record<string, number>>({ a: 2, b: 0, c: -6, d: -1, e: 1 });
  const [xMin, setXMin] = useState<number>(-2.6);
  const [xMax, setXMax] = useState<number>(2.6);
  const [yMin, setYMin] = useState<number>(-6.5);
  const [yMax, setYMax] = useState<number>(4.5);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Auxiliary horizontal & vertical lines
  const [showAuxHoriz, setShowAuxHoriz] = useState<boolean>(false);
  const [auxHorizY, setAuxHorizY] = useState<number>(3);
  const [showAuxVert, setShowAuxVert] = useState<boolean>(false);
  const [auxVertX, setAuxVertX] = useState<number>(-1);

  // Extra projection points in analytic mode
  const [extraPoints, setExtraPoints] = useState<SpecialPoint[]>([
    { id: 'ep1', name: 'Điểm (-2, -5)', x: -2, y: -5, labelX: '-2', labelY: '', showDot: true, dashToX: true, dashToY: true },
    { id: 'ep2', name: 'Điểm (2, 3)', x: 2, y: 3, labelX: '2', labelY: '', showDot: true, dashToX: true, dashToY: true }
  ]);

  // Sketch Mode State (Hermite Interpolation)
  const [sketchPoints, setSketchPoints] = useState<SketchPoint[]>([
    { id: 'sp1', name: 'Cực đại', x: -1, y: 3, type: 'max', dashX: true, dashY: true },
    { id: 'sp2', name: 'Cực tiểu', x: 1, y: -1, type: 'min', dashX: true, dashY: true }
  ]);

  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Apply Analytic Preset
  const handleApplyPreset = (preset: GraphPreset) => {
    setSelectedFamily(preset.family);
    setParams({ e: 1, ...preset.params });
    setXMin(preset.xRange[0]);
    setXMax(preset.xRange[1]);
    setYMin(preset.yRange[0]);
    setYMax(preset.yRange[1]);
    if (preset.extraPoints) {
      setExtraPoints(preset.extraPoints);
    } else {
      setExtraPoints([]);
    }
  };

  // Apply Sketch Preset
  const handleApplySketchPreset = (p: typeof SKETCH_PRESETS[0]) => {
    setSketchPoints(p.points);
    setXMin(p.xR[0]);
    setXMax(p.xR[1]);
    setYMin(p.yR[0]);
    setYMax(p.yR[1]);
  };

  // Evaluate Analytic Function
  const evalF = (x: number): number | null => {
    const { a = 0, b = 0, c = 0, d = 0, e = 1 } = params;
    if (selectedFamily === 'linear') {
      return a * x + b;
    }
    if (selectedFamily === 'line_x' || selectedFamily === 'line_y') {
      return null;
    }
    if (selectedFamily === 'quadratic') {
      return a * x * x + b * x + c;
    }
    if (selectedFamily === 'cubic') {
      return a * x * x * x + b * x * x + c * x + d;
    }
    if (selectedFamily === 'quartic') {
      return a * x * x * x * x + b * x * x + c;
    }
    if (selectedFamily === 'rational11') {
      const denom = c * x + d;
      if (Math.abs(denom) < 1e-5) return null;
      return (a * x + b) / denom;
    }
    if (selectedFamily === 'rational21') {
      const denom = d * x + e;
      if (Math.abs(denom) < 1e-5) return null;
      return (a * x * x + b * x + c) / denom;
    }
    return null;
  };

  // Evaluate Interpolation Curve in Sketch Mode (Cubic Hermite Spline)
  const evalSketch = useMemo(() => {
    const sorted = [...sketchPoints].sort((a, b) => a.x - b.x);
    if (sorted.length < 2) return (_: number) => null;

    // Calculate slopes at each point
    const slopes: number[] = sorted.map((p, i) => {
      if (p.type === 'max' || p.type === 'min') {
        return 0; // Horizontal tangent at extrema!
      }
      if (i === 0) {
        return (sorted[1].y - sorted[0].y) / (sorted[1].x - sorted[0].x);
      }
      if (i === sorted.length - 1) {
        const last = sorted.length - 1;
        return (sorted[last].y - sorted[last - 1].y) / (sorted[last].x - sorted[last - 1].x);
      }
      const s1 = (sorted[i].y - sorted[i - 1].y) / (sorted[i].x - sorted[i - 1].x);
      const s2 = (sorted[i + 1].y - sorted[i].y) / (sorted[i + 1].x - sorted[i].x);
      return (s1 + s2) / 2;
    });

    return (x: number): number | null => {
      // Find segment
      let segIdx = 0;
      if (x <= sorted[0].x) {
        segIdx = 0;
      } else if (x >= sorted[sorted.length - 1].x) {
        segIdx = sorted.length - 2;
      } else {
        for (let i = 0; i < sorted.length - 1; i++) {
          if (x >= sorted[i].x && x <= sorted[i + 1].x) {
            segIdx = i;
            break;
          }
        }
      }

      const p0 = sorted[segIdx];
      const p1 = sorted[segIdx + 1];
      const m0 = slopes[segIdx];
      const m1 = slopes[segIdx + 1];

      const h = p1.x - p0.x;
      if (Math.abs(h) < 1e-6) return p0.y;
      const t = (x - p0.x) / h;

      // Cubic Hermite basis functions
      const h00 = 2 * t * t * t - 3 * t * t + 1;
      const h10 = t * t * t - 2 * t * t + t;
      const h01 = -2 * t * t * t + 3 * t * t;
      const h11 = t * t * t - t * t;

      return h00 * p0.y + h10 * h * m0 + h01 * p1.y + h11 * h * m1;
    };
  }, [sketchPoints]);

  // Calculate Asymptotes for Analytic Mode
  const asymptotes = useMemo(() => {
    const { a = 0, b = 0, c = 0, d = 0, e = 1 } = params;
    const res: {
      hasVertical: boolean;
      vertX?: number;
      hasHorizontal: boolean;
      horizY?: number;
      hasSlant: boolean;
      slantM?: number;
      slantN?: number;
    } = {
      hasVertical: false,
      hasHorizontal: false,
      hasSlant: false
    };

    if (selectedFamily === 'line_x') {
      res.hasVertical = true;
      res.vertX = a;
    } else if (selectedFamily === 'line_y') {
      res.hasHorizontal = true;
      res.horizY = b;
    } else if (selectedFamily === 'rational11') {
      if (Math.abs(c) > 1e-5) {
        res.hasVertical = true;
        res.vertX = -d / c;
        res.hasHorizontal = true;
        res.horizY = a / c;
      }
    } else if (selectedFamily === 'rational21') {
      if (Math.abs(d) > 1e-5) {
        res.hasVertical = true;
        res.vertX = -e / d;
        const m = a / d;
        const n = (b - m * e) / d;
        res.hasSlant = true;
        res.slantM = m;
        res.slantN = n;
      }
    }
    return res;
  }, [selectedFamily, params]);

  // Calculate Special Points for Analytic Mode
  const autoSpecialPoints = useMemo(() => {
    if (activeTab === 'sketch') return [];
    const { a = 0, b = 0, c = 0, d = 0, e = 1 } = params;
    const list: SpecialPoint[] = [];

    // Linear function intercepts
    if (selectedFamily === 'linear') {
      list.push({
        id: 'lin_y',
        name: `Giao Oy (0; ${b})`,
        x: 0,
        y: b,
        labelX: '',
        labelY: String(b),
        showDot: true,
        dashToX: false,
        dashToY: false
      });
      if (Math.abs(a) > 1e-5) {
        const xZero = -b / a;
        list.push({
          id: 'lin_x',
          name: `Giao Ox (${xZero.toFixed(1).replace('.0', '')}; 0)`,
          x: xZero,
          y: 0,
          labelX: xZero.toFixed(1).replace('.0', ''),
          labelY: '',
          showDot: true,
          dashToX: false,
          dashToY: false
        });
      }
      return list;
    }

    // Y-intercept
    const y0 = evalF(0);
    if (y0 !== null && Number.isFinite(y0)) {
      list.push({
        id: 'y_intercept',
        name: `Giao trục Oy (0; ${y0.toFixed(1).replace('.0', '')})`,
        x: 0,
        y: y0,
        labelX: '',
        labelY: y0.toFixed(1).replace('.0', ''),
        showDot: true,
        dashToX: false,
        dashToY: false
      });
    }

    // Extrema for Cubic
    if (selectedFamily === 'cubic' && Math.abs(a) > 1e-5) {
      const deltaPrime = b * b - 3 * a * c;
      if (deltaPrime > 1e-5) {
        const x1 = (-b - Math.sqrt(deltaPrime)) / (3 * a);
        const x2 = (-b + Math.sqrt(deltaPrime)) / (3 * a);
        const y1 = evalF(x1);
        const y2 = evalF(x2);

        if (y1 !== null) {
          const isMax = a > 0 ? x1 < x2 : x1 > x2;
          list.push({
            id: 'cubic_ext1',
            name: `${isMax ? 'Cực đại' : 'Cực tiểu'} (${x1.toFixed(1).replace('.0', '')}; ${y1.toFixed(1).replace('.0', '')})`,
            x: x1,
            y: y1,
            labelX: x1.toFixed(1).replace('.0', ''),
            labelY: y1.toFixed(1).replace('.0', ''),
            showDot: true,
            dashToX: true,
            dashToY: true
          });
        }
        if (y2 !== null) {
          const isMax = a > 0 ? x2 < x1 : x2 > x1;
          list.push({
            id: 'cubic_ext2',
            name: `${isMax ? 'Cực đại' : 'Cực tiểu'} (${x2.toFixed(1).replace('.0', '')}; ${y2.toFixed(1).replace('.0', '')})`,
            x: x2,
            y: y2,
            labelX: x2.toFixed(1).replace('.0', ''),
            labelY: y2.toFixed(1).replace('.0', ''),
            showDot: true,
            dashToX: true,
            dashToY: true
          });
        }
      }
    }

    // Extrema for Quadratic (Vertex)
    if (selectedFamily === 'quadratic' && Math.abs(a) > 1e-5) {
      const xV = -b / (2 * a);
      const yV = evalF(xV);
      if (yV !== null) {
        list.push({
          id: 'quad_vertex',
          name: `Đỉnh Parabol (${xV.toFixed(1).replace('.0', '')}; ${yV.toFixed(1).replace('.0', '')})`,
          x: xV,
          y: yV,
          labelX: xV.toFixed(1).replace('.0', ''),
          labelY: yV.toFixed(1).replace('.0', ''),
          showDot: true,
          dashToX: true,
          dashToY: true
        });
      }
    }

    // Extrema for Quartic
    if (selectedFamily === 'quartic' && Math.abs(a) > 1e-5) {
      const x0 = 0;
      const y0Val = evalF(x0);
      if (y0Val !== null) {
        list.push({
          id: 'quartic_ext0',
          name: `Cực trị (0; ${y0Val.toFixed(1).replace('.0', '')})`,
          x: 0,
          y: y0Val,
          labelX: '',
          labelY: y0Val.toFixed(1).replace('.0', ''),
          showDot: true,
          dashToX: false,
          dashToY: true
        });
      }
      if (-b / (2 * a) > 1e-5) {
        const r = Math.sqrt(-b / (2 * a));
        const yr1 = evalF(-r);
        const yr2 = evalF(r);
        if (yr1 !== null) {
          list.push({
            id: 'quartic_ext1',
            name: `Cực trị (-${r.toFixed(1).replace('.0', '')}; ${yr1.toFixed(1).replace('.0', '')})`,
            x: -r,
            y: yr1,
            labelX: (-r).toFixed(1).replace('.0', ''),
            labelY: yr1.toFixed(1).replace('.0', ''),
            showDot: true,
            dashToX: true,
            dashToY: true
          });
        }
        if (yr2 !== null) {
          list.push({
            id: 'quartic_ext2',
            name: `Cực trị (${r.toFixed(1).replace('.0', '')}; ${yr2.toFixed(1).replace('.0', '')})`,
            x: r,
            y: yr2,
            labelX: r.toFixed(1).replace('.0', ''),
            labelY: yr2.toFixed(1).replace('.0', ''),
            showDot: true,
            dashToX: true,
            dashToY: true
          });
        }
      }
    }

    // Extrema for Rational 2/1
    if (selectedFamily === 'rational21' && Math.abs(d) > 1e-5) {
      const A = a * d;
      const B = 2 * a * e;
      const C = b * e - c * d;
      const delta = B * B - 4 * A * C;
      if (delta > 1e-5 && Math.abs(A) > 1e-5) {
        const x1 = (-B - Math.sqrt(delta)) / (2 * A);
        const x2 = (-B + Math.sqrt(delta)) / (2 * A);
        const y1 = evalF(x1);
        const y2 = evalF(x2);
        if (y1 !== null) {
          list.push({
            id: 'rat21_ext1',
            name: `Cực trị 1 (${x1.toFixed(1).replace('.0', '')}; ${y1.toFixed(1).replace('.0', '')})`,
            x: x1,
            y: y1,
            labelX: x1.toFixed(1).replace('.0', ''),
            labelY: y1.toFixed(1).replace('.0', ''),
            showDot: true,
            dashToX: true,
            dashToY: true
          });
        }
        if (y2 !== null) {
          list.push({
            id: 'rat21_ext2',
            name: `Cực trị 2 (${x2.toFixed(1).replace('.0', '')}; ${y2.toFixed(1).replace('.0', '')})`,
            x: x2,
            y: y2,
            labelX: x2.toFixed(1).replace('.0', ''),
            labelY: y2.toFixed(1).replace('.0', ''),
            showDot: true,
            dashToX: true,
            dashToY: true
          });
        }
      }
    }

    return list;
  }, [activeTab, selectedFamily, params]);

  // Combine Special Points
  const allSpecialPoints = useMemo(() => {
    if (activeTab === 'sketch') {
      return sketchPoints.map((sp) => ({
        id: sp.id,
        name: sp.name,
        x: sp.x,
        y: sp.y,
        labelX: sp.x.toFixed(1).replace('.0', ''),
        labelY: sp.y.toFixed(1).replace('.0', ''),
        showDot: true,
        dashToX: sp.dashX,
        dashToY: sp.dashY
      }));
    }
    return [...autoSpecialPoints, ...extraPoints];
  }, [activeTab, sketchPoints, autoSpecialPoints, extraPoints]);

  // Generate SVG Graphic
  const svgString = useMemo(() => {
    const W = 460;
    const H = 420;
    const margin = 35;

    const mapX = (x: number) => {
      return margin + ((x - xMin) / (xMax - xMin)) * (W - 2 * margin);
    };

    const mapY = (y: number) => {
      return (H - margin) - ((y - yMin) / (yMax - yMin)) * (H - 2 * margin);
    };

    const xZero = mapX(0);
    const yZero = mapY(0);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n`;
    svg += `  <defs>\n`;
    svg += `    <marker id="axis-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n`;
    svg += `      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#000000" />\n`;
    svg += `    </marker>\n`;
    svg += `    <clipPath id="plot-clip">\n`;
    svg += `      <rect x="${margin - 5}" y="${margin - 5}" width="${W - 2 * margin + 10}" height="${H - 2 * margin + 10}" />\n`;
    svg += `    </clipPath>\n`;
    svg += `  </defs>\n\n`;

    // White background
    svg += `  <rect width="${W}" height="${H}" fill="#ffffff" />\n\n`;

    // Optional Grid lines
    if (showGrid) {
      svg += `  <!-- Lưới tọa độ -->\n  <g stroke="#e8e8e8" stroke-width="1">\n`;
      const xStart = Math.ceil(xMin);
      const xEnd = Math.floor(xMax);
      for (let x = xStart; x <= xEnd; x++) {
        if (x === 0) continue;
        const px = mapX(x);
        svg += `    <line x1="${px}" y1="${margin}" x2="${px}" y2="${H - margin}" />\n`;
      }
      const yStart = Math.ceil(yMin);
      const yEnd = Math.floor(yMax);
      for (let y = yStart; y <= yEnd; y++) {
        if (y === 0) continue;
        const py = mapY(y);
        svg += `    <line x1="${margin}" y1="${py}" x2="${W - margin}" y2="${py}" />\n`;
      }
      svg += `  </g>\n\n`;
    }

    // Axes Ox and Oy with Arrows
    svg += `  <!-- Hệ trục tọa độ Oxy -->\n`;
    const clampedYZero = Math.max(margin, Math.min(H - margin, yZero));
    svg += `  <line x1="${margin - 10}" y1="${clampedYZero}" x2="${W - margin + 20}" y2="${clampedYZero}" stroke="#000000" stroke-width="1.5" marker-end="url(#axis-arrow)" />\n`;
    svg += `  <text x="${W - margin + 12}" y="${clampedYZero + 18}" font-family="'Times New Roman', 'Cambria Math', serif" font-size="16px" font-style="italic" font-weight="bold" fill="#000000">x</text>\n`;

    const clampedXZero = Math.max(margin, Math.min(W - margin, xZero));
    svg += `  <line x1="${clampedXZero}" y1="${H - margin + 10}" x2="${clampedXZero}" y2="${margin - 20}" stroke="#000000" stroke-width="1.5" marker-end="url(#axis-arrow)" />\n`;
    svg += `  <text x="${clampedXZero + 10}" y="${margin - 12}" font-family="'Times New Roman', 'Cambria Math', serif" font-size="16px" font-style="italic" font-weight="bold" fill="#000000">y</text>\n`;

    svg += `  <text x="${clampedXZero - 12}" y="${clampedYZero + 16}" font-family="'Times New Roman', 'Cambria Math', serif" font-size="16px" font-style="italic" fill="#000000">O</text>\n\n`;

    // Special vertical line x = a
    if (activeTab === 'analytic' && selectedFamily === 'line_x') {
      const vx = mapX(params.a ?? 0);
      svg += `  <!-- Đường thẳng đứng x = ${params.a} -->\n`;
      svg += `  <line x1="${vx}" y1="${margin - 10}" x2="${vx}" y2="${H - margin + 10}" stroke="#0f6cbd" stroke-width="2" />\n`;
      svg += `  <text x="${vx + 6}" y="${margin + 12}" font-family="'Times New Roman', serif" font-size="14px" font-weight="bold" fill="#0f6cbd">x = ${params.a}</text>\n`;
    }

    // Special horizontal line y = b
    if (activeTab === 'analytic' && selectedFamily === 'line_y') {
      const hy = mapY(params.b ?? 0);
      svg += `  <!-- Đường thẳng nằm ngang y = ${params.b} -->\n`;
      svg += `  <line x1="${margin - 10}" y1="${hy}" x2="${W - margin + 10}" y2="${hy}" stroke="#0f6cbd" stroke-width="2" />\n`;
      svg += `  <text x="${W - margin - 35}" y="${hy - 6}" font-family="'Times New Roman', serif" font-size="14px" font-weight="bold" fill="#0f6cbd">y = ${params.b}</text>\n`;
    }

    // Auxiliary lines (e.g. y = m or x = k)
    if (showAuxHoriz) {
      const ay = mapY(auxHorizY);
      svg += `  <!-- Đường phụ nằm ngang y = ${auxHorizY} -->\n`;
      svg += `  <line x1="${margin - 10}" y1="${ay}" x2="${W - margin + 10}" y2="${ay}" stroke="#d13438" stroke-width="1.3" stroke-dasharray="5,5" />\n`;
      svg += `  <text x="${margin + 4}" y="${ay - 6}" font-family="'Times New Roman', serif" font-size="12px" fill="#d13438">y = ${auxHorizY}</text>\n`;
    }
    if (showAuxVert) {
      const ax = mapX(auxVertX);
      svg += `  <!-- Đường phụ thẳng đứng x = ${auxVertX} -->\n`;
      svg += `  <line x1="${ax}" y1="${margin - 10}" x2="${ax}" y2="${H - margin + 10}" stroke="#d13438" stroke-width="1.3" stroke-dasharray="5,5" />\n`;
      svg += `  <text x="${ax + 4}" y="${margin + 12}" font-family="'Times New Roman', serif" font-size="12px" fill="#d13438">x = ${auxVertX}</text>\n`;
    }

    // Asymptotes (Dashed Lines)
    if (activeTab === 'analytic') {
      svg += `  <!-- Đường tiệm cận nét đứt -->\n`;
      if (asymptotes.hasVertical && asymptotes.vertX !== undefined && selectedFamily !== 'line_x') {
        const vx = mapX(asymptotes.vertX);
        if (vx >= margin - 20 && vx <= W - margin + 20) {
          svg += `  <line x1="${vx}" y1="${margin - 10}" x2="${vx}" y2="${H - margin + 10}" stroke="#000000" stroke-width="1.3" stroke-dasharray="5,5" />\n`;
          svg += `  <text x="${vx + 4}" y="${margin + 12}" font-family="'Times New Roman', serif" font-size="12px" fill="#000000">x=${asymptotes.vertX.toFixed(1).replace('.0', '')}</text>\n`;
        }
      }
      if (asymptotes.hasHorizontal && asymptotes.horizY !== undefined && selectedFamily !== 'line_y') {
        const hy = mapY(asymptotes.horizY);
        if (hy >= margin - 20 && hy <= H - margin + 20) {
          svg += `  <line x1="${margin - 10}" y1="${hy}" x2="${W - margin + 10}" y2="${hy}" stroke="#000000" stroke-width="1.3" stroke-dasharray="5,5" />\n`;
          svg += `  <text x="${margin + 4}" y="${hy - 6}" font-family="'Times New Roman', serif" font-size="12px" fill="#000000">y=${asymptotes.horizY.toFixed(1).replace('.0', '')}</text>\n`;
        }
      }
      if (asymptotes.hasSlant && asymptotes.slantM !== undefined && asymptotes.slantN !== undefined) {
        const m = asymptotes.slantM;
        const n = asymptotes.slantN;
        const x1 = xMin;
        const y1 = m * x1 + n;
        const x2 = xMax;
        const y2 = m * x2 + n;
        svg += `  <line x1="${mapX(x1)}" y1="${mapY(y1)}" x2="${mapX(x2)}" y2="${mapY(y2)}" stroke="#000000" stroke-width="1.3" stroke-dasharray="5,5" clip-path="url(#plot-clip)" />\n`;
      }
    }

    // Function Curve Drawing
    svg += `\n  <!-- Đường cong đồ thị (Chuẩn nét) -->\n  <g clip-path="url(#plot-clip)">\n`;

    if (activeTab === 'sketch') {
      // Draw Hermite Interpolation Curve
      const steps = 240;
      const dx = (xMax - xMin) / steps;
      let pathD = '';
      for (let i = 0; i <= steps; i++) {
        const x = xMin + i * dx;
        const y = evalSketch(x);
        if (y === null || !Number.isFinite(y)) continue;
        const clampedY = Math.max(yMin - 8, Math.min(yMax + 8, y));
        const px = mapX(x);
        const py = mapY(clampedY);
        if (!pathD) {
          pathD = `M ${px.toFixed(2)} ${py.toFixed(2)}`;
        } else {
          pathD += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
        }
      }
      if (pathD) {
        svg += `    <path d="${pathD}" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />\n`;
      }
    } else if (selectedFamily !== 'line_x' && selectedFamily !== 'line_y') {
      // Draw Analytic Curve Segments
      const segments: { start: number; end: number }[] = [];
      if (asymptotes.hasVertical && asymptotes.vertX !== undefined) {
        const vx = asymptotes.vertX;
        segments.push({ start: xMin, end: vx - 0.04 });
        segments.push({ start: vx + 0.04, end: xMax });
      } else {
        segments.push({ start: xMin, end: xMax });
      }

      segments.forEach((seg) => {
        const steps = 160;
        const dx = (seg.end - seg.start) / steps;
        let pathD = '';

        for (let i = 0; i <= steps; i++) {
          const x = seg.start + i * dx;
          const y = evalF(x);
          if (y === null || !Number.isFinite(y)) continue;

          const clampedY = Math.max(yMin - 6, Math.min(yMax + 6, y));
          const px = mapX(x);
          const py = mapY(clampedY);

          if (!pathD) {
            pathD = `M ${px.toFixed(2)} ${py.toFixed(2)}`;
          } else {
            pathD += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
          }
        }

        if (pathD) {
          svg += `    <path d="${pathD}" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />\n`;
        }
      });
    }
    svg += `  </g>\n\n`;

    // Special Points and Dashed Projections to Ox & Oy
    svg += `  <!-- Các điểm đặc biệt & Đường gióng nét đứt -->\n`;
    allSpecialPoints.forEach((pt) => {
      const px = mapX(pt.x);
      const py = mapY(pt.y);

      // Dashed line to Ox
      if (pt.dashToX) {
        svg += `  <line x1="${px.toFixed(2)}" y1="${py.toFixed(2)}" x2="${px.toFixed(2)}" y2="${clampedYZero.toFixed(2)}" stroke="#000000" stroke-width="1.2" stroke-dasharray="4,4" />\n`;
        if (pt.labelX) {
          const textY = clampedYZero + (pt.y >= 0 ? 16 : -8);
          svg += `  <text x="${px.toFixed(2)}" y="${textY.toFixed(2)}" font-family="'Times New Roman', 'Cambria Math', serif" font-size="14px" fill="#000000" text-anchor="middle">${pt.labelX}</text>\n`;
        }
      }

      // Dashed line to Oy
      if (pt.dashToY) {
        svg += `  <line x1="${px.toFixed(2)}" y1="${py.toFixed(2)}" x2="${clampedXZero.toFixed(2)}" y2="${py.toFixed(2)}" stroke="#000000" stroke-width="1.2" stroke-dasharray="4,4" />\n`;
        if (pt.labelY) {
          const textX = clampedXZero + (pt.x >= 0 ? -10 : 10);
          const anchor = pt.x >= 0 ? 'end' : 'start';
          svg += `  <text x="${textX.toFixed(2)}" y="${(py + 4).toFixed(2)}" font-family="'Times New Roman', 'Cambria Math', serif" font-size="14px" fill="#000000" text-anchor="${anchor}">${pt.labelY}</text>\n`;
        }
      }

      // Dot
      if (pt.showDot) {
        svg += `  <circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="3.5" fill="#000000" />\n`;
      }
    });

    svg += `</svg>`;
    return svg;
  }, [
    xMin,
    xMax,
    yMin,
    yMax,
    showGrid,
    asymptotes,
    allSpecialPoints,
    activeTab,
    selectedFamily,
    params,
    evalSketch,
    showAuxHoriz,
    auxHorizY,
    showAuxVert,
    auxVertX
  ]);

  // Insert to Word
  const handleInsertToWord = async () => {
    setStatus('Đang chèn đồ thị vào Word...');
    const caption =
      activeTab === 'sketch'
        ? 'Phác thảo dạng đường cong đồ thị hàm số'
        : `Đồ thị hàm số trên hệ trục tọa độ Oxy`;
    const res = await insertSvgAtCursor(svgString, caption);
    setStatus(res.message);
  };

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add Point in Sketch Mode
  const handleAddSketchPoint = () => {
    const nextX = sketchPoints.length > 0 ? sketchPoints[sketchPoints.length - 1].x + 1 : 0;
    const newPt: SketchPoint = {
      id: `sp_${Date.now()}`,
      name: `Điểm ${sketchPoints.length + 1}`,
      x: nextX,
      y: 0,
      type: 'pass',
      dashX: true,
      dashY: true
    };
    setSketchPoints((prev) => [...prev, newPt]);
  };

  const handleRemoveSketchPoint = (id: string) => {
    if (sketchPoints.length <= 2) return;
    setSketchPoints((prev) => prev.filter((p) => p.id !== id));
  };

  // Add Point in Analytic Mode
  const handleAddCustomPoint = () => {
    const newPt: SpecialPoint = {
      id: `pt_${Date.now()}`,
      name: `Điểm mới`,
      x: 1,
      y: evalF(1) ?? 0,
      labelX: '1',
      labelY: (evalF(1) ?? 0).toFixed(1).replace('.0', ''),
      showDot: true,
      dashToX: true,
      dashToY: true
    };
    setExtraPoints((prev) => [...prev, newPt]);
  };

  const handleRemoveCustomPoint = (id: string) => {
    setExtraPoints((prev) => prev.filter((p) => p.id !== id));
  };

  // Display formula string in Analytic Mode
  const currentFormula = useMemo(() => {
    const { a = 0, b = 0, c = 0, d = 0, e = 1 } = params;
    if (selectedFamily === 'line_x') return `Đường thẳng đứng: x = ${a}`;
    if (selectedFamily === 'line_y') return `Đường thẳng ngang: y = ${b}`;
    if (selectedFamily === 'linear') return `y = ${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`;
    if (selectedFamily === 'cubic') {
      return `y = ${a}x³ ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x² ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}x ${d >= 0 ? '+ ' + d : '- ' + Math.abs(d)}`;
    }
    if (selectedFamily === 'quadratic') {
      return `y = ${a}x² ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`;
    }
    if (selectedFamily === 'quartic') {
      return `y = ${a}x⁴ ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x² ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}`;
    }
    if (selectedFamily === 'rational11') {
      return `y = (${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}) / (${c}x ${d >= 0 ? '+ ' + d : '- ' + Math.abs(d)})`;
    }
    if (selectedFamily === 'rational21') {
      return `y = (${a}x² ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}) / (${d}x ${e >= 0 ? '+ ' + e : '- ' + Math.abs(e)})`;
    }
    return '';
  }, [selectedFamily, params]);

  return (
    <div className={styles.container}>
      <Card>
        <CardHeader
          image={<DataArea24Regular style={{ color: '#0f6cbd' }} />}
          header={<Text weight="semibold" size={400}>Vẽ đồ thị hàm số giải tích & Phác thảo đường cong</Text>}
          description={
            <Text size={200}>
              Nhập hàm số chính xác, đường thẳng x=a, y=b, hoặc nhập các điểm cực trị để phác thảo dạng đường cong
            </Text>
          }
        />

        {/* Mode Navigation Tabs */}
        <div className={styles.tabNav}>
          <TabList
            selectedValue={activeTab}
            onTabSelect={(_: SelectTabEvent, data: SelectTabData) => setActiveTab(data.value as 'analytic' | 'sketch')}
            size="small"
          >
            <Tab value="analytic" icon={<DataArea24Regular />}>
              1. Khảo sát theo hàm số & Tiệm cận
            </Tab>
            <Tab value="sketch" icon={<Line20Regular />}>
              2. Phác thảo đường cong theo cực trị (Nội suy)
            </Tab>
          </TabList>
        </div>

        {/* PRESETS FOR CURRENT MODE */}
        <div>
          <Text size={200} weight="semibold" style={{ color: '#0f6cbd', marginBottom: '4px', display: 'block' }}>
            ⚡ Mẫu đồ thị thông dụng (Bấm để nạp nhanh):
          </Text>
          <div className={styles.presetsRow}>
            {activeTab === 'analytic'
              ? ANALYTIC_PRESETS.map((p, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    appearance="secondary"
                    icon={<Sparkle20Regular />}
                    onClick={() => handleApplyPreset(p)}
                    title={p.desc}
                  >
                    {p.name}
                  </Button>
                ))
              : SKETCH_PRESETS.map((p, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    appearance="secondary"
                    icon={<Sparkle20Regular />}
                    onClick={() => handleApplySketchPreset(p)}
                    title={p.desc}
                  >
                    {p.name}
                  </Button>
                ))}
          </div>
        </div>

        {/* Live Vector Graph Preview */}
        <Field
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text weight="semibold">
                Đồ thị trên hệ trục tọa độ Oxy:{' '}
                <strong style={{ color: '#0f6cbd' }}>
                  {activeTab === 'analytic' ? currentFormula : 'Phác thảo dạng đường cong đi qua các cực trị'}
                </strong>
              </Text>
              <Checkbox
                label="Lưới tọa độ"
                checked={showGrid}
                onChange={(_, d) => setShowGrid(Boolean(d.checked))}
              />
            </div>
          }
        >
          <div className={styles.previewCard}>
            <div
              style={{ display: 'flex', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
            <Text size={100} style={{ color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
              Vector SVG nét chuẩn Bộ Giáo Dục - Tiệm cận & gióng tọa độ bằng nét đứt sắc nét
            </Text>
          </div>
        </Field>

        {/* TAB 1: ANALYTIC MODE CONFIGURATION */}
        {activeTab === 'analytic' && (
          <>
            <div className={styles.configSection}>
              <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                1. Dạng hàm số & Hệ số chi tiết
              </Text>

              <Field label="Loại hàm số hoặc đường thẳng khảo sát:">
                <Select
                  value={selectedFamily}
                  onChange={(_, d) => setSelectedFamily(d.value as FunctionFamily)}
                >
                  <option value="cubic">Hàm bậc ba: y = ax³ + bx² + cx + d</option>
                  <option value="rational11">Hàm phân thức bậc 1/1: y = (ax + b)/(cx + d)</option>
                  <option value="rational21">Hàm phân thức bậc 2/1: y = (ax² + bx + c)/(dx + e)</option>
                  <option value="linear">Hàm số bậc nhất: y = ax + b</option>
                  <option value="line_x">Đường thẳng đứng đặc biệt: x = a</option>
                  <option value="line_y">Đường thẳng ngang đặc biệt: y = b</option>
                  <option value="quartic">Hàm trùng phương bậc bốn: y = ax⁴ + bx² + c</option>
                  <option value="quadratic">Hàm bậc hai Parabol: y = ax² + bx + c</option>
                </Select>
              </Field>

              {/* Coefficients Inputs */}
              <div className={styles.paramsRow}>
                {selectedFamily !== 'line_y' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text weight="semibold">a =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(params.a ?? 1)}
                      onChange={(_, d) => setParams((p) => ({ ...p, a: parseFloat(d.value) || 0 }))}
                      style={{ width: '65px' }}
                    />
                  </div>
                )}

                {selectedFamily !== 'line_x' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text weight="semibold">b =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(params.b ?? 0)}
                      onChange={(_, d) => setParams((p) => ({ ...p, b: parseFloat(d.value) || 0 }))}
                      style={{ width: '65px' }}
                    />
                  </div>
                )}

                {(selectedFamily === 'cubic' ||
                  selectedFamily === 'quadratic' ||
                  selectedFamily === 'quartic' ||
                  selectedFamily === 'rational11' ||
                  selectedFamily === 'rational21') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text weight="semibold">c =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(params.c ?? 0)}
                      onChange={(_, d) => setParams((p) => ({ ...p, c: parseFloat(d.value) || 0 }))}
                      style={{ width: '65px' }}
                    />
                  </div>
                )}

                {(selectedFamily === 'cubic' ||
                  selectedFamily === 'rational11' ||
                  selectedFamily === 'rational21') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text weight="semibold">d =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(params.d ?? 0)}
                      onChange={(_, d) => setParams((p) => ({ ...p, d: parseFloat(d.value) || 0 }))}
                      style={{ width: '65px' }}
                    />
                  </div>
                )}

                {selectedFamily === 'rational21' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text weight="semibold">e =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(params.e ?? 1)}
                      onChange={(_, d) => setParams((p) => ({ ...p, e: parseFloat(d.value) || 0 }))}
                      style={{ width: '65px' }}
                    />
                  </div>
                )}
              </div>

              {/* Asymptotes Status */}
              {(asymptotes.hasVertical || asymptotes.hasHorizontal || asymptotes.hasSlant) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {asymptotes.hasVertical && selectedFamily !== 'line_x' && (
                    <Badge appearance="tint" color="danger">
                      Tiệm cận đứng (TCĐ): x = {asymptotes.vertX?.toFixed(2).replace('.00', '')}
                    </Badge>
                  )}
                  {asymptotes.hasHorizontal && selectedFamily !== 'line_y' && (
                    <Badge appearance="tint" color="informative">
                      Tiệm cận ngang (TCN): y = {asymptotes.horizY?.toFixed(2).replace('.00', '')}
                    </Badge>
                  )}
                  {asymptotes.hasSlant && (
                    <Badge appearance="tint" color="brand">
                      Tiệm cận xiên (TCX): y = {asymptotes.slantM?.toFixed(1).replace('.0', '')}x{' '}
                      {((asymptotes.slantN ?? 0) >= 0 ? '+ ' : '- ') +
                        Math.abs(asymptotes.slantN ?? 0).toFixed(1).replace('.0', '')}
                    </Badge>
                  )}
                </div>
              )}

              {/* Auxiliary Horizontal & Vertical lines for intersection / test problems */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Checkbox
                    label="Đường phụ ngang y = m"
                    checked={showAuxHoriz}
                    onChange={(_, d) => setShowAuxHoriz(Boolean(d.checked))}
                  />
                  {showAuxHoriz && (
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(auxHorizY)}
                      onChange={(_, d) => setAuxHorizY(parseFloat(d.value) || 0)}
                      style={{ width: '60px' }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Checkbox
                    label="Đường phụ đứng x = k"
                    checked={showAuxVert}
                    onChange={(_, d) => setShowAuxVert(Boolean(d.checked))}
                  />
                  {showAuxVert && (
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(auxVertX)}
                      onChange={(_, d) => setAuxVertX(parseFloat(d.value) || 0)}
                      style={{ width: '60px' }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Special points and projections */}
            <div className={styles.configSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                    2. Điểm đặc biệt (Cực trị, giao trục) & Đường gióng nét đứt
                  </Text>
                  <Text size={100} style={{ color: '#666', display: 'block' }}>
                    Tự động định vị cực trị và giao điểm, cho phép thêm điểm phụ gióng nét đứt
                  </Text>
                </div>
                <Button size="small" appearance="subtle" icon={<Add20Regular />} onClick={handleAddCustomPoint}>
                  + Thêm điểm phụ
                </Button>
              </div>

              <div className={styles.pointsList}>
                {autoSpecialPoints.map((pt) => (
                  <div key={pt.id} className={styles.pointItem}>
                    <Badge appearance="tint" color="brand" style={{ minWidth: '130px' }}>
                      {pt.name}
                    </Badge>
                    <Text size={200} style={{ minWidth: '90px' }}>
                      ({pt.x.toFixed(1).replace('.0', '')}; {pt.y.toFixed(1).replace('.0', '')})
                    </Text>
                    <Checkbox label="Gióng Ox" checked={pt.dashToX} disabled />
                    <Checkbox label="Gióng Oy" checked={pt.dashToY} disabled />
                  </div>
                ))}

                {extraPoints.map((pt) => (
                  <div key={pt.id} className={styles.pointItem}>
                    <Input
                      size="small"
                      value={pt.name}
                      onChange={(_, d) => {
                        setExtraPoints((prev) =>
                          prev.map((p) => (p.id === pt.id ? { ...p, name: d.value } : p))
                        );
                      }}
                      style={{ width: '110px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <Text size={100}>x:</Text>
                      <Input
                        size="small"
                        type="number"
                        step="any"
                        value={String(pt.x)}
                        onChange={(_, d) => {
                          const val = parseFloat(d.value) || 0;
                          setExtraPoints((prev) =>
                            prev.map((p) => (p.id === pt.id ? { ...p, x: val, labelX: String(val) } : p))
                          );
                        }}
                        style={{ width: '55px' }}
                      />
                      <Text size={100}>y:</Text>
                      <Input
                        size="small"
                        type="number"
                        step="any"
                        value={String(pt.y)}
                        onChange={(_, d) => {
                          const val = parseFloat(d.value) || 0;
                          setExtraPoints((prev) =>
                            prev.map((p) => (p.id === pt.id ? { ...p, y: val, labelY: String(val) } : p))
                          );
                        }}
                        style={{ width: '55px' }}
                      />
                    </div>
                    <Checkbox
                      label="Gióng Ox"
                      checked={pt.dashToX}
                      onChange={(_, d) => {
                        setExtraPoints((prev) =>
                          prev.map((p) => (p.id === pt.id ? { ...p, dashToX: Boolean(d.checked) } : p))
                        );
                      }}
                    />
                    <Checkbox
                      label="Gióng Oy"
                      checked={pt.dashToY}
                      onChange={(_, d) => {
                        setExtraPoints((prev) =>
                          prev.map((p) => (p.id === pt.id ? { ...p, dashToY: Boolean(d.checked) } : p))
                        );
                      }}
                    />
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Delete20Regular style={{ color: '#c42b1c' }} />}
                      onClick={() => handleRemoveCustomPoint(pt.id)}
                      title="Xóa điểm này"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: SKETCH INTERPOLATION MODE */}
        {activeTab === 'sketch' && (
          <div className={styles.configSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                  Phác thảo đường cong theo các điểm cực trị & điểm uốn (Nội suy Hermite)
                </Text>
                <Text size={100} style={{ color: '#666', display: 'block' }}>
                  Nhập tọa độ các điểm và chọn loại: Cực đại (tiếp tuyến ngang cong xuống), Cực tiểu (tiếp tuyến ngang cong lên) hoặc Điểm đi qua
                </Text>
              </div>
              <Button size="small" appearance="subtle" icon={<Add20Regular />} onClick={handleAddSketchPoint}>
                + Thêm điểm
              </Button>
            </div>

            <div className={styles.pointsList}>
              {sketchPoints.map((pt, idx) => (
                <div key={pt.id} className={styles.pointItem}>
                  <Text size={200} weight="semibold" style={{ minWidth: '60px' }}>
                    Điểm {idx + 1}:
                  </Text>

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Text size={100}>x =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(pt.x)}
                      onChange={(_, d) => {
                        const val = parseFloat(d.value) || 0;
                        setSketchPoints((prev) =>
                          prev.map((p) => (p.id === pt.id ? { ...p, x: val } : p))
                        );
                      }}
                      style={{ width: '60px' }}
                    />
                    <Text size={100}>y =</Text>
                    <Input
                      size="small"
                      type="number"
                      step="any"
                      value={String(pt.y)}
                      onChange={(_, d) => {
                        const val = parseFloat(d.value) || 0;
                        setSketchPoints((prev) =>
                          prev.map((p) => (p.id === pt.id ? { ...p, y: val } : p))
                        );
                      }}
                      style={{ width: '60px' }}
                    />
                  </div>

                  {/* Point Type: Max, Min, or Pass */}
                  <Select
                    size="small"
                    value={pt.type}
                    onChange={(_, d) => {
                      const t = d.value as PointType;
                      setSketchPoints((prev) =>
                        prev.map((p) => (p.id === pt.id ? { ...p, type: t } : p))
                      );
                    }}
                    style={{ minWidth: '120px' }}
                  >
                    <option value="max">⚡ Cực đại (y' = 0)</option>
                    <option value="min">⚡ Cực tiểu (y' = 0)</option>
                    <option value="pass">● Điểm đi qua</option>
                  </Select>

                  <Checkbox
                    label="Gióng Ox"
                    checked={pt.dashX}
                    onChange={(_, d) => {
                      setSketchPoints((prev) =>
                        prev.map((p) => (p.id === pt.id ? { ...p, dashX: Boolean(d.checked) } : p))
                      );
                    }}
                  />
                  <Checkbox
                    label="Gióng Oy"
                    checked={pt.dashY}
                    onChange={(_, d) => {
                      setSketchPoints((prev) =>
                        prev.map((p) => (p.id === pt.id ? { ...p, dashY: Boolean(d.checked) } : p))
                      );
                    }}
                  />

                  {sketchPoints.length > 2 && (
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Delete20Regular style={{ color: '#c42b1c' }} />}
                      onClick={() => handleRemoveSketchPoint(pt.id)}
                      title="Xóa điểm này"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: PHẠM VI TRỤC TỌA ĐỘ */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text size={200} weight="semibold">Phạm vi trục Oxy:</Text>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <Text size={200}>x từ:</Text>
            <Input
              size="small"
              type="number"
              value={String(xMin)}
              onChange={(_, d) => setXMin(parseFloat(d.value) || -5)}
              style={{ width: '55px' }}
            />
            <Text size={200}>đến:</Text>
            <Input
              size="small"
              type="number"
              value={String(xMax)}
              onChange={(_, d) => setXMax(parseFloat(d.value) || 5)}
              style={{ width: '55px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <Text size={200}>y từ:</Text>
            <Input
              size="small"
              type="number"
              value={String(yMin)}
              onChange={(_, d) => setYMin(parseFloat(d.value) || -5)}
              style={{ width: '55px' }}
            />
            <Text size={200}>đến:</Text>
            <Input
              size="small"
              type="number"
              value={String(yMax)}
              onChange={(_, d) => setYMax(parseFloat(d.value) || 5)}
              style={{ width: '55px' }}
            />
          </div>
          <Button
            size="small"
            appearance="subtle"
            icon={<ArrowReset20Regular />}
            onClick={() => {
              if (activeTab === 'analytic') handleApplyPreset(ANALYTIC_PRESETS[0]);
              else handleApplySketchPreset(SKETCH_PRESETS[0]);
            }}
          >
            Mặc định
          </Button>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className={styles.actions}>
          <Button
            size="medium"
            appearance="subtle"
            icon={copied ? <Checkmark20Regular style={{ color: 'green' }} /> : <Copy20Regular />}
            onClick={handleCopySvg}
          >
            {copied ? 'Đã sao chép!' : 'Sao chép SVG'}
          </Button>

          <Button
            appearance="primary"
            size="medium"
            icon={<Add20Regular />}
            onClick={handleInsertToWord}
          >
            Chèn đồ thị vào Word
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
