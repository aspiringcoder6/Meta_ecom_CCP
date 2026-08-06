# Meta Ecom API

Express + Prisma 7 API cho Creator Management và Dashboard metrics.

## Chạy local

1. Sao chép `.env.example` thành `.env` và điền `DATABASE_URL`.
2. Nếu dùng local Prisma Postgres, khởi động database bằng `npx prisma dev --detach` và đặt `DIRECT_URL` theo TCP URL được Prisma cung cấp.
3. Chạy migration: `npm run prisma:deploy`.
4. Nạp dữ liệu demo: `npm run prisma:seed`.
5. Chạy API: `npm run dev`.

API mặc định chạy tại `http://localhost:4000`. Vite development server đã proxy `/api` tới địa chỉ này.

## API Creator

- `GET /api/health` — trạng thái API.
- `GET /api/creators` — danh sách; hỗ trợ `search`, `segment`, `category`, `type`, `status`.
- `GET /api/creators/metrics` — tổng Creator, Category phổ biến nhất, Followers, GMV và Booking Expense.
- `GET /api/creators/:id` — chi tiết Creator.
- `POST /api/creators` — thêm Creator.
- `PATCH /api/creators/:id` — cập nhật Creator.
- `DELETE /api/creators/:id` — xóa Creator chưa liên kết Campaign.
- `POST /api/creators/import` — import với `mode: "append" | "replace"`.
- `POST /api/creators/batch` — commit nguyên tử các thay đổi từ spreadsheet, Undo/Redo và import preview.

Backend trả lỗi validation theo từng field trong `error.details`. TikTok ID được chuẩn hóa chữ thường và có unique constraint ở database.

## Kiểm tra

- `npm test` — unit/API health tests.
- `npm run build` — generate Prisma Client và kiểm tra TypeScript.

## Deploy

- Build Command: `npm install && npm run build`
- Pre-Deploy Command: `npm run prisma:deploy`
- Start Command: `npm start`
- Environment: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`

Với PostgreSQL thông thường trên Render, không cần đặt `DIRECT_URL`.
