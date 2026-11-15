import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Input,
  Field,
  Badge,
  makeStyles,
  shorthands,
  tokens,
  Tooltip,
  Divider
} from '@fluentui/react-components';
import {
  Table24Regular,
  Add20Regular,
  Delete20Regular,
  ArrowUpRight20Regular,
  ArrowDownRight20Regular,
  ArrowRight20Regular,
  Copy20Regular,
  Checkmark20Regular,
  ArrowReset20Regular,
  Sparkle20Regular
} from '@fluentui/react-icons';
import { insertSvgAtCursor } from '../services/wordService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('14px'),
    ...shorthands.padding('4px')
  },
  presetsRow: {
    display: 'flex',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  presetButton: {
    fontSize: '12px',
    height: '32px'
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
  pointsGrid: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
    ...shorthands.padding('8px 0')
  },
  pointCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
    ...shorthands.padding('8px 10px'),
    backgroundColor: '#f8f9fa',
    ...shorthands.border('1px', 'solid', '#dcdfe6'),
    ...shorthands.borderRadius('6px'),
    minWidth: '130px'
  },
  intervalCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
    ...shorthands.padding('8px 10px'),
    backgroundColor: '#f0f7ff',
    ...shorthands.border('1px', 'solid', '#b8daff'),
    ...shorthands.borderRadius('6px'),
    minWidth: '150px'
  },
  actions: {
    display: 'flex',
    ...shorthands.gap('8px'),
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px'
  }
});

// BarType:
// 'none': Nghiệm thông thường (0 ở hàng y', liên tục ở hàng y)
// 'both': Dấu 2 gạch ở cả dòng y' và dòng y (tiệm cận đứng, không xác định cả y lẫn y')
// 'yPrimeOnly': Dấu 2 gạch CHỈ Ở DÒNG y' (y' không xác định, nhưng y vẫn liên tục/đạt cực trị!)
export type BarType = 'none' | 'both' | 'yPrimeOnly';

export interface CriticalPoint {
  id: string;
  xVal: string;
  barType: BarType;
  yPrimeVal: string;
}

export interface TableInterval {
  id: string;
  yPrimeSign: string; // "+", "-", "0", ""
  arrow: 'up' | 'down' | 'flat' | 'none'; // 'up' = ↗, 'down' = ↘, 'flat' = →
  startVal: string;
  startLevel: 'top' | 'bot' | 'mid';
  endVal: string;
  endLevel: 'top' | 'bot' | 'mid';
}

export interface BBTState {
  xLabel: string;
  yPrimeLabel: string;
  yLabel: string;
  xLeft: string;
  xRight: string;
  points: CriticalPoint[];
  intervals: TableInterval[];
}

// Default Presets matching user images and standard Vietnamese THPT curriculum
const PRESETS: { name: string; desc: string; data: BBTState }[] = [
  {
    name: 'Mẫu 1: Vừa có || vừa có cực trị (Hình 1 mới)',
    desc: 'x = -8 có 2 gạch ||, x = 3 là điểm cực tiểu f(3) = -3',
    data: {
      xLabel: 'x',
      yPrimeLabel: "f'(x)",
      yLabel: 'f(x)',
      xLeft: '-∞',
      xRight: '+∞',
      points: [
        { id: 'p1', xVal: '-8', barType: 'both', yPrimeVal: '||' },
        { id: 'p2', xVal: '3', barType: 'none', yPrimeVal: '0' }
      ],
      intervals: [
        { id: 'i0', yPrimeSign: '-', arrow: 'down', startVal: '1', startLevel: 'top', endVal: '-∞', endLevel: 'bot' },
        { id: 'i1', yPrimeSign: '-', arrow: 'down', startVal: '2', startLevel: 'top', endVal: '-3', endLevel: 'bot' },
        { id: 'i2', yPrimeSign: '+', arrow: 'up', startVal: '-3', startLevel: 'bot', endVal: '3', endLevel: 'top' }
      ]
    }
  },
  {
    name: 'Mẫu 2: Dấu || chỉ ở dòng y\' (Hình 2 mới)',
    desc: 'Tại x = -2 và x = 3 chỉ có || ở dòng f\'(x), hàm f(x) vẫn liên tục đạt cực trị!',
    data: {
      xLabel: 'x',
      yPrimeLabel: "f'(x)",
      yLabel: 'f(x)',
      xLeft: '-∞',
      xRight: '+∞',
      points: [
        { id: 'p1', xVal: '-2', barType: 'yPrimeOnly', yPrimeVal: '||' },
        { id: 'p2', xVal: '-1', barType: 'both', yPrimeVal: '||' },
        { id: 'p3', xVal: '3', barType: 'yPrimeOnly', yPrimeVal: '||' }
      ],
      intervals: [
        { id: 'i0', yPrimeSign: '+', arrow: 'up', startVal: '-∞', startLevel: 'bot', endVal: '-4', endLevel: 'top' },
        { id: 'i1', yPrimeSign: '-', arrow: 'down', startVal: '-4', startLevel: 'top', endVal: '-∞', endLevel: 'bot' },
        { id: 'i2', yPrimeSign: '-', arrow: 'down', startVal: '+∞', startLevel: 'top', endVal: '0', endLevel: 'bot' },
        { id: 'i3', yPrimeSign: '+', arrow: 'up', startVal: '0', startLevel: 'bot', endVal: '+∞', endLevel: 'top' }
      ]
    }
  },
  {
    name: 'Mẫu 3: Hàm bậc 3 (2 cực trị)',
    desc: 'y = x³ - 3x + 1 (2 cực trị x = -1, x = 1)',
    data: {
      xLabel: 'x',
      yPrimeLabel: "y'",
      yLabel: 'y',
      xLeft: '-∞',
      xRight: '+∞',
      points: [
        { id: 'p1', xVal: '-1', barType: 'none', yPrimeVal: '0' },
        { id: 'p2', xVal: '1', barType: 'none', yPrimeVal: '0' }
      ],
      intervals: [
        { id: 'i0', yPrimeSign: '+', arrow: 'up', startVal: '-∞', startLevel: 'bot', endVal: '3', endLevel: 'top' },
        { id: 'i1', yPrimeSign: '-', arrow: 'down', startVal: '3', startLevel: 'top', endVal: '-1', endLevel: 'bot' },
        { id: 'i2', yPrimeSign: '+', arrow: 'up', startVal: '-1', startLevel: 'bot', endVal: '+∞', endLevel: 'top' }
      ]
    }
  },
  {
    name: 'Mẫu 4: Phân thức bậc 1/1 (Tiệm cận đứng ||)',
    desc: 'y = (3x+1)/(x+4) (Tiệm cận đứng x = -4, || cả 2 dòng)',
    data: {
      xLabel: 'x',
      yPrimeLabel: "f'(x)",
      yLabel: 'f(x)',
      xLeft: '-∞',
      xRight: '+∞',
      points: [
        { id: 'p1', xVal: '-4', barType: 'both', yPrimeVal: '||' }
      ],
      intervals: [
        { id: 'i0', yPrimeSign: '+', arrow: 'up', startVal: '3', startLevel: 'bot', endVal: '+∞', endLevel: 'top' },
        { id: 'i1', yPrimeSign: '+', arrow: 'up', startVal: '-∞', startLevel: 'bot', endVal: '3', endLevel: 'top' }
      ]
    }
  },
  {
    name: 'Mẫu 5: Trùng phương bậc 4 (3 cực trị)',
    desc: 'y = ax⁴ + bx² + c (3 điểm cực trị: -1, 0, 1)',
    data: {
      xLabel: 'x',
      yPrimeLabel: "y'",
      yLabel: 'y',
      xLeft: '-∞',
      xRight: '+∞',
      points: [
        { id: 'p1', xVal: '-1', barType: 'none', yPrimeVal: '0' },
        { id: 'p2', xVal: '0', barType: 'none', yPrimeVal: '0' },
        { id: 'p3', xVal: '1', barType: 'none', yPrimeVal: '0' }
      ],
      intervals: [
        { id: 'i0', yPrimeSign: '-', arrow: 'down', startVal: '+∞', startLevel: 'top', endVal: '-2', endLevel: 'bot' },
        { id: 'i1', yPrimeSign: '+', arrow: 'up', startVal: '-2', startLevel: 'bot', endVal: '1', endLevel: 'top' },
        { id: 'i2', yPrimeSign: '-', arrow: 'down', startVal: '1', startLevel: 'top', endVal: '-2', endLevel: 'bot' },
        { id: 'i3', yPrimeSign: '+', arrow: 'up', startVal: '-2', startLevel: 'bot', endVal: '+∞', endLevel: 'top' }
      ]
    }
  },
  {
    name: 'Mẫu 6: Parabol bậc hai',
    desc: 'y = ax² + bx + c (1 cực trị)',
    data: {
      xLabel: 'x',
      yPrimeLabel: "y'",
      yLabel: 'y',
      xLeft: '-∞',
      xRight: '+∞',
      points: [
        { id: 'p1', xVal: '2', barType: 'none', yPrimeVal: '0' }
      ],
      intervals: [
        { id: 'i0', yPrimeSign: '-', arrow: 'down', startVal: '+∞', startLevel: 'top', endVal: '-1', endLevel: 'bot' },
        { id: 'i1', yPrimeSign: '+', arrow: 'up', startVal: '-1', startLevel: 'bot', endVal: '+∞', endLevel: 'top' }
      ]
    }
  }
];

export const VariationTableGenerator: React.FC = () => {
  const styles = useStyles();
  const [bbt, setBbt] = useState<BBTState>(PRESETS[0].data);
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Helper to format mathematical infinity and minus symbols
  const formatMath = (val: string) => {
    return val
      .replace(/-oo|-inf|\\-infty|-\\infty/gi, '−∞')
      .replace(/\+oo|\+inf|\\\+infty|\+\\infty/gi, '+∞')
      .replace(/-/g, '−');
  };

  // SVG Geometry Calculations
  const svgData = useMemo(() => {
    const numPoints = bbt.points.length;
    const numIntervals = numPoints + 1;

    // Dynamic width to comfortably fit all points
    const headerWidth = 80;
    const intervalWidth = Math.max(140, Math.floor(520 / numIntervals));
    const totalWidth = headerWidth + numIntervals * intervalWidth;

    const row1H = 38;
    const row2H = 38;
    const row3H = 106;
    const totalHeight = row1H + row2H + row3H;

    // Horizontal grid lines
    const lineY1 = row1H;
    const lineY2 = row1H + row2H;

    // Critical point X coordinates
    const pointXCoords: number[] = bbt.points.map((_, idx) => {
      return headerWidth + (idx + 1) * intervalWidth;
    });

    const xLeftX = headerWidth + 30;
    const xRightX = totalWidth - 30;

    // Row 3 Y levels
    const Y_TOP = lineY2 + 22; // 98
    const Y_BOT = totalHeight - 16; // 166
    const Y_MID = Math.round((Y_TOP + Y_BOT) / 2); // 132

    const getLevelY = (level: 'top' | 'bot' | 'mid') => {
      if (level === 'top') return Y_TOP;
      if (level === 'bot') return Y_BOT;
      return Y_MID;
    };

    return {
      totalWidth,
      totalHeight,
      headerWidth,
      lineY1,
      lineY2,
      xLeftX,
      xRightX,
      pointXCoords,
      Y_TOP,
      Y_BOT,
      Y_MID,
      getLevelY
    };
  }, [bbt]);

  // Generate SVG String
  const svgString = useMemo(() => {
    const {
      totalWidth,
      totalHeight,
      headerWidth,
      lineY1,
      lineY2,
      xLeftX,
      xRightX,
      pointXCoords,
      getLevelY
    } = svgData;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">\n`;
    svg += `  <defs>\n`;
    svg += `    <marker id="bbt-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n`;
    svg += `      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#000000" />\n`;
    svg += `    </marker>\n`;
    svg += `  </defs>\n\n`;

    // Outer table border and background
    svg += `  <!-- Khung bảng biến thiên nét chuẩn SGK -->\n`;
    svg += `  <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="${totalHeight - 1}" fill="#ffffff" stroke="#000000" stroke-width="1.5" />\n`;

    // Header vertical divider
    svg += `  <line x1="${headerWidth}" y1="0" x2="${headerWidth}" y2="${totalHeight}" stroke="#000000" stroke-width="1.5" />\n`;

    // Horizontal dividers
    svg += `  <line x1="0" y1="${lineY1}" x2="${totalWidth}" y2="${lineY1}" stroke="#000000" stroke-width="1.5" />\n`;
    svg += `  <line x1="0" y1="${lineY2}" x2="${totalWidth}" y2="${lineY2}" stroke="#000000" stroke-width="1.5" />\n\n`;

    // Left Column Labels
    const fontStyle = `font-family="'Times New Roman', 'Cambria Math', serif" font-size="18px" font-style="italic" font-weight="bold" fill="#000000" text-anchor="middle" dominant-baseline="central"`;
    svg += `  <!-- Nhãn hàng bên trái -->\n`;
    svg += `  <text x="${headerWidth / 2}" y="${lineY1 / 2}" ${fontStyle}>${bbt.xLabel}</text>\n`;
    svg += `  <text x="${headerWidth / 2}" y="${(lineY1 + lineY2) / 2}" ${fontStyle}>${bbt.yPrimeLabel}</text>\n`;
    svg += `  <text x="${headerWidth / 2}" y="${(lineY2 + totalHeight) / 2}" ${fontStyle}>${bbt.yLabel}</text>\n\n`;

    // Row 1: X Values
    const numFont = `font-family="'Times New Roman', 'Cambria Math', serif" font-size="16px" fill="#000000" text-anchor="middle" dominant-baseline="central"`;
    svg += `  <!-- Giá trị hàng x -->\n`;
    svg += `  <text x="${xLeftX}" y="${lineY1 / 2}" ${numFont}>${formatMath(bbt.xLeft)}</text>\n`;
    bbt.points.forEach((p, idx) => {
      const px = pointXCoords[idx];
      svg += `  <text x="${px}" y="${lineY1 / 2}" ${numFont}>${formatMath(p.xVal)}</text>\n`;
    });
    svg += `  <text x="${xRightX}" y="${lineY1 / 2}" ${numFont}>${formatMath(bbt.xRight)}</text>\n\n`;

    // Row 2: Y' Signs and Critical Points
    const signFont = `font-family="'Times New Roman', 'Cambria Math', serif" font-size="18px" font-weight="bold" fill="#000000" text-anchor="middle" dominant-baseline="central"`;
    svg += `  <!-- Hàng đạo hàm y' -->\n`;
    const yPrimeMidY = (lineY1 + lineY2) / 2;

    // Interval signs
    bbt.intervals.forEach((inv, idx) => {
      const x1 = idx === 0 ? headerWidth : pointXCoords[idx - 1];
      const x2 = idx === bbt.points.length ? totalWidth : pointXCoords[idx];
      const midX = (x1 + x2) / 2;
      svg += `  <text x="${midX}" y="${yPrimeMidY}" ${signFont}>${inv.yPrimeSign}</text>\n`;
    });

    // Critical point signs / double bars in Row 2 & Row 3
    bbt.points.forEach((p, idx) => {
      const px = pointXCoords[idx];

      if (p.barType === 'both' || p.barType === 'yPrimeOnly') {
        // Draw double vertical lines in Row 2 (y')
        svg += `  <!-- Dấu || tại x = ${p.xVal} (Hàng y') -->\n`;
        svg += `  <line x1="${px - 2.5}" y1="${lineY1}" x2="${px - 2.5}" y2="${lineY2}" stroke="#000000" stroke-width="1.3" />\n`;
        svg += `  <line x1="${px + 2.5}" y1="${lineY1}" x2="${px + 2.5}" y2="${lineY2}" stroke="#000000" stroke-width="1.3" />\n`;
      } else {
        // Normal root 0 or custom value in Row 2
        svg += `  <text x="${px}" y="${yPrimeMidY}" ${numFont}>${p.yPrimeVal || '0'}</text>\n`;
      }

      // Draw double vertical lines in Row 3 (y) ONLY IF barType === 'both'!
      if (p.barType === 'both') {
        svg += `  <!-- Dấu || tại x = ${p.xVal} (Hàng y) -->\n`;
        svg += `  <line x1="${px - 2.5}" y1="${lineY2}" x2="${px - 2.5}" y2="${totalHeight}" stroke="#000000" stroke-width="1.3" />\n`;
        svg += `  <line x1="${px + 2.5}" y1="${lineY2}" x2="${px + 2.5}" y2="${totalHeight}" stroke="#000000" stroke-width="1.3" />\n`;
      }
    });

    // Row 3: Y Values & Arrows
    svg += `\n  <!-- Hàng biến thiên y (Số & Mũi tên) -->\n`;
    bbt.intervals.forEach((inv, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === bbt.intervals.length - 1;

      // Start position X:
      // If previous point was 'both', start slightly to the right of the double bar.
      // If previous point was 'none' or 'yPrimeOnly', it's a continuous point exactly at pointXCoords[idx-1]!
      let startX = isFirst ? xLeftX : pointXCoords[idx - 1];
      if (!isFirst && bbt.points[idx - 1].barType === 'both') {
        startX = pointXCoords[idx - 1] + 24;
      }
      const startY = getLevelY(inv.startLevel);

      // End position X:
      // If current end point is 'both', end slightly to the left of the double bar.
      // If current end point is 'none' or 'yPrimeOnly', it's continuous exactly at pointXCoords[idx]!
      let endX = isLast ? xRightX : pointXCoords[idx];
      if (!isLast && bbt.points[idx].barType === 'both') {
        endX = pointXCoords[idx] - 24;
      }
      const endY = getLevelY(inv.endLevel);

      // Draw Start Value text:
      // Draw if it is the first interval, OR if the previous point had barType === 'both' (discontinuous)
      if (isFirst || bbt.points[idx - 1].barType === 'both') {
        svg += `  <text x="${startX}" y="${startY}" ${numFont}>${formatMath(inv.startVal)}</text>\n`;
      }

      // Draw End Value text:
      svg += `  <text x="${endX}" y="${endY}" ${numFont}>${formatMath(inv.endVal)}</text>\n`;

      // Draw Arrow if specified
      if (inv.arrow !== 'none') {
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 36) {
          const ux = dx / dist;
          const uy = dy / dist;

          const arrowStartX = Math.round(startX + ux * 22);
          const arrowStartY = Math.round(startY + uy * 14);
          const arrowEndX = Math.round(endX - ux * 22);
          const arrowEndY = Math.round(endY - uy * 14);

          svg += `  <line x1="${arrowStartX}" y1="${arrowStartY}" x2="${arrowEndX}" y2="${arrowEndY}" stroke="#000000" stroke-width="1.3" marker-end="url(#bbt-arrow)" />\n`;
        }
      }
    });

    svg += `</svg>`;
    return svg;
  }, [bbt, svgData]);

  // Insert to Word via Word.run and HTML/SVG
  const handleInsertToWord = async () => {
    setStatus('Đang chèn bảng biến thiên vào Word...');
    const res = await insertSvgAtCursor(svgString, `Bảng biến thiên hàm số`);
    setStatus(res.message);
  };

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cycle BarType: 'none' -> 'yPrimeOnly' -> 'both' -> 'none'
  const handleCycleBarType = (pointIdx: number) => {
    const cycle: BarType[] = ['none', 'yPrimeOnly', 'both'];
    setBbt((prev) => {
      const newPoints = [...prev.points];
      const pt = { ...newPoints[pointIdx] };
      const nextIdx = (cycle.indexOf(pt.barType) + 1) % cycle.length;
      const nextType = cycle[nextIdx];
      pt.barType = nextType;
      pt.yPrimeVal = nextType !== 'none' ? '||' : '0';
      newPoints[pointIdx] = pt;

      const newIntervals = [...prev.intervals];
      if (nextType === 'both') {
        // Discontinuous: separate limits
        newIntervals[pointIdx] = {
          ...newIntervals[pointIdx],
          endVal: '+∞',
          endLevel: 'top'
        };
        newIntervals[pointIdx + 1] = {
          ...newIntervals[pointIdx + 1],
          startVal: '-∞',
          startLevel: 'bot'
        };
      } else {
        // Continuous: sync common value
        const sharedVal = newIntervals[pointIdx].endVal;
        const sharedLevel = newIntervals[pointIdx].endLevel;
        newIntervals[pointIdx + 1] = {
          ...newIntervals[pointIdx + 1],
          startVal: sharedVal,
          startLevel: sharedLevel
        };
      }

      return {
        ...prev,
        points: newPoints,
        intervals: newIntervals
      };
    });
  };

  // Direct set BarType
  const handleSetBarType = (pointIdx: number, type: BarType) => {
    setBbt((prev) => {
      const newPoints = [...prev.points];
      const pt = { ...newPoints[pointIdx] };
      pt.barType = type;
      pt.yPrimeVal = type !== 'none' ? '||' : '0';
      newPoints[pointIdx] = pt;

      const newIntervals = [...prev.intervals];
      if (type === 'both') {
        newIntervals[pointIdx] = {
          ...newIntervals[pointIdx],
          endVal: '+∞',
          endLevel: 'top'
        };
        newIntervals[pointIdx + 1] = {
          ...newIntervals[pointIdx + 1],
          startVal: '-∞',
          startLevel: 'bot'
        };
      } else {
        const sharedVal = newIntervals[pointIdx].endVal;
        const sharedLevel = newIntervals[pointIdx].endLevel;
        newIntervals[pointIdx + 1] = {
          ...newIntervals[pointIdx + 1],
          startVal: sharedVal,
          startLevel: sharedLevel
        };
      }

      return {
        ...prev,
        points: newPoints,
        intervals: newIntervals
      };
    });
  };

  // Update critical point value
  const handlePointChange = (pointIdx: number, val: string) => {
    setBbt((prev) => {
      const newPoints = [...prev.points];
      newPoints[pointIdx] = { ...newPoints[pointIdx], xVal: val };
      return { ...prev, points: newPoints };
    });
  };

  // Update interval arrow direction
  const handleCycleArrow = (invIdx: number) => {
    const cycle: ('up' | 'down' | 'flat' | 'none')[] = ['up', 'down', 'flat', 'none'];
    setBbt((prev) => {
      const newIntervals = [...prev.intervals];
      const curr = newIntervals[invIdx].arrow;
      const nextIdx = (cycle.indexOf(curr) + 1) % cycle.length;
      const nextArrow = cycle[nextIdx];

      // Auto update levels to match arrow direction
      let startLevel = newIntervals[invIdx].startLevel;
      let endLevel = newIntervals[invIdx].endLevel;
      if (nextArrow === 'up') {
        startLevel = 'bot';
        endLevel = 'top';
      } else if (nextArrow === 'down') {
        startLevel = 'top';
        endLevel = 'bot';
      } else if (nextArrow === 'flat') {
        startLevel = 'mid';
        endLevel = 'mid';
      }

      newIntervals[invIdx] = {
        ...newIntervals[invIdx],
        arrow: nextArrow,
        startLevel,
        endLevel
      };
      return { ...prev, intervals: newIntervals };
    });
  };

  // Update interval sign in y'
  const handleCycleSign = (invIdx: number) => {
    const signs = ['+', '-', '0', ''];
    setBbt((prev) => {
      const newIntervals = [...prev.intervals];
      const curr = newIntervals[invIdx].yPrimeSign;
      const nextIdx = (signs.indexOf(curr) + 1) % signs.length;
      newIntervals[invIdx] = {
        ...newIntervals[invIdx],
        yPrimeSign: signs[nextIdx]
      };
      return { ...prev, intervals: newIntervals };
    });
  };

  // Update Y values
  const handleYValChange = (invIdx: number, side: 'start' | 'end', val: string) => {
    setBbt((prev) => {
      const newIntervals = [...prev.intervals];
      if (side === 'start') {
        newIntervals[invIdx] = { ...newIntervals[invIdx], startVal: val };
      } else {
        newIntervals[invIdx] = { ...newIntervals[invIdx], endVal: val };
        // Sync with next interval's start if continuous (i.e. not 'both')
        if (invIdx < prev.points.length && prev.points[invIdx].barType !== 'both') {
          newIntervals[invIdx + 1] = { ...newIntervals[invIdx + 1], startVal: val };
        }
      }
      return { ...prev, intervals: newIntervals };
    });
  };

  // Add critical point
  const handleAddPoint = () => {
    setBbt((prev) => {
      const newId = `p${prev.points.length + 1}`;
      const newPt: CriticalPoint = {
        id: newId,
        xVal: `${prev.points.length}`,
        barType: 'none',
        yPrimeVal: '0'
      };

      const newInvId = `i${prev.intervals.length}`;
      const newInv: TableInterval = {
        id: newInvId,
        yPrimeSign: '+',
        arrow: 'up',
        startVal: prev.intervals[prev.intervals.length - 1].endVal,
        startLevel: 'bot',
        endVal: '+∞',
        endLevel: 'top'
      };

      return {
        ...prev,
        points: [...prev.points, newPt],
        intervals: [...prev.intervals, newInv]
      };
    });
  };

  // Remove critical point
  const handleRemovePoint = (idx: number) => {
    if (bbt.points.length <= 1) return;
    setBbt((prev) => {
      const newPoints = prev.points.filter((_, i) => i !== idx);
      const newIntervals = prev.intervals.filter((_, i) => i !== idx);
      return {
        ...prev,
        points: newPoints,
        intervals: newIntervals
      };
    });
  };

  const getArrowIcon = (arrow: 'up' | 'down' | 'flat' | 'none') => {
    if (arrow === 'up') return <ArrowUpRight20Regular style={{ color: '#0f6cbd' }} />;
    if (arrow === 'down') return <ArrowDownRight20Regular style={{ color: '#d13438' }} />;
    if (arrow === 'flat') return <ArrowRight20Regular style={{ color: '#107c41' }} />;
    return <span style={{ color: '#999', fontSize: '11px' }}>Ẩn</span>;
  };

  return (
    <div className={styles.container}>
      <Card>
        <CardHeader
          image={<Table24Regular style={{ color: '#0f6cbd' }} />}
          header={<Text weight="semibold" size={400}>Bảng biến thiên Toán học (Chuẩn SGK & Đề thi THPT)</Text>}
          description={
            <Text size={200}>
              Tùy chỉnh trực tiếp số, dấu mũi tên, dấu 2 gạch dọc (|| cả 2 dòng hoặc || chỉ dòng y'), kết hợp cực trị
            </Text>
          }
        />

        {/* Quick Presets matching standard curriculum and user request */}
        <div>
          <Text size={200} weight="semibold" style={{ color: '#0f6cbd', marginBottom: '4px', display: 'block' }}>
            ⚡ Mẫu hàm số thông dụng (Chọn để áp dụng nhanh):
          </Text>
          <div className={styles.presetsRow}>
            {PRESETS.map((p, idx) => (
              <Button
                key={idx}
                size="small"
                appearance={bbt === p.data ? 'primary' : 'secondary'}
                className={styles.presetButton}
                icon={<Sparkle20Regular />}
                onClick={() => setBbt(p.data)}
                title={p.desc}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Live SVG Vector Variation Table Preview */}
        <Field label="Hình vẽ bảng biến thiên trực quan (Vector SVG nét chuẩn Bộ Giáo Dục):">
          <div className={styles.previewCard}>
            <div
              style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
            <Text size={100} style={{ color: '#777', marginTop: '6px', fontStyle: 'italic' }}>
              Vector SVG chuẩn nét - Không bị nhòe hay vỡ hạt khi phóng to hoặc chèn vào Microsoft Word
            </Text>
          </div>
        </Field>

        {/* SECTION 1: HÀNG X & DẤU 2 GẠCH DỌC */}
        <div className={styles.configSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                1. Hàng giá trị x & Tùy chọn dấu 2 gạch dọc (||)
              </Text>
              <Text size={100} style={{ color: '#666', display: 'block' }}>
                Chọn [Nghiệm 0], [|| Chỉ y'] (liên tục ở y), hoặc [|| Cả 2 dòng] (tiệm cận đứng)
              </Text>
            </div>
            <Button
              size="small"
              appearance="subtle"
              icon={<Add20Regular />}
              onClick={handleAddPoint}
              title="Thêm một mốc điểm x"
            >
              + Thêm điểm x
            </Button>
          </div>

          <div className={styles.pointsGrid}>
            {/* Left Boundary */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '85px', gap: '3px' }}>
              <Text size={100} weight="medium">Biên trái:</Text>
              <Input
                size="small"
                value={bbt.xLeft}
                onChange={(_, d) => setBbt((prev) => ({ ...prev, xLeft: d.value }))}
                style={{ textAlign: 'center' }}
              />
            </div>

            {/* Critical Points */}
            {bbt.points.map((pt, idx) => (
              <div key={pt.id} className={styles.pointCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text size={100} weight="semibold">Điểm x_{idx + 1}:</Text>
                  {bbt.points.length > 1 && (
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Delete20Regular style={{ fontSize: '13px', color: '#c42b1c' }} />}
                      onClick={() => handleRemovePoint(idx)}
                      title="Xóa điểm này"
                    />
                  )}
                </div>

                <Input
                  size="small"
                  value={pt.xVal}
                  onChange={(_, d) => handlePointChange(idx, d.value)}
                  placeholder="Giá trị x"
                  style={{ textAlign: 'center', fontWeight: 'bold' }}
                />

                {/* 3-Way Selector for Bar Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <Button
                    size="small"
                    appearance={
                      pt.barType === 'both' ? 'primary' : (pt.barType === 'yPrimeOnly' ? 'primary' : 'outline')
                    }
                    style={{
                      fontSize: '11px',
                      height: '24px',
                      backgroundColor:
                        pt.barType === 'both' ? '#c42b1c' : (pt.barType === 'yPrimeOnly' ? '#8764b8' : undefined),
                      color: pt.barType !== 'none' ? '#ffffff' : undefined
                    }}
                    onClick={() => handleCycleBarType(idx)}
                    title="Bấm để chuyển đổi giữa: Nghiệm 0 ➔ || Chỉ dòng y' ➔ || Cả 2 dòng"
                  >
                    {pt.barType === 'both'
                      ? '|| Cả 2 dòng'
                      : pt.barType === 'yPrimeOnly'
                      ? '|| Chỉ dòng y\''
                      : 'Nghiệm 0'}
                  </Button>

                  <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                    <Button
                      size="small"
                      appearance={pt.barType === 'none' ? 'secondary' : 'subtle'}
                      style={{ fontSize: '10px', height: '18px', padding: '0 4px' }}
                      onClick={() => handleSetBarType(idx, 'none')}
                    >
                      0
                    </Button>
                    <Button
                      size="small"
                      appearance={pt.barType === 'yPrimeOnly' ? 'secondary' : 'subtle'}
                      style={{ fontSize: '10px', height: '18px', padding: '0 4px', color: '#8764b8', fontWeight: 'bold' }}
                      onClick={() => handleSetBarType(idx, 'yPrimeOnly')}
                    >
                      || y'
                    </Button>
                    <Button
                      size="small"
                      appearance={pt.barType === 'both' ? 'secondary' : 'subtle'}
                      style={{ fontSize: '10px', height: '18px', padding: '0 4px', color: '#c42b1c', fontWeight: 'bold' }}
                      onClick={() => handleSetBarType(idx, 'both')}
                    >
                      || cả
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Right Boundary */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '85px', gap: '3px' }}>
              <Text size={100} weight="medium">Biên phải:</Text>
              <Input
                size="small"
                value={bbt.xRight}
                onChange={(_, d) => setBbt((prev) => ({ ...prev, xRight: d.value }))}
                style={{ textAlign: 'center' }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: HÀNG ĐẠO HÀM Y' & CHIỀU MŨI TÊN HÀNG Y */}
        <div className={styles.configSection}>
          <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
            2. Chiều mũi tên & Giá trị hàng y (Tùy chỉnh trực tiếp từng khoảng)
          </Text>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {bbt.intervals.map((inv, idx) => (
              <div key={inv.id} className={styles.intervalCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text size={100} weight="bold" style={{ color: '#0f6cbd' }}>
                    Khoảng {idx + 1}
                  </Text>
                  <Tooltip content="Bấm để đổi dấu đạo hàm (+ / -)" relationship="label">
                    <Button
                      size="small"
                      appearance="outline"
                      style={{ fontSize: '12px', minWidth: '32px', height: '22px', fontWeight: 'bold' }}
                      onClick={() => handleCycleSign(idx)}
                    >
                      Dấu y': {inv.yPrimeSign}
                    </Button>
                  </Tooltip>
                </div>

                <Divider style={{ margin: '2px 0' }} />

                {/* Arrow Direction Toggle Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text size={100}>Mũi tên:</Text>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={getArrowIcon(inv.arrow)}
                    onClick={() => handleCycleArrow(idx)}
                    style={{ height: '26px' }}
                    title="Bấm để chuyển đổi chiều mũi tên (↗ Tăng / ↘ Giảm / → Ngang / Ẩn)"
                  >
                    {inv.arrow === 'up' ? '↗ Lên' : inv.arrow === 'down' ? '↘ Xuống' : inv.arrow === 'flat' ? '→ Ngang' : 'Ẩn'}
                  </Button>
                </div>

                {/* Start Y Value */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Text size={100} style={{ width: '42px' }}>Đầu:</Text>
                  <Input
                    size="small"
                    value={inv.startVal}
                    onChange={(_, d) => handleYValChange(idx, 'start', d.value)}
                    style={{ flex: 1, textAlign: 'center' }}
                  />
                  <Button
                    size="small"
                    appearance="subtle"
                    style={{ fontSize: '10px', padding: '0 4px', height: '24px' }}
                    onClick={() => {
                      setBbt((prev) => {
                        const newInvs = [...prev.intervals];
                        const nextLevel = newInvs[idx].startLevel === 'bot' ? 'top' : (newInvs[idx].startLevel === 'top' ? 'mid' : 'bot');
                        newInvs[idx] = { ...newInvs[idx], startLevel: nextLevel };
                        return { ...prev, intervals: newInvs };
                      });
                    }}
                    title="Đổi mức độ cao: Trên / Dưới / Giữa"
                  >
                    {inv.startLevel === 'top' ? 'Trên' : inv.startLevel === 'bot' ? 'Dưới' : 'Giữa'}
                  </Button>
                </div>

                {/* End Y Value */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Text size={100} style={{ width: '42px' }}>Cuối:</Text>
                  <Input
                    size="small"
                    value={inv.endVal}
                    onChange={(_, d) => handleYValChange(idx, 'end', d.value)}
                    style={{ flex: 1, textAlign: 'center' }}
                  />
                  <Button
                    size="small"
                    appearance="subtle"
                    style={{ fontSize: '10px', padding: '0 4px', height: '24px' }}
                    onClick={() => {
                      setBbt((prev) => {
                        const newInvs = [...prev.intervals];
                        const nextLevel = newInvs[idx].endLevel === 'top' ? 'bot' : (newInvs[idx].endLevel === 'bot' ? 'mid' : 'top');
                        newInvs[idx] = { ...newInvs[idx], endLevel: nextLevel };
                        return { ...prev, intervals: newInvs };
                      });
                    }}
                    title="Đổi mức độ cao: Trên / Dưới / Giữa"
                  >
                    {inv.endLevel === 'top' ? 'Trên' : inv.endLevel === 'bot' ? 'Dưới' : 'Giữa'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: TÙY CHỌN TÊN NHÃN */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text size={200} weight="semibold">Nhãn hiển thị:</Text>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Text size={200}>Hàng 1:</Text>
            <Input
              size="small"
              value={bbt.xLabel}
              onChange={(_, d) => setBbt((prev) => ({ ...prev, xLabel: d.value }))}
              style={{ width: '55px', textAlign: 'center' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Text size={200}>Hàng 2:</Text>
            <Input
              size="small"
              value={bbt.yPrimeLabel}
              onChange={(_, d) => setBbt((prev) => ({ ...prev, yPrimeLabel: d.value }))}
              style={{ width: '65px', textAlign: 'center' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Text size={200}>Hàng 3:</Text>
            <Input
              size="small"
              value={bbt.yLabel}
              onChange={(_, d) => setBbt((prev) => ({ ...prev, yLabel: d.value }))}
              style={{ width: '65px', textAlign: 'center' }}
            />
          </div>
          <Button
            size="small"
            appearance="subtle"
            icon={<ArrowReset20Regular />}
            onClick={() => setBbt(PRESETS[0].data)}
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
            Chèn bảng biến thiên vào Word
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
