import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Badge,
  Spinner,
  makeStyles,
  shorthands
} from '@fluentui/react-components';
import {
  ArrowUpload24Regular,
  Delete20Regular,
  Copy20Regular,
  Checkmark20Regular,
  ArrowReset20Regular,
  DocumentPdf24Regular,
  Image24Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Settings20Regular,
  Sparkle20Regular,
  Add20Regular
} from '@fluentui/react-icons';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  DocumentBlock,
  ScanResult,
  loadImageToCanvas,
  renderPdfPageToCanvas,
  cropImageFromCanvas,
  callGeminiVisionOcr,
  insertDocumentBlocksToWord
} from '../services/aiScannerService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('4px')
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('24px', '16px'),
    backgroundColor: '#ffffff',
    ...shorthands.border('2px', 'dashed', '#0f6cbd'),
    ...shorthands.borderRadius('8px'),
    cursor: 'pointer',
    textAlign: 'center',
    transitionProperty: 'all',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: '#f0f6ff',
      ...shorthands.borderColor('#0b5a9e')
    }
  },
  settingsCard: {
    backgroundColor: '#f8fafc',
    ...shorthands.padding('10px'),
    ...shorthands.borderRadius('8px'),
    ...shorthands.border('1px', 'solid', '#d0d7de'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px')
  },
  previewCard: {
    backgroundColor: '#ffffff',
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('8px'),
    ...shorthands.border('1px', 'solid', '#d0d7de'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px')
  },
  blocksList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
    marginTop: '6px'
  },
  blockItem: {
    backgroundColor: '#ffffff',
    ...shorthands.padding('10px'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'solid', '#e1dfdd'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  imageBlockPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    ...shorthands.padding('8px'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'dashed', '#c7c7c7')
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
    marginTop: '8px'
  }
});

// Demo sample data with math text and an embedded geometry image
const DEMO_BLOCKS: DocumentBlock[] = [
  {
    id: 'demo_1',
    type: 'paragraph',
    content: 'Câu 1 (2,0 điểm). Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ có đồ thị $(C)$ như hình vẽ bên dưới:'
  },
  {
    id: 'demo_2',
    type: 'image',
    caption: 'Đồ thị hàm số bậc ba Câu 1',
    imageWidth: 260,
    imageHeight: 180,
    // Simple inline SVG converted to PNG Base64 for demo
    imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAARwAAAC0CAYAAABgE6eCAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGQSURBVHhe7cExAQAAAMKg9U9tDQ8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZg9bAAHN605xAAAAAElFTkSuQmCC'
  },
  {
    id: 'demo_3',
    type: 'paragraph',
    content: 'a) Tìm tọa độ các điểm cực đại và cực tiểu của đồ thị hàm số.\nb) Tính tích phân $I = \\int_{0}^{2} [f\'(x) + 2x] \\, dx$ và tìm phương trình tiếp tuyến của $(C)$ tại điểm có hoành độ $x_0 = 1$.'
  },
  {
    id: 'demo_4',
    type: 'paragraph',
    content: 'Câu 2 (2,0 điểm). Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông cân tại $B$, $AB = a$. Cạnh bên $SA \\perp (ABC)$ và $SA = a\\sqrt{2}$. Gọi $M$ là trung điểm của $SC$. Tính thể tích khối chóp $S.ABC$ và khoảng cách giữa hai đường thẳng $SA$ và $BM$.'
  }
];

export const DocScanner: React.FC = () => {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Gemini API Key & Model Settings
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [model, setModel] = useState<string>(() => {
    const saved = localStorage.getItem('gemini_model');
    if (saved && saved !== 'gemini-2.0-flash') return saved;
    return 'gemini-2.5-flash';
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiKeySaved, setApiKeySaved] = useState<boolean>(false);

  // Input File State
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [totalPdfPages, setTotalPdfPages] = useState<number>(1);

  // Active Canvas (holds current image / rendered PDF page)
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  // Scanning State & Results
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [docTitle, setDocTitle] = useState<string>('');
  const [insertStatus, setInsertStatus] = useState<string>('');
  const [isInserting, setIsInserting] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Save API key
  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  // Global Clipboard Paste Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            await processImageBlob(blob, 'Ảnh dán từ Clipboard');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Process image blob
  const processImageBlob = async (blob: Blob, name: string) => {
    try {
      setScanStatus('Đang đọc hình ảnh...');
      const { canvas, dataUrl } = await loadImageToCanvas(blob);
      setActiveCanvas(canvas);
      setPreviewDataUrl(dataUrl);
      setFileType('image');
      setFileName(name);
      setBlocks([]);
      setScanStatus('Ảnh đã sẵn sàng. Bấm "Bắt đầu Quét" bên dưới.');
    } catch (err: any) {
      setScanStatus('Lỗi đọc ảnh: ' + err.message);
    }
  };

  // Process PDF file
  const processPdfFile = async (file: File) => {
    try {
      setScanStatus('Đang nạp file PDF...');
      const ab = await file.arrayBuffer();
      setPdfArrayBuffer(ab);
      setFileType('pdf');
      setFileName(file.name);
      setCurrentPdfPage(1);

      // Render page 1
      const res = await renderPdfPageToCanvas(ab, 1, 2.0);
      setActiveCanvas(res.canvas);
      setPreviewDataUrl(res.dataUrl);
      setTotalPdfPages(res.totalPages);
      setBlocks([]);
      setScanStatus(`Đã tải PDF (${res.totalPages} trang). Sẵn sàng quét trang 1.`);
    } catch (err: any) {
      setScanStatus('Lỗi nạp PDF: ' + err.message);
    }
  };

  // Change PDF Page
  const handlePdfPageChange = async (newPage: number) => {
    if (!pdfArrayBuffer) return;
    try {
      setScanStatus(`Đang chuyển sang trang ${newPage}...`);
      const res = await renderPdfPageToCanvas(pdfArrayBuffer, newPage, 2.0);
      setActiveCanvas(res.canvas);
      setPreviewDataUrl(res.dataUrl);
      setCurrentPdfPage(newPage);
      setBlocks([]);
      setScanStatus(`Trang ${newPage} / ${totalPdfPages} đã sẵn sàng.`);
    } catch (err: any) {
      setScanStatus('Lỗi chuyển trang: ' + err.message);
    }
  };

  // File Input Handler
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      await processPdfFile(file);
    } else if (file.type.startsWith('image/')) {
      await processImageBlob(file, file.name);
    }
  };

  // Perform AI Scan
  const handleStartScan = async () => {
    if (!activeCanvas) {
      setScanStatus('Chưa có ảnh hoặc PDF nào được tải lên.');
      return;
    }

    if (!apiKey.trim()) {
      setShowSettings(true);
      setScanStatus('⚠️ Vui lòng nhập khóa API Gemini (Google AI Studio) ở phần Cài đặt.');
      return;
    }

    try {
      setIsScanning(true);
      setScanStatus('Đang gửi hình ảnh tới Gemini AI để nhận diện văn bản & công thức...');

      const fullImageBase64 = activeCanvas.toDataURL('image/png');
      const scanRes: ScanResult = await callGeminiVisionOcr(fullImageBase64, apiKey, model);

      setDocTitle(scanRes.title || 'Tài liệu');
      setScanStatus('Đang tự động cắt và trích xuất các hình vẽ minh họa...');

      // Process blocks: Crop diagrams if box_2d is present
      const processedBlocks: DocumentBlock[] = scanRes.blocks.map(block => {
        if (block.type === 'image' && block.box_2d) {
          try {
            const crop = cropImageFromCanvas(activeCanvas, block.box_2d);
            return {
              ...block,
              imageBase64: crop.base64,
              imageDataUrl: crop.dataUrl,
              imageWidth: crop.width,
              imageHeight: crop.height
            };
          } catch (cropErr) {
            console.warn('[MathAddin] Crop diagram warning:', cropErr);
            return block;
          }
        }
        return block;
      });

      setBlocks(processedBlocks);
      const imgCount = processedBlocks.filter(b => b.type === 'image').length;
      const pCount = processedBlocks.filter(b => b.type === 'paragraph').length;
      setScanStatus(`✅ Hoàn thành: ${pCount} đoạn văn bản/công thức và ${imgCount} hình ảnh minh họa.`);
    } catch (err: any) {
      console.error('[MathAddin] Scan error:', err);
      setScanStatus(`❌ Lỗi: ${err.message || err}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Load Demo Data
  const handleLoadDemo = () => {
    setBlocks(DEMO_BLOCKS);
    setDocTitle('Đề thi thử Tốt nghiệp THPT môn Toán (Dữ liệu mẫu)');
    setScanStatus('Đã nạp đề thi mẫu gồm 3 câu hỏi, công thức toán và hình ảnh minh họa!');
  };

  // Insert all blocks into Word at cursor
  const handleInsertToWord = async () => {
    if (blocks.length === 0) return;
    try {
      setIsInserting(true);
      setInsertStatus('Đang chuyển đổi và chèn nội dung vào vị trí con trỏ trong Word...');
      const res = await insertDocumentBlocksToWord(blocks);
      setInsertStatus(res.message);
    } catch (err: any) {
      setInsertStatus('Lỗi chèn vào Word: ' + (err.message || err));
    } finally {
      setIsInserting(false);
    }
  };

  // Copy full LaTeX text to clipboard
  const handleCopyAllText = () => {
    const fullText = blocks
      .map(b => (b.type === 'paragraph' ? b.content : `[HÌNH ẢNH MINH HỌA: ${b.caption || 'Hình vẽ'}]`))
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Edit paragraph block
  const handleBlockContentChange = (id: string, newContent: string) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, content: newContent } : b)));
  };

  // Delete block
  const handleDeleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className={styles.container}>
      {/* Header and API Key Settings */}
      <Card>
        <CardHeader
          image={<Sparkle20Regular style={{ color: '#0f6cbd' }} />}
          header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Text weight="semibold" size={400} style={{ color: '#0f6cbd' }}>
                Quét PDF / Ảnh sang Word (AI Math OCR)
              </Text>
              <Button
                size="small"
                appearance="subtle"
                icon={<Settings20Regular />}
                onClick={() => setShowSettings(!showSettings)}
                title="Cài đặt khóa API Gemini"
              >
                {apiKey ? 'API: Đã lưu' : 'Cài đặt API'}
              </Button>
            </div>
          }
          description={
            <Text size={200} style={{ color: '#605e5c' }}>
              Tự động nhận diện văn bản, công thức toán và <strong>giữ nguyên các hình ảnh xen kẽ</strong>
            </Text>
          }
        />

        {/* API Settings Section */}
        {showSettings && (
          <div className={styles.settingsCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="semibold" size={200} style={{ color: '#0f6cbd' }}>
                🔑 Khóa API Google Gemini (Google AI Studio)
              </Text>
              <Badge appearance="tint" color={apiKey ? 'success' : 'warning'}>
                {apiKey ? 'Đã cài đặt' : 'Cần nhập API Key'}
              </Badge>
            </div>

            <Text size={100} style={{ color: '#555' }}>
              Dịch vụ Google AI Studio hoàn toàn <b style={{ color: '#107c41' }}>MIỄN PHÍ 100%</b> (1500 lượt quét đề thi/ngày, không cần thẻ):
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: '4px', color: '#0f6cbd', fontWeight: 600 }}
              >
                Lấy API Key miễn phí tại đây (30 giây) ↗
              </a>
            </Text>

            <div style={{ display: 'flex', gap: '6px' }}>
              <Input
                type="password"
                placeholder="Dán mã API Key (bắt đầu bằng AIzaSy...)"
                value={apiKey}
                onChange={(_, d) => setApiKey(d.value)}
                style={{ flexGrow: 1 }}
              />
              <Button appearance="primary" size="small" onClick={handleSaveApiKey}>
                {apiKeySaved ? 'Đã lưu!' : 'Lưu Key'}
              </Button>
            </div>

            <Field label="Mô hình AI (Miễn phí 100%):" size="small">
              <Select
                value={model}
                onChange={(_, d) => {
                  setModel(d.value);
                  localStorage.setItem('gemini_model', d.value);
                }}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Mới nhất, cực nhanh &amp; chuẩn xác - Khuyên dùng)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Bản ổn định lâu dài - Miễn phí)</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Tốc độ cao - Miễn phí)</option>
              </Select>
            </Field>
          </div>
        )}

        {/* File / Clipboard Drop & Paste Zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <div
          className={styles.dropZone}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                await processPdfFile(file);
              } else if (file.type.startsWith('image/')) {
                await processImageBlob(file, file.name);
              }
            }
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <ArrowUpload24Regular style={{ color: '#0f6cbd' }} />
            <DocumentPdf24Regular style={{ color: '#d13438' }} />
            <Image24Regular style={{ color: '#107c41' }} />
          </div>
          <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
            Bấm để chọn File PDF hoặc Ảnh đề thi
          </Text>
          <Text size={200} style={{ color: '#605e5c', marginTop: '2px' }}>
            Hoặc <strong>bấm Ctrl + V</strong> ở bất kỳ đâu để dán ảnh chụp màn hình ngay lập tức!
          </Text>
        </div>

        {/* Quick Demo Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
          <Button
            size="small"
            appearance="subtle"
            style={{ fontSize: '11px', color: '#0f6cbd' }}
            onClick={handleLoadDemo}
          >
            💡 Dùng thử đề thi mẫu có hình vẽ
          </Button>
        </div>

        {/* Current Document Preview */}
        {previewDataUrl && (
          <div className={styles.previewCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Text weight="semibold" size={200}>
                  {fileType === 'pdf' ? `📄 ${fileName}` : `🖼️ ${fileName}`}
                </Text>
                {activeCanvas && (
                  <Badge size="small" appearance="tint">
                    {activeCanvas.width} × {activeCanvas.height} px
                  </Badge>
                )}
              </div>

              {/* PDF Page Navigation */}
              {fileType === 'pdf' && totalPdfPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ChevronLeft20Regular />}
                    disabled={currentPdfPage <= 1}
                    onClick={() => handlePdfPageChange(currentPdfPage - 1)}
                  />
                  <Text size={100} weight="semibold">
                    Trang {currentPdfPage} / {totalPdfPages}
                  </Text>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ChevronRight20Regular />}
                    disabled={currentPdfPage >= totalPdfPages}
                    onClick={() => handlePdfPageChange(currentPdfPage + 1)}
                  />
                </div>
              )}
            </div>

            {/* Thumbnail Canvas View */}
            <div style={{ maxHeight: '160px', overflowY: 'auto', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '4px', padding: '4px' }}>
              <img
                src={previewDataUrl}
                alt="Tài liệu"
                style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
              />
            </div>

            {/* Scan Action Button */}
            <Button
              appearance="primary"
              size="medium"
              icon={isScanning ? <Spinner size="tiny" /> : <Sparkle20Regular />}
              disabled={isScanning}
              onClick={handleStartScan}
              style={{ marginTop: '4px' }}
            >
              {isScanning ? 'Đang phân tích tài liệu...' : '🚀 Bắt đầu Quét & Tách hình ảnh'}
            </Button>
          </div>
        )}

        {/* Status Notification */}
        {scanStatus && (
          <div style={{ fontSize: '12px', padding: '6px 10px', backgroundColor: '#f0f6ff', borderRadius: '4px', color: '#0f6cbd' }}>
            {scanStatus}
          </div>
        )}

        {/* RECOGNITION RESULTS (Blocks list with interspersed images) */}
        {blocks.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                📋 {docTitle ? `${docTitle} (${blocks.length} khối):` : `Kết quả nhận diện (${blocks.length} khối):`}
              </Text>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowReset20Regular />}
                onClick={() => setBlocks([])}
                style={{ fontSize: '11px', color: '#d13438' }}
              >
                Xóa kết quả
              </Button>
            </div>

            <div className={styles.blocksList}>
              {blocks.map((block, idx) => {
                if (block.type === 'paragraph') {
                  // Render preview of KaTeX equations inside paragraph text
                  return (
                    <div key={block.id} className={styles.blockItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge size="small" appearance="outline" color="brand">
                          Đoạn {idx + 1}
                        </Badge>
                        <Button
                          size="small"
                          appearance="subtle"
                          icon={<Delete20Regular />}
                          onClick={() => handleDeleteBlock(block.id)}
                          style={{ color: '#d13438' }}
                        />
                      </div>

                      {/* Editable Textarea with LaTeX */}
                      <Textarea
                        value={block.content || ''}
                        onChange={(_, d) => handleBlockContentChange(block.id, d.value)}
                        rows={2}
                        style={{ fontFamily: 'Consolas, monospace', fontSize: '12px' }}
                      />

                      {/* KaTeX Math Preview */}
                      <div style={{ fontSize: '13px', color: '#242424', padding: '4px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: renderTextWithKatexHtml(block.content || '')
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                if (block.type === 'image') {
                  // Interspersed Diagram Image
                  return (
                    <div key={block.id} className={styles.blockItem} style={{ borderLeft: '3px solid #107c41' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge size="small" appearance="filled" color="success">
                            🖼️ Hình minh họa xen kẽ (Khối {idx + 1})
                          </Badge>
                          {block.imageWidth && block.imageHeight && (
                            <Text size={100} style={{ color: '#605e5c' }}>
                              {block.imageWidth} × {block.imageHeight} px
                            </Text>
                          )}
                        </div>
                        <Button
                          size="small"
                          appearance="subtle"
                          icon={<Delete20Regular />}
                          onClick={() => handleDeleteBlock(block.id)}
                          style={{ color: '#d13438' }}
                        />
                      </div>

                      <div className={styles.imageBlockPreview}>
                        {block.imageDataUrl || block.imageBase64 ? (
                          <img
                            src={block.imageDataUrl || `data:image/png;base64,${block.imageBase64}`}
                            alt={block.caption || 'Hình vẽ'}
                            style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }}
                          />
                        ) : (
                          <Text size={200} style={{ color: '#888' }}>
                            [Hình ảnh phát hiện tại tọa độ: {JSON.stringify(block.box_2d)}]
                          </Text>
                        )}
                        <Text size={100} style={{ fontStyle: 'italic', color: '#555', marginTop: '4px' }}>
                          {block.caption || 'Hình vẽ xen giữa các câu'}
                        </Text>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* Bottom Actions for Word Insertion */}
            <div className={styles.actionsBar}>
              <Button
                size="small"
                appearance="subtle"
                icon={copiedAll ? <Checkmark20Regular style={{ color: 'green' }} /> : <Copy20Regular />}
                onClick={handleCopyAllText}
              >
                {copiedAll ? 'Đã chép LaTeX!' : 'Chép toàn bộ văn bản'}
              </Button>

              <Button
                appearance="primary"
                size="medium"
                icon={isInserting ? <Spinner size="tiny" /> : <Add20Regular />}
                disabled={isInserting}
                onClick={handleInsertToWord}
              >
                {isInserting ? 'Đang chèn vào Word...' : 'Chèn tất cả vào Word tại con trỏ'}
              </Button>
            </div>

            {insertStatus && (
              <div style={{ fontSize: '12px', padding: '6px 10px', backgroundColor: '#eefdf3', borderRadius: '4px', color: '#107c41', marginTop: '6px' }}>
                {insertStatus}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

/**
 * Helper to render LaTeX math formulas $...$ and $$...$$ into preview HTML via KaTeX
 */
function renderTextWithKatexHtml(text: string): string {
  if (!text) return '';
  try {
    const parts: string[] = [];
    let lastIndex = 0;
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escapeHtml(text.substring(lastIndex, match.index)));
      }
      const raw = match[0];
      const isDisplay = raw.startsWith('$$');
      const formula = isDisplay ? raw.slice(2, -2) : raw.slice(1, -1);
      try {
        const katexHtml = katex.renderToString(formula, {
          displayMode: isDisplay,
          throwOnError: false
        });
        parts.push(katexHtml);
      } catch {
        parts.push(escapeHtml(raw));
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(escapeHtml(text.substring(lastIndex)));
    }
    return parts.join('').replace(/\n/g, '<br/>');
  } catch {
    return escapeHtml(text);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
