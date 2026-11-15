# HƯỚNG DẪN TRIỂN KHAI CLOUD & SỬ DỤNG CHO MỌI MÁY TÍNH

Bộ công cụ Toán Học Word Add-in hoạt động theo cơ chế **Office Web Add-in** chuẩn của Microsoft:
* Giao diện và các thuật toán tính toán được lưu trữ trên máy chủ Cloud (Netlify / Vercel).
* Word chỉ cần một file định danh duy nhất (`manifest.xml`) để nạp toàn bộ công cụ vào thanh Ribbon.
* **Không cần cài đặt Node.js hay mở PowerShell trên bất kỳ máy tính nào!**

---

## 🚀 BƯỚC 1: ĐƯA ỨNG DỤNG LÊN CLOUD MIỄN PHÍ (Chỉ làm 1 lần)

### Cách đơn giản nhất (Dùng Netlify Drop - Miễn phí vĩnh viễn):
1. Nhấp đúp chạy file **`1_Dong_Goi_Ung_Dung.bat`** trong thư mục dự án. Thư mục `dist` chứa bản phát hành sẽ tự động mở ra.
2. Mở trình duyệt web và truy cập vào: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
3. Kéo toàn bộ thư mục **`dist`** và thả vào khung viền nét đứt trên trang web.
4. Đợi khoảng 5-10 giây, Netlify sẽ tạo cho bạn một đường link HTTPS công khai (ví dụ: `https://amazing-euler-123456.netlify.app`).
5. *(Tùy chọn đặt tên đẹp)*: Bấm vào **Site configuration** -> **Change site name** -> đổi thành tên bạn thích (ví dụ: `toan-word-addin.netlify.app`).

---

## ⚙️ BƯỚC 2: TẠO FILE CÀI ĐẶT CHO WORD

1. Nhấp đúp chạy file **`2_Tao_File_Cai_Dat_Word.bat`**.
2. Nhập đường link HTTPS bạn vừa nhận được ở Bước 1 (ví dụ: `https://toan-word-addin.netlify.app`) rồi bấm **Enter**.
3. Thư mục **`Ban_Cai_Dat_Cac_May_Tinh`** sẽ mở ra, bên trong có duy nhất 1 file: **`manifest.xml`**.

---

## 💻 BƯỚC 3: CÀI ĐẶT LÊN BẤT KỲ MÁY TÍNH NÀO (Ở trường, ở nhà, máy đồng nghiệp)

Trên bất kỳ máy tính nào có Microsoft Word (Word 2016, 2019, 2021, Office 365, Word trên Mac hoặc Word Web):

1. **Sao chép file `manifest.xml`** (ở Bước 2) sang máy tính đó:
   * Ví dụ lưu vào thư mục: `C:\WordAddins\manifest.xml` (hoặc `D:\TienIch\manifest.xml`).
2. Mở **Microsoft Word** -> vào menu **File** -> **Options** -> **Trust Center**.
3. Bấm nút **Trust Center Settings...** -> chọn mục **Trusted Add-in Catalogs**.
4. Tại ô **Catalog Url**, nhập đường dẫn thư mục vừa lưu file (ví dụ `C:\WordAddins`) -> bấm **Add catalog**.
5. Đánh dấu tích vào ô **Show in Menu** bên cạnh đường dẫn đó -> bấm **OK** rồi khởi động lại Word.
6. Mở Word lại -> vào tab **Insert** -> chọn **My Add-ins** (hoặc **Get Add-ins**).
7. Nhấp vào thẻ **SHARED FOLDER** (Thư mục dùng chung) -> Bạn sẽ thấy mục **Toán Học** -> Bấm **Add**.
8. Tab **Toán Học** sẽ xuất hiện vĩnh viễn trên thanh Ribbon của Word!

---

## 🔄 CƠ CHẾ TỰ ĐỘNG CẬP NHẬT KHI BẠN SỬA ĐỔI HOẶC THÊM TÍNH NĂNG MỚI

Khi bạn thay đổi công thức, thêm dạng đồ thị mới, hoặc nâng cấp giao diện:
1. Bạn chỉ cần chạy lại file **`1_Dong_Goi_Ung_Dung.bat`**.
2. Kéo thư mục `dist` mới thả vào trang quản lý Netlify của bạn để cập nhật.
3. **KẾT QUẢ:**
   * **Tất cả các máy tính khác đã cài Add-in hoàn toàn không cần thao tác gì thêm!**
   * Mỗi khi người dùng mở Word (hoặc bấm chuột phải vào Taskpane chọn **Reload**), Word sẽ tự động tải phiên bản mới nhất từ Cloud về.
   * Không bao giờ phải đi cài lại hay copy lại file manifest!
