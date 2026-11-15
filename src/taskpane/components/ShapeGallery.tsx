import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Badge,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { Grid24Regular } from '@fluentui/react-icons';
import { insertTextAtCursor } from '../services/wordService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('14px'),
    ...shorthands.padding('4px')
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    marginTop: '6px',
    marginBottom: '4px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    ...shorthands.gap('6px')
  },
  symbolBtn: {
    fontFamily: 'Cambria Math, "Times New Roman", serif',
    fontSize: '16px',
    minHeight: '36px',
    padding: '4px 6px'
  }
});

interface SymbolCategory {
  title: string;
  items: { label: string; insertValue: string }[];
}

const CATEGORIES: SymbolCategory[] = [
  {
    title: 'Ký hiệu quan hệ & Logic',
    items: [
      { label: '⊥', insertValue: ' ⊥ ' },
      { label: '∥', insertValue: ' ∥ ' },
      { label: '∈', insertValue: ' ∈ ' },
      { label: '∉', insertValue: ' ∉ ' },
      { label: '⊂', insertValue: ' ⊂ ' },
      { label: '∪', insertValue: ' ∪ ' },
      { label: '∩', insertValue: ' ∩ ' },
      { label: '∅', insertValue: '∅' },
      { label: '⇒', insertValue: ' ⇒ ' },
      { label: '⇔', insertValue: ' ⇔ ' },
      { label: '∀', insertValue: '∀' },
      { label: '∃', insertValue: '∃' }
    ]
  },
  {
    title: 'Ký hiệu Vectơ & Góc',
    items: [
      { label: 'u⃗', insertValue: 'u⃗' },
      { label: 'v⃗', insertValue: 'v⃗' },
      { label: 'AB⃗', insertValue: 'AB⃗' },
      { label: '0⃗', insertValue: '0⃗' },
      { label: '∠ABC', insertValue: '∠ABC' },
      { label: '90°', insertValue: '90°' },
      { label: '45°', insertValue: '45°' },
      { label: '60°', insertValue: '60°' }
    ]
  },
  {
    title: 'Tập số & Hằng số',
    items: [
      { label: 'ℝ', insertValue: 'ℝ' },
      { label: 'ℕ', insertValue: 'ℕ' },
      { label: 'ℤ', insertValue: 'ℤ' },
      { label: 'ℚ', insertValue: 'ℚ' },
      { label: 'π', insertValue: 'π' },
      { label: 'e', insertValue: 'e' },
      { label: '∞', insertValue: '∞' },
      { label: '±', insertValue: '±' },
      { label: 'Δ', insertValue: 'Δ' },
      { label: 'α', insertValue: 'α' },
      { label: 'β', insertValue: 'β' },
      { label: 'θ', insertValue: 'θ' }
    ]
  }
];

export const ShapeGallery: React.FC = () => {
  const styles = useStyles();
  const [status, setStatus] = useState<string>('');

  const handleInsertSymbol = async (val: string) => {
    const res = await insertTextAtCursor(val);
    setStatus(res.message);
  };

  return (
    <div className={styles.container}>
      <Card>
        <CardHeader
          image={<Grid24Regular />}
          header={<Text weight="semibold">Thư viện ký hiệu & Hình mẫu</Text>}
          description={<Text size={200}>Bấm vào ký hiệu để chèn ngay lập tức vào vị trí con trỏ trong Word</Text>}
        />

        {CATEGORIES.map((cat, catIdx) => (
          <div key={catIdx}>
            <div className={styles.sectionTitle}>{cat.title}</div>
            <div className={styles.grid}>
              {cat.items.map((item, idx) => (
                <Button
                  key={idx}
                  size="small"
                  appearance="secondary"
                  className={styles.symbolBtn}
                  onClick={() => handleInsertSymbol(item.insertValue)}
                  title={`Chèn ${item.label}`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        ))}

        {status && (
          <Badge appearance="tint" color="informative" style={{ marginTop: '8px' }}>
            {status}
          </Badge>
        )}
      </Card>
    </div>
  );
};
