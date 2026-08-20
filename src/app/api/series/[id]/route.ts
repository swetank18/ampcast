/**
 * One run's block-averaged series.
 *
 * Reads Neon and falls back to the exported file that ships with the build, so
 * the chart still draws if the database is unreachable. Columnar on the wire:
 * 1,440 blocks x 11 channels as objects would roughly triple the payload for
 * no benefit to the client, which immediately walks them as arrays anyway.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { tryQuery } from "@/lib/db";
import type { Series } from "@/lib/types";

export const revalidate = 300;

const ID = /^[a-z_]+__[a-z_]+$/;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID.test(id)) {
    return NextResponse.json({ error: "bad series id" }, { status: 400 });
  }

  const rows = await tryQuery(
    async (sql) =>
      (await sql`
        select extract(epoch from t)::bigint as t, grid_kw, t_indoor, t_lo, t_hi, t_out,
               base_kw, hvac_kw, pv_kw, viol_k, bill_cum
        from series_points where run_id = ${id} order by t
      `) as unknown as Record<string, number>[],
  );

  if (rows && rows.length) {
    const cols: Series = {
      t: [], grid_kw: [], t_indoor: [], t_lo: [], t_hi: [], t_out: [],
      base_kw: [], hvac_kw: [], pv_kw: [], viol_k: [], bill_cum: [],
    };
    for (const r of rows) {
      cols.t.push(Number(r.t));
      cols.grid_kw.push(Number(r.grid_kw));
      cols.t_indoor.push(Number(r.t_indoor));
      cols.t_lo.push(Number(r.t_lo));
      cols.t_hi.push(Number(r.t_hi));
      cols.t_out.push(Number(r.t_out));
      cols.base_kw.push(Number(r.base_kw));
      cols.hvac_kw.push(Number(r.hvac_kw));
      cols.pv_kw.push(Number(r.pv_kw));
      cols.viol_k.push(Number(r.viol_k));
      cols.bill_cum.push(Number(r.bill_cum));
    }
    return NextResponse.json(cols, {
      headers: { "x-series-source": "neon", "cache-control": "public, max-age=300, s-maxage=300" },
    });
  }

  try {
    const buf = await readFile(join(process.cwd(), "public/data/series", `${id}.json`), "utf8");
    return new NextResponse(buf, {
      headers: {
        "content-type": "application/json",
        "x-series-source": "bundle",
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "series not found" }, { status: 404 });
  }
}
