import katex from 'katex';

/**
 * Office.js Word Service
 * Handles document manipulation and cursor insertions using Word JavaScript API
 */

export interface InsertionResult {
  success: boolean;
  message: string;
}

/**
 * Checks if Office.js is running inside a supported Word client
 */
export function isWordHost(): boolean {
  try {
    return (
      typeof Office !== 'undefined' &&
      typeof Word !== 'undefined' &&
      Boolean(Office.context) &&
      Boolean(Office.context.host) &&
      Boolean(Office.HostType) &&
      Office.context.host === Office.HostType.Word
    );
  } catch {
    return false;
  }
}

/**
 * Milestone 1 Required Function:
 * Inserts "Hello from Math Add-in" at the cursor using Word.run
 */
export async function insertHelloMath(): Promise<InsertionResult> {
  if (!isWordHost()) {
    return {
      success: false,
      message: 'Office.js chưa sẵn sàng hoặc không chạy trong Microsoft Word. Hãy sideload add-in vào Word.'
    };
  }

  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText('Hello from Math Add-in', Word.InsertLocation.replace);
      await context.sync();
    });

    return {
      success: true,
      message: 'Đã chèn thành công "Hello from Math Add-in" tại vị trí con trỏ!'
    };
  } catch (error: any) {
    console.error('Lỗi khi gọi Word.run:', error);
    return {
      success: false,
      message: `Lỗi chèn văn bản: ${error?.message || error}`
    };
  }
}

/**
 * Inserts a native Word Equation from LaTeX using MathML conversion
 * Word automatically parses standard MathML into native Word Equations (OMML)
 */
export async function insertMathEquation(latex: string): Promise<InsertionResult> {
  if (!isWordHost()) {
    return {
      success: false,
      message: 'Vui lòng mở Add-in trong Microsoft Word để chèn công thức vào văn bản.'
    };
  }

  try {
    const mathmlHtml = katex.renderToString(latex, {
      output: 'mathml',
      throwOnError: false
    });

    const htmlToInsert = `
      <p style="margin: 6pt 0; text-align: left; font-family: 'Cambria Math', 'Times New Roman', serif;">
        ${mathmlHtml}
      </p>
    `;

    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertHtml(htmlToInsert, Word.InsertLocation.replace);
      await context.sync();
    });

    return {
      success: true,
      message: 'Đã chèn công thức chuẩn Word Equation thành công!'
    };
  } catch (error: any) {
    console.error('Lỗi insertMathEquation:', error);
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(latex, Word.InsertLocation.replace);
        await context.sync();
      });
      return {
        success: true,
        message: 'Đã chèn công thức dạng văn bản.'
      };
    } catch {
      return {
        success: false,
        message: `Lỗi chèn công thức: ${error?.message || error}`
      };
    }
  }
}

/**
 * Converts an SVG string into high-resolution PNG Base64 for native Word insertion
 * Renders at 2.5x - 3x scale (~300 DPI) for razor-sharp vector-like print quality
 */
export async function convertSvgToPngBase64(
  svgString: string,
  scale = 2.5
): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    try {
      let cleanSvg = svgString.trim();
      if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Extract original viewBox dimensions or width/height
      let w = 320;
      let h = 230;
      const vbMatch = cleanSvg.match(/viewBox=["']([0-9.\s-]+)["']/);
      if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/);
        if (parts.length >= 4) {
          w = parseFloat(parts[2]) || 320;
          h = parseFloat(parts[3]) || 230;
        }
      } else {
        const wMatch = cleanSvg.match(/width=["']([0-9.]+)["']/);
        const hMatch = cleanSvg.match(/height=["']([0-9.]+)["']/);
        if (wMatch) w = parseFloat(wMatch[1]) || 320;
        if (hMatch) h = parseFloat(hMatch[1]) || 230;
      }

      // Ensure explicit width & height attributes for proper Image sizing
      if (!cleanSvg.includes('width=')) {
        cleanSvg = cleanSvg.replace('<svg', `<svg width="${w}"`);
      }
      if (!cleanSvg.includes('height=')) {
        cleanSvg = cleanSvg.replace('<svg', `<svg height="${h}"`);
      }

      const renderCanvas = (imgSource: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Fill crisp white background (preserves visibility in dark mode / print)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgSource, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        return { base64, width: w, height: h };
      };

      // Try Blob URL approach first
      const blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const res = renderCanvas(img);
          URL.revokeObjectURL(url);
          resolve(res);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: encode via Data URI
        try {
          const fallbackDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            try {
              const res = renderCanvas(fallbackImg);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          };
          fallbackImg.onerror = (e) => reject(new Error(`Failed to render SVG: ${e}`));
          fallbackImg.src = fallbackDataUrl;
        } catch (fallbackErr) {
          reject(fallbackErr);
        }
      };

      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Inserts vector geometry drawing as a high-resolution native Word picture at cursor
 */
export async function insertSvgAtCursor(svgContent: string, caption?: string): Promise<InsertionResult> {
  if (!isWordHost()) {
    return {
      success: false,
      message: 'Vui lòng mở Add-in trong Microsoft Word để chèn hình vẽ vào văn bản.'
    };
  }

  try {
    // 1. Convert SVG to high-resolution PNG Base64
    const { base64, width, height } = await convertSvgToPngBase64(svgContent, 2.5);

    // 2. Insert natively via Word JavaScript API (supported across all Word versions)
    await Word.run(async (context) => {
      const selection = context.document.getSelection();

      // Insert inline image
      const pic = selection.insertInlinePictureFromBase64(base64, Word.InsertLocation.replace);
      
      // Set display dimensions in points (preserves clear 1:1 scale)
      pic.width = width;
      pic.height = height;

      // Center the image paragraph
      pic.paragraph.alignment = Word.Alignment.centered;
      pic.paragraph.spaceBefore = 6;
      pic.paragraph.spaceAfter = 4;

      // Add centered caption paragraph below image if provided
      if (caption && caption.trim()) {
        const p = pic.paragraph.insertParagraph(caption.trim(), Word.InsertLocation.after);
        p.font.name = 'Times New Roman';
        p.font.size = 11;
        p.font.italic = true;
        p.font.color = '#333333';
        p.alignment = Word.Alignment.centered;
        p.spaceBefore = 2;
        p.spaceAfter = 12;
      }

      await context.sync();
    });

    return {
      success: true,
      message: `Đã chèn hình "${caption || 'Hình vẽ'}" vào Word thành công!`
    };
  } catch (error: any) {
    console.error('Lỗi insertSvgAtCursor:', error);
    return {
      success: false,
      message: `Lỗi chèn hình vẽ: ${error?.message || error}`
    };
  }
}

/**
 * Inserts formatted text at cursor
 */
export async function insertTextAtCursor(text: string): Promise<InsertionResult> {
  if (!isWordHost()) {
    return {
      success: false,
      message: 'Vui lòng mở Add-in trong Microsoft Word để thực hiện chức năng này.'
    };
  }

  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(text, Word.InsertLocation.replace);
      await context.sync();
    });

    return {
      success: true,
      message: `Đã chèn: "${text}"`
    };
  } catch (error: any) {
    console.error('Lỗi insertTextAtCursor:', error);
    return {
      success: false,
      message: `Lỗi: ${error?.message || error}`
    };
  }
}

/**
 * Inserts an HTML snippet at cursor
 */
export async function insertHtmlAtCursor(htmlContent: string): Promise<InsertionResult> {
  if (!isWordHost()) {
    return {
      success: false,
      message: 'Office.js chưa sẵn sàng trong Word.'
    };
  }

  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertHtml(htmlContent, Word.InsertLocation.replace);
      await context.sync();
    });

    return {
      success: true,
      message: 'Đã chèn nội dung vào tài liệu.'
    };
  } catch (error: any) {
    console.error('Lỗi insertHtmlAtCursor:', error);
    return {
      success: false,
      message: `Lỗi chèn HTML: ${error?.message || error}`
    };
  }
}
