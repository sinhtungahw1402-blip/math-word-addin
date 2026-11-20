import React, { useState, useMemo } from 'react';
import {
  Text,
  Button,
  Field,
  Input,
  Select,
  Switch,
  Badge,
  makeStyles,
  shorthands
} from '@fluentui/react-components';
import {
  Add20Regular,
  Delete20Regular,
  ArrowReset20Regular,
  Dismiss20Regular,
  Checkmark20Regular
} from '@fluentui/react-icons';
import {
  ExtraPoint,
  ExtraLine,
  ExtraShape,
  ExtraPointType,
  ExtraLineType,
  ExtraShapeType
} from '../services/geometryUtils';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    marginTop: '10px'
  },
  card: {
    backgroundColor: '#fbfcfd',
    ...shorthands.border('1px', 'solid', '#d0d7de'),
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('10px')
  },
  btnRow: {
    display: 'flex',
    ...shorthands.gap('6px'),
    flexWrap: 'wrap',
    marginTop: '6px',
    marginBottom: '8px'
  },
  formBox: {
    backgroundColor: '#ffffff',
    ...shorthands.padding('10px'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'solid', '#0f6cbd'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    marginBottom: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('8px')
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    ...shorthands.gap('6px')
  },
  elementItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    ...shorthands.padding('6px', '10px'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'solid', '#e1dfdd'),
    fontSize: '12px',
    marginBottom: '4px'
  },
  colorOption: {
    width: '18px',
    height: '18px',
    ...shorthands.borderRadius('50%'),
    cursor: 'pointer',
    display: 'inline-block',
    ...shorthands.border('2px', 'solid', 'transparent')
  }
});

interface GeometryCustomElementsCardProps {
  is3D?: boolean;
  availablePoints: { id: string; label: string }[];
  extraPoints: ExtraPoint[];
  extraLines: ExtraLine[];
  extraShapes: ExtraShape[];
  onAddPoint: (pt: ExtraPoint) => void;
  onRemovePoint: (id: string) => void;
  onAddLine: (line: ExtraLine) => void;
  onRemoveLine: (id: string) => void;
  onAddShape: (shape: ExtraShape) => void;
  onRemoveShape: (id: string) => void;
  onClearAll: () => void;
}

const COLOR_PALETTE = [
  { label: 'Đỏ', hex: '#d13438' },
  { label: 'Xanh dương', hex: '#0f6cbd' },
  { label: 'Xanh lá', hex: '#107c41' },
  { label: 'Cam', hex: '#d83b01' },
  { label: 'Tím', hex: '#881798' },
  { label: 'Đen', hex: '#242424' }
];

export const GeometryCustomElementsCard: React.FC<GeometryCustomElementsCardProps> = ({
  is3D = false,
  availablePoints,
  extraPoints,
  extraLines,
  extraShapes,
  onAddPoint,
  onRemovePoint,
  onAddLine,
  onRemoveLine,
  onAddShape,
  onRemoveShape,
  onClearAll
}) => {
  const styles = useStyles();

  // Active form mode: null | 'point' | 'intersection' | 'line' | 'shape'
  const [activeForm, setActiveForm] = useState<'point' | 'intersection' | 'line' | 'shape' | null>(null);

  // Default selectable point keys
  const defaultP1 = availablePoints[0]?.id || 'A';
  const defaultP2 = availablePoints[1]?.id || availablePoints[0]?.id || 'B';
  const defaultP3 = availablePoints[2]?.id || availablePoints[0]?.id || 'C';

  // Point Form State
  const [ptLabel, setPtLabel] = useState<string>('M');
  const [ptType, setPtType] = useState<ExtraPointType>('midpoint');
  const [pt1, setPt1] = useState<string>(defaultP1);
  const [pt2, setPt2] = useState<string>(defaultP2);
  const [pt3, setPt3] = useState<string>(defaultP3);
  const [ptFrom, setPtFrom] = useState<string>(defaultP1);
  const [ptOnto1, setPtOnto1] = useState<string>(defaultP2);
  const [ptOnto2, setPtOnto2] = useState<string>(defaultP3);
  const [ptL1P1, setPtL1P1] = useState<string>(defaultP1);
  const [ptL1P2, setPtL1P2] = useState<string>(defaultP2);
  const [ptL2P1, setPtL2P1] = useState<string>(defaultP3);
  const [ptL2P2, setPtL2P2] = useState<string>(availablePoints[3]?.id || defaultP1);
  const [ptRatio, setPtRatio] = useState<number>(0.5);
  const [ptColor, setPtColor] = useState<string>('#d13438');

  // Dedicated Intersection Form State
  const [interLabel, setInterLabel] = useState<string>('N');
  const [interColor, setInterColor] = useState<string>('#d13438');
  const [interMode, setInterMode] = useState<'existing_lines' | 'two_points'>('existing_lines');
  const [interLine1Key, setInterLine1Key] = useState<string>('');
  const [interLine2Key, setInterLine2Key] = useState<string>('');
  const [interP1, setInterP1] = useState<string>(defaultP1);
  const [interP2, setInterP2] = useState<string>(defaultP2);
  const [interP3, setInterP3] = useState<string>(defaultP3);
  const [interP4, setInterP4] = useState<string>(availablePoints[3]?.id || defaultP1);

  // Line Form State
  const [lineType, setLineType] = useState<ExtraLineType>('segment');
  const [lineP1, setLineP1] = useState<string>(defaultP1);
  const [lineP2, setLineP2] = useState<string>(defaultP2);
  const [lineRefP1, setLineRefP1] = useState<string>(defaultP2);
  const [lineRefP2, setLineRefP2] = useState<string>(defaultP3);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>(is3D ? 'dashed' : 'solid');
  const [lineColor, setLineColor] = useState<string>('#d13438');
  const [lineLength, setLineLength] = useState<number>(85);
  const [lineRightAngle, setLineRightAngle] = useState<boolean>(true);

  // Shape Form State
  const [shapeType, setShapeType] = useState<ExtraShapeType>(is3D ? 'polygon_cross_section' : 'circle_center_point');
  const [shapeCenter, setShapeCenter] = useState<string>(defaultP1);
  const [shapeThrough, setShapeThrough] = useState<string>(defaultP2);
  const [shapeRadius, setShapeRadius] = useState<number>(45);
  const [shapePtsText, setShapePtsText] = useState<string>(
    availablePoints.slice(0, 3).map(p => p.id).join(' ')
  );
  const [shapeStyle, setShapeStyle] = useState<'solid' | 'dashed'>('solid');
  const [shapeColor, setShapeColor] = useState<string>('#0f6cbd');

  const totalElements = extraPoints.length + extraLines.length + extraShapes.length;

  // Available lines across the figure (base shape edges + user-drawn lines)
  const availableLineItems = useMemo(() => {
    const items: { id: string; label: string; p1?: string; p2?: string; lineId?: string }[] = [];
    // 1. Base shape edges
    for (let i = 0; i < availablePoints.length; i++) {
      for (let j = i + 1; j < availablePoints.length; j++) {
        const pA = availablePoints[i];
        const pB = availablePoints[j];
        items.push({
          id: `edge_${pA.id}_${pB.id}`,
          label: `Cạnh / Đoạn ${pA.label}${pB.label}`,
          p1: pA.id,
          p2: pB.id
        });
      }
    }
    // 2. Extra lines added by user
    for (const l of extraLines) {
      let desc = '';
      if (l.type === 'segment') desc = `Đoạn thẳng ${l.p1}${l.p2}`;
      else if (l.type === 'line') desc = `Đường thẳng qua ${l.p1}, ${l.p2}`;
      else if (l.type === 'parallel') desc = `Đường qua ${l.p1} // ${l.refLineP1}${l.refLineP2}`;
      else if (l.type === 'perpendicular') desc = `Đường qua ${l.p1} ⊥ ${l.refLineP1}${l.refLineP2}`;
      items.push({
        id: `line_${l.id}`,
        label: desc,
        lineId: l.id
      });
    }
    return items;
  }, [availablePoints, extraLines]);

  // Auto increment point label
  const suggestNextLabel = () => {
    const commonLabels = ['M', 'N', 'P', 'Q', 'I', 'K', 'H', 'G', 'E', 'F', 'J', 'O'];
    const usedLabels = new Set([...availablePoints.map(p => p.label), ...extraPoints.map(p => p.label)]);
    for (const l of commonLabels) {
      if (!usedLabels.has(l)) return l;
    }
    return `P${extraPoints.length + 1}`;
  };

  const handleOpenPointForm = () => {
    setPtLabel(suggestNextLabel());
    setActiveForm('point');
  };

  const handleOpenIntersectionForm = () => {
    setInterLabel(suggestNextLabel());
    if (availableLineItems.length >= 2) {
      const extraItem = availableLineItems.find(x => x.lineId);
      const firstId = extraItem ? extraItem.id : availableLineItems[0].id;
      setInterLine1Key(firstId);
      const secondItem = availableLineItems.find(x => x.id !== firstId);
      if (secondItem) setInterLine2Key(secondItem.id);
    }
    setActiveForm('intersection');
  };

  const handleCreatePoint = () => {
    const id = `pt_${Date.now()}`;
    const cleanLabel = ptLabel.trim() || 'M';
    const newPt: ExtraPoint = {
      id,
      label: cleanLabel,
      type: ptType,
      color: ptColor,
      pt1,
      pt2,
      pt3,
      fromPt: ptFrom,
      ontoLineP1: ptOnto1,
      ontoLineP2: ptOnto2,
      line1P1: ptL1P1,
      line1P2: ptL1P2,
      line2P1: ptL2P1,
      line2P2: ptL2P2,
      ratio: ptRatio,
      labelOffset: { x: 7, y: -7 }
    };
    onAddPoint(newPt);
    setActiveForm(null);
  };

  const handleCreateIntersection = () => {
    const id = `pt_${Date.now()}`;
    const cleanLabel = interLabel.trim() || suggestNextLabel();

    let newPt: ExtraPoint;
    if (interMode === 'existing_lines') {
      const l1Item = availableLineItems.find(x => x.id === interLine1Key);
      const l2Item = availableLineItems.find(x => x.id === interLine2Key);

      newPt = {
        id,
        label: cleanLabel,
        type: 'intersection',
        color: interColor,
        line1Id: l1Item?.lineId,
        line1P1: l1Item?.p1,
        line1P2: l1Item?.p2,
        line2Id: l2Item?.lineId,
        line2P1: l2Item?.p1,
        line2P2: l2Item?.p2,
        labelOffset: { x: 7, y: -7 }
      };
    } else {
      newPt = {
        id,
        label: cleanLabel,
        type: 'intersection',
        color: interColor,
        line1P1: interP1,
        line1P2: interP2,
        line2P1: interP3,
        line2P2: interP4,
        labelOffset: { x: 7, y: -7 }
      };
    }

    onAddPoint(newPt);
    setActiveForm(null);
  };

  const handleCreateLine = () => {
    const id = `line_${Date.now()}`;
    const newLine: ExtraLine = {
      id,
      type: lineType,
      p1: lineP1,
      p2: lineP2,
      refLineP1: lineRefP1,
      refLineP2: lineRefP2,
      style: lineStyle,
      color: lineColor,
      strokeWidth: 1.8,
      length: lineLength,
      hasRightAngle: lineRightAngle
    };
    onAddLine(newLine);
    setActiveForm(null);
  };

  const handleCreateShape = () => {
    const id = `shape_${Date.now()}`;
    const parsedPts = shapePtsText
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const newShape: ExtraShape = {
      id,
      type: shapeType,
      center: shapeCenter,
      through: shapeThrough,
      radius: Number(shapeRadius) || 45,
      pts: parsedPts,
      style: shapeStyle,
      color: shapeColor,
      fill: shapeType === 'polygon_cross_section' ? 'rgba(209, 52, 56, 0.20)' : 'none',
      strokeWidth: 1.6
    };
    onAddShape(newShape);
    setActiveForm(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
              📐 Vẽ thêm yếu tố hình học
            </Text>
            {totalElements > 0 && (
              <Badge appearance="filled" color="brand" size="small">
                {totalElements}
              </Badge>
            )}
          </div>
          {totalElements > 0 && (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowReset20Regular />}
              onClick={onClearAll}
              style={{ color: '#d13438', fontSize: '11px' }}
            >
              Xóa tất cả yếu tố thêm
            </Button>
          )}
        </div>

        <Text size={200} style={{ color: '#605e5c', marginTop: '2px', display: 'block' }}>
          Tạo điểm đặc biệt (trung điểm, trọng tâm, chân đường cao) &amp; kẻ đường nối, song song, vuông góc, {is3D ? 'thiết diện mặt phẳng' : 'đường tròn'}.
        </Text>

        {/* Action Buttons to open creators */}
        <div className={styles.btnRow}>
          <Button
            size="small"
            appearance={activeForm === 'point' ? 'primary' : 'outline'}
            icon={<Add20Regular />}
            onClick={() => (activeForm === 'point' ? setActiveForm(null) : handleOpenPointForm())}
          >
            + Thêm điểm đặc biệt
          </Button>

          <Button
            size="small"
            appearance={activeForm === 'line' ? 'primary' : 'outline'}
            icon={<Add20Regular />}
            onClick={() => setActiveForm(activeForm === 'line' ? null : 'line')}
          >
            + Kẻ đoạn / đường thẳng
          </Button>

          <Button
            size="small"
            appearance={activeForm === 'intersection' ? 'primary' : 'outline'}
            icon={<Add20Regular />}
            onClick={() => (activeForm === 'intersection' ? setActiveForm(null) : handleOpenIntersectionForm())}
            style={{ fontWeight: 600 }}
          >
            + Giao điểm 2 đường
          </Button>

          <Button
            size="small"
            appearance={activeForm === 'shape' ? 'primary' : 'outline'}
            icon={<Add20Regular />}
            onClick={() => setActiveForm(activeForm === 'shape' ? null : 'shape')}
          >
            {is3D ? '+ Vẽ thiết diện (Mặt cắt)' : '+ Thêm đường tròn'}
          </Button>
        </div>

        {/* ---------------- 1. FORM THÊM ĐIỂM ĐẶC BIỆT ---------------- */}
        {activeForm === 'point' && (
          <div className={styles.formBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="bold" size={300} style={{ color: '#0f6cbd' }}>
                ⭐ Tạo điểm đặc biệt mới
              </Text>
              <Button size="small" appearance="subtle" icon={<Dismiss20Regular />} onClick={() => setActiveForm(null)} />
            </div>

            <div className={styles.grid2}>
              <Field label="Tên điểm (Nhãn)" size="small">
                <Input value={ptLabel} onChange={(_, d) => setPtLabel(d.value)} style={{ width: '80px' }} />
              </Field>

              <Field label="Màu sắc điểm" size="small">
                <Select value={ptColor} onChange={(_, d) => setPtColor(d.value)}>
                  {COLOR_PALETTE.map(c => (
                    <option key={c.hex} value={c.hex}>{c.label}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Loại điểm đặc biệt" size="small">
              <Select value={ptType} onChange={(_, d) => setPtType(d.value as ExtraPointType)}>
                <option value="midpoint">1. Trung điểm của đoạn thẳng</option>
                <option value="centroid">2. Trọng tâm tam giác (G)</option>
                <option value="projection">3. Chân đường cao / Hình chiếu vuông góc (H ⊥ d)</option>
                <option value="orthocenter">4. Trực tâm tam giác (H)</option>
                <option value="circumcenter">5. Tâm đường tròn ngoại tiếp (O)</option>
                <option value="incenter">6. Tâm đường tròn nội tiếp (I)</option>
                <option value="ratio">7. Điểm chia đoạn thẳng theo tỉ lệ k</option>
                <option value="intersection">8. Giao điểm 2 đường thẳng</option>
                <option value="free">9. Điểm tự do trên hình</option>
              </Select>
            </Field>

            {/* Dynamic fields based on point type */}
            {ptType === 'midpoint' && (
              <div className={styles.grid2}>
                <Field label="Trung điểm của: Đỉnh 1" size="small">
                  <Select value={pt1} onChange={(_, d) => setPt1(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Đỉnh 2" size="small">
                  <Select value={pt2} onChange={(_, d) => setPt2(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {(ptType === 'centroid' || ptType === 'orthocenter' || ptType === 'circumcenter' || ptType === 'incenter') && (
              <div className={styles.grid3}>
                <Field label="Đỉnh 1" size="small">
                  <Select value={pt1} onChange={(_, d) => setPt1(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Đỉnh 2" size="small">
                  <Select value={pt2} onChange={(_, d) => setPt2(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Đỉnh 3" size="small">
                  <Select value={pt3} onChange={(_, d) => setPt3(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {ptType === 'projection' && (
              <div className={styles.grid3}>
                <Field label="Từ điểm" size="small">
                  <Select value={ptFrom} onChange={(_, d) => setPtFrom(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Chiếu lên đoạn: Đầu 1" size="small">
                  <Select value={ptOnto1} onChange={(_, d) => setPtOnto1(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Đầu 2" size="small">
                  <Select value={ptOnto2} onChange={(_, d) => setPtOnto2(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {ptType === 'ratio' && (
              <div className={styles.grid3}>
                <Field label="Đoạn thẳng: Điểm 1" size="small">
                  <Select value={pt1} onChange={(_, d) => setPt1(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Điểm 2" size="small">
                  <Select value={pt2} onChange={(_, d) => setPt2(d.value)}>
                    {availablePoints.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tỉ lệ k (0.33, 0.5, 0.67...)" size="small">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.05"
                    max="0.95"
                    value={String(ptRatio)}
                    onChange={(_, d) => setPtRatio(Number(d.value) || 0.5)}
                  />
                </Field>
              </div>
            )}

            {ptType === 'intersection' && (
              <div className={styles.grid2}>
                <div>
                  <Text size={200} weight="semibold">Đường thẳng 1 qua 2 điểm:</Text>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Select value={ptL1P1} onChange={(_, d) => setPtL1P1(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                    <Select value={ptL1P2} onChange={(_, d) => setPtL1P2(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Text size={200} weight="semibold">Đường thẳng 2 qua 2 điểm:</Text>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Select value={ptL2P1} onChange={(_, d) => setPtL2P1(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                    <Select value={ptL2P2} onChange={(_, d) => setPtL2P2(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              <Button size="small" appearance="subtle" onClick={() => setActiveForm(null)}>Hủy</Button>
              <Button size="small" appearance="primary" icon={<Checkmark20Regular />} onClick={handleCreatePoint}>
                Tạo điểm {ptLabel}
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- 1b. FORM TÌM & VẼ GIAO ĐIỂM 2 ĐƯỜNG ---------------- */}
        {activeForm === 'intersection' && (
          <div className={styles.formBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="bold" size={300} style={{ color: '#0f6cbd' }}>
                ✖ Tìm &amp; vẽ giao điểm của 2 đường thẳng
              </Text>
              <Button size="small" appearance="subtle" icon={<Dismiss20Regular />} onClick={() => setActiveForm(null)} />
            </div>

            <div className={styles.grid2}>
              <Field label="Tên điểm giao (Nhãn)" size="small">
                <Input value={interLabel} onChange={(_, d) => setInterLabel(d.value)} style={{ width: '80px' }} />
              </Field>

              <Field label="Màu sắc điểm" size="small">
                <Select value={interColor} onChange={(_, d) => setInterColor(d.value)}>
                  {COLOR_PALETTE.map(c => (
                    <option key={c.hex} value={c.hex}>{c.label}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Cách chọn 2 đường thẳng" size="small">
              <Select value={interMode} onChange={(_, d) => setInterMode(d.value as any)}>
                <option value="existing_lines">1. Chọn trực tiếp từ các cạnh &amp; đường đã vẽ (Dễ nhất)</option>
                <option value="two_points">2. Chọn thủ công qua 4 điểm (Đường 1 qua 2 điểm, Đường 2 qua 2 điểm)</option>
              </Select>
            </Field>

            {interMode === 'existing_lines' ? (
              <div className={styles.grid2}>
                <Field label="Đường thẳng thứ nhất" size="small">
                  <Select value={interLine1Key} onChange={(_, d) => setInterLine1Key(d.value)}>
                    {availableLineItems.map(item => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Đường thẳng thứ hai" size="small">
                  <Select value={interLine2Key} onChange={(_, d) => setInterLine2Key(d.value)}>
                    {availableLineItems.map(item => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : (
              <div className={styles.grid2}>
                <div>
                  <Text size={200} weight="semibold">Đường 1 qua 2 điểm:</Text>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Select value={interP1} onChange={(_, d) => setInterP1(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                    <Select value={interP2} onChange={(_, d) => setInterP2(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Text size={200} weight="semibold">Đường 2 qua 2 điểm:</Text>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Select value={interP3} onChange={(_, d) => setInterP3(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                    <Select value={interP4} onChange={(_, d) => setInterP4(d.value)}>
                      {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              <Button size="small" appearance="subtle" onClick={() => setActiveForm(null)}>Hủy</Button>
              <Button size="small" appearance="primary" icon={<Checkmark20Regular />} onClick={handleCreateIntersection}>
                Tạo giao điểm {interLabel}
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- 2. FORM KẺ ĐOẠN / ĐƯỜNG THẲNG ---------------- */}
        {activeForm === 'line' && (
          <div className={styles.formBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="bold" size={300} style={{ color: '#0f6cbd' }}>
                📏 Kẻ đoạn / đường thẳng mới
              </Text>
              <Button size="small" appearance="subtle" icon={<Dismiss20Regular />} onClick={() => setActiveForm(null)} />
            </div>

            <div className={styles.grid2}>
              <Field label="Loại đường" size="small">
                <Select value={lineType} onChange={(_, d) => setLineType(d.value as ExtraLineType)}>
                  <option value="segment">1. Đoạn thẳng nối 2 điểm</option>
                  <option value="line">2. Đường thẳng kéo dài qua 2 điểm</option>
                  <option value="parallel">3. Qua 1 điểm song song (//) với đường khác</option>
                  <option value="perpendicular">4. Qua 1 điểm vuông góc (⊥) với đường khác</option>
                </Select>
              </Field>

              <Field label="Kiểu nét vẽ" size="small">
                <Select value={lineStyle} onChange={(_, d) => setLineStyle(d.value as 'solid' | 'dashed')}>
                  <option value="solid">Nét liền (Thấy rõ)</option>
                  <option value="dashed">Nét đứt (Khuất / Đường phụ)</option>
                </Select>
              </Field>
            </div>

            {/* Selecting points for line */}
            {(lineType === 'segment' || lineType === 'line') && (
              <div className={styles.grid2}>
                <Field label="Từ điểm" size="small">
                  <Select value={lineP1} onChange={(_, d) => setLineP1(d.value)}>
                    {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </Select>
                </Field>
                <Field label="Đến điểm" size="small">
                  <Select value={lineP2} onChange={(_, d) => setLineP2(d.value)}>
                    {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </Select>
                </Field>
              </div>
            )}

            {(lineType === 'parallel' || lineType === 'perpendicular') && (
              <div className={styles.grid3}>
                <Field label="Đi qua điểm" size="small">
                  <Select value={lineP1} onChange={(_, d) => setLineP1(d.value)}>
                    {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </Select>
                </Field>
                <Field label={lineType === 'parallel' ? 'Song song // với: Đỉnh 1' : 'Vuông góc ⊥ với: Đỉnh 1'} size="small">
                  <Select value={lineRefP1} onChange={(_, d) => setLineRefP1(d.value)}>
                    {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </Select>
                </Field>
                <Field label="Đỉnh 2" size="small">
                  <Select value={lineRefP2} onChange={(_, d) => setLineRefP2(d.value)}>
                    {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </Select>
                </Field>
              </div>
            )}

            <div className={styles.grid2}>
              <Field label="Màu sắc đường" size="small">
                <Select value={lineColor} onChange={(_, d) => setLineColor(d.value)}>
                  {COLOR_PALETTE.map(c => (<option key={c.hex} value={c.hex}>{c.label}</option>))}
                </Select>
              </Field>

              {(lineType === 'parallel' || lineType === 'perpendicular') && (
                <Field label="Độ dài đường vẽ" size="small">
                  <Select value={String(lineLength)} onChange={(_, d) => setLineLength(Number(d.value) || 85)}>
                    <option value="60">Ngắn (60px)</option>
                    <option value="85">Vừa phải (85px - Khuyên dùng)</option>
                    <option value="120">Dài (120px)</option>
                    <option value="160">Rất dài (160px)</option>
                  </Select>
                </Field>
              )}
            </div>

            {lineType === 'perpendicular' && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', marginBottom: '4px' }}>
                <Switch
                  checked={lineRightAngle}
                  onChange={(_, d) => setLineRightAngle(d.checked)}
                  label="Vẽ ký hiệu góc vuông (∟)"
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              <Button size="small" appearance="subtle" onClick={() => setActiveForm(null)}>Hủy</Button>
              <Button size="small" appearance="primary" icon={<Checkmark20Regular />} onClick={handleCreateLine}>
                Kẻ đường thẳng
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- 3. FORM THÊM ĐƯỜNG TRÒN / THIẾT DIỆN ---------------- */}
        {activeForm === 'shape' && (
          <div className={styles.formBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="bold" size={300} style={{ color: '#0f6cbd' }}>
                {is3D ? '⬠ Vẽ thiết diện mặt phẳng (Mặt cắt 3D)' : '⭕ Thêm đường tròn mới'}
              </Text>
              <Button size="small" appearance="subtle" icon={<Dismiss20Regular />} onClick={() => setActiveForm(null)} />
            </div>

            {is3D ? (
              <>
                <Field label="Các đỉnh của thiết diện (cách nhau dấu cách, ví dụ: M N P hoặc M N P Q)" size="small">
                  <Input value={shapePtsText} onChange={(_, d) => setShapePtsText(d.value)} />
                </Field>
                <div className={styles.grid2}>
                  <Field label="Kiểu đường viền" size="small">
                    <Select value={shapeStyle} onChange={(_, d) => setShapeStyle(d.value as 'solid' | 'dashed')}>
                      <option value="solid">Nét liền</option>
                      <option value="dashed">Nét đứt</option>
                    </Select>
                  </Field>
                  <Field label="Màu sắc thiết diện" size="small">
                    <Select value={shapeColor} onChange={(_, d) => setShapeColor(d.value)}>
                      {COLOR_PALETTE.map(c => (<option key={c.hex} value={c.hex}>{c.label}</option>))}
                    </Select>
                  </Field>
                </div>
              </>
            ) : (
              <>
                <Field label="Loại đường tròn" size="small">
                  <Select value={shapeType} onChange={(_, d) => setShapeType(d.value as ExtraShapeType)}>
                    <option value="circle_center_point">Tâm tại 1 điểm và đi qua 1 điểm</option>
                    <option value="circle_center_radius">Tâm tại 1 điểm với bán kính R</option>
                    <option value="circumcircle">Đường tròn ngoại tiếp tam giác (3 đỉnh)</option>
                    <option value="incircle">Đường tròn nội tiếp tam giác (3 đỉnh)</option>
                  </Select>
                </Field>

                {shapeType === 'circle_center_point' && (
                  <div className={styles.grid2}>
                    <Field label="Tâm đường tròn" size="small">
                      <Select value={shapeCenter} onChange={(_, d) => setShapeCenter(d.value)}>
                        {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                      </Select>
                    </Field>
                    <Field label="Đi qua điểm" size="small">
                      <Select value={shapeThrough} onChange={(_, d) => setShapeThrough(d.value)}>
                        {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                      </Select>
                    </Field>
                  </div>
                )}

                {shapeType === 'circle_center_radius' && (
                  <div className={styles.grid2}>
                    <Field label="Tâm đường tròn" size="small">
                      <Select value={shapeCenter} onChange={(_, d) => setShapeCenter(d.value)}>
                        {availablePoints.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                      </Select>
                    </Field>
                    <Field label="Bán kính R (px)" size="small">
                      <Input
                        type="number"
                        min="10"
                        max="150"
                        value={String(shapeRadius)}
                        onChange={(_, d) => setShapeRadius(Number(d.value) || 40)}
                      />
                    </Field>
                  </div>
                )}

                {(shapeType === 'circumcircle' || shapeType === 'incircle') && (
                  <Field label="3 đỉnh tam giác (cách nhau dấu cách, ví dụ: A B C)" size="small">
                    <Input value={shapePtsText} onChange={(_, d) => setShapePtsText(d.value)} />
                  </Field>
                )}

                <div className={styles.grid2}>
                  <Field label="Kiểu nét vẽ" size="small">
                    <Select value={shapeStyle} onChange={(_, d) => setShapeStyle(d.value as 'solid' | 'dashed')}>
                      <option value="solid">Nét liền</option>
                      <option value="dashed">Nét đứt</option>
                    </Select>
                  </Field>
                  <Field label="Màu sắc" size="small">
                    <Select value={shapeColor} onChange={(_, d) => setShapeColor(d.value)}>
                      {COLOR_PALETTE.map(c => (<option key={c.hex} value={c.hex}>{c.label}</option>))}
                    </Select>
                  </Field>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              <Button size="small" appearance="subtle" onClick={() => setActiveForm(null)}>Hủy</Button>
              <Button size="small" appearance="primary" icon={<Checkmark20Regular />} onClick={handleCreateShape}>
                {is3D ? 'Vẽ thiết diện' : 'Vẽ đường tròn'}
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- DANH SÁCH CÁC YẾU TỐ ĐÃ VẼ THÊM ---------------- */}
        {totalElements === 0 ? (
          <div style={{ fontSize: '11px', color: '#8a8886', textAlign: 'center', padding: '6px 0', fontStyle: 'italic' }}>
            Chưa có yếu tố thêm nào trên hình.
          </div>
        ) : (
          <div style={{ marginTop: '6px' }}>
            {/* Extra Points List */}
            {extraPoints.map(p => {
              let desc = '';
              if (p.type === 'midpoint') desc = `Trung điểm ${p.pt1}${p.pt2}`;
              else if (p.type === 'centroid') desc = `Trọng tâm ${p.pt1}${p.pt2}${p.pt3}`;
              else if (p.type === 'orthocenter') desc = `Trực tâm ${p.pt1}${p.pt2}${p.pt3}`;
              else if (p.type === 'circumcenter') desc = `Tâm ngoại tiếp ${p.pt1}${p.pt2}${p.pt3}`;
              else if (p.type === 'incenter') desc = `Tâm nội tiếp ${p.pt1}${p.pt2}${p.pt3}`;
              else if (p.type === 'projection') desc = `Hình chiếu từ ${p.fromPt} ⊥ ${p.ontoLineP1}${p.ontoLineP2}`;
              else if (p.type === 'ratio') desc = `Điểm trên ${p.pt1}${p.pt2} (tỉ lệ ${p.ratio})`;
              else if (p.type === 'intersection') {
                if (p.line1Id || p.line2Id) {
                  const l1 = extraLines.find(x => x.id === p.line1Id);
                  const l2 = extraLines.find(x => x.id === p.line2Id);
                  const l1Name = l1 ? (l1.type === 'perpendicular' ? `(Đường qua ${l1.p1} ⊥ ${l1.refLineP1}${l1.refLineP2})` : `(Đường qua ${l1.p1} // ${l1.refLineP1}${l1.refLineP2})`) : (p.line1P1 && p.line1P2 ? `${p.line1P1}${p.line1P2}` : 'Đường 1');
                  const l2Name = l2 ? (l2.type === 'perpendicular' ? `(Đường qua ${l2.p1} ⊥ ${l2.refLineP1}${l2.refLineP2})` : `(Đường qua ${l2.p1} // ${l2.refLineP1}${l2.refLineP2})`) : (p.line2P1 && p.line2P2 ? `${p.line2P1}${p.line2P2}` : 'Đường 2');
                  desc = `Giao điểm ${l1Name} ∩ ${l2Name}`;
                } else {
                  desc = `Giao điểm ${p.line1P1}${p.line1P2} ∩ ${p.line2P1}${p.line2P2}`;
                }
              }
              else desc = 'Điểm tự do';

              return (
                <div key={p.id} className={styles.elementItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color || '#d13438' }} />
                    <Text weight="semibold">Điểm {p.label}:</Text>
                    <span style={{ color: '#605e5c' }}>{desc}</span>
                  </div>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Delete20Regular />}
                    onClick={() => onRemovePoint(p.id)}
                    style={{ color: '#d13438' }}
                  />
                </div>
              );
            })}

            {/* Extra Lines List */}
            {extraLines.map(l => {
              let desc = '';
              if (l.type === 'segment') desc = `Đoạn ${l.p1}${l.p2}`;
              else if (l.type === 'line') desc = `Đường thẳng qua ${l.p1}, ${l.p2}`;
              else if (l.type === 'parallel') desc = `Đường qua ${l.p1} // ${l.refLineP1}${l.refLineP2}`;
              else if (l.type === 'perpendicular') desc = `Đường qua ${l.p1} ⊥ ${l.refLineP1}${l.refLineP2} ${l.hasRightAngle ? '(∟)' : ''}`;

              return (
                <div key={l.id} className={styles.elementItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '14px',
                      height: '2px',
                      backgroundColor: l.color || '#d13438',
                      borderTop: l.style === 'dashed' ? '1px dashed' : 'none'
                    }} />
                    <Text weight="semibold">{desc}</Text>
                    <Badge size="small" appearance="outline" color={l.style === 'dashed' ? 'informative' : 'brand'}>
                      {l.style === 'dashed' ? 'Nét đứt' : 'Nét liền'}
                    </Badge>
                  </div>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Delete20Regular />}
                    onClick={() => onRemoveLine(l.id)}
                    style={{ color: '#d13438' }}
                  />
                </div>
              );
            })}

            {/* Extra Shapes List */}
            {extraShapes.map(s => {
              let desc = '';
              if (s.type === 'polygon_cross_section') desc = `Thiết diện (${(s.pts || []).join('-')})`;
              else if (s.type === 'circle_center_point') desc = `Đường tròn tâm ${s.center} qua ${s.through}`;
              else if (s.type === 'circle_center_radius') desc = `Đường tròn tâm ${s.center} (R=${s.radius}px)`;
              else if (s.type === 'circumcircle') desc = `Đường tròn ngoại tiếp (${(s.pts || []).join(' ')})`;
              else if (s.type === 'incircle') desc = `Đường tròn nội tiếp (${(s.pts || []).join(' ')})`;

              return (
                <div key={s.id} className={styles.elementItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: s.type === 'polygon_cross_section' ? '2px' : '50%', border: `1.5px solid ${s.color || '#0f6cbd'}` }} />
                    <Text weight="semibold">{desc}</Text>
                    <Badge size="small" appearance="outline" color={s.style === 'dashed' ? 'informative' : 'brand'}>
                      {s.style === 'dashed' ? 'Nét đứt' : 'Nét liền'}
                    </Badge>
                  </div>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Delete20Regular />}
                    onClick={() => onRemoveShape(s.id)}
                    style={{ color: '#d13438' }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
