import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppContent } from './App';

// Polyfill window.history in environments where Office.js or browser sandbox modifies it
if (typeof window !== 'undefined') {
  if (!window.history) {
    (window as any).history = {};
  }
  if (typeof window.history.replaceState !== 'function') {
    window.history.replaceState = function () {};
  }
  if (typeof window.history.pushState !== 'function') {
    window.history.pushState = function () {};
  }
}

console.log("[MathAddin] index.tsx đang chạy...");

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);

    // Read initial tool view from URL search query (e.g. ?view=plane-geometry from Ribbon)
    const queryParams = new URLSearchParams(window.location.search);
    const initialView = queryParams.get('view') || 'formula';

    const renderApp = () => {
      try {
        root.render(
          <React.StrictMode>
            <FluentProvider theme={webLightTheme}>
              <MemoryRouter initialEntries={[`/${initialView}`]}>
                <AppContent />
              </MemoryRouter>
            </FluentProvider>
          </React.StrictMode>
        );
        console.log("[MathAddin] Đã render MemoryRouter thành công.");
      } catch (renderErr: any) {
        console.error("[MathAddin] Lỗi renderApp:", renderErr);
        const errBox = document.getElementById('js-error-box');
        if (errBox) {
          errBox.style.display = 'block';
          errBox.innerHTML += `<div><b>Lỗi ReactDOM Render:</b> ${renderErr?.message || renderErr}</div>`;
        }
      }
    };

    // Render immediately so the UI is visible in browser preview & Word
    renderApp();

    // Also hook into Office.onReady when running inside Word
    if (typeof Office !== 'undefined' && Office.onReady) {
      Office.onReady((info) => {
        console.log(`[MathAddin] Office.js đã sẵn sàng. Host: ${info?.host}, Platform: ${info?.platform}`);
        renderApp();
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
