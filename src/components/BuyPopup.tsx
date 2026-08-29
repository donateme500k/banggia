import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

type Props = {
  open: boolean;
  content: string;
  onClose: () => void;
  /** thời gian tự đóng, mặc định 3 giây */
  duration?: number;
};

export function BuyPopup({ open, content, onClose, duration = 3000 }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />
      <div
        role="alertdialog"
        aria-live="polite"
        className="glass-card animate-pop-in relative w-full max-w-sm rounded-2xl p-6 text-center shadow-glow"
      >
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
