/**
 * Vercel KV (Upstash Redis REST) — lớp lưu trữ dữ liệu duy nhất của app.
 *
 * Biến môi trường cần có (Vercel tự thêm khi kết nối KV store):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 */

const DOC_KEY = "smm:data:v1";

export type Platform = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type Service = {
  id: string;
  platform_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type ServerRow = {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: number;
  min_qty: number;
  max_qty: number;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type DataDoc = {
  platforms: Platform[];
  services: Service[];
  servers: ServerRow[];
  site_settings: Record<string, string>;
};

export const SEED_SETTINGS: Record<string, string> = {
  site_name: "SMM PRO",
  site_tagline: "Bảng giá dịch vụ mạng xã hội – nhanh, rẻ, uy tín",
  intro_text:
    "Chào mừng bạn đến với SMM PRO! Chúng tôi cung cấp dịch vụ tăng tương tác mạng xã hội giá rẻ, tốc độ nhanh, bảo hành uy tín. Chọn nền tảng – dịch vụ – máy chủ bên dưới để xem giá ngay.",
  popup_enabled: "true",
  popup_title: "🎉 Thông báo từ Admin",
  popup_content:
    "Hệ thống đang khuyến mãi nạp tiền +10%. Liên hệ Telegram để được hỗ trợ nhanh nhất!",
  popup_button_text: "Tắt 2 tiếng",
  buy_popup_content:
    "Vui lòng liên hệ Telegram hoặc Facebook của admin để đặt mua dịch vụ. Cảm ơn bạn!",
  contact_telegram: "https://t.me/username",
  contact_facebook: "https://facebook.com/username",
  contact_note: "Hỗ trợ 24/7",
};

function seedDoc(): DataDoc {
  const now = new Date().toISOString();
  const fb: Platform = {
    id: crypto.randomUUID(),
    name: "Facebook",
    icon: "📘",
    sort_order: 1,
    active: true,
    created_at: now,
  };
  const tt: Platform = {
    id: crypto.randomUUID(),
    name: "TikTok",
    icon: "🎵",
    sort_order: 2,
    active: true,
    created_at: now,
  };
  const mk = (platform_id: string, name: string, sort_order: number): Service => ({
    id: crypto.randomUUID(),
    platform_id,
    name,
    sort_order,
    active: true,
    created_at: now,
  });
  const fbFollow = mk(fb.id, "Follow", 1);
  const fbLike = mk(fb.id, "Like bài viết", 2);
  const ttFollow = mk(tt.id, "Follow", 1);

  const srv = (
    service_id: string,
    name: string,
    description: string,
    price: number,
    min_qty: number,
    max_qty: number,
    sort_order: number,
  ): ServerRow => ({
    id: crypto.randomUUID(),
    service_id,
    name,
    description,
    price,
    min_qty,
    max_qty,
    sort_order,
    active: true,
    created_at: now,
  });

  return {
    platforms: [fb, tt],
    services: [fbFollow, fbLike, ttFollow],
    servers: [
      srv(fbFollow.id, "sv1 Follow tây | nhanh", "Không bảo hành, lên nhanh", 3, 100, 100000, 1),
      srv(fbFollow.id, "sv2 Follow việt | chậm", "Bảo hành 30 ngày", 8, 50, 50000, 2),
      srv(fbLike.id, "sv1 Like tây", "Lên nhanh trong 5 phút", 2, 50, 20000, 1),
      srv(ttFollow.id, "sv1 Follow tiktok", "Server ổn định", 5, 100, 50000, 1),
    ],
    site_settings: { ...SEED_SETTINGS },
  };
}

function kvConfig() {
  const url = process.env["KV_REST_API_URL"];
  const token = process.env["KV_REST_API_TOKEN"];
  if (!url || !token) {
    throw new Error(
      "Thiếu KV_REST_API_URL / KV_REST_API_TOKEN. Hãy kết nối Vercel KV store cho project.",
    );
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function kvCommand<T>(command: unknown[]): Promise<T> {
  const { url, token } = kvConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Vercel KV lỗi ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(`Vercel KV lỗi: ${json.error}`);
  return json.result as T;
}

export async function readDoc(): Promise<DataDoc> {
  const raw = await kvCommand<string | null>(["GET", DOC_KEY]);
  if (!raw) {
    const doc = seedDoc();
    await writeDoc(doc);
    return doc;
  }
  const parsed = typeof raw === "string" ? (JSON.parse(raw) as DataDoc) : (raw as DataDoc);
  return {
    platforms: parsed.platforms ?? [],
    services: parsed.services ?? [],
    servers: parsed.servers ?? [],
    site_settings: { ...SEED_SETTINGS, ...(parsed.site_settings ?? {}) },
  };
}

export async function writeDoc(doc: DataDoc): Promise<void> {
  await kvCommand(["SET", DOC_KEY, JSON.stringify(doc)]);
}

export async function updateDoc<T>(fn: (doc: DataDoc) => T | Promise<T>): Promise<T> {
  const doc = await readDoc();
  const result = await fn(doc);
  await writeDoc(doc);
  return result;
}
