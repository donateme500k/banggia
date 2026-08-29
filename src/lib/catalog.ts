export type Platform = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

export type Service = {
  id: string;
  platform_id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type Server = {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: number;
  min_qty: number;
  max_qty: number;
  sort_order: number;
  active: boolean;
};

export type Settings = Record<string, string>;

export type Catalog = {
  platforms: Platform[];
  services: Service[];
  servers: Server[];
  settings: Settings;
};

/** Dữ liệu mặc định khi API chưa sẵn sàng. */
export const DEFAULT_SETTINGS: Settings = {
  site_name: "SMM PRO",
  site_tagline: "Bảng giá dịch vụ mạng xã hội – nhanh, rẻ, uy tín",
  intro_text:
    "Chào mừng bạn đến với SMM PRO! Chọn nền tảng – dịch vụ – máy chủ bên dưới để xem giá ngay.",
  popup_enabled: "true",
  popup_title: "🎉 Thông báo",
  popup_content: "Chào mừng bạn đến với hệ thống!",
  popup_button_text: "Tắt 2 tiếng",
  buy_popup_content: "Vui lòng liên hệ admin qua Telegram hoặc Facebook để đặt mua.",
  contact_telegram: "https://t.me/username",
  contact_facebook: "https://facebook.com/username",
  contact_note: "Hỗ trợ 24/7",
};

export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch("/api/public/catalog");
  if (!res.ok) throw new Error("Không tải được bảng giá");
  const json = (await res.json()) as Partial<Catalog>;
  return {
    platforms: json.platforms ?? [],
    services: json.services ?? [],
    servers: json.servers ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(json.settings ?? {}) },
  };
}

export const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value * 100) / 100) + "đ";
