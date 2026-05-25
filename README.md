<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>

<p align="center">
  <a href="https://nestjs.com" target="_blank"><img src="https://img.shields.io/badge/NestJS-11.0.1-E0234E?style=flat&logo=nestjs&logoColor=white" alt="NestJS" /></a>
  <a href="https://www.mongodb.com" target="_blank"><img src="https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB" /></a>
  <a href="https://redis.io" target="_blank"><img src="https://img.shields.io/badge/Redis-ioredis_5-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis" /></a>
  <a href="https://socket.io" target="_blank"><img src="https://img.shields.io/badge/Socket.IO-v4.8-010101?style=flat&logo=socket.io&logoColor=white" alt="Socket.IO" /></a>
  <a href="https://www.typescriptlang.org" target="_blank"><img src="https://img.shields.io/badge/TypeScript-5.1-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://swagger.io" target="_blank"><img src="https://img.shields.io/badge/OpenAPI-Swagger_11-85EA2D?style=flat&logo=swagger&logoColor=black" alt="Swagger" /></a>
  <a href="https://jestjs.io" target="_blank"><img src="https://img.shields.io/badge/Unit_Tests-123_Passed_100%25-brightgreen?style=flat&logo=jest&logoColor=white" alt="Tests" /></a>
</p>

# 💬 Realtime Chat Message Backend

Hệ thống Backend cho ứng dụng nhắn tin thời gian thực (Realtime Chat Application) được xây dựng trên nền tảng **NestJS**, **MongoDB (Mongoose)**, **Socket.IO**, **Redis**, và **Nodemailer**. Hỗ trợ chat 1-1, chat nhóm, gửi file đính kèm, xác thực tài khoản qua mã OTP email, và khả năng mở rộng ngang (Horizontal Scaling) qua Redis Adapter.


Frontend repository: [RealtimeChat-Frontend](https://github.com/dangngockhieu/RealtimeChat_Frontend)
---

## 📑 Mục lục
- [1. Danh sách tính năng](#1-danh-sách-tính-năng)
- [2. Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
- [3. Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
- [4. Chi tiết cấu hình theo từng Module](#4-chi-tiết-cấu-hình-theo-từng-module)
  - [4.1 File biến môi trường (.env)](#41-file-biến-môi-trường-env)
  - [4.2 Cấu hình MongoDB (src/modules/conversation, member, message)](#42-cấu-hình-mongodb)
  - [4.3 Cấu hình Redis (src/modules/redis, src/modules/chat-gateway)](#43-cấu-hình-redis)
  - [4.4 Cấu hình Thư mục Upload & Static Assets (public/uploads)](#44-cấu-hình-thư-mục-upload--static-assets)
  - [4.5 Cấu hình Email SMTP (src/modules/mail)](#45-cấu-hình-email-smtp)
- [5. Hướng dẫn cài đặt và chạy](#5-hướng-dẫn-cài-đặt-và-chạy)
- [6. Tài liệu API (Swagger)](#6-tài-liệu-api-swagger)
- [7. Kiểm thử (Unit Tests)](#7-kiểm-thử-unit-tests)

---

## 1. Danh sách tính năng

### 🔐 Xác thực & Người dùng (Auth & Users)
- **Đăng ký tài khoản & OTP Email:** Đăng ký tài khoản mới, hệ thống tự động sinh mã OTP 6 chữ số (hạn 5 phút) gửi qua SMTP Nodemailer.
- **Xác thực OTP (`/auth/verify-otp`) & Gửi lại OTP (`/auth/resend-otp`):** Kích hoạt tài khoản người dùng sau khi nhập đúng OTP.
- **Đăng nhập & Quản lý Token:** Cung cấp cặp **Access Token** (hạn ngắn) và **Refresh Token** (hạn dài, lưu hash an toàn trong DB).
- **Hồ sơ cá nhân:** Lấy thông tin cá nhân, cập nhật họ tên, đổi mật khẩu bảo mật qua Argon2.
- **Quản lý Avatar (Tự động dọn rác):**
  - Tải lên trực tiếp file ảnh đại diện (`POST /users/avatar`) lưu vào `./public/uploads/avatars`.
  - Cập nhật avatar qua URL (`PATCH /users/avatar`).
  - Gỡ ảnh đại diện (`DELETE /users/avatar`).
  - **Tự động xóa file avatar cũ trên đĩa** khi đổi avatar mới hoặc khi gỡ avatar, chống rò rỉ dung lượng ổ cứng và chống tấn công Path Traversal.

### 👥 Bạn bè (Friendship)
- Gửi lời mời kết bạn (ngăn chặn gửi cho chính mình hoặc gửi trùng).
- Chấp nhận hoặc từ chối lời mời kết bạn.
- Hủy lời mời đã gửi hoặc hủy kết bạn (Unfriend).
- Xem danh sách bạn bè, danh sách lời mời đã nhận và đã gửi.

### 💬 Cuộc trò chuyện (Conversation)
- **Chat 1-1 (Direct):** Tự động tìm lại cuộc trò chuyện cũ hoặc tạo mới nếu chưa tồn tại (sử dụng MongoDB Transaction Session).
- **Chat nhóm (Group):** Tạo nhóm chat với nhiều thành viên, tự động gán vai trò `OWNER` cho người tạo.
- Đổi tên nhóm chat, đổi avatar nhóm chat (yêu cầu quyền `ADMIN` hoặc `OWNER`).
- Giải tán nhóm chat (chỉ `OWNER`).
- Lấy chi tiết cuộc trò chuyện và danh sách cuộc trò chuyện của tôi có phân trang.

### 🛡️ Thành viên nhóm (Member)
- Thêm thành viên vào nhóm chat, xóa thành viên khỏi nhóm.
- Rời nhóm chat (tự động yêu cầu chuyển quyền nếu `OWNER` muốn rời).
- Phân quyền quản trị viên (`ADMIN` / `MEMBER`).
- Chuyển giao quyền Trưởng nhóm (`Transfer Owner`).
- Đánh dấu đã đọc tin nhắn (`Mark as read`) và cập nhật thời điểm đọc cuối cùng.
- Xóa lịch sử trò chuyện phía tôi (`Clear chat history` - chỉ ẩn tin nhắn với tài khoản hiện tại).

### 📨 Tin nhắn (Message)
- Gửi tin nhắn văn bản, hình ảnh, hoặc tệp đính kèm.
- **Phân trang dạng Cursor:** Tải tin nhắn cuộn ngược thời gian (dựa theo mốc `createdAt`), tối ưu hiệu năng không bị trùng lặp khi có tin nhắn mới.
- **Lọc tin nhắn thông minh:** Tự động loại bỏ các tin nhắn gửi trước thời điểm người dùng xóa lịch sử (`clearedAt`) hoặc tin nhắn nằm trong danh sách đã xóa cá nhân (`deletedBy`).
- **Thu hồi tin nhắn (`Recall Message`):** Người gửi có thể thu hồi tin nhắn trong vòng 24 giờ; Quản trị viên/Trưởng nhóm có thể thu hồi bất kỳ lúc nào.
- **Xóa tin nhắn phía tôi (`Delete for me`):** Chỉ ẩn tin nhắn đối với người thực hiện thao tác.

### ⚡ WebSocket Realtime (Socket.IO & Redis)
- **Xác thực Handshake:** Kiểm tra JWT qua header hoặc auth payload ngay khi client mở kết nối socket.
- **Tự động tham gia phòng:** Tự động join vào phòng cá nhân `user_{id}` và tất cả các phòng `conversation_{id}` mà user tham gia.
- **Sự kiện Realtime:**
  - `send_message`: Gửi tin nhắn và broadcast lập tức đến các thành viên trong cuộc trò chuyện.
  - `typing`: Phát tín hiệu trạng thái đang gõ phím đến phòng chat.
  - `mark_read`: Cập nhật trạng thái đã xem tin nhắn theo thời gian thực.
  - `recall_message`: Phát thông báo tin nhắn đã bị thu hồi đến toàn bộ người nhận.
  - `user_online` / `user_offline`: Báo hiệu trạng thái hoạt động của người dùng.
  - `check_online`: Truy vấn danh sách các user đang online cùng lúc.
- **Khả năng mở rộng ngang (Horizontal Scaling):**
  - Tích hợp `RedisIoAdapter` (`@socket.io/redis-adapter`) đồng bộ Pub/Sub giữa nhiều server instance.
  - Quản lý User Presence qua Redis Set (hỗ trợ người dùng mở nhiều tab hoặc nhiều thiết bị cùng lúc).
  - Tự động fallback về bộ nhớ trong (In-Memory) nếu Redis không khả dụng để dev server và tests không bị gián đoạn.

### 🚀 Tối ưu hóa & Hiệu năng (Caching)
- Lưu cache thông tin người dùng (`user:profile:{id}`) vào Redis với TTL 5 phút.
- Tự động xóa/invalidate cache khi hồ sơ, mật khẩu hoặc avatar được cập nhật.

---

## 2. Cấu trúc thư mục

```text
backend/
├── public/                       # Thư mục lưu trữ static files
│   └── uploads/                  # Files tải lên hệ thống
│       └── avatars/              # Ảnh đại diện của người dùng (tự tạo tự động)
├── src/
│   ├── auth/                     # Module xác thực & phân quyền (JWT, Local, Guards, OTP)
│   │   ├── decorator/            # Decorators tùy chỉnh (@User, @Public, @ResponseMessage)
│   │   ├── dto/                  # Data Transfer Objects cho Auth
│   │   ├── jwt/                  # JWT Strategy & Guards
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── interceptor/              # Interceptor chuẩn hóa response format ({ statusCode, message, data })
│   ├── modules/
│   │   ├── chat-gateway/         # WebSocket Gateway (Socket.IO realtime)
│   │   │   ├── chat.gateway.ts   # Gateway xử lý các sự kiện socket
│   │   │   ├── chat-gateway.module.ts
│   │   │   └── redis-io.adapter.ts # Adapter Redis hỗ trợ scale Socket.IO đa node
│   │   ├── conversation/         # Module quản lý cuộc trò chuyện (1-1, Group)
│   │   │   ├── dto/
│   │   │   ├── schemas/          # Mongoose Schema: Conversation
│   │   │   ├── conversation.controller.ts
│   │   │   ├── conversation.module.ts
│   │   │   └── conversation.service.ts
│   │   ├── friendship/           # Module quản lý quan hệ bạn bè
│   │   │   ├── dto/
│   │   │   ├── schemas/          # Mongoose Schema: Friendship
│   │   │   ├── friendship.controller.ts
│   │   │   ├── friendship.module.ts
│   │   │   ├── friendship.repository.ts
│   │   │   └── friendship.service.ts
│   │   ├── mail/                 # Module gửi email SMTP qua Nodemailer
│   │   │   ├── mail.module.ts
│   │   │   └── mail.service.ts
│   │   ├── member/               # Module quản lý thành viên cuộc trò chuyện
│   │   │   ├── dto/
│   │   │   ├── schemas/          # Mongoose Schema: Member
│   │   │   ├── member.controller.ts
│   │   │   ├── member.module.ts
│   │   │   └── member.service.ts
│   │   ├── message/              # Module tin nhắn & tệp đính kèm
│   │   │   ├── dto/
│   │   │   ├── schemas/          # Mongoose Schema: Message
│   │   │   ├── message.controller.ts
│   │   │   ├── message.module.ts
│   │   │   └── message.service.ts
│   │   ├── redis/                # Module Redis (Presence, Caching, In-Memory Fallback)
│   │   │   ├── redis.constants.ts
│   │   │   ├── redis.module.ts
│   │   │   └── redis.service.ts
│   │   ├── upload/               # Module tải lên hình ảnh & file đính kèm
│   │   │   ├── upload.controller.ts
│   │   │   ├── upload.module.ts
│   │   │   └── upload.service.ts
│   │   └── user/                 # Module thông tin người dùng & Avatar
│   │       ├── dto/
│   │       ├── schemas/          # Mongoose Schema: User
│   │       ├── user.controller.ts
│   │       ├── user.module.ts
│   │       ├── user.repository.ts
│   │       └── user.service.ts
│   ├── response/                 # DTO chuẩn hóa dữ liệu trả về cho client
│   ├── app.controller.ts
│   ├── app.module.ts             # Root Module kết nối toàn bộ hệ thống
│   ├── app.service.ts
│   └── main.ts                   # Điểm khởi chạy ứng dụng (Bootstrap)
├── test/                         # E2E Test Suite
├── .env.example                  # File mẫu biến môi trường
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Công nghệ sử dụng

| Công nghệ | Mục đích |
| :--- | :--- |
| **NestJS 11** | TypeScript Framework xây dựng kiến trúc modular, Clean Architecture |
| **MongoDB & Mongoose 9** | Cơ sở dữ liệu NoSQL lưu trữ User, Conversation, Member, Message, Friendship |
| **Socket.IO 4** | Giao thức WebSocket thời gian thực (Realtime Chat & Presence) |
| **Redis & ioredis** | Socket.IO Adapter scale ngang, Quản lý User Presence, Caching API |
| **Argon2** | Thuật toán băm mật khẩu bảo mật cao (chống brute-force) |
| **Passport & JWT** | Xác thực người dùng qua Access Token và Refresh Token |
| **Nodemailer** | Gửi email mã OTP xác minh tài khoản |
| **Multer** | Xử lý tải lên file ảnh và tài liệu |
| **Swagger (OpenAPI)** | Sinh tài liệu tương tác API tự động |
| **Jest & ts-jest** | Bộ khung kiểm thử Unit Testing |

---

## 4. Chi tiết cấu hình theo từng Module

### 4.1 File biến môi trường (.env)
Tạo file `.env` tại thư mục gốc dự án dựa trên mẫu [.env.example](file:///d:/Project/message/.env.example):

```env
# ================== CẤU HÌNH SERVER ==================
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# ================== MONGODB ==================
MONGODB_URI=mongodb://localhost:27017/be_message

# ================== CORS ==================
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# ================== JWT AUTHENTICATION ==================
JWT_SECRET=your_jwt_access_secret_key_here
JWT_EXPIRED=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
REFRESH_EXPIRED=7d

# ================== EMAIL SMTP (GỬI OTP) ==================
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password
VERIFY_BASE_URL=http://localhost:3000/verify-email

# ================== REDIS CONFIG (SOCKET SCALE & CACHE) ==================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

### 4.2 Cấu hình MongoDB
Ứng dụng sử dụng **Mongoose 9** kết nối tới MongoDB. Đối với các thao tác tạo nhóm và tạo chat 1-1, hệ thống sử dụng **MongoDB Transactions (`connection.startSession()`)**.

- **Khởi chạy MongoDB cục bộ qua Docker:**
```bash
docker run -d --name mongodb -p 27017:27017 -v mongo_data:/data/db mongo:7.0
```
- **Lưu ý về Transaction:** Khi chạy môi trường Production hoặc test transaction thực tế trên MongoDB, MongoDB cần được cấu hình dưới dạng **Replica Set**. Với local development cơ bản, mock test và unit test đã được mock session sẵn.
- **Indexes chính đã cấu hình:**
  - `User`: `email` (unique index).
  - `Member`: `conversationId + userId` (compound unique index), `userId + status`.
  - `Message`: `conversationId + createdAt` (compound index phục vụ cursor-based pagination).
  - `Friendship`: `requester + recipient`.

---

### 4.3 Cấu hình Redis
Module [src/modules/redis/](file:///d:/Project/message/src/modules/redis/) và [redis-io.adapter.ts](file:///d:/Project/message/src/modules/chat-gateway/redis-io.adapter.ts) phục vụ 3 mục đích chính:
1. **Socket.IO Scaling:** Sử dụng `@socket.io/redis-adapter` đồng bộ tin nhắn broadcast giữa nhiều pod/server.
2. **Quản lý User Presence:** Lưu các kết nối active vào Redis Set: `presence:user:{userId}` (tự động dọn sau 24h).
3. **Caching:** Lưu cache hồ sơ người dùng (`cache:user:profile:{userId}`) với TTL 5 phút, tự động xóa khi có cập nhật.

- **Khởi chạy Redis cục bộ qua Docker:**
```bash
docker run -d --name redis-chat -p 6379:6379 redis:alpine
```
- **Cơ chế Graceful In-Memory Fallback:** Nếu bạn không khởi chạy Redis, ứng dụng sẽ ghi nhận cảnh báo trong log và tự động chuyển sang chế độ **In-Memory Map**. Toàn bộ tính năng chat và API vẫn hoạt động bình thường mà không gây crash server.

---

### 4.4 Cấu hình Thư mục Upload & Static Assets
Module [src/modules/upload/](file:///d:/Project/message/src/modules/upload/) xử lý file đính kèm và ảnh đại diện:
- **Thư mục lưu trữ:**
  - File đính kèm tin nhắn & ảnh bài viết: `./public/uploads/`
  - Ảnh đại diện người dùng: `./public/uploads/avatars/`
- **Tự động khởi tạo:** Thư mục sẽ được tự động tạo (`mkdirSync`) nếu chưa tồn tại khi server khởi động.
- **Phục vụ tĩnh:** Cấu hình trong [src/main.ts](file:///d:/Project/message/src/main.ts) qua `app.useStaticAssets` với tiền tố URL `/public/`.
- **Bảo mật Helmet:** Cấu hình `crossOriginResourcePolicy: false` để trình duyệt của client không bị chặn khi load ảnh từ backend.
- **Chống rò rỉ & Path Traversal:** API đổi avatar (`POST /users/avatar`, `PATCH /users/avatar`) và gỡ avatar (`DELETE /users/avatar`) sẽ tự động xóa file avatar cũ trên đĩa và kiểm tra an toàn đường dẫn.

---

### 4.5 Cấu hình Email SMTP
Module [src/modules/mail/](file:///d:/Project/message/src/modules/mail/) sử dụng **Nodemailer** gửi email xác thực tài khoản:
- **Nhà cung cấp:** Gmail SMTP (`smtp.gmail.com`, Port `587`).
- **Tài khoản gửi:** `MAIL_USER` là địa chỉ Gmail của bạn.
- **Mật khẩu:** `MAIL_PASS` là **Mật khẩu ứng dụng (App Password)** gồm 16 ký tự:
  1. Truy cập [Google Account Security](https://myaccount.google.com/security).
  2. Bật Xác minh 2 bước (2-Step Verification).
  3. Chọn mục **Mật khẩu ứng dụng (App Passwords)** -> Đặt tên ứng dụng là `ChatApp` -> Sao chép chuỗi mật khẩu 16 chữ cái dán vào `MAIL_PASS` trong file `.env`.

---

## 5. Hướng dẫn cài đặt và chạy

### Bước 1: Clone mã nguồn & Cài đặt thư viện
```bash
# Clone repository
git clone <repository-url>
cd message

# Cài đặt các gói phụ thuộc
npm install
```

### Bước 2: Chuẩn bị file môi trường
```bash
cp .env.example .env
# Mở file .env và cập nhật các thông số MONGODB_URI, JWT_SECRET, MAIL_USER, MAIL_PASS
```

### Bước 3: Khởi chạy ứng dụng
```bash
# Chế độ phát triển (Development với Hot-Reload)
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

Server sẽ khởi chạy tại: `http://localhost:3000` (hoặc cổng cấu hình trong file `.env`).

---

## 6. Tài liệu API (Swagger)

Hệ thống được tích hợp sẵn Swagger UI đầy đủ mô tả schema, DTO và các mã phản hồi HTTP.

Sau khi khởi chạy ứng dụng, truy cập vào đường dẫn:
```text
http://localhost:3000/api/docs
```

- Bấm nút **Authorize** ở góc phải để nhập JWT Token (dạng `Bearer <your_token>`) để thử nghiệm trực tiếp các API yêu cầu đăng nhập.

---

## 7. Kiểm thử (Unit Tests)

Dự án đạt độ phủ kiểm thử cao với **17 Test Suites và 123 bài kiểm thử Unit Test** hoàn toàn vượt qua (**100% PASS**):

```bash
# Chạy toàn bộ Unit Tests
npm run test

# Chạy test và theo dõi thay đổi (Watch mode)
npm run test:watch

# Xuất báo cáo độ phủ mã nguồn (Coverage report)
npm run test:cov
```
