import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Facebook, Send, ShieldCheck, Zap, Headphones, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NoticePopup } from "@/components/NoticePopup";
import { BuyPopup } from "@/components/BuyPopup";
import { PriceCalculator } from "@/components/PriceCalculator";
import { DEFAULT_SETTINGS, fetchCatalog, type Catalog } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bảng giá dịch vụ SMM – Tính giá nhanh, giá rẻ uy tín" },
      {
        name: "description",
        content:
          "Bảng tính giá nhanh dịch vụ tăng tương tác mạng xã hội: chọn nền tảng, dịch vụ, máy chủ và xem giá tức thì. Hỗ trợ 24/7 qua Telegram và Facebook.",
      },
      { property: "og:title", content: "Bảng giá dịch vụ SMM – Tính giá nhanh" },
      {
        property: "og:description",
        content:
          "Chọn nền tảng, dịch vụ và máy chủ để xem giá ngay. Không cần đăng nhập, hỗ trợ 24/7.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const EMPTY_CATALOG: Catalog = {
  platforms: [],
  services: [],
  servers: [],
  settings: DEFAULT_SETTINGS,
};

function HomePage() {
  const [buyOpen, setBuyOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
    staleTime: 30_000,
  });

  const catalog = data ?? EMPTY_CATALOG;
  const s = (key: string): string =>
    catalog.settings[key] ?? DEFAULT_SETTINGS[key] ?? "";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="bg-app-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-lg font-black text-primary-foreground">
            S
          </span>
          <span className="text-lg font-extrabold tracking-tight">{s("site_name")}</span>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={s("contact_telegram")} target="_blank" rel="noreferrer">
              <Send className="mr-1.5 size-4" /> Telegram
            </a>
          </Button>
          <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
            <a href={s("contact_facebook")} target="_blank" rel="noreferrer">
              <Facebook className="mr-1.5 size-4" /> Facebook
            </a>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pb-16">
        <section className="animate-float-up py-8 text-center sm:py-12">
          <h1 className="text-3xl font-black leading-tight sm:text-5xl">
            <span className="text-brand-gradient">{s("site_tagline")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {s("intro_text")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <span className="glass-card flex items-center gap-2 rounded-full px-4 py-2">
              <Zap className="size-4 text-primary" /> Lên đơn tốc độ cao
            </span>
            <span className="glass-card flex items-center gap-2 rounded-full px-4 py-2">
              <ShieldCheck className="size-4 text-primary" /> Bảo hành uy tín
            </span>
            <span className="glass-card flex items-center gap-2 rounded-full px-4 py-2">
              <Headphones className="size-4 text-primary" /> {s("contact_note")}
            </span>
          </div>
        </section>

        <section id="bang-gia" className="mt-2">
          {isLoading ? (
            <div className="glass-card space-y-4 rounded-2xl p-6">
              <Skeleton className="h-8 w-56" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10" />
            </div>
          ) : isError ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <AlertTriangle className="mx-auto size-8 text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">
                Không tải được bảng giá. Vui lòng thử lại sau ít phút hoặc liên hệ admin.
              </p>
            </div>
          ) : (
            <PriceCalculator catalog={catalog} onBuy={() => setBuyOpen(true)} />
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href={s("contact_telegram")}
            target="_blank"
            rel="noreferrer"
            className="glass-card flex items-center gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 hover:shadow-glow"
          >
            <span className="bg-brand-gradient flex size-11 items-center justify-center rounded-xl text-primary-foreground">
              <Send className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Telegram</p>
              <p className="text-xs text-muted-foreground">{s("contact_telegram")}</p>
            </div>
          </a>
          <a
            href={s("contact_facebook")}
            target="_blank"
            rel="noreferrer"
            className="glass-card flex items-center gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 hover:shadow-glow"
          >
            <span className="bg-brand-gradient flex size-11 items-center justify-center rounded-xl text-primary-foreground">
              <Facebook className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Facebook</p>
              <p className="text-xs text-muted-foreground">{s("contact_facebook")}</p>
            </div>
          </a>
        </section>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {s("site_name")}. All rights reserved.
        </footer>
      </main>

      <NoticePopup
        enabled={s("popup_enabled") !== "false"}
        title={s("popup_title")}
        content={s("popup_content")}
        buttonText={s("popup_button_text")}
      />
      <BuyPopup
        open={buyOpen}
        content={s("buy_popup_content")}
        onClose={() => setBuyOpen(false)}
      />
    </div>
  );
}
