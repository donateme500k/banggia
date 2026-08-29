import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "notice_popup_hidden_until";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

type Props = {
  enabled: boolean;
  title: string;
  content: string;
  buttonText: string;
};

export function NoticePopup({ enabled, title, content, buttonText }: Props) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lên lịch hiện lại popup khi hết hạn ẩn (không cần tải lại trang).
  const scheduleFrom = (hiddenUntil: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const remaining = hiddenUntil - Date.now();
    if (remaining <= 0) {
      setOpen(true);
      return;
    }
    setOpen(false);
    timerRef.current = setTimeout(() => setOpen(true), remaining);
  };

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const hiddenUntil = raw ? Number(raw) : 0;
    if (Number.isFinite(hiddenUntil) && hiddenUntil > Date.now()) {
      scheduleFrom(hiddenUntil);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setOpen(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const hideForTwoHours = () => {
    const until = Date.now() + TWO_HOURS_MS;
    window.localStorage.setItem(STORAGE_KEY, String(until));
    scheduleFrom(until);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-card animate-pop-in relative w-full max-w-md rounded-2xl p-6 shadow-glow"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Đóng thông báo"
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 className="pr-8 text-lg font-bold text-brand-gradient">{title}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {content}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={hideForTwoHours}
            className="bg-brand-gradient flex-1 font-semibold text-primary-foreground hover:opacity-90"
          >
            {buttonText}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
