# math-word-addin

> **Office Add-in cho Microsoft Word** dành cho giáo viên Toán: Soạn thảo công thức Toán, Dựng hình học phẳng, Hình học không gian, Tạo bảng biến thiên và Vẽ đồ thị hàm số.

Dự án được xây dựng hoàn toàn bằng **Office.js**, **TypeScript**, **React**, **Vite** và **Fluent UI v9** (không sử dụng VSTO hay C#).

---

## 📋 Mục lục
1. [Tính năng và Cấu trúc Ribbon (Milestone 1)](#1-tính-năng-và-cấu-trúc-ribbon-milestone-1)
2. [Cài đặt và Khởi động Local Server](#2-cài-đặt-và-khởi-động-local-server)
3. [Hướng dẫn Sideload vào Word on the Web (Office 365)](#3-hướng-dẫn-sideload-vào-word-on-the-web)
4. [Hướng dẫn Sideload vào Word Desktop (Windows)](#4-hướng-dẫn-sideload-vào-word-desktop-windows)
5. [Kiểm tra Milestone 1](#5-kiểm-tra-milestone-1)
6. [Cấu trúc mã nguồn](#6-cấu-trúc-mã-nguồn)

---

## 1. Tính năng và Cấu trúc Ribbon (Milestone 1)

Manifest cung cấp một Tab tùy chỉnh trên thanh Ribbon tên là **"Toan Hoc"** với **5 nhóm lệnh (Groups)**:

| Nhóm (Group) | Nút trên Ribbon | Chức năng (Điều hướng Task Pane) |
| :--- | :--- | :--- |
| **Formulas** (Công thức) | *Công thức* | Mở Task Pane với công cụ `FormulaEditor` |
| **Plane Geometry** (Hình học phẳng) | *Hình phẳng* | Mở Task Pane với công cụ `PlaneGeometryEditor` |
| **Space Geometry** (Hình học không gian) | *Hình không gian* | Mở Task Pane với công cụ `SpaceGeometryEditor` |
| **Tables and Graphs** (Bảng & Đồ thị) | *Bảng biến thiên*<br>*Đồ thị hàm số* | Mở `VariationTableGenerator`<br>Mở `GraphPlotter` |
| **Tools** (Công cụ) | *Thư viện hình*<br>*Bảng điều khiển* | Mở `ShapeGallery`<br>Mở Task Pane tổng quan & Kiểm tra kết nối |

Mỗi nút trên Ribbon khi bấm sẽ tự động kích hoạt Task Pane với công cụ tương ứng được chọn sẵn thông qua tham số `?view=...` và React Router.

---

## 2. Cài đặt và Khởi động Local Server

### Bước 1: Mở thư mục dự án
```powershell
cd C:\Users\TUNG\.gemini\antigravity\scratch\math-word-addin
```

### Bước 2: Cài đặt các gói phụ thuộc
```bash
npm install
```

### Bước 3: Khởi chạy máy chủ Vite ở chế độ HTTPS
```bash
npm run dev
```

> **Lưu ý quan trọng về HTTPS**:
> Office Add-in bắt buộc phải chạy qua giao thức bảo mật `https://localhost:3000`. Plugin `@vitejs/plugin-basic-ssl` đã được cấu hình sẵn trong `vite.config.ts`.
> Khi khởi chạy lần đầu, hãy mở trình duyệt truy cập thử:  
> `https://localhost:3000/taskpane.html`  
> Nếu trình duyệt hiện cảnh báo bảo mật chứng chỉ tự ký (Self-signed certificate), hãy bấm **Advanced (Nâng cao)** -> **Proceed to localhost (Tiếp tục truy cập)** để máy tính chấp nhận chứng chỉ SSL.

---

## 3. Hướng dẫn Sideload vào Word on the Web

Đây là cách kiểm tra nhanh nhất và không cần phân quyền quản trị hệ thống:

1. Đảm bảo lệnh `npm run dev` đang chạy (`https://localhost:3000`).
2. Mở trình duyệt và truy cập [Word on the Web (Office 365)](https://word.office.com/) hoặc OneDrive.
3. Tạo một tài liệu Word trắng mới (**New blank document**).
4. Trên thanh công cụ, chọn thẻ **Insert (Chèn)** -> bấm vào **Add-ins (Phần bổ trợ)** (hoặc biểu tượng Add-ins ở góc phải thanh công cụ).
5. Trong hộp thoại *Office Add-ins*, chọn thẻ **MY ADD-INS (Phần bổ trợ của tôi)**.
6. Bấm liên kết **Upload My Add-in (Tải lên phần bổ trợ của tôi)** ở góc trên bên phải.
7. Bấm **Browse (Duyệt)** và chọn tệp `manifest.xml` tại đường dẫn:
   ```text
   C:\Users\TUNG\.gemini\antigravity\scratch\math-word-addin\manifest.xml
   ```
8. Bấm **Upload (Tải lên)**.
9. Tab **"Toan Hoc"** sẽ xuất hiện ngay lập tức trên thanh Ribbon của Word on the Web!

---

## 4. Hướng dẫn Sideload vào Word Desktop (Windows)

Đối với Microsoft Word phiên bản cài đặt trên máy tính (Word 2016, 2019, 2021 hoặc Microsoft 365 Apps for Enterprise):

### Phương pháp 1: Sử dụng Thư mục mạng chia sẻ (Shared Folder Catalog - Khuyên dùng)

1. Tạo một thư mục chia sẻ, ví dụ: `C:\OfficeManifests`.
2. Sao chép tệp `manifest.xml` vào thư mục `C:\OfficeManifests`.
3. Nhấp chuột phải vào thư mục `C:\OfficeManifests` -> chọn **Properties** -> thẻ **Sharing** -> bấm **Share...** -> thêm tài khoản của bạn hoặc `Everyone` với quyền Read -> Bấm **Share**.
4. Ghi lại đường dẫn mạng (Network Path), ví dụ: `\\TUNG-PC\OfficeManifests` hoặc `\\localhost\OfficeManifests`.
5. Mở phần mềm **Microsoft Word**:
   - Vào menu **File (Tệp)** -> **Options (Tùy chọn)**.
   - Chọn **Trust Center (Trung tâm tin cậy)** -> bấm **Trust Center Settings... (Cài đặt Trung tâm tin cậy)**.
   - Chọn **Trusted Add-in Catalogs (Danh mục phần bổ trợ đáng tin cậy)**.
   - Tại ô **Catalog Url**, dán đường dẫn mạng đã chia sẻ (ví dụ `\\localhost\OfficeManifests`) -> Bấm **Add Catalog (Thêm danh mục)**.
   - Đánh dấu tick vào ô **Show in Menu (Hiện trong Menu)** cho đường dẫn vừa thêm.
   - Bấm **OK** và khởi động lại Microsoft Word.
6. Mở một tài liệu bất kỳ:
   - Vào thẻ **Insert (Chèn)** -> **My Add-ins (Phần bổ trợ của tôi)**.
   - Chọn tab **Shared Folder (Thư mục dùng chung)**.
   - Nhấp chọn **Toan Hoc** -> bấm **Add**.

---

## 5. Kiểm tra Milestone 1

Sau khi Add-in được nạp vào Word:
1. Quan sát thấy tab **"Toan Hoc"** xuất hiện cùng 5 nhóm lệnh: *Formulas*, *Plane Geometry*, *Space Geometry*, *Tables and Graphs*, *Tools*.
2. Nhấp vào nút **Công thức** hoặc nút **Bảng điều khiển**: Task Pane sẽ mở ra ở cạnh phải màn hình Word.
3. Tại khung **🎯 Kiểm tra Milestone 1 (Word.run)** trên đầu Task Pane:
   - Bấm nút **Chèn "Hello from Math Add-in"**.
   - Thao tác này sẽ thực thi đoạn mã `Word.run(...)`:
     ```typescript
     await Word.run(async (context) => {
       const selection = context.document.getSelection();
       selection.insertText("Hello from Math Add-in", Word.InsertLocation.replace);
       await context.sync();
     });
     ```
   - Quan sát văn bản `"Hello from Math Add-in"` được chèn ngay tại vị trí con trỏ văn bản trong tài liệu Word.
4. Bấm thử các tab khác trên giao diện (*Hình phẳng*, *Không gian*, *BBT*, *Đồ thị*, *Ký hiệu*) để kiểm tra sự mượt mà của Fluent UI và React Router.

---

## 6. Cấu trúc mã nguồn

```text
math-word-addin/
├── manifest.xml                # Tệp cấu hình Add-in, khai báo Ribbon Tab "Toan Hoc" & 5 Groups
├── package.json                # Định nghĩa thư viện (React, Fluent UI v9, Office.js, Vite)
├── vite.config.ts              # Cấu hình Vite HTTPS (localhost:3000) và multi-page build
├── tsconfig.json               # Cấu hình TypeScript
├── tsconfig.node.json
├── taskpane.html               # Trang HTML nạp Office.js và gắn kết React root
├── index.html                  # Điểm truy cập dự phòng
├── assets/                     # Các biểu tượng PNG (16x16, 32x32, 64x64, 80x80) cho Ribbon
├── public/assets/              # Thư mục tĩnh phân phối assets qua Vite
└── src/
    └── taskpane/
        ├── index.tsx           # Khởi tạo Office.onReady và bọc FluentProvider
        ├── App.tsx             # Giao diện chính, React Router, Tabs và Milestone 1 Test Button
        ├── services/
        │   └── wordService.ts  # Tương tác với Word JavaScript API thông qua Word.run
        └── components/
            ├── FormulaEditor.tsx            # Trình soạn thảo công thức Toán
            ├── PlaneGeometryEditor.tsx      # Công cụ hình học phẳng (tam giác, đường tròn...)
            ├── SpaceGeometryEditor.tsx      # Công cụ hình không gian (khối chóp, lăng trụ, nón...)
            ├── VariationTableGenerator.tsx  # Bộ tạo bảng biến thiên hàm số
            ├── GraphPlotter.tsx             # Bộ vẽ phác thảo đồ thị trên hệ trục Oxy
            └── ShapeGallery.tsx             # Bảng ký hiệu toán học chèn nhanh
```
