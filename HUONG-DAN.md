# Website Bảng Giá + Bot Telegram quản trị

Website hiển thị **một bảng tính giá nhanh duy nhất** (nền tảng → dịch vụ → máy chủ → số lượng → thành tiền),
popup thông báo có nút **“Tắt 2 tiếng”**, popup mua hàng tự tắt sau 3 giây.
Khách chỉ xem — mọi nội dung được sửa qua **Bot Telegram** của admin.

## 1. Công nghệ

- TanStack Start (React 19 + Vite 7, SSR) — chạy được trên Vercel / Cloudflare / Netlify.
- Tailwind CSS v4 (design system trong `src/styles.css`).
- Lưu trữ dữ liệu: **Vercel KV** (Upstash Redis REST) — toàn bộ bảng giá & cấu hình nằm trong 1 khoá JSON `smm:data:v1`, tự seed dữ liệu mẫu lần chạy đầu.
- Webhook Telegram: `src/routes/api/public/telegram/webhook.ts` (chạy server-side, token KHÔNG lộ ra client).

## 2. Cấu trúc code

```
src/
  routes/
    index.tsx                              # Trang chủ (giới thiệu + bảng tính giá + liên hệ)
    api/public/telegram/webhook.ts         # Webhook bot Telegram (bảo mật 2 lớp)
  components/
    NoticePopup.tsx                        # Popup thông báo + nút "Tắt 2 tiếng" (localStorage)
    BuyPopup.tsx                           # Popup mua hàng tự đóng 3 giây
    PriceCalculator.tsx                    # Bảng tính giá nhanh
    api/public/catalog.ts                  # API công khai chỉ đọc (đọc từ Vercel KV)
  lib/catalog.ts                           # Fetch bảng giá cho client + dữ liệu mặc định
  lib/kv.server.ts                         # Kết nối Vercel KV + seed dữ liệu
  lib/db.server.ts                         # Lớp truy vấn/ghi dữ liệu trên KV
  styles.css                               # Toàn bộ màu sắc / hiệu ứng (design tokens)
```

## 3. Biến môi trường

| Biến | Mô tả |
|---|---|
| `KV_REST_API_URL` | URL Vercel KV (Vercel tự thêm khi bạn tạo/kết nối KV store) |
| `KV_REST_API_TOKEN` | Token Vercel KV — **chỉ ở server** |
| `TELEGRAM_BOT_TOKEN` | Token bot lấy từ @BotFather |
| `ADMIN_TELEGRAM_IDS` | Danh sách ID Telegram admin, cách nhau bởi dấu phẩy |

Trên Vercel: Project → Settings → Environment Variables → thêm đủ các biến trên (KHÔNG đặt tiền tố `VITE_` cho token bot).

## 4. Đăng ký webhook cho bot

```bash
SECRET=$(node -e "console.log(require('crypto').createHash('sha256').update('telegram-webhook:'+process.env.TELEGRAM_BOT_TOKEN).digest('base64url'))")

curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"https://TEN-MIEN-CUA-BAN/api/public/telegram/webhook\",\"secret_token\":\"$SECRET\",\"allowed_updates\":[\"message\",\"edited_message\"]}"
```

## 5. Lệnh bot

```
/help                     Xem hướng dẫn
/list                     Xem nền tảng / dịch vụ / máy chủ (kèm mã)
/settings                 Xem cấu hình website

/addnt Tên | Icon                       Thêm nền tảng
/delnt mã                               Xoá nền tảng
/adddv mã_nền_tảng | Tên                Thêm dịch vụ
/deldv mã                               Xoá dịch vụ
/addsv mã_dịch_vụ | Tên | Giá | Min | Max | Mô tả
/editsv mã | trường | giá trị           (name, price, min_qty, max_qty, description, active, sort_order)
/delsv mã                               Xoá máy chủ

/set khóa | giá trị
   site_name, site_tagline, intro_text,
   popup_enabled (true/false), popup_title, popup_content, popup_button_text,
   buy_popup_content, contact_telegram, contact_facebook, contact_note
```

Ví dụ: `/set popup_content | Khuyến mãi nạp tiền +20% hôm nay!`

## 6. Bảo mật

- Webhook kiểm tra `X-Telegram-Bot-Api-Secret-Token` (so sánh timing-safe) **và** `ADMIN_TELEGRAM_IDS`.
- Database bật RLS: khách chỉ được **đọc**, mọi thao tác ghi chỉ thực hiện từ server bằng service role.
- Không có token nào nằm trong code client.

## 7. Chạy local

```bash
bun install     # hoặc npm install
bun run dev     # http://localhost:8080
```
