import React, { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  useNavigate,
  useLocation
} from 'react-router-dom';
import {
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
  Button,
  Badge,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  MathFormula20Regular,
  Shapes20Regular,
  Cube20Regular,
  Table20Regular,
  DataArea20Regular,
  Grid20Regular,
  CheckmarkCircle20Filled,
  Play20Filled,
  Info20Regular
} from '@fluentui/react-icons';

import { FormulaEditor } from './components/FormulaEditor';
import { PlaneGeometryEditor } from './components/PlaneGeometryEditor';
import { SpaceGeometryEditor } from './components/SpaceGeometryEditor';
import { VariationTableGenerator } from './components/VariationTableGenerator';
import { GraphPlotter } from './components/GraphPlotter';
import { ShapeGallery } from './components/ShapeGallery';
import { insertHelloMath, isWordHost } from './services/wordService';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f5f7',
    ...shorthands.padding('12px')
  },
  headerCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding('12px'),
    marginBottom: '10px',
    boxShadow: tokens.shadow4
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: '#0f6cbd'
  },
  testBox: {
    backgroundColor: '#edf5fd',
    ...shorthands.border('1px', 'solid', '#c7e0f4'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
    marginTop: '6px'
  },
  testActionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px'
  },
  tabNav: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('4px'),
    marginBottom: '12px',
    boxShadow: tokens.shadow2,
    overflowX: 'auto'
  },
  contentArea: {
    flexGrow: 1
  },
  footer: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4
  }
});

export const AppContent: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const [connected, setConnected] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync route with Ribbon parameter ?view=... or current path
  useEffect(() => {
    const isWord = isWordHost();
    setConnected(isWord);

    const queryParams = new URLSearchParams(window.location.search);
    const view = queryParams.get('view');
    if (view) {
      navigate(`/${view}`, { replace: true });
    }
  }, [navigate]);

  // Determine current active tab key based on pathname
  const activeTab = location.pathname.replace('/', '') || 'formula';

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    navigate(`/${data.value}`);
  };

  // Milestone 1 test function
  const handleTestInsert = async () => {
    setTestResult(null);
    const res = await insertHelloMath();
    setTestResult(res);
  };

  return (
    <div className={styles.root}>
      {/* Header and Milestone 1 Verification */}
      <div className={styles.headerCard}>
        <div className={styles.titleRow}>
          <div className={styles.title}>Toán Học - Word Add-in</div>
          <Badge
            appearance="filled"
            color={connected ? 'success' : 'informative'}
            icon={connected ? <CheckmarkCircle20Filled /> : <Info20Regular />}
          >
            {connected ? 'Đã kết nối Word' : 'Chế độ Preview'}
          </Badge>
        </div>

        {/* Milestone 1 Requirement: Test button inserting "Hello from Math Add-in" */}
        <div className={styles.testBox}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f6cbd' }}>
            🎯 Kiểm tra Milestone 1 (Word.run):
          </div>
          <div style={{ fontSize: '12px', color: '#424242', marginTop: '2px' }}>
            Bấm nút bên dưới để chèn dòng chữ thử nghiệm vào vị trí con trỏ trong tài liệu Word:
          </div>
          <div className={styles.testActionRow}>
            <Button
              appearance="primary"
              size="medium"
              icon={<Play20Filled />}
              onClick={handleTestInsert}
            >
              Chèn "Hello from Math Add-in"
            </Button>
            <Badge appearance="tint" color="brand">Word.run (Office.js)</Badge>
          </div>
        </div>

        {testResult && (
          <div style={{ marginTop: '8px' }}>
            <MessageBar intent={testResult.success ? 'success' : 'warning'}>
              <MessageBarBody>
                <MessageBarTitle>{testResult.success ? 'Thành công!' : 'Thông báo:'}</MessageBarTitle>
                {testResult.message}
              </MessageBarBody>
            </MessageBar>
          </div>
        )}
      </div>

      {/* Tabs navigation for Ribbon tools */}
      <div className={styles.tabNav}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={handleTabSelect}
          size="small"
        >
          <Tab value="formula" icon={<MathFormula20Regular />}>
            Công thức
          </Tab>
          <Tab value="plane-geometry" icon={<Shapes20Regular />}>
            Hình phẳng
          </Tab>
          <Tab value="space-geometry" icon={<Cube20Regular />}>
            Không gian
          </Tab>
          <Tab value="variation-table" icon={<Table20Regular />}>
            BBT
          </Tab>
          <Tab value="graph-plotter" icon={<DataArea20Regular />}>
            Đồ thị
          </Tab>
          <Tab value="shape-gallery" icon={<Grid20Regular />}>
            Ký hiệu
          </Tab>
        </TabList>
      </div>

      {/* Main Content Area switched by React Router */}
      <div className={styles.contentArea}>
        <Routes>
          <Route path="/" element={<FormulaEditor />} />
          <Route path="/formula" element={<FormulaEditor />} />
          <Route path="/plane-geometry" element={<PlaneGeometryEditor />} />
          <Route path="/space-geometry" element={<SpaceGeometryEditor />} />
          <Route path="/variation-table" element={<VariationTableGenerator />} />
          <Route path="/graph-plotter" element={<GraphPlotter />} />
          <Route path="/shape-gallery" element={<ShapeGallery />} />
          <Route path="*" element={<FormulaEditor />} />
        </Routes>
      </div>

      <div className={styles.footer}>
        Dành cho giáo viên Toán THCS - THPT • Office.js & Fluent UI
      </div>
    </div>
  );
};
