import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppContent } from './App';

console.log("[MathAddin] index.tsx đang khởi động...");

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);

    const renderApp = () => {
      try {
        root.render(
          <React.StrictMode>
            <FluentProvider theme={webLightTheme}>
              <AppContent />
            </FluentProvider>
          </React.StrictMode>
        );
        console.log("[MathAddin] Render AppContent thành công.");
      } catch (renderErr: any) {
        console.error("[MathAddin] Lỗi renderApp:", renderErr);
        const errBox = document.getElementById('js-error-box');
        if (errBox) {
          errBox.style.display = 'block';
          errBox.innerHTML += `<div><b>Lỗi ReactDOM Render:</b> ${renderErr?.message || renderErr}</div>`;
        }
      }
    };

    // Render immediately so UI is loaded fast
    renderApp();

    // Hook into Office.onReady when running inside Microsoft Word
    if (typeof Office !== 'undefined' && Office.onReady) {
      Office.onReady((info) => {
        console.log(`[MathAddin] Office.js đã kết nối. Host: ${info?.host}, Platform: ${info?.platform}`);
      });
    }
  } catch (initErr: any) {
    console.error("[MathAddin] Lỗi khởi tạo root:", initErr);
    const errBox = document.getElementById('js-error-box');
    if (errBox) {
      errBox.style.display = 'block';
      errBox.innerHTML += `<div><b>Lỗi khởi tạo React Root:</b> ${initErr?.message || initErr}</div>`;
    }
  }
} else {
  console.error("[MathAddin] Không tìm thấy phần tử #root!");
}
