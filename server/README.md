# Meta Ecom API

Express + Prisma 7 API cho Creator Management, Dashboard metrics và authentication theo Role.

## Chạy local

1. Sao chép `.env.example` thành `.env`, sau đó điền `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
2. Nếu dùng local Prisma Postgres, chạy `npm run db:start` và đặt `DIRECT_URL` theo TCP URL Prisma cung cấp.
3. Chạy migration: `npm run prisma:deploy`.
4. Nạp dữ liệu demo nếu cần: `npm run prisma:seed`.
5. Chạy API: `npm run dev`.

API mặc định chạy tại `http://localhost:4000`. Vite development server proxy `/api` tới địa chỉ này.

## Authentication và phân quyền

- `POST /api/auth/signup` — đăng ký email/password; account mới ở trạng thái `PENDING`.
- `POST /api/auth/login` — đăng nhập bằng email hoặc username.
- `POST /api/auth/google` — đăng ký/đăng nhập bằng Google ID token.
- `GET /api/auth/me` — khôi phục phiên đăng nhập.
- `POST /api/auth/logout` — kết thúc phiên.
- `GET /api/users` và `GET /api/users/metrics` — chỉ Admin.
- `POST/PATCH/DELETE /api/users` — Admin tạo account, duyệt/từ chối, gán Role, tạm ngưng hoặc xóa.

Server tạo hoặc đồng bộ default Admin từ `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` mỗi lần khởi động. `ADMIN_PASSWORD` cần tối thiểu 12 ký tự. Admin có thể tạo Admin khác trong màn hình **Tài khoản & phân quyền**.

Client không có account Role `CLIENT`; khách hàng chỉ dùng review link riêng trong module Client Review. Các request thay đổi dữ liệu dùng session cookie `HttpOnly` và CSRF token. Production cần HTTPS, đồng thời `CLIENT_ORIGIN` phải đúng origin frontend.

### Link Brand Review

- Link `/client-review/:token` được lưu trong database, không hết hạn và không tự đổi khi chỉnh sửa thông tin/trạng thái Campaign hoặc restart/deploy ứng dụng.
- Mỗi lần lấy link sẽ dùng lại token hiện có. Các link cũ chưa bị thu hồi vẫn hoạt động, kể cả khi trước đây đã hết hạn.
- Migration `20261006090000_permanent_brand_review_links` bỏ thời hạn của các link chưa bị thu hồi, không thay đổi token. Chạy `npm run prisma:deploy` trước khi khởi động bản backend mới.
- Link chỉ ngừng hoạt động nếu bị thu hồi, Campaign/database bị xóa, hoặc địa chỉ frontend không còn được duy trì. Khi đổi domain cần giữ domain cũ hoặc cấu hình chuyển hướng.
- Link cho phép Brand xem và cập nhật dữ liệu Campaign mà không cần đăng nhập; chỉ chia sẻ với người được phép truy cập. Link demo lưu trên trình duyệt không thay thế link backend.
- Brand có thể gửi 200 Creator trong một lần, bao gồm Brand Pick, Brand Note, sản phẩm và Brand Feedback. Server xử lý theo lô 50 KOC, khóa/đọc/cập nhật và lưu feedback theo lô. Các lô thành công được commit riêng. Lỗi dữ liệu được tách nhỏ để bỏ qua dòng lỗi và tiếp tục lưu phần còn lại; lỗi kết nối/hệ thống dừng xử lý, không hoàn tác các lô đã lưu.
- Hai API trả thêm `submissionResult` gồm số mục đã lưu, ID đã lưu, danh sách lỗi theo KOC/Deliverable và trạng thái gián đoạn. Frontend chỉ xóa draft đã được xác nhận lưu, giữ phần lỗi để sửa/gửi lại, bôi đỏ và hiển thị lý do. HTTP 200 có thể là thành công một phần; luôn kiểm tra `submissionResult.errors`.
- Mỗi giao dịch có giới hạn 15 giây (chờ kết nối tối đa 5 giây), toàn bộ xử lý giới hạn khoảng 60 giây trước khi bắt đầu lô tiếp theo. Frontend chờ tối đa 120 giây. Thông báo được cộng dồn bằng một khóa riêng cho lần gửi, chỉ có một thông báo tổng hợp cho mỗi người nhận và chỉ đếm phần đã commit.

### Google Sign-In

Tạo một **OAuth 2.0 Web Client** trong Google Cloud Console. Dùng cùng Client ID cho:

- Backend: `GOOGLE_CLIENT_ID`
- Frontend: `VITE_GOOGLE_CLIENT_ID`

Thêm `http://localhost:5173` và URL frontend production vào **Authorized JavaScript origins**. Luồng này chỉ cần Web Client ID, không cần API key hoặc Client Secret.

## API Creator

- `GET /api/creators` — Admin, Campaign Manager, Member và Viewer; Viewer nhận dữ liệu đã ẩn contact.
- `GET /api/creators/metrics` — các Role nội bộ đã đăng nhập.
- `GET /api/creators/:id` — Admin, Campaign Manager và Member.
- `POST/PATCH/DELETE /api/creators` — Admin.
- `POST /api/creators/import` và `POST /api/creators/batch` — Admin.

Backend trả lỗi validation theo field trong `error.details`. TikTok ID được chuẩn hóa chữ thường và có unique constraint ở database.

## Kiểm tra

- `npm test` — unit/API health tests.
- `npm run build` — generate Prisma Client và kiểm tra TypeScript.

## Deploy Render

- Build Command: `npm install && npm run build`
- Pre-Deploy Command: `npm run prisma:deploy`
- Start Command: `npm start`
- Environment bắt buộc: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`, `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`.
- Google (khi bật): `GOOGLE_CLIENT_ID`.

Với PostgreSQL thông thường trên Render, không cần đặt `DIRECT_URL`.
