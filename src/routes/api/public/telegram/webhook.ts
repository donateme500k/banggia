import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Webhook Telegram — nơi DUY NHẤT được phép chỉnh sửa dữ liệu.
 * Bảo vệ 2 lớp: secret token của Telegram + danh sách ADMIN_TELEGRAM_IDS.
 */

function deriveSecret(botToken: string) {
  return createHash("sha256").update(`telegram-webhook:${botToken}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0) + "đ";
const LINE = "━━━━━━━━━━━━━━━━━━━━";

const MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "📋 Danh mục", callback_data: "list" },
      { text: "⚙️ Cấu hình", callback_data: "settings" },
    ],
    [
      { text: "➕ Thêm mới", callback_data: "guide_add" },
      { text: "✏️ Sửa / Xoá", callback_data: "guide_edit" },
    ],
    [{ text: "❓ Toàn bộ lệnh", callback_data: "help" }],
  ],
};

async function tg(botToken: string, method: string, payload: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  keyboard?: unknown,
) {
  // Telegram giới hạn 4096 ký tự — tự động chia nhỏ theo dòng.
  const chunks: string[] = [];
  let buf = "";
  for (const line of text.split("\n")) {
    if (buf.length + line.length + 1 > 3500) {
      chunks.push(buf);
      buf = "";
    }
    buf += (buf ? "\n" : "") + line;
  }
  if (buf) chunks.push(buf);

  for (let i = 0; i < chunks.length; i++) {
    await tg(botToken, "sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(keyboard && i === chunks.length - 1 ? { reply_markup: keyboard } : {}),
    });
  }
}

const HELP_MAIN = `<b>🤖 BOT QUẢN TRỊ BẢNG GIÁ</b>
${LINE}
<b>👀 XEM</b>
<code>/menu</code> — bảng điều khiển nhanh
<code>/list</code> — toàn bộ nền tảng · dịch vụ · máy chủ
<code>/settings</code> — toàn bộ cấu hình website
<code>/find từ_khoá</code> — tìm nhanh theo tên
<code>/id</code> — xem ID Telegram của bạn

<b>➕ THÊM</b>
<code>/addnt Tên | Icon</code>
<code>/adddv mã_nền_tảng | Tên</code>
<code>/addsv mã_dịch_vụ | Tên | Giá | Min | Max | Mô tả</code>

<b>✏️ SỬA</b>
<code>/editnt mã | trường | giá trị</code>
<code>/editdv mã | trường | giá trị</code>
<code>/editsv mã | trường | giá trị</code>
<code>/gia mã | giá mới</code> — sửa giá siêu nhanh
<code>/on mã</code> · <code>/off mã</code> — bật / tắt hiển thị

<b>🗑 XOÁ</b>
<code>/delnt mã</code> · <code>/deldv mã</code> · <code>/delsv mã</code>

<b>⚙️ WEBSITE / POPUP</b>
<code>/set khóa | giá trị</code>
<code>/get khóa</code>
<code>/popup on</code> · <code>/popup off</code>
${LINE}
💡 <i>Mã là 8 ký tự trong ngoặc vuông ở lệnh /list.</i>`;

const HELP_ADD = `<b>➕ HƯỚNG DẪN THÊM MỚI</b>
${LINE}
<b>1. Nền tảng</b>
<code>/addnt Facebook | 📘</code>

<b>2. Dịch vụ</b> (cần mã nền tảng)
<code>/adddv a1b2c3d4 | Tăng Like</code>

<b>3. Máy chủ</b> (cần mã dịch vụ)
<code>/addsv e5f6g7h8 | Server 1 | 25 | 100 | 50000 | Bảo hành 30 ngày</code>
${LINE}
💡 <i>Lấy mã bằng lệnh</i> <code>/list</code>`;

const HELP_EDIT = `<b>✏️ HƯỚNG DẪN SỬA / XOÁ</b>
${LINE}
<b>Nền tảng</b> — trường: name, icon, active, sort_order
<code>/editnt a1b2c3d4 | name | TikTok</code>

<b>Dịch vụ</b> — trường: name, active, sort_order
<code>/editdv e5f6g7h8 | name | Tăng Follow</code>

<b>Máy chủ</b> — trường: name, price, min_qty, max_qty, description, active, sort_order
<code>/editsv i9j0k1l2 | price | 30</code>
<code>/gia i9j0k1l2 | 30</code>

<b>Bật / tắt nhanh</b>
<code>/on i9j0k1l2</code> · <code>/off i9j0k1l2</code>

<b>Xoá</b>
<code>/delnt mã</code> · <code>/deldv mã</code> · <code>/delsv mã</code>
${LINE}
⚠️ <i>Xoá nền tảng sẽ xoá luôn dịch vụ & máy chủ bên trong.</i>`;

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env["TELEGRAM_BOT_TOKEN"];
        const adminIds = (process.env["ADMIN_TELEGRAM_IDS"] ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

        if (!botToken) return new Response("Not configured", { status: 500 });

        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(provided, deriveSecret(botToken))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = (await request.json()) as any;
        const callback = update.callback_query;
        const message = callback?.message ?? update.message ?? update.edited_message;
        const chatId: number | undefined = message?.chat?.id;
        const fromId = String((callback?.from ?? message?.from)?.id ?? "");
        const text: string = callback
          ? `/${String(callback.data ?? "").replace(/^guide_/, "guide ")}`
          : (update.message?.text ?? update.edited_message?.text ?? "").trim();

        if (callback) {
          await tg(botToken, "answerCallbackQuery", { callback_query_id: callback.id });
        }
        if (!chatId || !text) return Response.json({ ok: true });

        if (!adminIds.includes(fromId)) {
          await sendMessage(
            botToken,
            chatId,
            `⛔️ <b>Không có quyền</b>\n${LINE}\nBạn chưa nằm trong danh sách quản trị.\nID của bạn: <code>${esc(fromId)}</code>`,
          );
          return Response.json({ ok: true });
        }

        const { db: kvDb } = await import("@/lib/db.server");
        const db = kvDb as any;

        const [rawCmd, ...rest] = text.split(/\s+/);
        const cmd = (rawCmd ?? "").split("@")[0]?.toLowerCase() ?? "";
        const args = rest.join(" ");
        const parts = args.split("|").map((p) => p.trim());

        const short = (id: string) => id.slice(0, 8);
        const resolve = async (table: string, code: string) => {
          if (!code) return null;
          const { data } = await db.from(table).select("id").limit(500);
          return (data ?? []).find((r: { id: string }) => r.id.startsWith(code))?.id ?? null;
        };
        const reply = (msg: string, keyboard?: unknown) =>
          sendMessage(botToken, chatId, msg, keyboard);
        const usage = (line: string) => reply(`ℹ️ <b>Cú pháp</b>\n${LINE}\n<code>${esc(line)}</code>`);

        const editRow = async (
          table: string,
          label: string,
          allowed: string[],
          numeric: string[],
        ) => {
          const id = await resolve(table, parts[0] ?? "");
          const field = parts[1];
          const value = parts.slice(2).join(" | ");
          if (!id) return reply("❌ Không tìm thấy mã. Dùng <code>/list</code> để xem mã.");
          if (!field || !allowed.includes(field))
            return reply(
              `ℹ️ <b>Trường hợp lệ cho ${label}</b>\n${LINE}\n${allowed.map((a) => `<code>${a}</code>`).join(", ")}`,
            );
          const parsed =
            field === "active"
              ? value.toLowerCase() === "true" || value === "1"
              : numeric.includes(field)
                ? Number(value) || 0
                : value;
          const { error } = await db.from(table).update({ [field]: parsed }).eq("id", id);
          if (error) throw error;
          return reply(
            `✅ <b>Đã cập nhật ${label}</b>\n${LINE}\n<code>${esc(field)}</code> → <b>${esc(String(parsed))}</b>`,
          );
        };

        const toggle = async (code: string, active: boolean) => {
          for (const table of ["servers", "services", "platforms"]) {
            const id = await resolve(table, code);
            if (id) {
              const { error } = await db.from(table).update({ active }).eq("id", id);
              if (error) throw error;
              return reply(
                `${active ? "🟢 Đã bật" : "🔴 Đã tắt"} mục <code>${esc(code)}</code>`,
              );
            }
          }
          return reply("❌ Không tìm thấy mã.");
        };

        try {
          switch (cmd) {
            case "/start":
            case "/menu":
              await reply(
                `<b>👋 Xin chào Admin!</b>\n${LINE}\nChọn thao tác bên dưới hoặc gõ <code>/help</code> để xem toàn bộ lệnh.`,
                MENU_KEYBOARD,
              );
              break;

            case "/help":
              await reply(HELP_MAIN, MENU_KEYBOARD);
              break;

            case "/guide": {
              const which = (parts[0] ?? rest[0] ?? "").toLowerCase();
              await reply(which === "edit" ? HELP_EDIT : HELP_ADD, MENU_KEYBOARD);
              break;
            }

            case "/id":
              await reply(`🆔 ID Telegram của bạn: <code>${esc(fromId)}</code>`);
              break;

            case "/list": {
              const [{ data: pf }, { data: sv }, { data: srv }] = await Promise.all([
                db.from("platforms").select("*").order("sort_order"),
                db.from("services").select("*").order("sort_order"),
                db.from("servers").select("*").order("sort_order"),
              ]);
              let out = `<b>📋 DANH MỤC HIỆN TẠI</b>\n${LINE}`;
              for (const p of pf ?? []) {
                out += `\n\n${p.icon ? esc(p.icon) + " " : "📁 "}<b>${esc(p.name)}</b> ${p.active ? "🟢" : "🔴"}\n   mã: <code>${short(p.id)}</code>`;
                for (const s of (sv ?? []).filter((x: any) => x.platform_id === p.id)) {
                  out += `\n   ├ 🛠 <b>${esc(s.name)}</b> ${s.active ? "" : "🔴"} · <code>${short(s.id)}</code>`;
                  for (const r of (srv ?? []).filter((x: any) => x.service_id === s.id)) {
                    out += `\n   │   • ${esc(r.name)} — <b>${vnd(r.price)}</b> ${r.active ? "" : "🔴"}\n   │     min ${r.min_qty} · max ${r.max_qty} · <code>${short(r.id)}</code>`;
                  }
                }
              }
              if (!(pf ?? []).length) out += "\n\n<i>Chưa có dữ liệu.</i>";
              out += `\n${LINE}\n💡 Copy mã để dùng với lệnh sửa / xoá.`;
              await reply(out, MENU_KEYBOARD);
              break;
            }

            case "/find": {
              const q = args.trim().toLowerCase();
              if (!q) return await usage("/find từ_khoá"), Response.json({ ok: true });
              const [{ data: pf }, { data: sv }, { data: srv }] = await Promise.all([
                db.from("platforms").select("*"),
                db.from("services").select("*"),
                db.from("servers").select("*"),
              ]);
              const hit = (rows: any[]) =>
                (rows ?? []).filter((r) => String(r.name ?? "").toLowerCase().includes(q));
              let out = `<b>🔎 KẾT QUẢ CHO "${esc(q)}"</b>\n${LINE}`;
              for (const p of hit(pf)) out += `\n📁 ${esc(p.name)} · <code>${short(p.id)}</code>`;
              for (const s of hit(sv)) out += `\n🛠 ${esc(s.name)} · <code>${short(s.id)}</code>`;
              for (const r of hit(srv))
                out += `\n• ${esc(r.name)} — <b>${vnd(r.price)}</b> · <code>${short(r.id)}</code>`;
              await reply(out.endsWith(LINE) ? out + "\n<i>Không tìm thấy.</i>" : out);
              break;
            }

            case "/settings": {
              const { data } = await db.from("site_settings").select("*").order("key");
              const rows = (data ?? [])
                .map((r: any) => `• <code>${esc(r.key)}</code>\n   ${esc(r.value)}`)
                .join("\n");
              await reply(
                `<b>⚙️ CẤU HÌNH WEBSITE</b>\n${LINE}\n${rows || "<i>Trống.</i>"}\n${LINE}\nSửa: <code>/set khóa | giá trị</code>`,
                MENU_KEYBOARD,
              );
              break;
            }

            case "/get": {
              const key = (parts[0] ?? "").trim();
              if (!key) return await usage("/get khóa"), Response.json({ ok: true });
              const { data } = await db.from("site_settings").select("*").eq("key", key).maybeSingle();
              await reply(
                data
                  ? `<code>${esc(key)}</code>\n${LINE}\n${esc(data.value)}`
                  : `❌ Không có khóa <code>${esc(key)}</code>`,
              );
              break;
            }

            case "/set": {
              const key = parts[0] ?? "";
              const value = parts.slice(1).join(" | ");
              if (!key) return await usage("/set khóa | giá trị"), Response.json({ ok: true });
              const { error } = await db
                .from("site_settings")
                .upsert({ key, value, updated_at: new Date().toISOString() });
              if (error) throw error;
              await reply(
                `✅ <b>Đã lưu cấu hình</b>\n${LINE}\n<code>${esc(key)}</code>\n${esc(value)}`,
              );
              break;
            }

            case "/popup": {
              const v = (parts[0] ?? rest[0] ?? "").toLowerCase();
              if (v !== "on" && v !== "off")
                return await usage("/popup on  hoặc  /popup off"), Response.json({ ok: true });
              await db.from("site_settings").upsert({
                key: "popup_enabled",
                value: v === "on" ? "true" : "false",
                updated_at: new Date().toISOString(),
              });
              await reply(v === "on" ? "🟢 Đã bật popup thông báo." : "🔴 Đã tắt popup thông báo.");
              break;
            }

            case "/addnt": {
              const name = parts[0];
              if (!name) return await usage("/addnt Tên | Icon"), Response.json({ ok: true });
              const { data, error } = await db
                .from("platforms")
                .insert({ name, icon: parts[1] ?? "" })
                .select("id")
                .single();
              if (error) throw error;
              await reply(
                `✅ <b>Đã thêm nền tảng</b>\n${LINE}\n${esc(parts[1] ?? "📁")} ${esc(name)}\nmã: <code>${short(data.id)}</code>`,
              );
              break;
            }

            case "/adddv": {
              const pid = await resolve("platforms", parts[0] ?? "");
              const name = parts[1];
              if (!pid || !name)
                return await usage("/adddv mã_nền_tảng | Tên"), Response.json({ ok: true });
              const { data, error } = await db
                .from("services")
                .insert({ platform_id: pid, name })
                .select("id")
                .single();
              if (error) throw error;
              await reply(
                `✅ <b>Đã thêm dịch vụ</b>\n${LINE}\n🛠 ${esc(name)}\nmã: <code>${short(data.id)}</code>`,
              );
              break;
            }

            case "/addsv": {
              const sid = await resolve("services", parts[0] ?? "");
              const name = parts[1];
              if (!sid || !name)
                return (
                  await usage("/addsv mã_dịch_vụ | Tên | Giá | Min | Max | Mô tả"),
                  Response.json({ ok: true })
                );
              const { data, error } = await db
                .from("servers")
                .insert({
                  service_id: sid,
                  name,
                  price: Number(parts[2] ?? 0) || 0,
                  min_qty: Number(parts[3] ?? 1) || 1,
                  max_qty: Number(parts[4] ?? 100000) || 100000,
                  description: parts[5] ?? "",
                })
                .select("*")
                .single();
              if (error) throw error;
              await reply(
                `✅ <b>Đã thêm máy chủ</b>\n${LINE}\n• ${esc(name)} — <b>${vnd(data.price)}</b>\nmin ${data.min_qty} · max ${data.max_qty}\nmã: <code>${short(data.id)}</code>`,
              );
              break;
            }

            case "/editnt":
              await editRow("platforms", "nền tảng", ["name", "icon", "active", "sort_order"], [
                "sort_order",
              ]);
              break;

            case "/editdv":
              await editRow("services", "dịch vụ", ["name", "active", "sort_order"], ["sort_order"]);
              break;

            case "/editsv":
              await editRow(
                "servers",
                "máy chủ",
                ["name", "price", "min_qty", "max_qty", "description", "active", "sort_order"],
                ["price", "min_qty", "max_qty", "sort_order"],
              );
              break;

            case "/gia": {
              const id = await resolve("servers", parts[0] ?? "");
              const price = Number((parts[1] ?? "").replace(/[^\d.]/g, ""));
              if (!id || !Number.isFinite(price) || !parts[1])
                return await usage("/gia mã | giá mới"), Response.json({ ok: true });
              const { error } = await db.from("servers").update({ price }).eq("id", id);
              if (error) throw error;
              await reply(`✅ <b>Đã đổi giá</b>\n${LINE}\nGiá mới: <b>${vnd(price)}</b>`);
              break;
            }

            case "/on":
              await toggle((parts[0] ?? rest[0] ?? "").trim(), true);
              break;

            case "/off":
              await toggle((parts[0] ?? rest[0] ?? "").trim(), false);
              break;

            case "/delnt":
            case "/deldv":
            case "/delsv": {
              const table =
                cmd === "/delnt" ? "platforms" : cmd === "/deldv" ? "services" : "servers";
              const id = await resolve(table, parts[0] ?? "");
              if (!id)
                return (
                  await reply("❌ Không tìm thấy mã. Dùng <code>/list</code> để xem mã."),
                  Response.json({ ok: true })
                );
              const { error } = await db.from(table).delete().eq("id", id);
              if (error) throw error;
              await reply(`🗑 <b>Đã xoá</b>\n${LINE}\nmã: <code>${esc(parts[0] ?? "")}</code>`);
              break;
            }

            default:
              await reply(
                `❓ <b>Lệnh không hợp lệ</b>\n${LINE}\nGõ <code>/menu</code> hoặc <code>/help</code> để xem hướng dẫn.`,
                MENU_KEYBOARD,
              );
          }
        } catch (err) {
          await reply(
            `❌ <b>Lỗi</b>\n${LINE}\n${esc(err instanceof Error ? err.message : String(err))}`,
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
