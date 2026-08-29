/**
 * Adapter nhỏ mô phỏng cú pháp truy vấn quen dùng, nhưng dữ liệu nằm trên Vercel KV.
 * Chỉ dùng ở phía server (webhook Telegram & API công khai).
 */

import { readDoc, updateDoc, type DataDoc } from "./kv.server";

type Row = Record<string, any>;
type Result<T> = { data: T; error: Error | null };

const TABLES = ["platforms", "services", "servers", "site_settings"] as const;
export type TableName = (typeof TABLES)[number];

function rowsOf(doc: DataDoc, table: string): Row[] {
  if (table === "site_settings") {
    return Object.entries(doc.site_settings).map(([key, value]) => ({ key, value }));
  }
  return (doc as any)[table] ?? [];
}

class SelectQuery implements PromiseLike<Result<Row[] | Row | null>> {
  private filters: Array<[string, unknown]> = [];
  private orderKey: string | null = null;
  private limitN: number | null = null;
  private single = false;

  constructor(private table: string) {}

  eq(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }
  order(key: string) {
    this.orderKey = key;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }
  singleRow() {
    this.single = true;
    return this;
  }

  private async run(): Promise<Result<Row[] | Row | null>> {
    try {
      const doc = await readDoc();
      let rows = [...rowsOf(doc, this.table)];
      for (const [field, value] of this.filters) rows = rows.filter((r) => r[field] === value);
      if (this.orderKey) {
        const k = this.orderKey;
        rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0));
      }
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      return { data: this.single ? (rows[0] ?? null) : rows, error: null };
    } catch (err) {
      return { data: this.single ? null : [], error: err as Error };
    }
  }

  then<TResult1 = Result<Row[] | Row | null>, TResult2 = never>(
    onfulfilled?: ((value: Result<Row[] | Row | null>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

class MutationQuery implements PromiseLike<Result<any>> {
  private returnSingle = false;
  private filters: Array<[string, unknown]> = [];

  constructor(
    private table: string,
    private kind: "insert" | "update" | "delete" | "upsert",
    private payload: Row | null,
  ) {}

  eq(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }
  select(_cols?: string) {
    return this;
  }
  single() {
    this.returnSingle = true;
    return this;
  }
  maybeSingle() {
    this.returnSingle = true;
    return this;
  }

  private async run(): Promise<Result<any>> {
    try {
      const out = await updateDoc((doc) => {
        const table = this.table;

        if (table === "site_settings") {
          if (this.kind === "insert" || this.kind === "upsert") {
            const key = String(this.payload?.["key"] ?? "");
            doc.site_settings[key] = String(this.payload?.["value"] ?? "");
            return { key, value: doc.site_settings[key] };
          }
          if (this.kind === "update") {
            const keyFilter = this.filters.find(([f]) => f === "key")?.[1];
            if (keyFilter != null) {
              doc.site_settings[String(keyFilter)] = String(this.payload?.["value"] ?? "");
            }
            return null;
          }
          if (this.kind === "delete") {
            const keyFilter = this.filters.find(([f]) => f === "key")?.[1];
            if (keyFilter != null) delete doc.site_settings[String(keyFilter)];
            return null;
          }
        }

        const rows: Row[] = (doc as any)[table] ?? [];

        if (this.kind === "insert" || this.kind === "upsert") {
          const now = new Date().toISOString();
          const row: Row = {
            id: crypto.randomUUID(),
            sort_order: 0,
            active: true,
            created_at: now,
            ...(table === "servers"
              ? { description: "", price: 0, min_qty: 1, max_qty: 100000 }
              : {}),
            ...(table === "platforms" ? { icon: "" } : {}),
            ...this.payload,
          };
          rows.push(row);
          (doc as any)[table] = rows;
          return row;
        }

        const match = (r: Row) => this.filters.every(([f, v]) => r[f] === v);

        if (this.kind === "update") {
          let updated: Row | null = null;
          for (const r of rows) {
            if (match(r)) {
              Object.assign(r, this.payload);
              updated = r;
            }
          }
          return updated;
        }

        // delete (kèm xoá dây theo quan hệ)
        const removed = rows.filter(match);
        (doc as any)[table] = rows.filter((r) => !match(r));
        if (table === "platforms") {
          const pids = new Set(removed.map((r) => r["id"]));
          const killedServices = doc.services.filter((s) => pids.has(s.platform_id));
          doc.services = doc.services.filter((s) => !pids.has(s.platform_id));
          const sids = new Set(killedServices.map((s) => s.id));
          doc.servers = doc.servers.filter((s) => !sids.has(s.service_id));
        }
        if (table === "services") {
          const sids = new Set(removed.map((r) => r["id"]));
          doc.servers = doc.servers.filter((s) => !sids.has(s.service_id));
        }
        return removed[0] ?? null;
      });

      return { data: this.returnSingle ? out : out ? [out] : [], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  then<TResult1 = Result<any>, TResult2 = never>(
    onfulfilled?: ((value: Result<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

function table(name: string) {
  return {
    select: (_cols?: string) => new SelectQuery(name),
    insert: (payload: Row) => new MutationQuery(name, "insert", payload),
    upsert: (payload: Row) => new MutationQuery(name, "upsert", payload),
    update: (payload: Row) => new MutationQuery(name, "update", payload),
    delete: () => new MutationQuery(name, "delete", null),
  };
}

export const db = { from: table };
