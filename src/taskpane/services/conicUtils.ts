// conicUtils.ts - Mathematical modeling & SVG rendering for the 3 Conic Sections
// (Elip, Hypebol, Parabol) matching Vietnamese 10th grade textbook standard

export interface Point {
  x: number;
  y: number;
}

export type ConicType = 'ellipse' | 'hyperbola' | 'parabola';

export interface ConicConfig {
  type: ConicType;
  // Ellipse & Hyperbola parameters
  a: number; // Semi-major / real axis
  b: number; // Semi-minor / imaginary axis
  // Parabola parameter
  p: number; // Focal parameter (p > 0, y^2 = 2px)
  // Interactive test point M
  tM: number; // Parameter for point M: angle t for ellipse, y for hyperbola/parabola
  // Visual feature toggles
  showPointM: boolean;
  showFoci: boolean;
  showVertices: boolean;
  showAsymptotes: boolean; // Hyperbola
  showFundamentalRect: boolean; // Hyperbola
  showDirectrix: boolean; // Parabola
  showFocalRadii: boolean; // MF1, MF2 or MF, MH
  // Custom Labels
  lblF1?: string;
  lblF2?: string;
  lblM?: string;
  lblH?: string;
  lblA1?: string;
  lblA2?: string;
  lblB1?: string;
  lblB2?: string;
  lblDelta?: string;
  lblCurve?: string;
}

export interface DraggableVertex {
  id: string;
  pt: Point;
  label: string;
  labelOffset: { x: number; y: number };
  color?: string;
}

export interface ConicSceneResult {
  content: string;
  caption: string;
  equationLatex: string;
  equationSimplifiedLatex: string;
  propertiesHtml: string;
  draggableVertices: DraggableVertex[];
  computed: {
    a: number;
    b: number;
    c: number;
    e: number;
    p: number;
    fociDistance: number;
    ptM: Point;
    ptF1: Point;
    ptF2: Point;
    ptH?: Point;
    dist1: number; // MF1 or MF
    dist2: number; // MF2 or MH
  };
}

// Generate SVG marker definitions for coordinate arrows
export const getAxisMarkers = (): string => `
  <defs>
    <marker id="arrow-axis-x" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#242424" />
    </marker>
    <marker id="arrow-axis-y" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#242424" />
    </marker>
  </defs>
`;

/**
 * Main generator for 3 Conic Sections
 */
export function generateConicScene(config: ConicConfig): ConicSceneResult {
  const {
    type,
    a: rawA,
    b: rawB,
    p: rawP,
    tM,
    showPointM = true,
    showFoci = true,
    showVertices = true,
    showAsymptotes = true,
    showFundamentalRect = false,
    showDirectrix = true,
    showFocalRadii = true
  } = config;

  const width = 340;
  const height = 240;

  const strokeCurve = '#0f6cbd';
  const strokeFocalRadii = '#d13438';
  const strokeDirectrix = '#107c41';
  const strokeAsymptote = '#605e5c';
  const textFont = 'font-family="Cambria Math, Times New Roman, serif" font-size="12" font-style="italic" font-weight="bold" fill="#242424"';
  const subFont = 'font-family="Cambria Math, Times New Roman, serif" font-size="10" font-style="normal" fill="#555555"';

  let content = getAxisMarkers();
  let caption = '';
  let equationLatex = '';
  let equationSimplifiedLatex = '';
  let propertiesHtml = '';
  const draggableVertices: DraggableVertex[] = [];

  // =========================================================================
  // 1. ELIP (E): x^2/a^2 + y^2/b^2 = 1 (a > b > 0)
  // =========================================================================
  if (type === 'ellipse') {
    let a = Math.max(1, rawA);
    let b = Math.max(0.5, rawB);
    if (b >= a) {
      b = +(a * 0.75).toFixed(1);
    }
    const a2 = +(a * a).toFixed(2);
    const b2 = +(b * b).toFixed(2);
    const cVal = Math.sqrt(Math.max(0, a * a - b * b));
    const c = +cVal.toFixed(2);
    const e = +(c / a).toFixed(3);

    equationLatex = `\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1`;
    equationSimplifiedLatex = `\\frac{x^2}{${a2}} + \\frac{y^2}{${b2}} = 1`;
    caption = `Đường Elip (E): x²/${a2} + y²/${b2} = 1 (a = ${a}, b = ${b}, c = ${c})`;

    propertiesHtml = `
      <div style="font-size:12px; line-height:1.6; color:#333;">
        <div>• <strong>Bán trục lớn:</strong> a = ${a} (Độ dài trục lớn 2a = ${2 * a})</div>
        <div>• <strong>Bán trục bé:</strong> b = ${b} (Độ dài trục bé 2b = ${2 * b})</div>
        <div>• <strong>Tiêu cự:</strong> 2c = ${+(2 * c).toFixed(2)} (với c = √(a² - b²) = √(${a2} - ${b2}) = ${c})</div>
        <div>• <strong>Hai tiêu điểm:</strong> F₁(-${c}; 0) và F₂(${c}; 0)</div>
        <div>• <strong>Bốn đỉnh:</strong> A₁(-${a}; 0), A₂(${a}; 0), B₁(0; -${b}), B₂(0; ${b})</div>
        <div>• <strong>Tâm sai:</strong> e = c/a = ${e} &lt; 1</div>
      </div>
    `;

    // Coordinates mapping
    const origin: Point = { x: 170, y: 120 };
    const S = 115 / a; // Scale to fit nicely

    const rx = a * S;
    const ry = b * S;
    const cx = c * S;

    // Axes
    content += `
      <!-- Axes Oxy -->
      <line x1="20" y1="${origin.y}" x2="${width - 15}" y2="${origin.y}" stroke="#242424" stroke-width="1.2" marker-end="url(#arrow-axis-x)" />
      <line x1="${origin.x}" y1="${height - 15}" x2="${origin.x}" y2="15" stroke="#242424" stroke-width="1.2" marker-end="url(#arrow-axis-y)" />
      <text x="${width - 12}" y="${origin.y + 14}" ${textFont}>x</text>
      <text x="${origin.x - 14}" y="16" ${textFont}>y</text>
      <text x="${origin.x - 12}" y="${origin.y + 14}" ${textFont}>O</text>
    `;

    // Ellipse Curve
    content += `
      <!-- Ellipse Curve -->
      <ellipse cx="${origin.x}" cy="${origin.y}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${strokeCurve}" stroke-width="2" />
      <text x="${(origin.x + rx * 0.72).toFixed(1)}" y="${(origin.y - ry * 0.75).toFixed(1)}" ${textFont} fill="${strokeCurve}">${config.lblCurve || '(E)'}</text>
    `;

    // Vertices
    const ptA1: Point = { x: origin.x - rx, y: origin.y };
    const ptA2: Point = { x: origin.x + rx, y: origin.y };
    const ptB1: Point = { x: origin.x, y: origin.y + ry };
    const ptB2: Point = { x: origin.x, y: origin.y - ry };

    if (showVertices) {
      content += `
        <!-- Vertices -->
        <circle cx="${ptA1.x.toFixed(1)}" cy="${ptA1.y.toFixed(1)}" r="2.5" fill="#242424" />
        <circle cx="${ptA2.x.toFixed(1)}" cy="${ptA2.y.toFixed(1)}" r="2.5" fill="#242424" />
        <circle cx="${ptB1.x.toFixed(1)}" cy="${ptB1.y.toFixed(1)}" r="2.5" fill="#242424" />
        <circle cx="${ptB2.x.toFixed(1)}" cy="${ptB2.y.toFixed(1)}" r="2.5" fill="#242424" />
        
        <text x="${(ptA1.x - 18).toFixed(1)}" y="${(ptA1.y - 6).toFixed(1)}" ${textFont}>${config.lblA1 || 'A₁'}</text>
        <text x="${(ptA2.x + 6).toFixed(1)}" y="${(ptA2.y - 6).toFixed(1)}" ${textFont}>${config.lblA2 || 'A₂'}</text>
        <text x="${(ptB1.x - 16).toFixed(1)}" y="${(ptB1.y + 14).toFixed(1)}" ${textFont}>${config.lblB1 || 'B₁'}</text>
        <text x="${(ptB2.x - 16).toFixed(1)}" y="${(ptB2.y - 6).toFixed(1)}" ${textFont}>${config.lblB2 || 'B₂'}</text>
      `;
    }

    // Foci
    const ptF1: Point = { x: origin.x - cx, y: origin.y };
    const ptF2: Point = { x: origin.x + cx, y: origin.y };

    if (showFoci) {
      // Textbook style ticks on x-axis for F1 and F2
      content += `
        <!-- Foci ticks matching textbook Hinh 52 -->
        <line x1="${ptF1.x.toFixed(1)}" y1="${(origin.y - 4).toFixed(1)}" x2="${ptF1.x.toFixed(1)}" y2="${(origin.y + 4).toFixed(1)}" stroke="#242424" stroke-width="1.5" />
        <line x1="${ptF2.x.toFixed(1)}" y1="${(origin.y - 4).toFixed(1)}" x2="${ptF2.x.toFixed(1)}" y2="${(origin.y + 4).toFixed(1)}" stroke="#242424" stroke-width="1.5" />
        <circle cx="${ptF1.x.toFixed(1)}" cy="${ptF1.y.toFixed(1)}" r="2.5" fill="${strokeCurve}" />
        <circle cx="${ptF2.x.toFixed(1)}" cy="${ptF2.y.toFixed(1)}" r="2.5" fill="${strokeCurve}" />
        
        <text x="${(ptF1.x - 8).toFixed(1)}" y="${(origin.y + 15).toFixed(1)}" ${textFont}>${config.lblF1 || 'F₁'}</text>
        <text x="${(ptF2.x - 6).toFixed(1)}" y="${(origin.y + 15).toFixed(1)}" ${textFont}>${config.lblF2 || 'F₂'}</text>
      `;
    }

    // Point M on Ellipse
    const radM = (tM * Math.PI) / 180;
    const xM_math = +(a * Math.cos(radM)).toFixed(2);
    const yM_math = +(b * Math.sin(radM)).toFixed(2);
    const ptM: Point = {
      x: origin.x + xM_math * S,
      y: origin.y - yM_math * S
    };

    const d1 = +Math.hypot(xM_math - (-c), yM_math).toFixed(2);
    const d2 = +Math.hypot(xM_math - c, yM_math).toFixed(2);
    const sumD = +(d1 + d2).toFixed(2);

    if (showPointM && showFocalRadii) {
      content += `
        <!-- Focal Radii MF1 and MF2 -->
        <line x1="${ptM.x.toFixed(1)}" y1="${ptM.y.toFixed(1)}" x2="${ptF1.x.toFixed(1)}" y2="${ptF1.y.toFixed(1)}" stroke="${strokeFocalRadii}" stroke-width="1.5" />
        <line x1="${ptM.x.toFixed(1)}" y1="${ptM.y.toFixed(1)}" x2="${ptF2.x.toFixed(1)}" y2="${ptF2.y.toFixed(1)}" stroke="${strokeFocalRadii}" stroke-width="1.5" />
      `;
    }

    if (showPointM) {
      draggableVertices.push({
        id: 'M',
        pt: ptM,
        label: `${config.lblM || 'M'}(${xM_math}; ${yM_math})`,
        labelOffset: { x: 6, y: -8 },
        color: strokeFocalRadii
      });
    }

    return {
      content,
      caption,
      equationLatex,
      equationSimplifiedLatex,
      propertiesHtml: propertiesHtml + (showPointM ? `
        <div style="margin-top:6px; padding:6px; background:#fff1f0; border-radius:4px; border:1px solid #ffccc7; font-size:12px; color:#a8071a;">
          📍 <strong>Điểm M(${xM_math}; ${yM_math})</strong> ∈ (E):<br/>
          • Bán kính qua tiêu MF₁ = ${d1}<br/>
          • Bán kính qua tiêu MF₂ = ${d2}<br/>
          • <strong>Tổng: MF₁ + MF₂ = ${sumD} = 2a (${2 * a})</strong> (Đúng định nghĩa SGK Hình 52!)
        </div>
      ` : ''),
      draggableVertices,
      computed: {
        a,
        b,
        c,
        e,
        p: 0,
        fociDistance: 2 * c,
        ptM,
        ptF1,
        ptF2,
        dist1: d1,
        dist2: d2
      }
    };
  }

  // =========================================================================
  // 2. HYPEBOL (H): x^2/a^2 - y^2/b^2 = 1 (a > 0, b > 0)
  // =========================================================================
  if (type === 'hyperbola') {
    const a = Math.max(0.5, rawA);
    const b = Math.max(0.5, rawB);
    const a2 = +(a * a).toFixed(2);
    const b2 = +(b * b).toFixed(2);
    const cVal = Math.sqrt(a * a + b * b);
    const c = +cVal.toFixed(2);
    const e = +(c / a).toFixed(3);
    const slopeAsymp = +(b / a).toFixed(2);

    equationLatex = `\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1`;
    equationSimplifiedLatex = `\\frac{x^2}{${a2}} - \\frac{y^2}{${b2}} = 1`;
    caption = `Đường Hypebol (H): x²/${a2} - y²/${b2} = 1 (a = ${a}, b = ${b}, c = ${c})`;

    propertiesHtml = `
      <div style="font-size:12px; line-height:1.6; color:#333;">
        <div>• <strong>Bán trục thực:</strong> a = ${a} (Độ dài trục thực 2a = ${2 * a})</div>
        <div>• <strong>Bán trục ảo:</strong> b = ${b} (Độ dài trục ảo 2b = ${2 * b})</div>
        <div>• <strong>Tiêu cự:</strong> 2c = ${+(2 * c).toFixed(2)} (với c = √(a² + b²) = √(${a2} + ${b2}) = ${c})</div>
        <div>• <strong>Hai tiêu điểm:</strong> F₁(-${c}; 0) và F₂(${c}; 0)</div>
        <div>• <strong>Hai đỉnh:</strong> A₁(-${a}; 0) và A₂(${a}; 0)</div>
        <div>• <strong>Hai tiệm cận xiên:</strong> y = ±(${b}/${a})x = ±${slopeAsymp}x</div>
        <div>• <strong>Tâm sai:</strong> e = c/a = ${e} &gt; 1</div>
      </div>
    `;

    // Coordinates mapping
    const origin: Point = { x: 170, y: 120 };
    // Fit foci nicely on canvas: c * S ~ 85px
    const S = 90 / c;

    const rx = a * S;
    const ry = b * S;
    const cx = c * S;

    // Axes
    content += `
      <!-- Axes Oxy -->
      <line x1="20" y1="${origin.y}" x2="${width - 15}" y2="${origin.y}" stroke="#242424" stroke-width="1.2" marker-end="url(#arrow-axis-x)" />
      <line x1="${origin.x}" y1="${height - 15}" x2="${origin.x}" y2="15" stroke="#242424" stroke-width="1.2" marker-end="url(#arrow-axis-y)" />
      <text x="${width - 12}" y="${origin.y + 14}" ${textFont}>x</text>
      <text x="${origin.x - 14}" y="16" ${textFont}>y</text>
      <text x="${origin.x - 12}" y="${origin.y + 14}" ${textFont}>O</text>
    `;

    // Fundamental Rectangle (optional)
    if (showFundamentalRect) {
      content += `
        <!-- Fundamental Rectangle -->
        <rect x="${(origin.x - rx).toFixed(1)}" y="${(origin.y - ry).toFixed(1)}" width="${(2 * rx).toFixed(1)}" height="${(2 * ry).toFixed(1)}" fill="none" stroke="#8a8886" stroke-width="1" stroke-dasharray="3,3" />
      `;
    }

    // Asymptotes (y = ± (b/a) x)
    if (showAsymptotes) {
      const maxPlotX = (width / 2) - 10;
      const asympY = (b / a) * maxPlotX;
      content += `
        <!-- Asymptotes -->
        <line x1="${(origin.x - maxPlotX).toFixed(1)}" y1="${(origin.y + asympY).toFixed(1)}" x2="${(origin.x + maxPlotX).toFixed(1)}" y2="${(origin.y - asympY).toFixed(1)}" stroke="${strokeAsymptote}" stroke-width="1.1" stroke-dasharray="4,4" />
        <line x1="${(origin.x - maxPlotX).toFixed(1)}" y1="${(origin.y - asympY).toFixed(1)}" x2="${(origin.x + maxPlotX).toFixed(1)}" y2="${(origin.y + asympY).toFixed(1)}" stroke="${strokeAsymptote}" stroke-width="1.1" stroke-dasharray="4,4" />
      `;
    }

    // Generate Hyperbola Branches (Parametric in y: x = a * sqrt(1 + y^2/b^2))
    const yMaxMath = (height / 2 - 20) / S;
    const steps = 60;
    const dRight: string[] = [];
    const dLeft: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const yMath = -yMaxMath + (2 * yMaxMath * i) / steps;
      const xMath = a * Math.sqrt(1 + (yMath * yMath) / (b * b));

      const pxRight = origin.x + xMath * S;
      const pxLeft = origin.x - xMath * S;
      const py = origin.y - yMath * S;

      if (i === 0) {
        dRight.push(`M ${pxRight.toFixed(1)} ${py.toFixed(1)}`);
        dLeft.push(`M ${pxLeft.toFixed(1)} ${py.toFixed(1)}`);
      } else {
        dRight.push(`L ${pxRight.toFixed(1)} ${py.toFixed(1)}`);
        dLeft.push(`L ${pxLeft.toFixed(1)} ${py.toFixed(1)}`);
      }
    }

    content += `
      <!-- Hyperbola Branches -->
      <path d="${dRight.join(' ')}" fill="none" stroke="${strokeCurve}" stroke-width="2" />
      <path d="${dLeft.join(' ')}" fill="none" stroke="${strokeCurve}" stroke-width="2" />
      <text x="${(origin.x + rx + 30).toFixed(1)}" y="${(origin.y - 75).toFixed(1)}" ${textFont} fill="${strokeCurve}">${config.lblCurve || '(H)'}</text>
    `;

    // Vertices A1, A2
    const ptA1: Point = { x: origin.x - rx, y: origin.y };
    const ptA2: Point = { x: origin.x + rx, y: origin.y };

    if (showVertices) {
      content += `
        <!-- Vertices A1, A2 -->
        <circle cx="${ptA1.x.toFixed(1)}" cy="${ptA1.y.toFixed(1)}" r="2.5" fill="#242424" />
        <circle cx="${ptA2.x.toFixed(1)}" cy="${ptA2.y.toFixed(1)}" r="2.5" fill="#242424" />
        <text x="${(ptA1.x + 4).toFixed(1)}" y="${(ptA1.y + 14).toFixed(1)}" ${textFont}>${config.lblA1 || 'A₁'}</text>
        <text x="${(ptA2.x - 14).toFixed(1)}" y="${(ptA2.y + 14).toFixed(1)}" ${textFont}>${config.lblA2 || 'A₂'}</text>
      `;
    }

    // Foci F1, F2
    const ptF1: Point = { x: origin.x - cx, y: origin.y };
    const ptF2: Point = { x: origin.x + cx, y: origin.y };

    if (showFoci) {
      content += `
        <!-- Foci F1, F2 matching textbook Hinh 54 -->
        <circle cx="${ptF1.x.toFixed(1)}" cy="${ptF1.y.toFixed(1)}" r="2.5" fill="${strokeCurve}" />
        <circle cx="${ptF2.x.toFixed(1)}" cy="${ptF2.y.toFixed(1)}" r="2.5" fill="${strokeCurve}" />
        <text x="${(ptF1.x - 8).toFixed(1)}" y="${(origin.y + 15).toFixed(1)}" ${textFont}>${config.lblF1 || 'F₁'}</text>
        <text x="${(ptF2.x - 6).toFixed(1)}" y="${(origin.y + 15).toFixed(1)}" ${textFont}>${config.lblF2 || 'F₂'}</text>
      `;
    }

    // Point M on Hyperbola Right Branch (matching textbook Hinh 54!)
    // Parameter tM controls math y of M
    const yM_math = +(tM * 0.8 * b).toFixed(2);
    const xM_math = +(a * Math.sqrt(1 + (yM_math * yM_math) / (b * b))).toFixed(2);
    const ptM: Point = {
      x: origin.x + xM_math * S,
      y: origin.y - yM_math * S
    };

    const d1 = +Math.hypot(xM_math - (-c), yM_math).toFixed(2);
    const d2 = +Math.hypot(xM_math - c, yM_math).toFixed(2);
    const diffD = +Math.abs(d1 - d2).toFixed(2);

    if (showPointM && showFocalRadii) {
      content += `
        <!-- Focal Radii MF1 and MF2 -->
        <line x1="${ptM.x.toFixed(1)}" y1="${ptM.y.toFixed(1)}" x2="${ptF1.x.toFixed(1)}" y2="${ptF1.y.toFixed(1)}" stroke="${strokeFocalRadii}" stroke-width="1.5" />
        <line x1="${ptM.x.toFixed(1)}" y1="${ptM.y.toFixed(1)}" x2="${ptF2.x.toFixed(1)}" y2="${ptF2.y.toFixed(1)}" stroke="${strokeFocalRadii}" stroke-width="1.5" />
      `;
    }

    if (showPointM) {
      draggableVertices.push({
        id: 'M',
        pt: ptM,
        label: `${config.lblM || 'M'}(${xM_math}; ${yM_math})`,
        labelOffset: { x: 6, y: -8 },
        color: strokeFocalRadii
      });
    }

    return {
      content,
      caption,
      equationLatex,
      equationSimplifiedLatex,
      propertiesHtml: propertiesHtml + (showPointM ? `
        <div style="margin-top:6px; padding:6px; background:#fff1f0; border-radius:4px; border:1px solid #ffccc7; font-size:12px; color:#a8071a;">
          📍 <strong>Điểm M(${xM_math}; ${yM_math})</strong> ∈ (H):<br/>
          • Bán kính qua tiêu MF₁ = ${d1}<br/>
          • Bán kính qua tiêu MF₂ = ${d2}<br/>
          • <strong>Hiệu: |MF₁ - MF₂| = ${diffD} = 2a (${2 * a})</strong> (Đúng định nghĩa SGK Hình 54!)
        </div>
      ` : ''),
      draggableVertices,
      computed: {
        a,
        b,
        c,
        e,
        p: 0,
        fociDistance: 2 * c,
        ptM,
        ptF1,
        ptF2,
        dist1: d1,
        dist2: d2
      }
    };
  }

  // =========================================================================
  // 3. PARABOL (P): y^2 = 2px (p > 0)
  // =========================================================================
  {
    const p = Math.max(0.2, rawP);
    const p2 = +(2 * p).toFixed(2);
    const pOver2 = +(p / 2).toFixed(2);

    equationLatex = `y^2 = 2px`;
    equationSimplifiedLatex = `y^2 = ${p2}x`;
    caption = `Đường Parabol (P): y² = ${p2}x (Tham số tiêu p = ${p}, Tiêu điểm F(${pOver2}; 0))`;

    propertiesHtml = `
      <div style="font-size:12px; line-height:1.6; color:#333;">
        <div>• <strong>Tham số tiêu:</strong> p = ${p} (Khoảng cách từ tiêu điểm đến đường chuẩn FH = p)</div>
        <div>• <strong>Đỉnh Parabol:</strong> O(0; 0) (Gốc tọa độ)</div>
        <div>• <strong>Tiêu điểm:</strong> F(p/2; 0) = F(${pOver2}; 0)</div>
        <div>• <strong>Đường chuẩn:</strong> Δ: x = -p/2 = -${pOver2} (tức x + ${pOver2} = 0)</div>
        <div>• <strong>Tâm sai:</strong> e = 1</div>
        <div>• <strong>Trục đối xứng:</strong> Trục hoành Ox</div>
      </div>
    `;

    // Coordinates mapping matching textbook Hinh 56:
    // Origin O shifted to the left to give space for Directrix at x = -p/2
    const origin: Point = { x: 110, y: 120 };
    // Fit p/2 at ~40px
    const S = 80 / p;

    const fx = origin.x + pOver2 * S;
    const directrixX = origin.x - pOver2 * S;

    // Axes
    content += `
      <!-- Axes Oxy -->
      <line x1="20" y1="${origin.y}" x2="${width - 15}" y2="${origin.y}" stroke="#242424" stroke-width="1.2" marker-end="url(#arrow-axis-x)" />
      <line x1="${origin.x}" y1="${height - 15}" x2="${origin.x}" y2="15" stroke="#242424" stroke-width="1.2" marker-end="url(#arrow-axis-y)" />
      <text x="${width - 12}" y="${origin.y + 14}" ${textFont}>x</text>
      <text x="${origin.x - 14}" y="16" ${textFont}>y</text>
      <text x="${origin.x - 12}" y="${origin.y + 14}" ${textFont}>O</text>
    `;

    // Directrix Delta (straight line x = -p/2)
    if (showDirectrix) {
      content += `
        <!-- Directrix Delta -->
        <line x1="${directrixX.toFixed(1)}" y1="15" x2="${directrixX.toFixed(1)}" y2="${height - 15}" stroke="${strokeDirectrix}" stroke-width="1.8" />
        <text x="${(directrixX - 14).toFixed(1)}" y="${height - 18}" ${textFont} fill="${strokeDirectrix}">${config.lblDelta || 'Δ'}</text>
        <text x="${(directrixX - 16).toFixed(1)}" y="${origin.y + 14}" ${subFont}>-${pOver2}</text>
      `;
    }

    // Parabola Curve: x = y^2 / (2p)
    const yMaxMath = (height / 2 - 20) / S;
    const steps = 70;
    const dParab: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const yMath = -yMaxMath + (2 * yMaxMath * i) / steps;
      const xMath = (yMath * yMath) / (2 * p);

      const px = origin.x + xMath * S;
      const py = origin.y - yMath * S;

      if (px > width - 15) continue; // clamp within canvas

      if (dParab.length === 0) {
        dParab.push(`M ${px.toFixed(1)} ${py.toFixed(1)}`);
      } else {
        dParab.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
    }

    content += `
      <!-- Parabola Curve -->
      <path d="${dParab.join(' ')}" fill="none" stroke="${strokeCurve}" stroke-width="2" />
      <text x="${(width - 45).toFixed(1)}" y="${(origin.y - 75).toFixed(1)}" ${textFont} fill="${strokeCurve}">${config.lblCurve || '(P)'}</text>
    `;

    // Focus F(p/2; 0)
    const ptF: Point = { x: fx, y: origin.y };
    if (showFoci) {
      content += `
        <!-- Focus F(p/2; 0) -->
        <circle cx="${ptF.x.toFixed(1)}" cy="${ptF.y.toFixed(1)}" r="2.8" fill="${strokeCurve}" />
        <text x="${(ptF.x - 10).toFixed(1)}" y="${(origin.y + 15).toFixed(1)}" ${textFont}>${config.lblF1 || 'F'}</text>
        <text x="${(ptF.x + 4).toFixed(1)}" y="${(origin.y + 14).toFixed(1)}" ${subFont}>(${pOver2}; 0)</text>
      `;
    }

    // Point M on Parabola: yM = tM * p, xM = yM^2 / (2p)
    const yM_math = +(tM * 0.9 * p).toFixed(2);
    const xM_math = +((yM_math * yM_math) / (2 * p)).toFixed(2);
    const ptM: Point = {
      x: origin.x + xM_math * S,
      y: origin.y - yM_math * S
    };

    // Point H on Directrix: x = -p/2, y = yM
    const ptH: Point = {
      x: directrixX,
      y: ptM.y
    };

    const distMF = +Math.hypot(xM_math - pOver2, yM_math).toFixed(2);
    const distMH = +(xM_math - (-pOver2)).toFixed(2); // xM + p/2

    if (showPointM && showFocalRadii) {
      // Right angle mark at H between MH and directrix Delta
      const arm = 9;
      const rightAnglePath = `
        M ${(ptH.x + arm).toFixed(1)} ${ptH.y.toFixed(1)}
        L ${(ptH.x + arm).toFixed(1)} ${(ptH.y - (yM_math >= 0 ? arm : -arm)).toFixed(1)}
        L ${ptH.x.toFixed(1)} ${(ptH.y - (yM_math >= 0 ? arm : -arm)).toFixed(1)}
      `;

      content += `
        <!-- Segment MH and MF -->
        <line x1="${ptM.x.toFixed(1)}" y1="${ptM.y.toFixed(1)}" x2="${ptH.x.toFixed(1)}" y2="${ptH.y.toFixed(1)}" stroke="${strokeFocalRadii}" stroke-width="1.5" />
        <line x1="${ptM.x.toFixed(1)}" y1="${ptM.y.toFixed(1)}" x2="${ptF.x.toFixed(1)}" y2="${ptF.y.toFixed(1)}" stroke="${strokeFocalRadii}" stroke-width="1.5" />
        
        <!-- Right angle mark at H -->
        <path d="${rightAnglePath}" fill="none" stroke="${strokeDirectrix}" stroke-width="1.3" />
        
        <!-- Point H on Directrix -->
        <circle cx="${ptH.x.toFixed(1)}" cy="${ptH.y.toFixed(1)}" r="2.5" fill="${strokeDirectrix}" />
        <text x="${(ptH.x - 16).toFixed(1)}" y="${(ptH.y + 4).toFixed(1)}" ${textFont} fill="${strokeDirectrix}">${config.lblH || 'H'}</text>
      `;
    }

    if (showPointM) {
      draggableVertices.push({
        id: 'M',
        pt: ptM,
        label: `${config.lblM || 'M'}(${xM_math}; ${yM_math})`,
        labelOffset: { x: 6, y: -8 },
        color: strokeFocalRadii
      });
    }

    return {
      content,
      caption,
      equationLatex,
      equationSimplifiedLatex,
      propertiesHtml: propertiesHtml + (showPointM ? `
        <div style="margin-top:6px; padding:6px; background:#f6ffed; border-radius:4px; border:1px solid #b7eb8f; font-size:12px; color:#237804;">
          📍 <strong>Điểm M(${xM_math}; ${yM_math})</strong> ∈ (P):<br/>
          • Khoảng cách tới tiêu điểm: MF = ${distMF}<br/>
          • Khoảng cách tới đường chuẩn: MH = d(M, Δ) = ${distMH}<br/>
          • <strong>Đẳng thức: MF = MH = ${distMF}</strong> (Đúng định nghĩa SGK Hình 56!)
        </div>
      ` : ''),
      draggableVertices,
      computed: {
        a: 0,
        b: 0,
        c: pOver2,
        e: 1,
        p,
        fociDistance: p,
        ptM,
        ptF1: ptF,
        ptF2: ptF,
        ptH,
        dist1: distMF,
        dist2: distMH
      }
    };
  }
}
