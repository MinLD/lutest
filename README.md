# Lutest - Automated Testing & Scanning CLI

Lutest là một công cụ Command Line Interface (CLI) mạnh mẽ, chạy ngầm một kiến trúc phân tán (Host - Worker) để phục vụ cho việc tự động hóa trình duyệt và kiểm thử giao diện (sử dụng Playwright).

Dự án được xây dựng trên kiến trúc **Monorepo** với **Turborepo**, sử dụng **100% TypeScript** để tối ưu hóa việc chia sẻ dữ liệu và kiểu (types) giữa các module.

##  Kiến trúc hệ thống (Monorepo)

Dự án được chia thành các phân hệ độc lập nhưng giao tiếp chặt chẽ với nhau:

```text
lutest/
├── apps/
│   ├── cli-host/        # [Vỏ bọc] Tổng tư lệnh CLI (Quản lý vòng đời, cấp phát cổng động)
│   └── worker-node/     # [Lõi] Máy chủ Express chạy ngầm (Xử lý Playwright/Testing)
├── packages/
│   └── contracts/       # [Dùng chung] Các giao kèo API (Interfaces, Types)
├── turbo.json           # Cấu hình luồng chạy của Turborepo
└── package.json         # Quản lý NPM Workspaces
```
