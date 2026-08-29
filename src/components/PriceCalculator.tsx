import { useEffect, useMemo, useState } from "react";
import { Calculator, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatVnd, type Catalog } from "@/lib/catalog";

type Props = {
  catalog: Catalog;
  onBuy: () => void;
};

export function PriceCalculator({ catalog, onBuy }: Props) {
  const { platforms, services, servers } = catalog;

  const [platformId, setPlatformId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serverId, setServerId] = useState("");
  const [qty, setQty] = useState("100");

  const platformServices = useMemo(
    () => services.filter((s) => s.platform_id === platformId),
    [services, platformId],
  );
  const serviceServers = useMemo(
    () => servers.filter((s) => s.service_id === serviceId),
    [servers, serviceId],
  );
  const server = useMemo(
    () => serviceServers.find((s) => s.id === serverId) ?? null,
    [serviceServers, serverId],
  );

  useEffect(() => {
    setServiceId("");
    setServerId("");
  }, [platformId]);

  useEffect(() => {
    setServerId("");
  }, [serviceId]);

  useEffect(() => {
    if (server) setQty(String(server.min_qty));
  }, [server]);

  const qtyNumber = Number(qty) || 0;
  const total = server ? qtyNumber * Number(server.price) : 0;
  const qtyError = server
    ? qtyNumber < server.min_qty
      ? `Số lượng tối thiểu là ${server.min_qty}`
      : qtyNumber > server.max_qty
        ? `Số lượng tối đa là ${server.max_qty}`
        : ""
    : "";

  return (
    <div className="glass-card animate-float-up rounded-2xl p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-primary-foreground">
          <Calculator className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Bảng tính giá nhanh</h2>
          <p className="text-xs text-muted-foreground">
            Chọn nền tảng → dịch vụ → máy chủ để xem giá
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Nền tảng</Label>
          <Select value={platformId} onValueChange={setPlatformId}>
            <SelectTrigger className="w-full bg-surface">
              <SelectValue placeholder="Chọn nền tảng" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Dịch vụ</Label>
          <Select value={serviceId} onValueChange={setServiceId} disabled={!platformId}>
            <SelectTrigger className="w-full bg-surface">
              <SelectValue placeholder="Chọn dịch vụ" />
            </SelectTrigger>
            <SelectContent>
              {platformServices.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Máy chủ</Label>
          <Select value={serverId} onValueChange={setServerId} disabled={!serviceId}>
            <SelectTrigger className="w-full bg-surface">
              <SelectValue placeholder="Chọn máy chủ" />
            </SelectTrigger>
            <SelectContent>
              {serviceServers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} | {formatVnd(Number(s.price))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {server && (
        <div className="animate-float-up mt-4 rounded-xl border border-border bg-surface/60 p-4">
          <p className="text-sm font-semibold">{server.name}</p>
          {server.description && (
            <p className="mt-1 text-xs text-muted-foreground">{server.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Đơn giá:{" "}
            <span className="font-semibold text-primary">
              {formatVnd(Number(server.price))}/1
            </span>{" "}
            · Min {server.min_qty} · Max {server.max_qty}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="qty">Số lượng</Label>
          <Input
            id="qty"
            inputMode="numeric"
            className="bg-surface"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Nhập số lượng"
          />
          {qtyError && <p className="text-xs text-destructive">{qtyError}</p>}
        </div>
        <div className="space-y-2">
          <Label>Thành tiền</Label>
          <div className="flex h-9 items-center rounded-md border border-border bg-surface px-3 text-lg font-bold text-primary">
            {formatVnd(total)}
          </div>
        </div>
      </div>

      <Button
        onClick={onBuy}
        className="bg-brand-gradient mt-6 w-full font-semibold text-primary-foreground transition-transform hover:scale-[1.01] hover:opacity-90"
      >
        <ShoppingCart className="mr-2 size-4" /> Mua hàng
      </Button>
    </div>
  );
}
