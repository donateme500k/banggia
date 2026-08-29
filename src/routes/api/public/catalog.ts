import { createFileRoute } from "@tanstack/react-router";

/** API công khai chỉ đọc — trả về bảng giá lấy từ Vercel KV. */
export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      GET: async () => {
        const { readDoc } = await import("@/lib/kv.server");
        try {
          const doc = await readDoc();
          const bySort = <T extends { sort_order: number }>(a: T, b: T) =>
            a.sort_order - b.sort_order;
          return Response.json(
            {
              platforms: doc.platforms.filter((p) => p.active).sort(bySort),
              services: doc.services.filter((s) => s.active).sort(bySort),
              servers: doc.servers.filter((s) => s.active).sort(bySort),
              settings: doc.site_settings,
            },
            { headers: { "cache-control": "public, max-age=10" } },
          );
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Lỗi không xác định" },
            { status: 500 },
          );
        }
      },
    },
  },
});
